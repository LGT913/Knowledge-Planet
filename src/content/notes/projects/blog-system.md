---
title: "博客系统：Spring Boot + Vue3 全栈实践"
date: 2026-10-20
planet: projects
tags: [Spring Boot, Redis, RabbitMQ, 微服务]
summary: "从单体到微服务的完整演进：JWT 鉴权、Redis 缓存三防、RabbitMQ 异步解耦、AI 摘要，最后拆成 Gateway + Nacos + Feign + Sentinel。"
private: false
---

## 一句话定位

一个可上线的个人博客系统，覆盖用户、文章、分类、评论、点赞、通知、AI 摘要七个模块，并完成了从单体到微服务的服务拆分与治理实验。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 单体后端 | Spring Boot 4 + Java 17、Spring Security + JWT、Spring Data JPA |
| 微服务版 | Spring Cloud Alibaba、Gateway、Nacos、Feign、Sentinel |
| 存储与中间件 | MySQL 8、Redis 7、RabbitMQ 3.13、Redisson |
| 前端 | Vue 3 + Vite + Tailwind CSS、SockJS + STOMP |
| 外部能力 | DeepSeek API（AI 摘要） |

## 整体架构

```text
浏览器 (Vue3 SPA)
   |
   v
Nginx :80  ---  托管 dist 静态资源
   |              |-- /api -> 127.0.0.1:8088
   |              '-- /ws  -> 127.0.0.1:8088 (WebSocket)
   v
Spring Boot jar :8088 (systemd 常驻)
   |-- MySQL 8     (docker, 127.0.0.1:3306)
   |-- Redis 7     (docker, 127.0.0.1:6379)
   |-- RabbitMQ    (docker, 127.0.0.1:5672)
   '-- DeepSeek API (外部)
```

中间件全部只绑回环地址，安全组仅放行 22 / 80 / 443，数据库与消息队列不暴露公网。

## 三个关键取舍

### 1. 先单体，后微服务

没有一上来就做微服务。单体版本先把业务跑通、把缓存和消息队列的价值验证清楚，再按「用户 / 文章」两条业务边界拆成 `blog-user-service` 与 `blog-article-service`，用 Gateway 统一入口、Nacos 做注册、Feign 做远程调用、Sentinel 做限流熔断。

原因：单人项目里微服务的收益（独立部署、故障隔离）并不成立，成本（链路排查、分布式事务、运维）却是实打实的。拆分的价值在于**证明我理解边界怎么划**，而不是让线上跑得更快。

### 2. 数据访问用 JPA 而不是 MyBatis

实体与表结构强绑定，`ddl-auto: update` 让开发期无需手写建表脚本；分页、排序、条件查询由 Specification 覆盖，减少 XML 维护。代价是复杂 SQL 的可控性弱于 MyBatis，所以热点排行这类查询单独走手写 SQL。

### 3. 热点数据用 Redis 而不是本地缓存

多实例部署时本地缓存无法保证一致性。方案是「Redis 缓存 + 布隆过滤器防穿透 + 分布式锁防击穿 + 随机过期时间防雪崩」，并给排行接口加了令牌桶限流。

## 踩坑复盘：布隆过滤器的误判与预热

第一版把布隆过滤器直接挂在查询入口，文章发布后立刻查询却返回「不存在」。原因是过滤器只在启动时按库内已有数据初始化，新增 ID 没有写入。

修复方式：

1. 文章创建成功后同步 `put` 到过滤器；
2. 过滤器启动时全量预热，并对误判率按预期数据量估算位数组长度；
3. 过滤器判断不存在时直接返回，判断存在才继续查 Redis / DB，避免误判导致的数据不可见被放大。

教训：**过滤器只能当「快速否定」用，不能当唯一真相源**。

## 结果与产出

- 线上部署：Docker Compose 管中间件，jar 由 systemd 常驻，Nginx 托管前端并反代 `/api`、`/ws`
- 完整接口文档与后端架构文档（鉴权链路、缓存策略、MQ 可靠性）
- 微服务版保留在同一仓库，作为架构演进的对照实现

## 相关链接

- 源码：待补充 GitHub 地址
- 在线 Demo：待服务器恢复后开放
- 演示录屏：待录制
