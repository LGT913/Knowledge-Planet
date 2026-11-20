---
title: "Java & Spring 框架"
date: 2026-07-09
planet: growth
tags: ["面试", "复习", 1. Java & Spring 框架, growth]
summary: "项目应用：Spring Boot 2.7.18 + MyBatis 2.3.0，通过 spring-boot-starter-parent 统一版本，mybatis-spring-boot-starter 整合 MyBatis。"
private: false
---

## 1. Java & Spring 框架

### 1.1 SSM vs Spring Boot

| 对比项 | SSM | Spring Boot |
|--------|-----|-------------|
| 配置方式 | XML多（web.xml、applicationContext.xml等） | 约定优于配置，application.yml 搞定 |
| 部署方式 | 需外部Tomcat，打war包 | 内嵌Tomcat，打jar包直接运行 |
| 依赖管理 | 手动管理版本，容易冲突 | starter-parent 自动管理 |
| 启动速度 | 慢 | 快（自动配置） |

**项目应用**：Spring Boot 2.7.18 + MyBatis 2.3.0，通过 `spring-boot-starter-parent` 统一版本，`mybatis-spring-boot-starter` 整合 MyBatis。

### 1.2 MVC 三层架构职责划分

- **Controller**：HTTP 请求/响应、参数校验、权限判断（谁能操作）、VO 转换
- **Service**：业务逻辑、业务规则校验（怎么操作）、事务管理、调用 Mapper 组合 DB 操作
- **Mapper**：基础 CRUD、SQL 编写，不做业务逻辑

**拆分原则**：职责单一、解耦、可复用、可测试。

> ⚠️ **易忘点**：权限判断双层防护 — Controller 快速拦截（性能优化）+ Service 兜底校验（安全保障），防止绕过 Controller 直接调用 Service。

### 1.3 权限校验 vs 状态流转校验（放哪层？）

**面试问题**：快递签收接口，权限校验和状态流转校验分别放哪层？

- **权限校验 → Controller**：判断"谁能操作"，未登录或越权直接拦截
- **状态流转校验 → Service**：判断"怎么操作"，校验当前状态能否被签收

**追问：批量签收或定时任务调用 Service，怎么避免越权？**

> Service 层也要做权限校验（传入 userId + role），作为兜底防护。不管从哪个入口调用，权限规则统一。

**追问：同一个快递被学生和管理员同时签收，怎么保证不重复？**

> UPDATE 语句加状态条件：`UPDATE express SET status=2 WHERE id=? AND status=1`，利用数据库原子性保证只有一个请求成功。返回受影响行数，0 表示已被他人签收。

### 1.4 事务失效场景

项目未使用 `@Transactional`，但要知道失效场景：
- 方法访问权限非 `public`
- 类未被 Spring 容器管理
- 同类方法自调用（`this.method()`）
- 异常被 `catch` 吞掉

---

## 2. MyBatis ORM

### 2.1 #{} vs ${} 区别（⚠️ 高频）

| 对比项 | #{} | ${} |
|--------|-----|-----|
| 处理方式 | **预编译**（PreparedStatement） | **字符串拼接** |
| SQL注入 | ❌ 无（安全） | ✅ 有注入风险 |
| 适用场景 | 参数传递（WHERE条件值） | 动态表名、排序字段 |
| 底层 | `?` 占位符 | 直接替换到SQL中 |

**项目应用**：所有参数用 `#{}`，排序字段用 `${}` 但后端写死枚举值（如 `ORDER BY create_time DESC`），不存在注入风险。

### 2.2 resultType vs resultMap

- **resultType**：自动映射，要求数据库列名和 Java 字段名一致（或通过 `map-underscore-to-camel-case=true` 自动转驼峰）
- **resultMap**：手动映射，用于列名和字段名不一致、或一对一/一对多关联查询

**项目应用**：项目开启 `map-underscore-to-camel-case: true`，大部分用 resultType 自动映射即可。复杂关联查询才用 resultMap。

---

## 3. 安全与认证

### 3.1 BCrypt vs MD5（⚠️ 高频）

| 对比项 | MD5 | BCrypt |
|--------|-----|--------|
| 运算速度 | 极快（CPU每秒几亿次） | 可调慢（工作因子控制到几百毫秒） |
| 盐值 | 不自带，需手动加盐 | **自带盐值**，每次加密结果不同 |
| 彩虹表 | 容易被攻破 | 盐值不同，彩虹表失效 |
| 暴力破解 | 成本低 | 成本极高（几百年） |
| 官方推荐 | ❌ 不推荐 | ✅ Spring 官方推荐 |

**面试话术**：MD5运算太快，抗暴力破解差，且不自带盐值，容易被彩虹表攻破。BCrypt自带盐值，彩虹表失效；工作因子可调慢到几百毫秒，用户无感知但暴力破解成本极高。Spring官方推荐BCrypt。

**项目应用**：注册时 `PasswordEncoder.encode(password)` 加密入库，登录时 `PasswordEncoder.matches(password, user.getPassword())` 验证。项目用 `spring-boot-starter-security` 提供的 BCrypt。

### 3.2 Session vs JWT

| 对比项 | Session | JWT |
|--------|---------|-----|
| 存储位置 | 服务端内存/Redis | 客户端（Token） |
| 适用架构 | 单体架构 | 分布式/微服务 |
| 扩展性 | 难（需Session共享） | 易（无状态） |
| 安全性 | 服务端存储，较安全 | Token泄露风险，需HTTPS |

**项目应用**：项目用 HttpSession，单体架构足够。如果后续做分布式部署，会切换到 JWT。

### 3.3 VO 脱敏（⚠️ 易忘）

**问题**：登录成功直接返回 User 对象，password 和 phone 暴露给前端。

**解决**：用 UserVO 过滤敏感字段，只返回 id、username、role、roleName、statusName 等。项目已有 `convertToUserVO()` 方法，但登录接口未使用，需优化。

> ⚠️ **易忘点**：加密后的密码也不应该返回前端！用 VO 过滤，而不是 `@JsonIgnore`（后者会影响全局，不够灵活）。

---
