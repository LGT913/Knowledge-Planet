---
title: "RabbitMQ 高级特性：死信队列 + 延迟队列"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战"]
summary: "项目：blog 个人博客    技术栈：Spring Boot 3 + RabbitMQ + Redis + MySQL    日期：2026-08-04"
private: false
---
# RabbitMQ 高级特性：死信队列 + 延迟队列

> 项目：blog 个人博客  
> 技术栈：Spring Boot 3 + RabbitMQ + Redis + MySQL  
> 日期：2026-08-04

---

## 一、整体设计思路

### 1.1 为什么需要死信队列（DLX）

在改造前，4 个业务消费者（评论、摘要、点赞、浏览记录）各自的错误处理是孤立的——每个业务队列绑定一个独立的死信交换机和死信队列（`blog.comment.dlx.exchange` → `blog.comment.dlx.queue`，以此类推），共 8 个 DLX 组件。

**问题**：
- 组件膨胀：4 个业务 = 4 个 DLX 交换机 + 4 个 DLX 队列 = 8 个额外 Bean
- 排查分散：失败消息散落在不同队列，运维需要逐个查看
- 扩展困难：每新增一个业务队列，就要配套新增一对 DLX

**改造目标**：4 个业务队列统一指向同一个死信交换机 `blog.dlx.exchange`，所有消费失败的消息汇聚到 `blog.dlx.queue`，在 RabbitMQ 管理页面一目了然。

### 1.2 为什么需要延迟队列

**场景需求**：订单超时取消、定时发布文章、延迟通知等。

**方案选择**：采用 **TTL + DLX 模式**（无需安装额外插件），而非 Delayed Message Exchange 插件。

| 方案 | 优点 | 缺点 |
|------|------|------|
| TTL + DLX | 无需插件，通用性强 | 所有消息同一个 TTL，不同延迟需不同队列 |
| Delayed Message Exchange | 消息级延迟，灵活 | 需安装插件，运维成本高 |

当前项目使用 TTL + DLX，通过消息级 `setExpiration()` 覆盖队列默认 TTL，灵活支持不同延迟时长。

### 1.3 整体架构图

```
┌──────────────────────────────────────────────────────────────────────┐
│                        业务交换机（TopicExchange）                     │
│                                                                      │
│  comment.exchange ──→ comment.queue ──→ CommentNotifyConsumer        │
│  summary.exchange ──→ summary.queue ──→ SummaryConsumer              │
│  like.exchange    ──→ like.queue    ──→ LikeConsumer                 │
│  history.exchange ──→ history.queue ──→ BrowseHistoryConsumer        │
│                        │                                              │
│                        │ 消费异常 throw RuntimeException               │
│                        ↓                                              │
│              ┌─────────────────────┐                                  │
│              │  DLX_EXCHANGE       │  ← 统一死信交换机（DirectExchange）│
│              │  blog.dlx.exchange  │                                  │
│              └──────┬──────────────┘                                  │
│                     │                                                │
│          ┌──────────┼──────────────┐                                  │
│          │ routing key:            │  routing key:                    │
│          │ blog.dlx               │  blog.delay                       │
│          ↓                        ↓                                  │
│   ┌──────────────┐       ┌─────────────────────┐                     │
│   │  DLX_QUEUE   │       │ DELAY_PROCESS_QUEUE │                     │
│   │  blog.dlx.   │       │ blog.delay.process. │                     │
│   │  queue       │       │ queue               │                     │
│   │  (人工排查)   │       │ (DelayConsumer)     │                     │
│   └──────────────┘       └─────────────────────┘                     │
│                                    ↑                                 │
│                                    │ TTL 到期后路由                   │
│                           ┌────────┴──────────┐                      │
│                           │ DELAY_QUEUE       │                      │
│                           │ blog.delay.queue  │  ← 30s TTL            │
│                           └────────┬──────────┘                      │
│                                    ↑                                 │
│                           ┌────────┴──────────┐                      │
│                           │ DELAY_EXCHANGE    │                      │
│                           │ blog.delay.exchange│ ← DirectExchange     │
│                           └────────┬──────────┘                      │
│                                    ↑                                 │
│                              生产者发送延迟消息                         │
└──────────────────────────────────────────────────────────────────────┘
```

