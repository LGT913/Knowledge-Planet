---
title: "WebSocket 实时推送通知 — 实现笔记"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战"]
summary: "博客评论功能的问题：用户 A 对文章发表评论后，文章作者 B 和其他读者 C 无法实时看到新评论，必须手动刷新页面。引入 WebSocket 后，任何在文章详情页的用户都能实时收到新评论通知。"
private: false
---

# WebSocket 实时推送通知 — 实现笔记

## WebSocket 实时推送通知 — 实现笔记 · 章节

- [一、整体设计思路](/planet/blog-dev/整体设计思路)
- [2.2 创建 WebSocketConfig 配置类](/planet/blog-dev/创建-WebSocketConfig-配置类)
- [2.3 修改 CommentNotifyConsumer 添加实时推送](/planet/blog-dev/修改-CommentNotifyConsumer-添加实时推送)
- [2.5 前端改造](/planet/blog-dev/前端改造)
- [三、Bug 记录与修复](/planet/blog-dev/Bug-记录与修复)
- [四、优化前后对比](/planet/blog-dev/优化前后对比)
