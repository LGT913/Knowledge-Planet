---
title: "第 2 步：Redis 黑名单 —— 登出/密码修改后封禁 Token"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战", 第 2 步：Redis 黑名单 —— 登出/密码修改后封禁 Token, blog-dev]
summary: "用户登出时，将当前 Token 的 jti 加入 Redis 黑名单，TTL = Token 剩余过期时间。每次请求在 Filter 中检查该 Token 的 jti 是否在黑名单中。"
private: false
---

## 第 2 步：Redis 黑名单 —— 登出/密码修改后封禁 Token

### 思路

用户登出时，将当前 Token 的 jti 加入 Redis 黑名单，TTL = Token 剩余过期时间。每次请求在 Filter 中检查该 Token 的 jti 是否在黑名单中。

**为什么黑名单需要 TTL？**

```
不设 TTL：                          设 TTL（剩余过期时间）：
┌────────────────────────────┐     ┌──────────────────────────────┐
│ 登出 → SET blacklist:jti   │     │ 登出 → SET blacklist:jti     │
│ 24h 后 Token 自然过期       │     │        TTL = 23:50:00       │
│ Redis 里这条 key 永远在     │     │ 23:50:00 后 key 自动删除     │
│ → 内存泄漏                  │     │ → 内存自动回收               │
└────────────────────────────┘     └──────────────────────────────┘
```

### 关键代码

**文件**：`UserController.java`

```java
@PostMapping("/logout")
public Result<String> logout(@RequestHeader("Authorization") String authHeader) {
    String token = authHeader;
    if (token != null && token.startsWith("Bearer ")) {
        token = token.substring(7).trim();
    }
    String jti = jwtUtil.getJtiFromToken(token);
    long remainSeconds = jwtUtil.getRemainingSeconds(token);
    if (remainSeconds > 0) {
        redisUtil.set(TOKEN_BLACKLIST_KEY + jti, "1", remainSeconds);
    }
    return Result.success("登出成功");
}
```

### 关键设计

| 设计点 | 说明 |
|--------|------|
| key = `blog:jwt:blacklist:{jti}` | 带项目前缀，多项目共用 Redis 不冲突 |
| value = `"1"` | 值不重要，只看 key 是否存在 |
| TTL = Token 剩余时间 | 到期自动清除，不占永久空间 |

---