**关键设计决策**：
- 死信消息和延迟消息通过**不同的 routing key** 隔离（`blog.dlx` vs `blog.delay`），互不干扰
- 业务队列**不加 `x-message-ttl`**，防止消费积压时消息被意外过期
- 死信交换机使用 `DirectExchange`（而非 `TopicExchange`），精确路由，避免误匹配

---

## 二、具体步骤与核心代码

### 步骤 1：改造 RabbitMQConfig.java（统一死信 + 新增延迟）

**文件**：`config/RabbitMQConfig.java`

**设计思路**：
- 删除旧的 8 个 DLX 常量（`COMMENT_DLX_EXCHANGE`、`SUMMARY_DLX_QUEUE` 等）
- 新增统一死信交换机/队列（`DLX_EXCHANGE` / `DLX_QUEUE`）
- 新增延迟队列相关的 4 个组件（`DELAY_EXCHANGE` / `DELAY_QUEUE` / `DELAY_PROCESS_QUEUE` + 绑定）
- 4 个业务队列的 `x-dead-letter-exchange` 统一指向 `DLX_EXCHANGE`

```java
// ==================== 常量定义 ====================

// 业务交换机/队列/路由键（保持不变）
public static final String COMMENT_EXCHANGE = "blog.comment.exchange";
public static final String COMMENT_QUEUE = "blog.comment.queue";
public static final String COMMENT_ROUTING_KEY = "blog.comment.notify";

public static final String SUMMARY_EXCHANGE = "blog.summary.exchange";
public static final String SUMMARY_QUEUE = "blog.summary.queue";
public static final String SUMMARY_ROUTING_KEY = "blog.summary.generate";

public static final String LIKE_EXCHANGE = "blog.like.exchange";
public static final String LIKE_QUEUE = "blog.like.queue";
public static final String LIKE_ROUTING_KEY = "blog.like.save";

public static final String HISTORY_EXCHANGE = "blog.history.exchange";
public static final String HISTORY_QUEUE = "blog.history.queue";
public static final String HISTORY_ROUTING_KEY = "blog.history.save";

// 统一死信队列（处理消费失败的消息）
public static final String DLX_EXCHANGE = "blog.dlx.exchange";
public static final String DLX_QUEUE = "blog.dlx.queue";
public static final String DLX_ROUTING_KEY = "blog.dlx";

// 延迟队列（TTL + DLX 模式）
public static final String DELAY_EXCHANGE = "blog.delay.exchange";
public static final String DELAY_QUEUE = "blog.delay.queue";
public static final String DELAY_ROUTING_KEY = "blog.delay";
public static final String DELAY_PROCESS_QUEUE = "blog.delay.process.queue";
public static final long DELAY_TTL_MS = 30_000; // 30 秒

// ==================== 业务队列（统一 DLX） ====================

@Bean
public Queue commentQueue() {
    return QueueBuilder.durable(COMMENT_QUEUE)
            .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)      // ← 统一指向
            .withArgument("x-dead-letter-routing-key", DLX_ROUTING_KEY)
            .build();
}

@Bean
public Queue summaryQueue() {
    // 注意：业务队列不加 x-message-ttl，防止消费积压时消息被意外过期
    return QueueBuilder.durable(SUMMARY_QUEUE)
            .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)
            .withArgument("x-dead-letter-routing-key", DLX_ROUTING_KEY)
            .build();
}

// likeQueue、historyQueue 同理...

// ==================== 统一死信 ====================

@Bean
public DirectExchange dlxExchange() {
    return new DirectExchange(DLX_EXCHANGE, true, false);
}

@Bean
public Queue dlxQueue() {
    return QueueBuilder.durable(DLX_QUEUE).build();
}

@Bean
public Binding dlxBinding() {
    return BindingBuilder.bind(dlxQueue())
            .to(dlxExchange())
            .with(DLX_ROUTING_KEY);
}

// ==================== 延迟队列 ====================

@Bean
public DirectExchange delayExchange() {
    return new DirectExchange(DELAY_EXCHANGE, true, false);
}

@Bean
public Queue delayQueue() {
    return QueueBuilder.durable(DELAY_QUEUE)
            .withArgument("x-message-ttl", DELAY_TTL_MS)                    // TTL
            .withArgument("x-dead-letter-exchange", DLX_EXCHANGE)           // 复用 DLX
            .withArgument("x-dead-letter-routing-key", DELAY_ROUTING_KEY)   // 不同 routing key
            .build();
}

@Bean
public Queue delayProcessQueue() {
    return QueueBuilder.durable(DELAY_PROCESS_QUEUE).build();
}

@Bean
public Binding delayProcessBinding() {
    return BindingBuilder.bind(delayProcessQueue())
            .to(dlxExchange())
            .with(DELAY_ROUTING_KEY);
}
```

