---
title: "后端："
date: 2026-07-26
planet: blog-dev
tags: ["后端", "实战"]
summary: ""
private: false
---
# 后端：

- #### 企业级项目的标准包结构

```
com.blog.blog/
├── common/           ← 基础设施（工具、配置、通用组件）
├── config/           ← 配置类
├── controller/       ← 控制器层（接收请求）
├── service/          ← 业务层
├── repository/       ← 数据访问层
├── entity/           ← 数据库实体
├── dto/              ← 数据传输对象（层与层之间传递）
└── vo/               ← 视图对象（返回给前端的数据结构）
```
