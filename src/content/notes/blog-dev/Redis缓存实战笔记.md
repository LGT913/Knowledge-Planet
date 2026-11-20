---
title: "📝 Redis 缓存实战笔记——基于个人博客项目"
date: 2026-07-31
planet: blog-dev
tags: ["后端", "实战"]
summary: "写作结构：概念 → 问题 → 方案 → 代码 → 效果（学习计划要求的格式）  所属阶段：Phase 1（第 1-2 周）复盘收尾"
private: false
---
# 📝 Redis 缓存实战笔记——基于个人博客项目

> 写作结构：概念 → 问题 → 方案 → 代码 → 效果（学习计划要求的格式）
> 所属阶段：Phase 1（第 1-2 周）复盘收尾

---

## 一、Redis 数据类型与底层结构

### 1.1 五种基本类型

| 类型 | 底层结构（Redis 7 以前） | 典型场景 | 博客项目中的应用 |
|------|------------------------|---------|-----------------|
| **String** | int / SDS（简单动态字符串） | 缓存对象、计数器、分布式锁 | 文章详情 JSON、阅读量计数、锁 |
| **List** | quicklist（ziplist + linkedlist） | 消息队列、最新列表 | 暂无（Phase 2 用 MQ 替代） |
| **Hash** | listpack / hashtable | 存储对象字段、购物车 | 暂无 |
| **Set** | intset / hashtable | 去重、点赞、共同好友 | 暂无（点赞功能计划中） |
| **ZSet** | skiplist + hashtable | 排行榜、延时队列 | 阅读量排行（当前用 list 排序，后续可换 ZSet） |

### 1.2 底层结构要点（面试常问）

- **SDS**：C 字符串的升级版，`len` 字段记录长度，O(1) 获取长度；杜绝缓冲区溢出；二进制安全。
- **skiplist（跳表）**：ZSet 用跳表而非红黑树，因为跳表实现简单、范围查询方便（`ZRANGE`）。
- **quicklist**：多个 ziplist 用双向链表串起来，兼顾内存紧凑和快速插入。
- **listpack**：比 ziplist 更紧凑的连续内存结构，Redis 7 全面替代 ziplist。

### 1.3 项目中的序列化设计

```java
// RedisConfig.java（核心片段）
template.setKeySerializer(new StringRedisSerializer());     // key 可读，不出现乱码
Jackson2JsonRedisSerializer<Object> serializer = ...;       // value 存 JSON
ObjectMapper mapper = new ObjectMapper();
mapper.activateDefaultTyping(...NON_FINAL);                 // 写入类型信息，反序列化不丢类型
```

**为什么 value 用 JSON 而不用 JDK 序列化？**
- JDK 序列化存的是二进制，RedisInsight 里看全是乱码，没法排查问题；
- JSON 可读、可跨语言（以后微服务拆分，Python/Go 服务也能读）；
- `activateDefaultTyping` 会把类名写进 JSON（如 `["com.blog.blog.entity.Article", {...}]`），保证 `(Article) redisUtil.get(key)` 强转不报 `ClassCastException`。

---

## 二、缓存三大问题与解决方案对比

### 2.1 问题定义

| 问题 | 触发场景 | 后果 |
|------|---------|------|
| **穿透** | 查**不存在**的数据（如恶意攻击遍历不存在的 id） | 每次都打 DB，DB 压力巨大甚至宕机 |
| **击穿** | 查**存在但缓存刚好过期**的热点 key | 一瞬间大量请求涌向 DB |
| **雪崩** | **大量 key 同时过期** / Redis 宕机 | DB 被打垮，服务雪崩 |

### 2.2 解决方案对比

| 问题 | 方案 1 | 方案 2 | 方案 3 |
|------|--------|--------|--------|
| 穿透 | ✅ **缓存空值**（项目已用） | 布隆过滤器 | 参数校验（id 合法性） |
| 击穿 | ✅ **互斥锁**（项目已用） | 逻辑过期（不设 TTL，只存过期时间字段） | 热点 key 预热 |
| 雪崩 | ✅ **随机过期**（项目已用） | 多级缓存（本地缓存 + Redis） | 集群部署 + 熔断降级 |

### 2.3 项目中的落地代码

**① 缓存空值防穿透**（`ArticleServiceImpl`）：

```java
private static final String ARTICLE_NULL_VALUE = "NULL";

if (pageResult.hasContent()) {
    redisUtil.set(key, pageResult, 600);
} else {
    redisUtil.set(key, ARTICLE_NULL_VALUE, 60);  // 空值短过期，防穿透
}
```

