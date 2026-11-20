---
title: "Spring Boot 与分层架构"
date: 2026-07-09
planet: growth
tags: ["面试", "复习", 一、Spring Boot 与分层架构, growth]
summary: "问题本身：  问：Controller、Service、Mapper 各自应该负责什么？  追问：如果一个接口里同时有参数校验、权限判断、业务规则和数据库访问，你会怎么拆到这几层，为什么？  再追问：快递签收接口，权限校验和状态流转校验分别"
private: false
---

## 一、Spring Boot 与分层架构

### 问题 1：MVC 三层架构各层职责是什么？

**问题本身**：
> 问：Controller、Service、Mapper 各自应该负责什么？
> 追问：如果一个接口里同时有参数校验、权限判断、业务规则和数据库访问，你会怎么拆到这几层，为什么？
> 再追问：快递签收接口，权限校验和状态流转校验分别放哪层？
> 再追问：如果批量签收接口或定时任务也调用同一个签收 Service，怎么避免越权？

**为什么要这么做**：
- **职责单一**：每一层只做一件事，代码清晰易维护
- **解耦**：Controller 不关心业务怎么实现，Service 不关心数据怎么存
- **可复用**：Service 层的业务逻辑可以被多个 Controller 调用
- **可测试**：每一层都可以单独测试

**具体怎么做**：
1. **Controller 层**：处理 HTTP 请求/响应、参数校验、权限判断（谁能操作）、VO 转换
2. **Service 层**：业务逻辑、业务规则校验（怎么操作）、事务管理、调用 Mapper 组合 DB 操作、兜底权限校验
3. **Mapper 层**：基础 CRUD、SQL 编写，不做任何业务逻辑判断

**权限校验双层防护**：
- **Controller 层**：快速拦截（性能优化）——检查用户角色，未登录或越权直接返回错误
- **Service 层**：兜底校验（安全保障）——传入 userId + role，即使被定时任务或其他 Controller 调用，权限规则也统一

**项目实战**：
- 快递签收接口：Controller 检查当前用户是否是管理员或对应学生；Service 校验快递当前状态是否能被签收（只能从待取件→已签收）
- 登录接口：Controller 校验参数非空；Service 校验用户名密码正确；Mapper 执行 SQL 查询

**如何验证**：
1. 测试越权：用快递员账号尝试签收不属于自己的快递，验证返回"无权操作"
2. 测试状态非法：尝试签收已完成的快递，验证返回"快递已签收，不能重复操作"
3. 测试定时任务调用：写一个定时任务调用签收 Service，验证仍然校验权限

---

### 问题 2：SSM 和 Spring Boot 有什么区别？

**问题本身**：
> 问：你项目用的是 Spring Boot，那你了解 SSM 吗？它们有什么区别？

**为什么要这么做**：
- Spring Boot 是对 Spring 的封装，解决了 Spring 配置繁琐的问题
- 约定优于配置，减少样板代码，让开发者专注业务逻辑
- 内嵌 Tomcat，简化部署流程

**具体怎么做**：

| 对比项 | SSM | Spring Boot |
|--------|-----|-------------|
| 配置方式 | XML多（web.xml、applicationContext.xml等） | application.yml 一个文件搞定 |
| 部署方式 | 需外部Tomcat，打war包 | 内嵌Tomcat，打jar包直接运行 |
| 依赖管理 | 手动管理版本，容易冲突 | starter-parent 自动管理版本 |
| 启动速度 | 慢（加载多个XML） | 快（自动配置） |

**项目实战**：
- 项目用 Spring Boot 2.7.18 + MyBatis 2.3.0
- 通过 `spring-boot-starter-parent` 统一管理版本，`mybatis-spring-boot-starter` 整合 MyBatis
- 打包后直接 `java -jar express-manage.jar` 运行

**如何验证**：
1. 查看 pom.xml，确认 `spring-boot-starter-parent` 和相关 starter 依赖
2. 运行 `mvn package`，确认生成可执行 jar 包
3. 运行 `java -jar`，确认项目正常启动

---
