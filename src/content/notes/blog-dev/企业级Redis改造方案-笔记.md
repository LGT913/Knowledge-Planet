---
title: "企业级 Redis 改造方案 — 笔记"
date: 2026-08-03
planet: blog-dev
tags: ["后端", "实战"]
summary: "缓存 Key 散落在各处，容易不一致 - 使用 KEYS 命令可能阻塞 Redis - 无缓存穿透/击穿/雪崩防护 - 阅读量同步时脏标记可能丢失 - 无缓存预热机制 - 线程池未受 Spring 管理，关闭时可能丢失任务"
private: false
---
# 企业级 Redis 改造方案 — 笔记

## 一、改造背景

项目原有 Redis 使用存在以下问题：

- 缓存 Key 散落在各处，容易不一致
- 使用 `KEYS` 命令可能阻塞 Redis
- 无缓存穿透/击穿/雪崩防护
- 阅读量同步时脏标记可能丢失
- 无缓存预热机制
- 线程池未受 Spring 管理，关闭时可能丢失任务

## 二、改造思路

### 1. 集中管理缓存 Key

**问题**：多个 Service 和 Consumer 中硬编码相同的缓存 Key，修改一处容易漏改。

**方案**：创建 `BlogCacheConstants` 公共常量类，所有缓存 Key、过期时间、锁 Key 统一引用。

涉及文件：`BlogCacheConstants.java`

### 2. 替换 KEYS 为 SCAN

**问题**：`RedisUtil.deleteByPattern()` 使用 `KEYS` 命令，大数据量时阻塞 Redis 单线程。

**方案**：改用 `SCAN` 游标遍历 + 批量删除，SCAN 失败时兜底回退到 KEYS。

涉及文件：`RedisUtil.java`

### 3. 修复脏标记丢失 Bug

**问题**：同步阅读量时对整个 dirty set 执行 `DEL`，同步过程中新产生的脏标记被误删。

**方案**：逐个 `SREM` 已同步的脏文章 ID，不移除未处理的 ID。

涉及文件：`RedisUtil.java`（新增 `srem` 方法）、`ArticleServiceImpl.java`

### 4. 缓存穿透防护（布隆过滤器）

**思路**：查询详情前先检查布隆过滤器，不存在则直接返回"文章不存在"。

**步骤**：
1. 创建文章时加入布隆过滤器
2. 查询详情时先 `mightContain` 判断
3. 缓存空值（"NULL"）兜底

涉及文件：`ArticleServiceImpl.java`

### 5. 缓存击穿防护（分布式锁 + 逻辑过期）

**思路**：热点 Key 过期瞬间大量并发请求打到 DB，采用双重防护：

- **互斥锁方案**：获锁线程查 DB 回写缓存，其他线程等待后重试
- **逻辑过期方案**：缓存永不过期（物理过期时间加缓冲），设置逻辑过期时间，过期后异步重建，返回旧数据

涉及文件：`RedisUtil.java`（`setWithLogicalExpire`、`getWithLogicalExpire`）、`ArticleServiceImpl.java`

### 6. ZSet 阅读排行榜

**思路**：用 Redis ZSet 存储文章阅读量排行，避免每次查询 DB 排序。

**步骤**：
1. 创建文章时 ZADD score=0 初始化
2. 阅读量 +1 时 ZINCRBY
3. 排行榜查询用 `zReverseRangeWithScores` 取 Top N
4. 同步阅读量到 DB 后更新 ZSet score

涉及文件：`ArticleServiceImpl.java`

### 7. 缓存预热

**思路**：应用启动时自动加载热点数据到 Redis，避免冷启动所有请求打 DB。

**步骤**：
1. ZSet 排行榜（同步，保证首页立即可用）
2. 文章列表缓存（异步）
3. TOP 10 热点文章详情缓存（异步，逻辑过期结构）

**注意**：通过 `ApplicationContext.getBean()` 获取代理对象调用 `@Async` 方法，解决同类内部调用不生效问题。

涉及文件：`CacheWarmup.java`、`WarmupConfig.java`

### 8. Spring 管理线程池

**问题**：手动创建 `ExecutorService`，Spring 关闭时无法优雅终止。

**方案**：使用 `ThreadPoolTaskExecutor` 配置线程池 Bean，设置 `waitForTasksToCompleteOnShutdown=true`。

涉及文件：`ExecutorConfig.java`

## 三、涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `common/constant/BlogCacheConstants.java` | 新增 | 缓存 Key 集中管理 |
| `common/util/RedisUtil.java` | 修改 | SCAN 替代 KEYS；新增 srem/逻辑过期/分布式锁方法 |
| `common/util/CacheCleaner.java` | 新增 | 缓存清理工具类 |
| `service/impl/ArticleServiceImpl.java` | 重写 | 构造器注入、常量引用、CacheCleaner、脏标记修复、线程池 |
| `config/ExecutorConfig.java` | 新增 | 缓存重建线程池配置 |
| `config/CacheWarmup.java` | 修改 | 缓存预热（ZSet/列表/详情） |
| `config/WarmupConfig.java` | 新增 | 预热异步线程池 |

## 四、总结

- **Key 统一管理**：所有缓存 Key 集中在 `BlogCacheConstants`，消除重复定义风险
- **性能优化**：`SCAN` 替代 `KEYS` 避免阻塞，逻辑过期减少 DB 压力
- **可靠性提升**：脏标记逐个移除、线程池优雅关闭、布隆过滤器防穿透
- **高并发防护**：分布式锁防击穿 + 逻辑过期异步重建 + 空值缓存防穿透
- **冷启动优化**：缓存预热确保服务启动后热点数据立即可用
