---
title: "安装 RabbitMQ + Spring Boot 整合"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战"]
summary: "预期效果：评论后后台日志打印通知信息，评论不受通知影响（异步）"
private: false
---
# 安装 RabbitMQ + Spring Boot 整合

## 步骤：

#### 1.在Linux安装Docker部署RabbitMQ（必须）

#### 2.pom.xml:

```java
<!-- RabbitMQ -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-amqp</artifactId>
        </dependency>
```

#### 3.application.yml(也可以原来的.properties):

```java
spring:
  rabbitmq:
    host: 192.168.32.199
    port: 5672
    username: admin
    password：[已隐藏]
    virtual-host: /
```



# 实现评论异步通知（用户评论文章后，异步通知文章作者）

- 预期效果：评论后后台日志打印通知信息，评论不受通知影响（异步）

## 步骤：

### 1.config层新建RabbitMQConfig.java

```java
package com.blog.blog.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String COMMENT_EXCHANGE = "blog.comment.exchange";
    public static final String COMMENT_QUEUE = "blog.comment.queue";
    public static final String COMMENT_ROUTING_KEY = "blog.comment.notify";
    public static final String COMMENT_DLX_EXCHANGE = "blog.comment.dlx.exchange";
    public static final String COMMENT_DLX_QUEUE = "blog.comment.dlx.queue";

    // 业务交换机(durable=true, autoDelete=false)
    @Bean
    public TopicExchange commentExchange() {
        return new TopicExchange(COMMENT_EXCHANGE, true, false);
    }

    // 业务队列(持久化 + 绑定死信交换机)
    @Bean
    public Queue commentQueue() {
        return QueueBuilder.durable(COMMENT_QUEUE)
                .withArgument("x-dead-letter-exchange", COMMENT_DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", COMMENT_DLX_QUEUE)
                .build();
    }

    @Bean
    public Binding commentBinding() {
        return BindingBuilder.bind(commentQueue())
                .to(commentExchange())
                .with(COMMENT_ROUTING_KEY);
    }

    // 死信交换机 + 死信队列(消费失败的消息进这里,人工排查)
    @Bean
    public TopicExchange commentDlxExchange() {
        return new TopicExchange(COMMENT_DLX_EXCHANGE, true, false);
    }

    @Bean
    public Queue commentDlxQueue() {
        return QueueBuilder.durable(COMMENT_DLX_QUEUE).build();
    }

    @Bean
    public Binding commentDlxBinding() {
        return BindingBuilder.bind(commentDlxQueue())
                .to(commentDlxExchange())
                .with(COMMENT_DLX_QUEUE);
    }

    // Jackson 序列化(跨语言、安全、可读)
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
```

### 2. 新建 DTO层（数据传输对象):CommentNotifyMessage.java

```java
package com.blog.blog.dto;

import lombok.Data;
import java.io.Serializable;

@Data
public class CommentNotifyMessage implements Serializable {
    private Long articleId;        // 文章 ID
    private Long authorId;         // 文章作者 ID(通知接收方)
    private Long commentUserId;    // 评论者 ID
    private String commentContent; // 评论内容
    private Long timestamp;        // 发送时间戳(用于幂等去重)
}
```

### 3. service层新建NotifyService.java(加 try-catch 降级)

```java
package com.blog.blog.service;

import com.blog.blog.config.RabbitMQConfig;
import com.blog.blog.dto.CommentNotifyMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class NotifyService {
    private static final Logger log = LoggerFactory.getLogger(NotifyService.class);

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void sendCommentNotify(CommentNotifyMessage message) {
        try {
            rabbitTemplate.convertAndSend(
                RabbitMQConfig.COMMENT_EXCHANGE,
                RabbitMQConfig.COMMENT_ROUTING_KEY,
                message
            );
        } catch (Exception e) {
            // 降级:RabbitMQ 不可用时不影响主流程,只记日志
            log.error("发送评论通知失败,articleId={}", message.getArticleId(), e);
        }
    }
}
```

### 4. CommentNotifyConsumer.java(幂等 + 异常处理)

