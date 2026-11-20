---
title: "第 1 步：JWT 标准字段 jti —— 黑名单的原子标识"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战", 第 1 步：JWT 标准字段 jti —— 黑名单的原子标识, blog-dev]
summary: "JWT 规范中定义了 jti（JWT ID）标准字段，用于为每个 Token 分配全局唯一标识。黑名单的 key 应该使用这个标识，而不是截取 Token 字符串的一部分。"
private: false
---

## 第 1 步：JWT 标准字段 jti —— 黑名单的原子标识

### 思路

JWT 规范中定义了 `jti`（JWT ID）标准字段，用于为每个 Token 分配全局唯一标识。黑名单的 key 应该使用这个标识，而不是截取 Token 字符串的一部分。

**为什么用 jti 而不是 token.substring(0,12)？**

```
┌─ token.substring(0,12) ─────────────────────────────────┐
│  Token_A = "eyJhbGciOiJI..._abc123def456"  → "eyJhbGc"  │
│  Token_B = "eyJhbGciOiJI..._abc123def789"  → "eyJhbGc"  │
│  → 前 12 位相同！Token_A 登出，Token_B 被误封！         │
│  → 哈希碰撞，安全漏洞                                     │
└────────────────────────────────────────────────────────┘

┌─ jti（UUID）─────────────────────────────────────────────┐
│  Token_A 的 jti = "550e8400-e29b-41d4-a716-446655440000" │
│  Token_B 的 jti = "6ba7b810-9dad-11d1-80b4-00c04fd430c8" │
│  → UUID 全局唯一，零碰撞                                   │
└────────────────────────────────────────────────────────┘
```

### 修改代码

**文件**：`JwtUtil.java`

```java
public String generateToken(Long userId, String role) {
    return Jwts.builder()
            .subject(userId.toString())
            .claim("role", role)
            .id(UUID.randomUUID().toString())          // ← 新增：jti
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationTime))
            .signWith(key)
            .compact();
}

// 从 token 提取 jti（黑名单 key 用）
public String getJtiFromToken(String token) {
    Claims claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    return claims.getId();
}

// token 剩余有效时间（秒），用于设置黑名单 TTL
public long getRemainingSeconds(String token) {
    try {
        Claims claims = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
        long diff = claims.getExpiration().getTime() - System.currentTimeMillis();
        return diff > 0 ? diff / 1000 : 0;
    } catch (Exception e) {
        return 0;
    }
}
```

### 关键设计

| 设计点 | 说明 |
|--------|------|
| jti = UUID | 128 位随机 UUID，碰撞概率极低（~1/2^122），可忽略 |
| getRemainingSeconds | 计算 Token 剩余有效期，用于黑名单 TTL，到期自动清除 |
| 向后兼容 | 旧 Token 没有 jti，但改造后新签发的 Token 都有，无需处理旧 Token |

---
