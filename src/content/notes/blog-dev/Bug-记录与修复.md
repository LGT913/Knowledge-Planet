---
title: "Bug 记录与修复"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 三、Bug 记录与修复, blog-dev]
summary: "现象： 前端 SockJS 连接 /ws/notify 时返回 401 或 403。"
private: false
---

## 三、Bug 记录与修复

### Bug 1：WebSocket 连接被 Spring Security 拦截

**现象：** 前端 SockJS 连接 `/ws/notify` 时返回 401 或 403。

**原因：** Spring Security 的 `anyRequest().authenticated()` 拦截了所有请求，包括 WebSocket 握手。

**修复：** 在 `SecurityConfig.authorizeHttpRequests` 中添加 `.requestMatchers("/ws/**").permitAll()`。

**经验：** WebSocket 握手是 HTTP 请求（`Upgrade: websocket` 头），会经过 Spring Security 过滤器链。放行后由 WebSocket 自身的连接逻辑处理。

---

### Bug 2：Vite 代理未配置 `/ws` 导致连接 404

**现象：** 前端 `new SockJS('/ws/notify')` 报错 `POST http://localhost:5173/ws/notify/info 404`

**原因：** 前端 dev server 跑在 `localhost:5173`，后端在 `localhost:8080`。SockJS 发相对路径请求，没有代理的话请求打到 Vite 的 5173 端口，Vite 不认识 `/ws/notify`，直接返回 404。

**修复：** 在 `vite.config.js` 中添加 `/ws` 代理规则，并设置 `ws: true`。

**经验：** 任何跨端口的前后端通信，都需要在 Vite proxy 中配置，不仅仅是 `/api`。

---

### Bug 3：SockJS 连接成功但收不到消息

**现象：** 前端控制台无报错，但 `newComment` 始终为 `null`。

**原因：** 排查后发现两个可能原因：
1. **订阅路径不匹配**：前端订阅 `/topic/article/123/comments`，后端推送的是 `/topic/article/456/comments`（articleId 不同）
2. **消息序列化问题**：`CommentNotifyMessage` 没有 `Serializable` 检查（已实现 `Serializable`，无问题）

**修复：** 确认前端传入的 `articleId` 与后端推送的目标一致，在 `useCommentWebSocket` 中打印日志验证。

**经验：** WebSocket 调试难度高于 HTTP，建议在关键节点（连接、订阅、推送、接收）都加日志。

---

### Bug 4：页面切换后 WebSocket 连接未断开

**现象：** 从文章 A 详情页切到文章 B 详情页，收到了文章 A 的评论通知。

**原因：** 旧组件销毁时，WebSocket 连接虽然调用了 `disconnect()`，但 STOMP 的 `subscribe` 返回的 subscription 对象没有显式 `unsubscribe()`。

**修复：** 在 `disconnect()` 中先 `unsubscribe()` 所有订阅，再 `deactivate()`。

**经验：** 组件生命周期管理 WebSocket 时，必须清理订阅（`unsubscribe`）+ 连接（`deactivate`），否则旧订阅残留。

---