```java
package com.blog.blog.service;

import com.blog.blog.config.RabbitMQConfig;
import com.blog.blog.dto.CommentNotifyMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class CommentNotifyConsumer {
    private static final Logger log = LoggerFactory.getLogger(CommentNotifyConsumer.class);

    @RabbitListener(queues = RabbitMQConfig.COMMENT_QUEUE)
    public void handleCommentNotify(CommentNotifyMessage message) {
        try {
            // TODO: 幂等性检查(基于 timestamp 或消息 ID,用 Redis SET NX 去重)
            // 这里先简单打印日志,验证链路

            log.info("收到评论通知:文章ID={}, 作者ID={}, 评论者ID={}, 内容={}",
                    message.getArticleId(),
                    message.getAuthorId(),
                    message.getCommentUserId(),
                    message.getCommentContent());

            // TODO: 实际通知逻辑(WebSocket 推送、邮件、站内信)
        } catch (Exception e) {
            // 消费异常不向上抛,记录日志后让消息进入死信队列
            log.error("处理评论通知失败,message={}", message, e);
            throw new RuntimeException(e);  // 抛出后触发 NACK → 死信队列
        }
    }
}
```

### 5. CommentController.java

```java
@RestController
@RequestMapping("/api/comment")
public class CommentController {
    private static final Logger log = LoggerFactory.getLogger(CommentController.class);

    @Autowired
    private CommentService commentService;

    @Autowired
    private ArticleService articleService;

    @Autowired
    private NotifyService notifyService;
```
```java
@PostMapping("/create")
public Result<Comment> createComment(@RequestParam Long articleId,
                                     @AuthenticationPrincipal UserPrincipal principal,
                                     @RequestParam String content,
                                     @RequestParam(required = false) Long parentId) {
    Long userId = principal.getUserId();
    Comment comment = commentService.createComment(articleId, userId, content, parentId);

    // 异步发送通知(不影响主流程,内部已 try-catch)
    try {
        // 查文章作者 ID(需要 ArticleService 注入)
        Article article = articleService.getArticle(articleId);
        CommentNotifyMessage msg = new CommentNotifyMessage();
        msg.setArticleId(articleId);
        msg.setAuthorId(article.getUserId());
        msg.setCommentUserId(userId);
        msg.setCommentContent(content);
        msg.setTimestamp(System.currentTimeMillis());
        notifyService.sendCommentNotify(msg);
    } catch (Exception e) {
        // 查文章失败也要降级,不影响评论主流程
        log.warn("构建评论通知失败,articleId={}", articleId, e);
    }

    return Result.success(comment);
}
```

### 更细的包(企业级最规范)

```
common/
  ├── result/    ← 响应体
  │   └── Result.java   
  ├── util/      ← 工具类
  │   ├── RedisUtil.java
  │   ├── BloomFilterUtil.java
  │   ── JwtUtil.java
  ├── security/  ← 安全相关
  │   └── UserPrincipal.java
  └── exception/ ← 异常处理
      └── GlobalExceptionHandler.java
```

## 思考：

### 额外说明:vo vs dto 区别(项目已有 PageResult 和 Result)

| 类型 | 用途                                                   | 例子                 |
| :--- | :----------------------------------------------------- | :------------------- |
| DTO  | 后端**内部**各层之间传数据(Service→MQ,Service→Service) | CommentNotifyMessage |
| VO   | 后端→**前端**的视图对象(展示用)                        | Result、PageResult   |

简单记:**DTO 后端自己用,VO 给前端用。**

### DTO和VO核心判断标准:看"最终目的地"和"字段设计目的"

### 判断维度

| 维度             | DTO                          | VO                |
| :--------------- | :--------------------------- | :---------------- |
| 最终目的地       | 后端内部(MQ、另一个 Service) | 前端(JSON 序列化) |
| 字段设计目的     | 后端业务处理需要             | 前端展示需要      |
| 是否参与业务逻辑 | 是                           | 否                |

## 面试一句话总结

> **DTO 和 VO 的区别不在"是否跨层传递",而在"最终目的地和字段设计目的"。PageResult 虽然从 Service 传到 Controller,但它的字段都是为前端分页组件设计的,最终返回给前端,所以是 VO;CommentNotifyMessage 在后端内部流转,字段为业务处理服务,不返回前端,所以是 DTO。**