### 步骤 2：创建延迟消息 DTO

**文件**：`dto/DelayMessage.java`

**设计思路**：使用 `bizType` 字段区分业务类型，`payload` 承载扩展 JSON 数据，支持多种延迟场景复用同一套队列。

```java
@Data
public class DelayMessage implements Serializable {
    private String bizType;       // order_cancel / article_publish / remind
    private String bizId;         // 业务 ID
    private Long userId;
    private String payload;       // 扩展数据（JSON）
    private Long timestamp;
}
```

### 步骤 3：创建延迟消息消费者

**文件**：`service/DelayConsumer.java`

**设计思路**：
- 监听 `DELAY_PROCESS_QUEUE`（不是 `DELAY_QUEUE`，因为 `DELAY_QUEUE` 只有 TTL，没有消费者）
- 通过 `switch` 按 `bizType` 路由到不同处理方法，扩展新业务只需加一个 case
- 处理失败抛出 `RuntimeException` → 进入统一 DLX_QUEUE，形成双层保障

```java
@Component
public class DelayConsumer {
    private static final Logger log = LoggerFactory.getLogger(DelayConsumer.class);

    @RabbitListener(queues = RabbitMQConfig.DELAY_PROCESS_QUEUE)
    public void handleDelayedMessage(DelayMessage message) {
        log.info("收到延迟消息, bizType={}, bizId={}, 延迟时间={}ms",
                message.getBizType(), message.getBizId(),
                System.currentTimeMillis() - message.getTimestamp());

        try {
            switch (message.getBizType()) {
                case "order_cancel":
                    handleOrderCancel(message);
                    break;
                case "article_publish":
                    handleArticlePublish(message);
                    break;
                case "remind":
                    handleRemind(message);
                    break;
                default:
                    log.warn("未知延迟消息类型, bizType={}", message.getBizType());
            }
        } catch (Exception e) {
            log.error("延迟消息处理失败", e);
            throw new RuntimeException("延迟消息处理失败, 进入死信队列", e);
        }
    }

    private void handleOrderCancel(DelayMessage message) {
        // TODO: 查询订单状态，若仍为未支付则取消
        log.info("模拟订单取消, orderId={}", message.getBizId());
    }

    private void handleArticlePublish(DelayMessage message) {
        // TODO: 定时发布文章
        log.info("模拟定时发布文章, articleId={}", message.getBizId());
    }

    private void handleRemind(DelayMessage message) {
        // TODO: 延迟提醒
        log.info("模拟延迟提醒, bizId={}", message.getBizId());
    }
}
```

### 步骤 4：生产者使用示例

**设计思路**：生产者发送消息到 `DELAY_EXCHANGE`，通过 `MessagePostProcessor` 设置消息级 TTL 覆盖队列默认值，支持不同延迟时长。

```java
DelayMessage msg = new DelayMessage();
msg.setBizType("order_cancel");
msg.setBizId("ORDER_20260101_001");
msg.setUserId(1001L);
msg.setTimestamp(System.currentTimeMillis());

rabbitTemplate.convertAndSend(
    RabbitMQConfig.DELAY_EXCHANGE,
    RabbitMQConfig.DELAY_ROUTING_KEY,
    msg,
    message -> {
        // 消息级 TTL 覆盖队列默认值
        message.getMessageProperties().setExpiration("60000"); // 60 秒
        return message;
    });
```

---

## 三、消费者如何触发死信队列

4 个业务消费者统一通过"抛出 RuntimeException"触发 NACK → 死信路由：

