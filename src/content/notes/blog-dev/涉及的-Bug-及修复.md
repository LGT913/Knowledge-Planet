---
title: "涉及的 Bug 及修复"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 三、涉及的 Bug 及修复, blog-dev]
summary: "现象：编译错误 Duplicate field"
private: false
---

## 三、涉及的 Bug 及修复

### Bug 1：BlogCacheConstants 重复常量定义

**现象**：编译错误 `Duplicate field`

**原因**：`LIKE_SYNC_LOCK`、`ARTICLE_LIKE_DIRTY_KEY`、`ARTICLE_LIKE_COUNT_KEY` 在类中定义了两次——一组 `public static final`，一组包级私有。

**修复**：删除重复的包级私有定义。

```java
// 修复前（第 47-51 行）
String LIKE_SYNC_LOCK = "blog:like:sync:lock";
String ARTICLE_LIKE_DIRTY_KEY = "blog:article:like:dirty";
String ARTICLE_LIKE_COUNT_KEY = "blog:article:like:count:";

// 修复后：删除以上三行，保留 public static final 版本
```

### Bug 2：BrowseHistory 索引列名使用 Java 属性名

**现象**：`@Index` 的 `columnList` 使用 `browseTime`（Java 驼峰），但 JPA 默认命名策略 `SpringPhysicalNamingStrategy` 会将其转为 `browse_time`（数据库下划线），索引定义中的列名与物理列名不匹配，索引实际失效。

**修复**：`columnList` 中使用数据库列名。

```java
// 修复前
@Index(name = "idx_user_time", columnList = "userId, browseTime DESC")

// 修复后
@Index(name = "idx_user_time", columnList = "userId, browse_time DESC")
```

### Bug 3：BrowseHistoryConsumer 幂等性 key 粒度太粗

**现象**：同一用户对同一篇文章的浏览记录，永远只有第一次会持久化到 DB，后续全部被幂等性拦截。

**原因**：幂等性 key 只用了 `userId:articleId`，不含时间戳，导致不同时间点的浏览被当作重复消息。

**修复**：key 追加 `message.getTimestamp()`。

```java
// 修复前
String doneKey = HISTORY_DONE_PREFIX + message.getUserId() + ":" + message.getArticleId();

// 修复后
String doneKey = HISTORY_DONE_PREFIX + message.getUserId() + ":" + message.getArticleId()
        + ":" + message.getTimestamp();
```

### Bug 4：@Transactional 注解导入错误

**现象**：`ArticleServiceImpl.syncLikeCountToDB()` 的 `@Transactional(rollbackFor = Exception.class)` 编译报错。

**原因**：import 的是 `jakarta.transaction.Transactional`，该注解没有 `rollbackFor` 属性。

**修复**：改为 `org.springframework.transaction.annotation.Transactional`。

```java
// 修复前
import jakarta.transaction.Transactional;

// 修复后
import org.springframework.transaction.annotation.Transactional;
```

### Bug 5：redisUtil.get() 返回 Object 被赋值给 String

**现象**：`syncLikeCountToDB()` 中 `String countStr = redisUtil.get(...)` 编译报错。

**原因**：`redisUtil.get()` 返回 `Object`，不能直接赋值给 `String`。

**修复**：用 `Object` 接收，通过 `instanceof Number` 安全转换。

```java
// 修复前
String countStr = redisUtil.get(ARTICLE_LIKE_COUNT_KEY + articleId);
int realLikeCount = Objects.nonNull(countStr) ? Integer.parseInt(countStr) : 0;

// 修复后
Object countObj = redisUtil.get(ARTICLE_LIKE_COUNT_KEY + articleId);
int realLikeCount = countObj instanceof Number ? ((Number) countObj).intValue() : 0;
```

---

## 四、涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `controller/LikeController.java` | 新建 | 点赞/取消点赞 + 查询点赞状态 |
| `controller/UserHistoryController.java` | 新建 | 浏览历史查询（Redis → DB 回源） |
| `dto/LikeMessage.java` | 新建 | 点赞消息 DTO（delta 增量） |
| `dto/BrowseHistoryMessage.java` | 新建 | 浏览记录消息 DTO |
| `service/LikeConsumer.java` | 新建 | 点赞消息异步消费者 |
| `service/BrowseHistoryConsumer.java` | 新建 | 浏览记录消息异步消费者 |
| `controller/ArticleController.java` | 修改 | 文章详情中嵌入浏览历史记录逻辑 |
| `common/constant/BlogCacheConstants.java` | 修改 | 新增点赞/浏览记录相关常量 |
| `repository/ArticleRepository.java` | 修改 | 新增 `incrementLikeCount` + `updateLikeCount` |
| `repository/BrowseHistoryRepository.java` | 新建 | 浏览记录 JPA 仓库 |
| `entity/BrowseHistory.java` | 新建 | 浏览记录实体 |
| `service/impl/ArticleServiceImpl.java` | 修改 | 新增 `syncLikeCountToDB` 定时任务 |
| `config/RabbitMQConfig.java` | 修改 | 新增 LIKE/HISTORY 交换机/队列 |

---

## 五、总结

1. **Redis 先写 + MQ 异步持久化**：用户请求只写 Redis 即返回，响应时间降低 50%+。MQ 削峰填谷，DB 写压力可控。

2. **两层持久化保障**：LikeConsumer 实时增量同步 + 定时任务覆盖兜底。即使 MQ 消息丢失，10 分钟后定时任务也能从 Redis 读取最新计数修复 DB。

3. **幂等性 key 必须包含时间戳**：对于"同一用户可多次浏览同一文章"的场景，幂等性 key 只用 `userId:articleId` 会导致后续浏览记录全部丢失。加上 `timestamp` 后，只有同一次投递的重复消息被拦截，正常业务不受影响。

4. **Redis 数据结构选型**：点赞计数用 String（INCR 原子操作），点赞用户用 Set（SISMEMBER 快速判断），浏览历史用 List（LPUSH + LTRIM 天然有序且限长），脏标记用 Set（去重）。

5. **DB 原子更新**：`UPDATE SET like_count = like_count + delta` 而非先查后改，避免并发覆盖问题。`delta` 为 +1 或 -1，由 Controller 层计算，Consumer 层直接执行，职责清晰。
