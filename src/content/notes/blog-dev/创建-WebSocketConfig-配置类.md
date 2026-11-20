---
title: "创建 WebSocketConfig 配置类"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 2.2 创建 WebSocketConfig 配置类, blog-dev]
summary: "文件： blog/src/main/java/com/blog/blog/config/WebSocketConfig.java"
private: false
---

### 2.2 创建 WebSocketConfig 配置类

**文件：** `blog/src/main/java/com/blog/blog/config/WebSocketConfig.java`

```java
package com.blog.blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/notify")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
```

**设计思路：**

| 配置项 | 设计决策 | 原因 |
|---|---|---|
| `@EnableWebSocketMessageBroker` | 启用 STOMP 消息代理 | 比原生 WebSocket 更高级，支持订阅/发布模型 |
| 端点 `/ws/notify` | 语义化命名 | 区别于 `/api` 业务接口，一看就知道是通知推送 |
| `setAllowedOriginPatterns("*")` | 开发阶段宽松 | 生产环境应改为具体域名列表 |
| `withSockJS()` | 启用 SockJS 降级 | 兜底兼容不支持 WebSocket 的浏览器 |
| `enableSimpleBroker("/topic", "/queue")` | 内置 SimpleBroker | 当前单机部署够用，无需 RabbitMQ 等外部 Broker |
| `/topic` 前缀 | 广播（一对多） | 文章详情页所有用户都能收到 |
| `/queue` 前缀 | 点对点（一对一） | 预留，后续可做作者专属通知 |
| `/app` 前缀 | 客户端→服务端 | 预留，本项目暂不需要客户端发送 WebSocket 消息 |

---