```java
// LikeConsumer —— DB 写入失败
catch (Exception e) {
    log.error("点赞持久化失败, articleId={}", message.getArticleId(), e);
    throw new RuntimeException("点赞持久化失败,进入死信队列", e);
}

// BrowseHistoryConsumer —— DB 写入失败
catch (Exception e) {
    log.error("浏览记录持久化失败", e);
    throw new RuntimeException("浏览记录持久化失败,进入死信队列", e);
}

// CommentNotifyConsumer —— 通知发送失败
catch (Exception e) {
    log.error("处理评论通知失败", e);
    throw new RuntimeException(e);
}

// SummaryConsumer —— AI API 限流 / 调用失败
catch (Exception e) {
    log.error("AI 摘要生成失败(可重试)", e);
    throw new RuntimeException("摘要生成失败, 进入死信队列", e);
}
```

Spring AMQP 默认 `defaultRequeueRejected=false`，抛出异常后消息不重新入队，而是按队列配置的 `x-dead-letter-exchange` 路由到 `blog.dlx.queue`。

---

## 四、优化前后对比

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| DLX 交换机数量 | 4 个（每个业务一个） | 1 个统一 DLX |
| DLX 队列数量 | 4 个（每个业务一个） | 1 个统一 DLX + 1 个延迟处理队列 |
| 配置 Bean 数量 | 16 个（4业务×2交换机 + 4业务×2队列） | 11 个（4业务 + 1DLX + 3延迟） |
| 失败消息排查 | 需逐个查看 4 个队列 | 只看 `blog.dlx.queue` 一个队列 |
| 新增业务 DLX | 需新增一对交换机+队列 | 零代码，队列参数中指定 DLX 即可 |
| 延迟队列 | 无 | 支持 TTL + DLX 模式延迟 |
| 消息隔离 | 无隔离（失败消息和延迟消息混合） | routing key 隔离（`blog.dlx` vs `blog.delay`） |

---

## 五、遇到的 Bug 及修复

### Bug 1：BlogCacheConstants 重复常量定义

**现象**：编译错误 `Duplicate field`

**原因**：点赞同步相关的常量（`LIKE_SYNC_LOCK`、`ARTICLE_LIKE_DIRTY_KEY`、`ARTICLE_LIKE_COUNT_KEY`）在类中定义了两次——一组 `public static final`，一组包级私有。

**修复**：删除重复的包级私有定义。

```java
// 修复前（第 47-51 行有重复定义）
String LIKE_SYNC_LOCK = "blog:like:sync:lock";
String ARTICLE_LIKE_DIRTY_KEY = "blog:article:like:dirty";
String ARTICLE_LIKE_COUNT_KEY = "blog:article:like:count:";

// 修复后：删除以上三行，保留 public static final 版本
```

### Bug 2：BrowseHistory 索引列名使用 Java 属性名

**现象**：`@Index` 的 `columnList` 使用 Java 驼峰属性名 `browseTime`，但 JPA 默认命名策略将其转为 `browse_time`，导致索引定义中的列名与物理列名不匹配，索引实际失效。

**修复**：`columnList` 中使用数据库列名。

```java
// 修复前
@Index(name = "idx_user_time", columnList = "userId, browseTime DESC")

// 修复后
@Index(name = "idx_user_time", columnList = "userId, browse_time DESC")
```

### Bug 3：BrowseHistoryConsumer 幂等性 key 粒度太粗

**现象**：同一用户对同一篇文章的浏览记录，永远只有第一次会持久化到 DB，后续全部被幂等性拦截。

**原因**：幂等性 key 只用了 `userId:articleId`，不含时间戳，导致不同时间点的浏览被当作重复消息。

**修复**：key 追加 `message.getTimestamp()`。

```java
// 修复前
String doneKey = HISTORY_DONE_PREFIX + message.getUserId() + ":" + message.getArticleId();

// 修复后
String doneKey = HISTORY_DONE_PREFIX + message.getUserId() + ":" + message.getArticleId()
        + ":" + message.getTimestamp();
```

### Bug 4：@Transactional 注解导入错误

**现象**：`ArticleServiceImpl.syncLikeCountToDB()` 的 `@Transactional(rollbackFor = Exception.class)` 编译报错。

