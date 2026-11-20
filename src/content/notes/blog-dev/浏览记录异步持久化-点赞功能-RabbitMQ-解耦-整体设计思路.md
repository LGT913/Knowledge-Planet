---
title: "整体设计思路"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 一、整体设计思路, blog-dev]
summary: "问题：在文章详情页，每次用户访问都要同步执行两步 DB 写操作——记录浏览历史 + 更新阅读量。高并发下 DB 写操作成为瓶颈。"
private: false
---

## 一、整体设计思路

### 1.1 为什么需要异步持久化

**问题**：在文章详情页，每次用户访问都要同步执行两步 DB 写操作——记录浏览历史 + 更新阅读量。高并发下 DB 写操作成为瓶颈。

**方案**：将"浏览记录持久化"和"点赞计数持久化"从同步流程中剥离，改为：

```
用户请求 → Controller → Redis 先写（即时响应）
                              ↓
                        RabbitMQ 消息
                              ↓
                        Consumer 异步 → DB 持久化
```

**核心收益**：
- 用户请求响应时间从 `Redis + DB写` 降为 `Redis写`，延迟降低 50%+
- 点赞/浏览的瞬时高峰被 MQ 削峰填谷，DB 压力可控
- 消费者故障不影响用户操作，消息进入死信队列后补处理

### 1.2 点赞功能的数据流

```
POST /api/like/article/{articleId}?action=like
         │
         ▼
┌─ LikeController ─────────────────────────────────────────────┐
│  ① Redis Set 记录"谁点赞了"（SADD / SREM）                    │
│  ② Redis String 原子计数（INCR / DECR）                       │
│  ③ Redis Set 标记脏文章（SADD dirty）                        │
│  ④ 发送 LikeMessage 到 RabbitMQ LIKE_QUEUE                   │
│  ⑤ 返回最新点赞状态（liked + likeCount）                      │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌─ LikeConsumer ───────────────────────────────────────────────┐
│  ① 幂等性检查（Redis SET NX）                                 │
│  ② DB 原子更新：UPDATE article SET like_count = like_count + delta │
│  ③ 失败 → 抛 RuntimeException → 进入 DLX_QUEUE               │
└──────────────────────────────────────────────────────────────┘

         ⏰ 定时任务（每 10 分钟）
         ▼
┌─ ArticleServiceImpl.syncLikeCountToDB() ─────────────────────┐
│  ① 获取分布式锁（Redisson）                                   │
│  ② 读取 Redis 脏文章集合                                      │
│  ③ 遍历每篇文章：Redis 计数 → DB 覆盖更新                     │
│  ④ 移除脏标记（SREM）                                        │
└──────────────────────────────────────────────────────────────┘
```

**为什么需要两层持久化**：
- **LikeConsumer**：实时增量同步（`like_count + delta`），处理点赞/取消点赞的增量
- **定时任务 syncLikeCountToDB**：兜底覆盖同步（`like_count = redisCount`），修复 MQ 消息丢失或延迟导致的数据不一致

### 1.3 浏览记录的数据流

```
GET /api/article/{id}（用户查看文章详情）
         │
         ▼
┌─ ArticleController.getArticle() ─────────────────────────────┐
│  ① Redis List 记录浏览历史（LPUSH + LTRIM，最多保留 50 条）   │
│  ② Redis Set 标记脏用户（SADD dirty）                        │
│  ③ 发送 BrowseHistoryMessage 到 RabbitMQ HISTORY_QUEUE       │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌─ BrowseHistoryConsumer ──────────────────────────────────────┐
│  ① 幂等性检查（userId:articleId:timestamp）                  │
│  ② DB INSERT 浏览记录                                        │
│  ③ 失败 → 抛 RuntimeException → 进入 DLX_QUEUE               │
└──────────────────────────────────────────────────────────────┘

GET /api/user/history（用户查看浏览历史）
         │
         ▼
┌─ UserHistoryController ──────────────────────────────────────┐
│  ① 优先从 Redis List 读取（LRANGE 分页）                     │
│  ② Redis 无数据 → 回源 DB（BrowseHistory 表）                 │
│  ③ 按 articleId 批量查询 Article 实体                         │
└──────────────────────────────────────────────────────────────┘
```

**为什么 Redis List 只存 50 条**：浏览历史是"最近浏览"场景，用户只关心最近的几十条。全量存 Redis 浪费内存，超出的部分靠 DB 提供全量查询。

---

## 二、具体步骤与核心代码

### 步骤 1：定义缓存常量

**文件**：`common/constant/BlogCacheConstants.java`

**设计思路**：所有 Redis key 集中管理，避免硬编码字符串导致 key 不一致。

```java
// 点赞
public static final String ARTICLE_LIKE_COUNT_KEY = "blog:article:like:count:";  // 计数 key
public static final String ARTICLE_LIKE_USER_SET_KEY = "blog:article:like:user:"; // 用户集合 key
public static final String ARTICLE_LIKE_DIRTY_KEY = "blog:article:like:dirty";    // 脏文章标记
public static final String LIKE_SYNC_LOCK = "blog:article:like:sync:lock";        // 同步分布式锁
public static final String LIKE_DONE_PREFIX = "blog:like:done:";                  // 幂等性 key

// 浏览记录
public static final String USER_HISTORY_KEY = "blog:user:history:";               // 浏览历史 List
public static final String USER_HISTORY_DIRTY_KEY = "blog:user:history:dirty";    // 脏用户标记
public static final String HISTORY_SYNC_LOCK = "blog:user:history:sync:lock";     // 同步分布式锁
public static final String HISTORY_DONE_PREFIX = "blog:history:done:";            // 幂等性 key
public static final long USER_HISTORY_MAX = 50L;                                  // 每个用户最多 50 条
```

**Redis 数据结构选型**：

| 场景 | Redis 类型 | Key | 说明 |
|------|-----------|-----|------|
| 点赞计数 | String | `blog:article:like:count:{articleId}` | INCR/DECR 原子操作 |
| 点赞用户 | Set | `blog:article:like:user:{articleId}` | SISMEMBER 快速判断是否已点赞 |
| 脏文章标记 | Set | `blog:article:like:dirty` | 定时任务扫描需要同步的文章 |
| 浏览历史 | List | `blog:user:history:{userId}` | LPUSH 最新在前，LTRIM 限长 |
| 脏用户标记 | Set | `blog:user:history:dirty` | 记录哪些用户有新浏览数据 |
| 幂等性 | String | `blog:like:done:{articleId}:{userId}:{timestamp}` | SET NX 防重复消费 |

### 步骤 2：定义消息 DTO

**文件**：`dto/LikeMessage.java`、`dto/BrowseHistoryMessage.java`

**设计思路**：
- `LikeMessage` 使用 `delta`（+1/-1）而非 `liked` 布尔值，因为 DB 端用 `UPDATE SET like_count = like_count + delta` 的原子操作，无需先查后改
- 两个 DTO 都带 `timestamp`，用于幂等性去重（区分同一次投递的重复消息和不同时间点的正常消息）

```java
// LikeMessage.java
@Data
public class LikeMessage implements Serializable {
    private Long articleId;
    private Long userId;
    private int delta;          // 1=点赞, -1=取消点赞
    private Long timestamp;     // 用于幂等性去重
}

// BrowseHistoryMessage.java
@Data
public class BrowseHistoryMessage implements Serializable {
    private Long userId;
    private Long articleId;
    private Long timestamp;     // 用于幂等性去重
}
```
