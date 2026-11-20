---
title: "第五步：Redis 缓存优化"
date: 2026-07-28
planet: blog-dev
tags: ["博客系统", "工程", 6. 第五步：Redis 缓存优化, blog-dev]
summary: "从「每次请求都查数据库」优化为「先查缓存，缓存没有再查数据库并回填」，同时解决缓存三大问题。"
private: false
---

## 6. 第五步：Redis 缓存优化

### 思路

从「每次请求都查数据库」优化为「先查缓存，缓存没有再查数据库并回填」，同时解决缓存三大问题。

### 缓存策略：Cache-Aside 模式

```
┌────────┐    ① 查询请求     ┌─────────┐
│ 客户端 │ ────────────────► │ Service │
└────────┘                   └────┬────┘
                                  │ ② 先查 Redis
                                  ▼
                           ┌─────────────┐
                           │    Redis     │
                           └──────┬──────┘
                          命中 ↓     │ 未命中
                          返回 ↓     ▼
                          缓存   ┌─────────┐
                          数据   │  MySQL   │
                                 └────┬────┘
                                      │ ③ 查数据库
                                      ▼
                                 ④ 写入 Redis（随机过期时间）
                                      │
                                      ▼
                                 ⑤ 返回数据
```

### 缓存三大问题解决方案

| 问题 | 场景 | 解决方案 | 代码体现 |
|------|------|----------|----------|
| **缓存穿透** | 查询不存在的数据，绕过缓存直接打数据库 | 布隆过滤器 + 空值缓存 | `BloomFilterUtil.mightContain()` + `redisUtil.set(key, "NULL", 300)` |
| **缓存击穿** | 热点 key 过期瞬间，大量请求同时打到数据库 | 分布式锁 + 双重检查（DCL） | `redisUtil.tryLock()` + 二次查缓存 |
| **缓存雪崩** | 大量 key 同时过期 | 随机过期时间 | `3600 + random.nextInt(1800)` |

### 缓存击穿的 DCL（Double-Check Locking）流程

```
┌──────────┐
│  请求进来 │
└─────┬────┘
      ▼
┌──────────────┐     命中      ┌─────────┐
│ ① 查 Redis   │ ──────────────► │ 返回缓存 │
└──────┬───────┘                └─────────┘
       │ 未命中
       ▼
┌──────────────┐     获取失败   ┌──────────────┐
│ ② 获取分布式锁 │ ──────────────► │ 等待重试/返回  │
└──────┬───────┘                └──────────────┘
       │ 获取成功
       ▼
┌──────────────┐     命中      ┌─────────┐
│ ③ 再次查 Redis │ ──────────────► │ 返回缓存 │  ← DCL 核心
└──────┬───────┘                └─────────┘
       │ 未命中
       ▼
┌──────────────┐
│ ④ 查 MySQL    │
│ ⑤ 写入 Redis  │
│ ⑥ 释放锁      │
└──────────────┘
```

### 关键代码 — ArticleServiceImpl.getArticle

```java
public Article getArticle(Long id) {
    // 第一层防护：布隆过滤器
    if (!bloomFilterUtil.mightContain(id)) {
        throw new RuntimeException("文章不存在");
    }

    String key = "article:" + id;

    // 第一次查缓存
    String cached = redisUtil.get(key);
    if (cached != null) {
        if ("NULL".equals(cached)) return null;  // 空值缓存
        return JSON.parseObject(cached, Article.class);
    }

    // 缓存未命中 → 获取分布式锁
    String lockKey = "lock:article:" + id;
    String lockValue = UUID.randomUUID().toString();
    boolean locked = redisUtil.tryLock(lockKey, lockValue, 30);

    if (!locked) {
        // 没拿到锁，短暂等待后重试
        try { Thread.sleep(100); } catch (InterruptedException e) { }
        return getArticle(id);
    }

    try {
        // DCL：拿到锁后再查一次缓存
        cached = redisUtil.get(key);
        if (cached != null) {
            if ("NULL".equals(cached)) return null;
            return JSON.parseObject(cached, Article.class);
        }

        // 查数据库
        Article article = articleRepository.findById(id).orElse(null);

        if (article != null) {
            // 随机过期时间，防止雪崩
            int expire = 3600 + new Random().nextInt(1800);
            redisUtil.set(key, JSON.toJSONString(article), expire);
        } else {
            // 空值缓存，防止穿透
            redisUtil.set(key, "NULL", 300);
        }
        return article;
    } finally {
        redisUtil.unlock(lockKey, lockValue);
    }
}
```

### 优化经验

| 问题 | 优化方式 |
|------|----------|
| 高并发下缓存击穿 | 分布式锁 + DCL，只让一个请求查数据库 |
| 大量 key 同时过期 | 过期时间加随机值 `3600 + random(1800)` |
| 恶意查询不存在的 ID | 布隆过滤器前置拦截 + 空值缓存兜底 |
| 分布式锁死锁 | 用 `try-finally` 保证锁释放，锁值用 UUID 防误删 |

---