**② 互斥锁防击穿**（`ArticleServiceImpl.getArticle`）：

```java
// 1. 先查缓存
Article article = (Article) redisUtil.get(key);
if (article != null) return article;

// 2. 拿不到锁就自旋重试（setIfAbsent 原子性保证只有一个线程进 DB）
Boolean locked = redisTemplate.opsForValue()
        .setIfAbsent(lockKey, "locked", Duration.ofSeconds(30));
if (Boolean.TRUE.equals(locked)) {
    try {
        article = redisUtil.get(key);      // 二次检查 double check
        if (article != null) return article;
        article = articleRepository.findById(id).orElseThrow(...);
        redisUtil.set(key, article, 1800); // 回填缓存
        return article;
    } finally {
        redisUtil.delete(lockKey);         // 释放锁
    }
} else {
    Thread.sleep(50);
    return getArticle(id);                 // 自旋重试
}
```

**③ 随机过期防雪崩**：

```java
int baseExpire = 1800;
int randomExpire = baseExpire + RANDOM.nextInt(600);  // 30~40 分钟随机
redisUtil.set(key, article, randomExpire);
```

> 复习提示：三个方案的共同思想是「**不让请求直接打 DB**」——要么兜底（空值/默认值），要么排队（互斥锁），要么错峰（随机 TTL）。

---

## 三、分布式锁：setnx / Lua / Redisson 对比

### 3.1 为什么需要分布式锁

单体项目用 `synchronized` 就够了；但锁要跨 JVM 生效时（多实例部署、以后微服务），必须用 Redis 这种共享存储来做锁。

### 3.2 三种实现方案对比

| 维度 | 简单 setnx | ✅ Lua 脚本（项目现状） | Redisson |
|------|-----------|------------------------|----------|
| 获取锁 | `SET key value NX EX ttl` | 同上 | `lock.lock()` |
| 释放锁 | `DEL key` | 脚本内先比对再删除 | `lock.unlock()` |
| 原子性 | ❌ 删锁不是原子的 | ✅ 整个脚本原子执行 | ✅ 内部封装 |
| 误删别人锁 | ❌ 可能误删 | ✅ 比对 value 才删 | ✅ 看门狗机制 |
| 自动续期 | ❌ 无 | ❌ 无（锁可能提前过期） | ✅ 看门狗自动续期 |
| 复杂度 | ⭐ | ⭐⭐ | ⭐⭐⭐ |

### 3.3 项目中的实现（`RedisUtil`）

```java
// 获取锁：SET NX EX，value 存唯一标识（UUID）
public boolean tryLock(String key, String value, long timeout) {
    return Boolean.TRUE.equals(redisTemplate.opsForValue()
            .setIfAbsent(key, value, timeout, TimeUnit.SECONDS));
}

// 释放锁：Lua 脚本保证「先比对、再删除」原子执行
public boolean unlock(String key, String value) {
    String script = "if redis.call('get', KEYS[1]) == ARGV[1] then " +
            "return redis.call('del', KEYS[1]) else return 0 end";
    DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>(script, Long.class);
    Long result = redisTemplate.execute(redisScript,
            Collections.singletonList(key), value);
    return Long.valueOf(1).equals(result);
}
```

**为什么要 Lua 脚本？** 因为"比对 value + 删除 key"是两步操作，不加脚本的话：
1. 线程 A 拿到锁，value=AAA；
2. A 执行太久，锁过期了；
3. 线程 B 拿到锁，value=BBB；
4. A 终于执行完，直接 `DEL key` → **把 B 的锁删了**！

Lua 脚本把「get 比对 + del 删除」合并成一步，Redis 单线程执行脚本期间不会被其他命令插入，从而保证原子性。

### 3.4 项目中的实际应用（幂等防重）

```java
// ArticleController.create —— 防止快速点击重复发布
String requestId = article.getTitle() + ":" + article.getUserId() + ":" + System.currentTimeMillis();
String lockKey = "article:create:lock:" + requestId.hashCode();
String lockValue = UUID.randomUUID().toString();

boolean locked = redisUtil.tryLock(lockKey, lockValue, 5);
if (!locked) return Result.error("操作太频繁，请稍后重试");
try {
    return Result.success(articleService.createArticle(...));
} finally {
    redisUtil.unlock(lockKey, lockValue);
}
```

### 3.5 Redisson 的看门狗（进阶）

