---
title: "Redis 过期策略+内存淘汰策略，给缓存 key 加统一前缀和随机过期"
date: 2026-07-28
planet: blog-dev
tags: ["后端", "实战"]
summary: "看 ArticleServiceImpl.java："
private: false
---
# Redis 过期策略+内存淘汰策略，给缓存 key 加统一前缀和随机过期

### 1️⃣ 随机过期：✅ 已实现，而且做得比计划更好

看 ArticleServiceImpl.java：

```java
private static final java.util.Random RANDOM = new java.util.Random();  // L48
```

各处缓存都加了随机值：

| 缓存类型 | 基础过期      | 随机范围 | 实际过期区间 |
| :------- | :------------ | :------- | :----------- |
| 文章列表 | 600s (10min)  | +0~120s  | 10~12 分钟   |
| 文章详情 | 1800s (30min) | +0~300s  | 30~35 分钟   |
| 阅读排行 | 300s (5min)   | +0~60s   | 5~6 分钟     |
| 最新排行 | 300s (5min)   | +0~60s   | 5~6 分钟     |

**比计划更好的地方**：

- 不同类型缓存设置了**不同的随机范围**（不是统一 600s），更贴合各缓存的业务特性
- 用了 `static final RANDOM` 而不是每次 new，性能更好

### 一：缓存 key 统一前缀 `blog:`

```
修改前（各自为政）                    修改后（统一规范）
┌──────────────────────┐          ┌──────────────────────────┐
│ article:list         │          │ blog:article:list        │
│ article:detail:      │   ──►    │ blog:article:detail:     │
│ article:lock:        │          │ blog:article:lock:       │
│ article:bloom        │          │ blog:article:bloom       │
│ article:create:lock: │          │ blog:article:create:lock:│
│ site:config          │          │ blog:site:config:        │
│ notice:list          │          │ blog:notice:list         │
└──────────────────────┘          └──────────────────────────┘
```

| 文件                       | 修改内容                                              |
| :------------------------- | :---------------------------------------------------- |
| ArticleServiceImpl.java    | 新增 `ARTICLE_LOCK_KEY` 常量，L173 引用改为常量       |
| ArticleController.java     | 创建文章锁 key 加 `blog:` 前缀                        |
| BloomFilterUtil.java       | 布隆过滤器 key 加 `blog:` 前缀                        |
| SiteConfigServiceImpl.java | key 加前缀 + **修复 M3 Bug**（按 configKey 区分缓存） |
| NoticeServiceImpl.java     | 公告列表 key 加 `blog:` 前缀                          |

### 二：Random → ThreadLocalRandom

| 文件                                                         | 修改内容                                                     |
| :----------------------------------------------------------- | :----------------------------------------------------------- |
| [ArticleServiceImpl.java](file:///C:/Users/lenovo/Desktop/blog/blog/src/main/java/com/blog/blog/service/impl/ArticleServiceImpl.java#L19) | 删除 `static final Random`，改用 `ThreadLocalRandom.current()` |

```java
// 修改前（CAS 竞争）
private static final java.util.Random RANDOM = new java.util.Random();
ARTICLE_DETAIL_EXPIRE + RANDOM.nextInt(300);

// 修改后（无竞争，每个线程独立 seed）
ARTICLE_DETAIL_EXPIRE + ThreadLocalRandom.current().nextInt(300);
```

### 三、锁 key 提取为常量

```java
// 修改前：硬编码字符串散落在代码中
String lockKey = "article:lock:" + id;

// 修改后：统一常量管理
private static final String ARTICLE_LOCK_KEY = "blog:article:lock:";
String lockKey = ARTICLE_LOCK_KEY + id;
```

消除了魔法字符串，符合要求。

### 附带修复：SiteConfig 缓存覆盖 Bug（M3）

```
修改前：所有 configKey 共用一个 key          修改后：按 configKey 区分
┌─────────────────────────────────┐      ┌──────────────────────────────────┐
│ site:config                     │      │ blog:site:config:siteName        │
│ ← siteName 覆盖了 icp            │      │ blog:site:config:icp             │
│ ← 查 siteName 返回 icp 的数据    │       │ blog:site:config:copyright       │
└─────────────────────────────────┘      └──────────────────────────────────┘
```

### 优化 ArticleServiceImpl.java 不回填缓存的设计思路图示

```
重试 3 次没拿到锁时的缓存策略对比：

┌─ 错误做法（回填缓存）──────────────────────────┐
│  线程A（持锁）正在查库 → 还没写入缓存            │
│  线程B（重试失败）也查库 → 写入缓存              │
│  线程A 写入缓存 → 覆盖线程B的写入                │
│  → 两次数据库查询 + 并发写冲突                    │
└──────────────────────────────────────────────┘

┌─ 正确做法（不回填）────────────────────────────┐
│  线程A（持锁）查库 → 写入缓存（唯一写入者）       │
│  线程B（重试失败）查库 → 直接返回，不写缓存       │
│  → 线程A 是缓存唯一写入者，无并发冲突             │
│  → 下一个请求就能命中线程A回填的缓存了            │
└──────────────────────────────────────────────┘
```
