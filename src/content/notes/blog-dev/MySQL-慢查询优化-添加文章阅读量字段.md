---
title: "MySQL 慢查询优化 + 添加文章阅读量字段"
date: 2026-07-29
planet: blog-dev
tags: ["后端", "实战"]
summary: "本项目采用的企业方案（正确）      ┌────────────────────────────────────────────┐      │  用户访问 /article/123                       │    "
private: false
---
# MySQL 慢查询优化 + 添加文章阅读量字段

## 一、整体架构思路

```
                  传统直接写 DB（问题方案）
     ┌────────────────────────────────────────────┐
     │  用户访问 /article/123                       │
     │     ↓ 同步 SQL 写 +1                         │
     │  UPDATE article SET view_count = view_count + 1 │
     │     ↓ 行锁 + 磁盘 IO                          │
     │  1 篇热点文章 10 万 QPS → DB 被打挂          │
     └────────────────────────────────────────────┘

                 本项目采用的企业方案（正确）
     ┌────────────────────────────────────────────┐
     │  用户访问 /article/123                       │
     │     ↓ 只触达内存（<1ms）                     │
     │  ① Redis INCR blog:article:view:123          │
     │  ② Redis SADD blog:article:view:dirty 123   │
     │     ↓ 直接返回文章                           │
     │                                                │
     │  ── 10 分钟后定时任务（用户无感）─────────      │
     │  ③ SMEMBERS dirty → 拿到所有脏 id             │
     │  ④ 对每个 id：GETSET view:{id} → delta        │
     │  ⑤ UPDATE article SET view_count += delta     │
     │     ↓ 一次 DB 批量处理，而非每次访问都写库     │
     └────────────────────────────────────────────┘
```

**核心思想**：**读写分离 + 异步批量化**

- 写路径：高频访问只写内存（Redis），不阻塞用户
- 持久化：定时批量合并到 DB，把 N 次行锁变成 1 次行锁

## 二、分步实现（7 个步骤 + 3 个安全加固）

### 步骤 1：实体加字段

Article.java

```java
@Column(columnDefinition = "int default 0")
private Integer viewCount = 0;
```

**设计意图**：

- `columnDefinition = "int default 0"`：建表时直接给默认值，避免 `AlterTable` 之后老数据是 NULL
- `Integer` 而非 `int`：避免 Hibernate 保存时基本类型默认 0 和 DB NULL 冲突

### 步骤 2：DAO 层增量 UPDATE

ArticleRepository.java

```java
@Modifying
@Query("UPDATE Article a SET a.viewCount = a.viewCount + :delta WHERE a.id = :id")
int incrementViewCount(@Param("id") Long id, @Param("delta") int delta);
```

**为什么用增量而不是覆盖？**

```sql
❌ 错误写法（覆盖）：并发同步时丢失增量
UPDATE article SET view_count = 100 WHERE id = ?  -- 可能把别人刚+的覆盖掉

✅ 正确写法（累加）：SQL 自身就是原子的
UPDATE article SET view_count = view_count + 100 WHERE id = ?  -- 并发安全
```

**为什么加 `@Modifying`？**：JPA 的 `@Query` 默认是 SELECT，加了 `@Modifying` 才能执行 UPDATE/DELETE，否则抛 `InvalidDataAccessApiUsageException`。

------

### 步骤 3：RedisUtil 补 4 个原子操作

RedisUtil.java

| 方法               | 作用                                              | 原子性                                         |
| :----------------- | :------------------------------------------------ | :--------------------------------------------- |
| `increment(key)`   | 计数 +1，返回新值                                 | Redis INCR 单命令原子                          |
| `getAndReset(key)` | 读取当前值并把它清零 → 这一步是"**拿增量**"的关键 | Redis GETSET 原子（拿旧值+写入新值是一个操作） |
| `sadd(key, val)`   | 把脏文章 id 标记到集合里                          | Redis SADD 原子                                |
| `smembers(key)`    | 一次性拿回所有脏 id                               | —                                              |

**`getAndReset` 的类型安全处理**：因为项目用的是 `RedisTemplate<String, Object>`（泛型到 Object），反序列化后可能是 Long、Integer 或 String，所以要做 4 层兜底，这是企业项目里操作 Object 泛型 Redis 的**标准防御写法**：

```java
if (val == null) → null
if (val instanceof Long) → (Long) val
if (val instanceof Integer) → longValue()
最后兜底：Long.valueOf(val.toString())
```

------

### 步骤 4：写路径 — incrementViewCount

ArticleServiceImpl.java

```java
public void incrementViewCount(Long articleId) {
    redisUtil.increment(ARTICLE_VIEW_KEY + articleId);   // 原子 +1
    redisUtil.sadd(ARTICLE_VIEW_DIRTY_KEY, articleId);   // 标记脏
}
```

调用点在 ArticleController.java的 `getArticle`，取到文章就顺手 +1。

**为什么不用 GETSET +1？**：INCR 单命令最简单；标记脏独立一条命令也很简单，两条合起来不是原子的也没关系——标记脏比不标记更安全（最多下次多同步一次空值）。

------

### 步骤 5：定时配置 + 接口声明

- SchedulingConfig.java：`@Configuration + @EnableScheduling`，开启 Spring 定时调度线程池
- ArticleService.java：接口里声明两个方法

------

### 步骤 6：定时同步核心逻辑

ArticleServiceImpl.java