```
lock.lock() 默认 30s 过期，但看门狗每 10s 自动续期一次
→ 只要业务没跑完，锁就不会过期
→ 彻底解决「业务执行时间 > 锁过期时间」的问题
```

---

## 四、过期策略与内存淘汰策略

### 4.1 过期策略（key 怎么被删除的）

| 策略 | 机制 | 优缺点 |
|------|------|--------|
| **定时删除** | 到期立刻删 | 及时但耗 CPU（每个 key 一个定时器，不现实） |
| **惰性删除** | 访问时发现过期才删 | 省 CPU 但过期 key 一直占内存 |
| **定期删除** | 周期扫描随机抽 key 删 | ⭐ Redis 实际采用：惰性删除 + 定期删除结合 |

### 4.2 内存淘汰策略（内存满了怎么办）

| 策略 | 含义 | 适用场景 |
|------|------|---------|
| `noeviction` | 不淘汰，写报错（默认） | 不推荐生产 |
| `allkeys-lru` | 所有 key 按 LRU 淘汰 | 通用缓存 |
| `volatile-lru` | 仅设了 TTL 的 key 按 LRU 淘汰 | 缓存为主 |
| `allkeys-lfu` | 按访问频率淘汰 | 热点集中场景 |
| `volatile-lfu` | 仅设 TTL 的按 LFU 淘汰 | 热点集中 |
| `volatile-ttl` | 淘汰剩余 TTL 最短的 | 少用 |

**LRU vs LFU**：LRU 按"最近没被用"淘汰（适合一次性热点），LFU 按"用得少"淘汰（适合长期稳定热点）。Redis 4.0 起默认方向是 LFU。

### 4.3 项目中的对应设计

- 所有缓存都设了 TTL（600s / 1800s / 300s），就是给 `volatile-*` 策略留空间；
- 随机过期时间（30-40 分钟）本质就是「定期删除 + 淘汰策略」的补充——从源头避免同时过期。

---

## 五、布隆过滤器原理（✅ 已在项目落地：BloomFilterUtil + RedissonConfig + BloomFilterController）

### 5.1 核心思想

**一个位数组 + K 个哈希函数**，用来回答「一个元素**可能**存在 / **一定**不存在」。

```
添加 id=5：hash1(5)→位3, hash2(5)→位7, hash3(5)→位9  → 把这三个位置 1
查询 id=5：算三个位置，只要有一个是 0 → 一定不存在（直接拦截，不查 DB）
         三个位置全是 1    → 可能存在（还要查 DB 确认）
```

### 5.2 关键结论

- ✅ **一定不存在**：位数组全是 1 才放行，所以不存在的一定被拦下 → **防穿透的终极方案**
- ❌ **可能误判**：不同元素哈希后可能落在同一批位上 → 有误判率（把不存在的放过去了）
- ❌ **不能删除**：位是共享的，删一个元素可能误伤其他元素 → 需要计数布隆过滤器才能删

### 5.3 误判率公式

```
误判率 p ≈ (1 - e^(-kn/m))^k
k = 哈希函数个数，m = 位数组长度，n = 预期插入数量
Redisson 的 tryInit(10000L, 0.01) 就是「预期 1 万条，误判率 1%」
```

### 5.4 项目接入方案（下周一的改造任务）

```java
// 1. pom.xml 加依赖
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson-spring-boot-starter</artifactId>
    <version>3.27.0</version>
</dependency>

// 2. 创建文章时：bloomFilter.add(article.getId());
// 3. 查文章时：
if (!bloomFilterUtil.mightContain(id)) {
    throw new RuntimeException("文章不存在");  // 直接拦截，不进 DB
}
```

---

## 六、项目 Redis 架构总览（一图总结）

```
                    ┌──────────────────────────────────┐
                    │            Redis 缓存层            │
                    ├──────────────────────────────────┤
                    │  article:list          列表(600s) │
                    │  article:list:page:*   分页(600s) │
                    │  article:detail:*      详情(1800s)│
                    │  article:ranking:*     排行(300s) │
                    │  notice:list           公告(600s) │
                    │  site_config           站点配置    │
                    │  article:create:lock:*  分布式锁   │
                    └──────────────────────────────────┘
                              │ 读写
                    ┌─────────▼─────────┐
                    │   Spring Boot     │
                    │  (RedisTemplate)  │
                    └──────────────────┘
```

---

## 七、Phase 1 面试自测（10 题 Q&A）

**Q1：Redis 为什么快？**
A：① 纯内存操作，数据都在内存里；② 单线程模型，避免了多线程上下文切换和锁竞争（IO 多路复用处理网络请求）；③ 高效的数据结构（SDS、跳表、quicklist 等）；④ 非阻塞 IO（epoll）。

