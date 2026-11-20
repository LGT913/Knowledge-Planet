---
title: "第一步：基础 CRUD 搭建"
date: 2026-07-28
planet: blog-dev
tags: ["博客系统", "工程", 2. 第一步：基础 CRUD 搭建, blog-dev]
summary: "从最简单的 CRUD 开始，用 Spring Data JPA 自动生成 SQL，快速搭建数据模型和接口。"
private: false
---

## 2. 第一步：基础 CRUD 搭建

### 思路

从最简单的 CRUD 开始，用 Spring Data JPA 自动生成 SQL，快速搭建数据模型和接口。

### 实体模型

```java
@Entity
@Table(name = "user")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nickname;

    @Column(nullable = false)
    private LocalDateTime createTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    public enum Role { USER, ADMIN }
}
```

### Repository 层

```java
public interface ArticleRepository extends JpaRepository<Article, Long> {
    // Spring Data JPA 自动生成 SQL
    List<Article> findByUserId(Long userId);
    Page<Article> findByCategoryId(Long categoryId, Pageable pageable);

    // 自定义 JPQL 查询
    @Query("SELECT a FROM Article a WHERE " +
           "(:categoryId IS NULL OR a.categoryId = :categoryId) AND " +
           "(:keyword IS NULL OR a.title LIKE %:keyword%)")  
    Page<Article> findByFilter(@Param("categoryId") Long categoryId,
                               @Param("keyword") String keyword,
                               Pageable pageable);
}
```

### 优化经验

| 问题 | 优化方式 |
|------|----------|
| 分页查询全表扫描 | 用 Spring Data 的 `Pageable` 实现，JPA 自动加 `LIMIT` |
| 按分类+关键词组合查询 | 用 `@Query` 写 JPQL，避免写多个查询方法 |
| 密码明文存储 | 引入 BCrypt 加密 |

---
