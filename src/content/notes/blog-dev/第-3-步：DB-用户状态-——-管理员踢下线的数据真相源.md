---
title: "第 3 步：DB 用户状态 —— 管理员踢下线的数据真相源"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战", 第 3 步：DB 用户状态 —— 管理员踢下线的数据真相源, blog-dev]
summary: "管理员踢人不能只写 Redis（Redis 宕机就丢失），必须落地到 DB。DB 作为数据真相源（Single Source of Truth），Redis 作为加速缓存。"
private: false
---

## 第 3 步：DB 用户状态 —— 管理员踢下线的数据真相源

### 思路

管理员踢人不能只写 Redis（Redis 宕机就丢失），必须落地到 DB。DB 作为数据真相源（Single Source of Truth），Redis 作为加速缓存。

**为什么需要 DB 落地？**

```
┌─ 只写 Redis（不安全）─────────────────────────────────┐
│  管理员踢人 → SET blog:user:disabled:123 = "1"         │
│  → Redis 宕机 → 内存清空 → 禁用标记丢失                 │
│  → 被封禁的用户自动恢复登录 → 安全漏洞                   │
└──────────────────────────────────────────────────────┘

┌─ DB + Redis 双写（安全）──────────────────────────────┐
│  管理员踢人 → ① UPDATE user SET enabled=0 WHERE id=123 │
│           → ② SET blog:user:disabled:123 = "1"        │
│  → Redis 宕机 → 启动时从 DB 重新加载                    │
│  → 被封禁的用户仍然被禁用 → 安全                        │
└──────────────────────────────────────────────────────┘
```

### 修改代码

**文件**：`User.java`

```java
@Column(nullable = false)
private Boolean enabled = true;  // 账号状态：DB 是数据真相源
```

**文件**：`UserRepository.java`

```java
@Query("SELECT u.id FROM User u WHERE u.enabled = false")
List<Long> findDisabledUserIds();  // 启动时预加载 Redis 用
```

### 关键设计

| 设计点 | 说明 |
|--------|------|
| enabled = true 默认值 | 注册时自动启用，不影响现有用户 |
| `@Column(nullable = false)` | 数据库约束，不允许为 NULL |
| findDisabledUserIds() | 只查 ID，不查全字段，效率高 |

---