**Q2：String 底层 SDS 和 C 字符串的区别？**
A：① SDS 有 `len` 字段，O(1) 获取长度，C 字符串要遍历 O(n)；② SDS 拼接时自动检查空间，杜绝缓冲区溢出；③ SDS 以二进制安全方式存储（可含 `\0`），C 字符串以 `\0` 结尾判断结束；④ SDS 有 `free` 字段，通过空间预分配和惰性释放减少内存分配次数。

**Q3：ZSet 为什么用跳表不用红黑树？**
A：① 跳表实现更简单、易读、易调试；② 范围查询方便，跳表按序排列可快速定位区间（`ZRANGE`）；③ 跳表的插入/删除/查找都是 O(log n)，与红黑树同级；④ Redis 作者 Antirez 明确表示跳表代码更少、更直观。

**Q4：缓存穿透/击穿/雪崩分别是什么？各自解决方案？**
A：穿透 = 查不存在的数据，方案：缓存空值、布隆过滤器、参数校验；击穿 = 热点 key 过期瞬间大量请求，方案：互斥锁、逻辑过期、热点预热；雪崩 = 大量 key 同时过期或 Redis 宕机，方案：随机过期时间、多级缓存、集群 + 熔断降级。

**Q5：分布式锁释放为什么要用 Lua 脚本？**
A：释放锁需要「先比对 value 再删除」两步，非原子操作时可能出现：线程 A 业务超时锁已过期 → 线程 B 拿到锁 → A 执行 DEL 误删 B 的锁。Lua 脚本把 get 比对 + del 合并为一步，Redis 单线程执行脚本期间不插入其他命令，保证原子性。

**Q6：Redisson 看门狗解决了什么问题？**
A：解决「业务执行时间 > 锁过期时间」导致锁提前失效的问题。`lock.lock()` 默认 30s 过期，看门狗每 10s 自动续期一次，业务没跑完锁就不会过期；释放锁后看门狗自动停止。

**Q7：Redis 过期策略是哪两种结合？**
A：惰性删除 + 定期删除。惰性删除 = 访问 key 时才检查是否过期并删除（省 CPU 但占内存）；定期删除 = 周期性随机抽样检查并删除过期 key（均衡 CPU 和内存）。Redis 不用纯定时删除，因为每个 key 建定时器太耗 CPU。

**Q8：`allkeys-lru` 和 `volatile-lru` 区别？**
A：`allkeys-lru` 对所有 key（含没设 TTL 的）按 LRU 淘汰；`volatile-lru` 只对设了 TTL 的 key 按 LRU 淘汰，没设 TTL 的永远不淘汰。项目里所有缓存都设了 TTL，所以两种策略都能工作，`volatile-lru` 更安全（不会误伤持久化数据）。

**Q9：布隆过滤器为什么不能删除元素？误判率怎么降？**
A：布隆过滤器的位是多个元素共享的，删除一个元素把对应位清 0 可能误伤其他元素。降低误判率：增加位数组长度 m、增加哈希函数个数 k、控制预期插入量 n（误判率 p ≈ (1 - e^(-kn/m))^k）。

**Q10：你们项目缓存是怎么保证写后一致性的？**
A：增删改操作后调用 `clearRelatedCaches` 删除相关缓存：文章详情 key、列表 key、所有分页缓存（`article:list:page:*` 模糊删除）、分类总数缓存、排行缓存，下次查询时重新从 DB 加载写入缓存。采用「Cache Aside 旁路缓存」模式：先更新 DB，再删缓存。

---

## 八、Phase 1 完成清单（✅ 全部完成）

| 任务 | 状态 | 落地代码 |
|------|------|---------|
| 集成布隆过滤器（Redisson） | ✅ | `RedissonConfig` + `BloomFilterUtil` + `BloomFilterController` |
| 缓存 key 统一 `blog:` 前缀 | ✅ | 文章/公告/站点配置/布隆/锁，全部 `blog:*` |
| 阅读量 Redis 计数 + 定时同步 DB | ✅ | `incrementViewCount` + `@Scheduled` 每 10 分钟同步 |
| 评论删除 bug | ❌ 仍未修复 | `CommentServiceImpl.deleteComment` L36 |

---

*Phase 1（第 1-2 周）完成度：核心功能 ✅（缓存三问题、分布式锁、分页缓存） + 全部待办 ✅（布隆过滤器、key 前缀、阅读量计数）*
