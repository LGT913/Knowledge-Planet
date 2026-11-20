---
title: "修改 CommentNotifyConsumer 添加实时推送"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 2.3 修改 CommentNotifyConsumer 添加实时推送, blog-dev]
summary: "文件： blog/src/main/java/com/blog/blog/service/CommentNotifyConsumer.java"
private: false
---

### 2.3 修改 CommentNotifyConsumer 添加实时推送

**文件：** `blog/src/main/java/com/blog/blog/service/CommentNotifyConsumer.java`

```java
package com.blog.blog.service;

import com.blog.blog.common.util.RedisUtil;
import com.blog.blog.config.RabbitMQConfig;
import com.blog.blog.dto.CommentNotifyMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommentNotifyConsumer {
    private static final Logger log = LoggerFactory.getLogger(CommentNotifyConsumer.class);

    private static final String COMMENT_NOTIFY_DONE_PREFIX = "blog:comment:notify:done:";

    /** 文章详情页评论推送目标: /topic/article/{articleId}/comments */
    private static final String COMMENT_TOPIC_TEMPLATE = "/topic/article/%d/comments";

    private final RedisUtil redisUtil;
    private final SimpMessagingTemplate messagingTemplate;

    @RabbitListener(queues = RabbitMQConfig.COMMENT_QUEUE)
    public void handleCommentNotify(CommentNotifyMessage message) {
        // 幂等性检查: 基于文章ID + 评论者ID + 时间戳去重
        String idempotentKey = COMMENT_NOTIFY_DONE_PREFIX
                + message.getArticleId() + ":" + message.getCommentUserId()
                + ":" + message.getTimestamp();
        Boolean isFirst = redisUtil.setIfAbsent(idempotentKey, "1", 86400);
        if (!Boolean.TRUE.equals(isFirst)) {
            log.info("评论通知已处理,跳过重复消费, articleId={}, commentUserId={}",
                    message.getArticleId(), message.getCommentUserId());
            return;
        }

        try {
            log.info("收到评论通知:文章ID={}, 作者ID={}, 评论者ID={}, 内容={}",
                    message.getArticleId(),
                    message.getAuthorId(),
                    message.getCommentUserId(),
                    message.getCommentContent());

            // WebSocket 实时推送到文章详情页的所有用户
            String destination = String.format(COMMENT_TOPIC_TEMPLATE, message.getArticleId());
            messagingTemplate.convertAndSend(destination, message);
            log.info("WebSocket 推送成功, destination={}", destination);
        } catch (Exception e) {
            log.error("处理评论通知失败,message={}", message, e);
            throw new RuntimeException(e);  // 抛出后触发 NACK → 死信队列
        }
    }
}
```

**设计思路：**

| 改动点 | 设计决策 | 原因 |
|---|---|---|
| 新增 `SimpMessagingTemplate` 注入 | Spring 统一的消息发送模板 | 自动处理 JSON 序列化，无需手动管理 WebSocket Session |
| 常量 `COMMENT_TOPIC_TEMPLATE` | 集中管理推送路径 | 格式统一，后续改路径只改一处 |
| 推送对象复用 `CommentNotifyMessage` | 不新建 WebSocket 专用 DTO | 减少类膨胀，前端只需解析一种格式 |
| `convertAndSend` | 自动转换 + 发送 | 内部调用 `Jackson2JsonMessageConverter` 序列化 |
| 推送失败抛异常 | 进入死信队列 | 避免消息丢失，后续可人工排查 |
| 幂等检查在推送之前 | 先过滤重复消息 | 减少无效 WebSocket 推送，降低网络开销 |

---

### 2.4 修改 SecurityConfig 放行 WebSocket 端点

**文件：** `blog/src/main/java/com/blog/blog/config/SecurityConfig.java`

**改动：** 在 `authorizeHttpRequests` 配置中添加一行：

```java
.authorizeHttpRequests(auth -> auth
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .requestMatchers("/api/user/login", "/api/user/register").permitAll()
        .requestMatchers("/ws/**").permitAll()   // WebSocket 握手端点
        .requestMatchers(HttpMethod.GET,
                "/api/article/list",
                // ... 其他 GET 端点不变
        ).permitAll()
        .anyRequest().authenticated()
)
```

**设计思路：**

| 问题 | 方案 |
|---|---|
| WebSocket 握手是 HTTP 请求，会经过 Security 过滤器链 | 放行 `/ws/**`，让 WebSocket 自身逻辑处理握手 |
| 为什么不校验 JWT？ | STOMP CONNECT 阶段可以通过拦截器校验，比 HTTP 过滤器更精细 |
| 生产环境安全吗？ | 后续可注册 `ChannelInterceptor`，在 CONNECT 时校验 Token |
| 放行位置放在最前面 | 避免被 `anyRequest().authenticated()` 拦截 |

---