```
同步流程图（核心）：

  SETNX blog:article:view:sync:lock   ← 先拿锁
       │
  失败 └── 返回 "上次还在跑，跳过"
  成功
       │
  try {
    SMEMBERS dirtySet ──► 只拿有变化的 id（1000 个 vs SCAN 10 万个，差 100 倍）
       │
    for (每个 id) {
      try {
        GETSET view:{id} ──► 返回 delta（原子读+归零，并发安全）
        UPDATE article SET view_count += delta  ← SQL 累加，并发安全
      } catch (Exception e) {
        log.error("单篇失败，不阻塞其他")  ← 异常隔离
      }
    }
  } finally {
    unlock(lockKey, value)  ← Lua 校验锁值，不会误删别人的锁
  }
       │
  DEL dirtySet  ← 清空标记（放在 finally 外，异常场景也尽力清理）
```

------

### 步骤 7：三个安全加固（企业规范）

| 加固项                                 | 解决的问题                                                   | 实现方式                                                     |
| :------------------------------------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **① 异常隔离（try-catch 包内层 for）** | 单篇文章 DB 写失败 → 抛出 RuntimeException → 整个 for 中断 → 其他 999 篇文章白没同步 | 内层 try-catch，失败只 log.error，continue 下一个            |
| **② 分布式锁**                         | `fixedRate` 是"任务开始"计时，上次执行 12 分钟 → 下次 10 分钟时又触发 → 两个任务并发 GETSET 同一个 key → 丢计数 | SETNX 加锁 + UUID 锁值 + finally unlock(Lua 校验锁值) + 5 分钟过期兜底 |
| **③ initialDelay = 60s**               | 应用刚启动时 Redis 连接池、JPA、HikariCP 都在初始化 → 第一次调度立刻跑 → 可能 `ConnectionNotAvailable` | 等 1 分钟让容器完全稳再跑第一次                              |

## 三、经验总结（面试能讲的点）

### 🟢 为什么不用"每次访问直接写 DB"？

行锁竞争。一篇热点文章 1 万 QPS → 同一行被 UPDATE 1 万次 → InnoDB 行锁排队 1 万次 → DB CPU 100%。用 Redis INCR 把高频写变成内存操作，再把 1 万次 +1 合并成一次 `view_count += 10000`，DB 压力从 **10000 降到 1**。

### 🟢 为什么用 Dirty Set 而不是 SCAN `blog:article:view:*`？

| 方案               | 时间复杂度       | 10 万篇文章只有 1000 篇被看了 |
| :----------------- | :--------------- | :---------------------------- |
| SCAN 所有 view key | O(N)，N=文章总数 | 扫描 10 万次，99% 是白扫      |
| SMEMBERS dirtySet  | O(K)，K=变化数   | 只拿 1000 个 id，差 100 倍    |

这是大厂标准做法（微博阅读量、GitHub Star 数都这么做）。

### 🟢 为什么 GETSET（原子归零）而不是 GET？

```
GET 方案（有 Bug）：
  T1 GET view:123 → 100
  T2 INCR view:123 → 101（新的阅读）
  T1 SET view:123 = 0   ← 把 T2 的 1 覆盖了！丢失！

GETSET 方案（正确）：
  T1 GETSET view:123 = 0 → 返回 100（同时清零）
  T2 INCR view:123 → 1   ← 从 0 开始 +1，保留了这次增量
  T1 同步 100 到 DB，T2 的 1 下次再同步 → 零丢失
```

### 🟢 为什么 `@Transactional` 去掉了？

原来的方案给整个方法包了大事务，1000 条 SQL 包在一个事务里 → 事务持有的连接 10 秒不释放 → 连接池被占满。改成"每一条 `@Modifying` SQL 自己独立事务"，Hibernate 默认就是 `REQUIRED`，小事务更安全。

### 🟢 阅读量排行榜的优化配合

排行榜接口 ArticleRepository.findTop10ByOrderByViewCountDesc() 本身很简洁，但如果文章超过 100 万篇，MySQL `ORDER BY view_count DESC LIMIT 10` 会做 filesort。优化方向：

- 加索引 `INDEX idx_view_count(view_count)`，避免 filesort
- 或者热点排行直接读 Redis ZSET（本项目用的是缓存 Top10 列表 + 300s 过期，折中方案已经够用）

## 四、对应关系

```
MySQL 慢查询优化                              ✅ view_count 字段 + 默认值
阅读量字段加实体                               ✅ Article.viewCount @Column
Redis 自增计数                                ✅ increment(key)
定时同步 DB                                   ✅ @Scheduled + GETSET 原子归零
防雪崩（随机过期）                             ✅ 缓存层已有（排行缓存 300s ± 60s）
附加：Dirty Set 优化                          ✅ SMEMBERS 替代 SCAN（企业进阶项，超计划）
附加：分布式锁防重入                           ✅ SETNX + UUID（企业进阶项，超计划）
附加：异常隔离 try-catch                      ✅ 单篇失败不阻塞（企业进阶项，超计划）
```

#### 面试时怎么讲

我的阅读量采用 Redis 原子计数 + Dirty Set 标记 + 定时增量同步的三层架构。用户访问时用 INCR 原子递增，同时把文章 ID 加入 Dirty Set。定时任务每隔 10 分钟通过 SMEMBERS 获取所有脏文章，用 GETSET 原子读取增量并归零，最后用增量更新写入数据库。这样既保证了高并发下的计数准确性，又避免了全量扫描的性能损耗。
