---
title: "第 6 步：Controller 端点 —— 登出/踢人/恢复接口"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战", 第 6 步：Controller 端点 —— 登出/踢人/恢复接口, blog-dev]
summary: "提供三个 RESTful 端点，覆盖所有踢下线场景：用户自己登出（单 Token 失效）、管理员踢人（全 Token 失效）、管理员恢复（解除封禁）。"
private: false
---

## 第 6 步：Controller 端点 —— 登出/踢人/恢复接口

### 思路

提供三个 RESTful 端点，覆盖所有踢下线场景：用户自己登出（单 Token 失效）、管理员踢人（全 Token 失效）、管理员恢复（解除封禁）。

### 修改代码

**文件**：`UserController.java`

```java
// 登出：当前 token 加入黑名单（TTL = token 剩余时间）
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

// 管理员踢人：DB + Redis 双写（先 DB 后 Redis）
@PreAuthorize("hasRole('ADMIN')")
@PostMapping("/admin/kick/{userId}")
public Result<String> kickUser(@PathVariable Long userId) {
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
    // 第一步：DB 落地（真相源）
    user.setEnabled(false);
    userRepository.save(user);
    // 第二步：写入 Redis（加速缓存）
    try {
        redisUtil.set(USER_DISABLED_KEY + userId, "1");
    } catch (Exception e) {
        log.error("Redis 写入禁用标记失败，启动时将自动恢复", userId, e);
    }
    return Result.success("用户已下线");
}

// 管理员恢复账号：DB + Redis 双删
@PreAuthorize("hasRole('ADMIN')")
@PostMapping("/admin/enable/{userId}")
public Result<String> enableUser(@PathVariable Long userId) {
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
    user.setEnabled(true);
    userRepository.save(user);
    redisUtil.del(USER_DISABLED_KEY + userId);
    return Result.success("账号已恢复");
}
```

### 三种踢下线场景的完整链路

```
┌─ 场景 A：用户自己登出 ──────────────────────────────────────┐
│  1. 前端调用 POST /api/user/logout                          │
│  2. 后端取 jti，计算剩余时间                                │
│  3. Redis SET blog:jwt:blacklist:{jti} TTL=剩余时间         │
│  4. 前端删除 localStorage 中的 token                        │
│  → 该 Token 在黑名单过期前无法使用                          │
└──────────────────────────────────────────────────────────┘

┌─ 场景 B：管理员踢人 ─────────────────────────────────────────┐
│  1. 管理员调用 POST /api/user/admin/kick/123                │
│  2. DB: UPDATE user SET enabled=0 WHERE id=123              │
│  3. Redis: SET blog:user:disabled:123 = "1"                 │
│  → 用户 123 的所有 Token 立刻失效                            │
│  → 即使 Redis 宕机，启动时从 DB 恢复                          │
└──────────────────────────────────────────────────────────┘

┌─ 场景 C：管理员恢复账号 ──────────────────────────────────────┐
│  1. 管理员调用 POST /api/user/admin/enable/123              │
│  2. DB: UPDATE user SET enabled=1 WHERE id=123              │
│  3. Redis: DEL blog:user:disabled:123                       │
│  → 用户 123 重新登录后即可正常访问                           │
└──────────────────────────────────────────────────────────┘
```

---
