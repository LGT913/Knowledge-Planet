---
title: "第 5 步：Filter 鉴权链路 —— 两层检查 + 降级兜底"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战", 第 5 步：Filter 鉴权链路 —— 两层检查 + 降级兜底, blog-dev]
summary: "Filter 每次请求执行两层检查，Redis 不可用时降级查 DB，保证鉴权链路不因 Redis 宕机而全链路崩溃。"
private: false
---

## 第 5 步：Filter 鉴权链路 —— 两层检查 + 降级兜底

### 思路

Filter 每次请求执行两层检查，Redis 不可用时降级查 DB，保证鉴权链路不因 Redis 宕机而全链路崩溃。

### 完整流程图

```
请求到达 JwtAuthenticationFilter
       │
       ▼
┌──────────────────────────────┐
│ ① 提取 Token（处理 Bearer）  │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ ② Token 为 null？            │
│  └─ 是 → 放行（匿名访问）     │
│  └─ 否 → 继续                │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ ③ validateToken 签名校验     │
│  └─ 失败 → clearContext 放行 │
│  └─ 成功 → 解析 jti/userId  │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ ④ 黑名单检查（jti）          │
│  └─ 在黑名单 → 拒绝          │
│  └─ 不在 → 继续              │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ ⑤ 禁用状态检查              │
│  └─ Redis hasKey             │
│      ├─ true → 拒绝          │
│      ├─ false → 放行         │
│      └─ Redis 宕机 →         │
│         降级查 DB enabled     │
│          ├─ false → 拒绝     │
│          └─ true → 放行      │
└─────────────┬────────────────┘
              │
              ▼
     设置 SecurityContext → 放行
```

### 核心代码

**文件**：`JwtAuthenticationFilter.java`

```java
// 第 1 层检查：Token 黑名单（用 jti，零碰撞）
if (Boolean.TRUE.equals(redisUtil.hasKey(TOKEN_BLACKLIST_KEY + jti))) {
    SecurityContextHolder.clearContext();
    filterChain.doFilter(request, response);
    return;
}

// 第 2 层检查：用户禁用标记（Redis + DB 降级兜底）
if (isUserDisabled(userId)) {
    SecurityContextHolder.clearContext();
    filterChain.doFilter(request, response);
    return;
}
```

**降级方法**：

```java
private boolean isUserDisabled(Long userId) {
    try {
        // 正常路径：查 Redis，0.1ms
        return Boolean.TRUE.equals(redisUtil.hasKey(USER_DISABLED_KEY + userId));
    } catch (RedisConnectionFailureException e) {
        // Redis 宕机降级：临时查 DB enabled 字段兜底
        Optional<User> userOpt = userRepository.findById(userId);
        return userOpt.map(u -> !u.getEnabled()).orElse(true);
    } catch (DataAccessException e) {
        // Redis 和 DB 都不可用 → 保守策略：拒绝
        return true;
    }
}
```

### 降级策略设计

| 场景 | 行为 | 合理性 |
|------|------|--------|
| Redis 正常 | 查 Redis（0.1ms） | 正常路径，高性能 |
| Redis 宕机 | 降级查 DB（~5ms） | 保证鉴权不中断，临时降速 |
| Redis + DB 都宕机 | 保守拒绝（返回 true） | 安全优先，避免绕过权限检查 |

---
