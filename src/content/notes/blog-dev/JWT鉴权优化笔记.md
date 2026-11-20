---
title: "JWT 鉴权优化笔记"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战"]
summary: "博客项目原本的 JWT 鉴权存在无状态认证的致命缺陷：无法踢下线、无法登出、无法禁用用户。本次优化从零到一实现了中厂标准的企业级鉴权体系，核心思路是引入 Redis 黑名单 + DB 用户状态兜底，在保持无状态认证高性能的同时，补全了\"令行"
private: false
---

# JWT 鉴权优化笔记

## JWT 鉴权优化笔记 · 章节

- [第 1 步：JWT 标准字段 jti —— 黑名单的原子标识](/planet/blog-dev/第-1-步：JWT-标准字段-jti-——-黑名单的原子标识)
- [第 2 步：Redis 黑名单 —— 登出/密码修改后封禁 Token](/planet/blog-dev/第-2-步：Redis-黑名单-——-登出-密码修改后封禁-Token)
- [第 3 步：DB 用户状态 —— 管理员踢下线的数据真相源](/planet/blog-dev/第-3-步：DB-用户状态-——-管理员踢下线的数据真相源)
- [第 4 步：启动预加载 —— Redis 宕机后的自动恢复](/planet/blog-dev/第-4-步：启动预加载-——-Redis-宕机后的自动恢复)
- [第 5 步：Filter 鉴权链路 —— 两层检查 + 降级兜底](/planet/blog-dev/第-5-步：Filter-鉴权链路-——-两层检查-降级兜底)
- [第 6 步：Controller 端点 —— 登出/踢人/恢复接口](/planet/blog-dev/第-6-步：Controller-端点-——-登出-踢人-恢复接口)
- [遇到问题与修复](/planet/blog-dev/遇到问题与修复)
- [与大厂双 Token 方案的对比](/planet/blog-dev/与大厂双-Token-方案的对比)