**原因**：import 的是 `jakarta.transaction.Transactional`，该注解没有 `rollbackFor` 属性。

**修复**：改为 `org.springframework.transaction.annotation.Transactional`。

```java
// 修复前
import jakarta.transaction.Transactional;

// 修复后
import org.springframework.transaction.annotation.Transactional;
```

### Bug 5：redisUtil.get() 返回类型与 String 不兼容

**现象**：`syncLikeCountToDB()` 中 `String countStr = redisUtil.get(...)` 编译报错。

**原因**：`redisUtil.get()` 返回 `Object`，不能直接赋值给 `String`。

**修复**：改用 `Object` 接收，通过 `instanceof Number` 安全转换。

```java
// 修复前
String countStr = redisUtil.get(ARTICLE_LIKE_COUNT_KEY + articleId);
int realLikeCount = Objects.nonNull(countStr) ? Integer.parseInt(countStr) : 0;

// 修复后
Object countObj = redisUtil.get(ARTICLE_LIKE_COUNT_KEY + articleId);
int realLikeCount = countObj instanceof Number ? ((Number) countObj).intValue() : 0;
```

### Bug 6：启动报 PRECONDITION_FAILED（队列参数冲突）

**现象**：IDEA 启动时 RabbitMQ 报错：

```
PRECONDITION_FAILED - inequivalent arg 'x-dead-letter-exchange' for queue 'blog.comment.queue':
received 'blog.dlx.exchange' but current is 'blog.comment.dlx.exchange'
```

**原因**：RabbitMQ 中已存在旧队列，其 `x-dead-letter-exchange` 是旧值 `blog.comment.dlx.exchange`。新代码要声明同一个队列但 DLX 改为 `blog.dlx.exchange`，RabbitMQ 不允许修改已有队列的参数。

**修复**：删除 RabbitMQ 中所有旧队列，重启后 Spring 自动用新参数创建。删除的队列列表：

```
blog.comment.queue        blog.comment.dlx.queue
blog.summary.queue        blog.summary.dlx.queue
blog.like.queue           blog.like.dlx.queue
blog.history.queue        blog.history.dlx.queue
```

---

## 六、涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `config/RabbitMQConfig.java` | 改造 | 统一 DLX + 新增延迟队列 |
| `dto/DelayMessage.java` | 新建 | 延迟消息 DTO |
| `service/DelayConsumer.java` | 新建 | 延迟消息消费者 |
| `common/constant/BlogCacheConstants.java` | 修复 | 删除重复常量 |
| `entity/BrowseHistory.java` | 修复 | 索引列名改为数据库列名 |
| `service/BrowseHistoryConsumer.java` | 修复 | 幂等性 key 加时间戳 |
| `service/impl/ArticleServiceImpl.java` | 修复 | @Transactional 导入 + 类型转换 |

---

## 七、总结

1. **统一 DLX 降低运维成本**：4 个业务队列共用一个死信交换机，失败消息汇聚到 `blog.dlx.queue`，在 RabbitMQ 管理页面一处查看。Bean 数量从 16 个减少到 11 个。

2. **延迟队列采用 TTL + DLX 模式**：无需额外插件，利用死信机制实现延迟投递。通过 routing key 隔离（`blog.dlx` vs `blog.delay`）与死信消息互不干扰。生产者可通过消息级 `setExpiration()` 覆盖队列默认值，支持不同延迟时长。

3. **业务队列不加 TTL**：这是容易被忽略的细节。如果在业务队列上设置 `x-message-ttl`，当消费积压时，仍在队列中等待的消息会因超过 TTL 被过期丢弃，而非真正的"消费失败"。延迟队列和业务队列必须分开。

4. **幂等性 key 要包含时间戳**：对于"同一用户可多次浏览同一文章"这类场景，幂等性 key 只用 `userId:articleId` 会导致后续浏览记录全部丢失。加上 `timestamp` 后，只有同一次投递的重复消息被拦截。

5. **修改队列参数需先删除旧队列**：RabbitMQ 不允许 `queueDeclare` 修改已有队列的参数（如 `x-dead-letter-exchange`）。生产环境变更队列配置时，需先通过管理页面或 CLI 删除旧队列，再重新声明。
