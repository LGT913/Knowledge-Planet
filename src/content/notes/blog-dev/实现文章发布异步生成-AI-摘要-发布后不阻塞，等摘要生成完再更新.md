---
title: "实现文章发布异步生成 AI 摘要（发布后不阻塞，等摘要生成完再更新）"
date: 2026-08-03
planet: blog-dev
tags: ["后端", "实战"]
summary: "预期效果：发布文章后立即返回（前端不等待），摘要异步生成后自动更新"
private: false
---
# 实现文章发布异步生成 AI 摘要（发布后不阻塞，等摘要生成完再更新）

- 预期效果：发布文章后立即返回（前端不等待），摘要异步生成后自动更新

## 步骤：

### 1.新建 DTO:SummaryGenerateMessage.java(dto 包)

```java
package com.blog.blog.dto;

import lombok.Data;
import java.io.Serializable;

@Data
public class SummaryGenerateMessage implements Serializable {
    private Long articleId;
    private Long timestamp;
}
```

### 2. 修改 RabbitMQConfig.java(新增部分)

```java
// ============ 摘要生成交换机/队列 ============
public static final String SUMMARY_EXCHANGE = "blog.summary.exchange";
public static final String SUMMARY_QUEUE = "blog.summary.queue";
public static final String SUMMARY_ROUTING_KEY = "blog.summary.generate";
public static final String SUMMARY_DLX_EXCHANGE = "blog.summary.dlx.exchange";
public static final String SUMMARY_DLX_QUEUE = "blog.summary.dlx.queue";

@Bean
public TopicExchange summaryExchange() {
    return new TopicExchange(SUMMARY_EXCHANGE, true, false);  // durable=true
}

@Bean
public Queue summaryQueue() {
    return QueueBuilder.durable(SUMMARY_QUEUE)
            .withArgument("x-dead-letter-exchange", SUMMARY_DLX_EXCHANGE)
            .withArgument("x-dead-letter-routing-key", SUMMARY_DLX_QUEUE)
            .build();
}

@Bean
public Binding summaryBinding() {
    return BindingBuilder.bind(summaryQueue())
            .to(summaryExchange())
            .with(SUMMARY_ROUTING_KEY);
}

// 死信交换机 + 死信队列
@Bean
public TopicExchange summaryDlxExchange() {
    return new TopicExchange(SUMMARY_DLX_EXCHANGE, true, false);
}

@Bean
public Queue summaryDlxQueue() {
    return QueueBuilder.durable(SUMMARY_DLX_QUEUE).build();
}

@Bean
public Binding summaryDlxBinding() {
    return BindingBuilder.bind(summaryDlxQueue())
            .to(summaryDlxExchange())
            .with(SUMMARY_DLX_QUEUE);
}
```

### 3. 修改 ArticleServiceImpl.createArticle

```java
@Autowired
private RabbitTemplate rabbitTemplate;

@Override
public Article createArticle(String title, String content, Long userId, String categoryId) {
    Article article = new Article();
    article.setTitle(title);
    article.setContent(content);
    article.setUserId(userId);
    article.setCategoryId(categoryId);
    article.setCreateTime(LocalDateTime.now());
    article.setUpdateTime(LocalDateTime.now());
    article.setSummary("AI 摘要生成中...");  // 前端显示默认值

    article = articleRepository.save(article);

    // 布隆过滤器(不能漏!)
    bloomFilterUtil.add(article.getId());

    // MQ 异步生成摘要(失败降级不影响主流程)
    try {
        SummaryGenerateMessage msg = new SummaryGenerateMessage();
        msg.setArticleId(article.getId());
        msg.setTimestamp(System.currentTimeMillis());
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.SUMMARY_EXCHANGE,
                RabbitMQConfig.SUMMARY_ROUTING_KEY,
                msg
        );
    } catch (Exception e) {
        log.warn("发送摘要生成消息失败,articleId={},降级为同步生成", article.getId(), e);
        // MQ 不可用时降级:同步生成摘要,保底用户体验
        try {
            String summary = deepSeekService.generateSummary(content);
            article.setSummary(summary);
            article = articleRepository.save(article);
        } catch (Exception ex) {
            log.error("同步摘要生成也失败,articleId={}", article.getId(), ex);
        }
    }

    // 全量删缓存(Bug2+Bug3 修复)
    clearRelatedCaches(article.getId());

    return article;
}
```

### 4. 新建 SummaryConsumer.java(service 包)

```java
package com.blog.blog.service;

import com.blog.blog.config.RabbitMQConfig;
import com.blog.blog.dto.SummaryGenerateMessage;
import com.blog.blog.entity.Article;
import com.blog.blog.repository.ArticleRepository;
import com.blog.blog.service.impl.ArticleServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SummaryConsumer {
    private static final Logger log = LoggerFactory.getLogger(SummaryConsumer.class);

    @Autowired
    private ArticleRepository articleRepository;

    @Autowired
    private DeepSeekService deepSeekService;

    @Autowired
    private ArticleServiceImpl articleService;  // 为了调 clearRelatedCaches(需要反射或抽出工具类,这里简化)

    // 常量同 ArticleServiceImpl,实际建议抽到公共常量类
    private static final String ARTICLE_DETAIL_KEY = "blog:article:detail:";
    private static final String ARTICLE_LIST_KEY = "blog:article:list";
    private static final String ARTICLE_LIST_PAGE_KEY = "blog:article:list:page:";
    private static final String ARTICLE_TOTAL_COUNT_KEY = "blog:article:total:count";
    private static final String ARTICLE_RANKING_VIEWS_KEY = "blog:article:ranking:views";
    private static final String ARTICLE_RANKING_LATEST_KEY = "blog:article:ranking:latest";

    @Autowired
    private com.blog.blog.common.util.RedisUtil redisUtil;

    @RabbitListener(queues = RabbitMQConfig.SUMMARY_QUEUE)
    public void handleSummaryGeneration(SummaryGenerateMessage message) {
        Long articleId = message.getArticleId();
        log.info("开始异步生成文章摘要,articleId={}", articleId);

        // TODO: 幂等性检查(SETNX,去重)

        Article article;
        try {
            article = articleRepository.findById(articleId)
                    .orElseThrow(() -> new IllegalArgumentException("文章不存在:" + articleId));
        } catch (IllegalArgumentException e) {
            // 不可重试异常:ACK + 告警,不进入死信
            log.error("摘要生成失败,文章不存在,articleId={}", articleId, e);
            return;
        }

        // HTTP 调用(事务外)
        String summary;
        try {
            summary = deepSeekService.generateSummary(article.getContent());
        } catch (Exception e) {
            // 可重试异常:抛出去触发 NACK → 死信队列
            log.error("AI 摘要生成失败(可重试),articleId={}", articleId, e);
            throw new RuntimeException("摘要生成失败,进入死信队列", e);
        }

        // DB 操作(事务内)
        updateArticleSummary(articleId, summary);

        // 删缓存(让下次查询回源,避免竞态条件)
        clearRelatedCaches(articleId);

        log.info("文章摘要生成完成,articleId={}", articleId);
    }

    @Transactional
    public void updateArticleSummary(Long articleId, String summary) {
        Article article = articleRepository.findById(articleId)
                .orElseThrow(() -> new IllegalArgumentException("文章不存在:" + articleId));
        article.setSummary(summary);
        articleRepository.save(article);
    }

    // 复制同 ArticleServiceImpl.clearRelatedCaches
    // 企业规范:这个方法应该抽到公共工具类(如 CacheCleaner),避免重复代码
    private void clearRelatedCaches(Long articleId) {
        redisUtil.delete(ARTICLE_LIST_KEY);
        redisUtil.deleteByPattern(ARTICLE_LIST_PAGE_KEY + "*");
        redisUtil.deleteByPattern(ARTICLE_TOTAL_COUNT_KEY + "*");
        redisUtil.delete(ARTICLE_DETAIL_KEY + articleId);
        redisUtil.delete(ARTICLE_RANKING_VIEWS_KEY);
        redisUtil.delete(ARTICLE_RANKING_LATEST_KEY);
    }
}
```

### 优化：一、消息体简化(不传 content,消费者从 DB 查)

#### SummaryGenerateMessage 中实现

```java
@Data
public class SummaryGenerateMessage implements Serializable {
    private Long articleId;    // ✅ 只传 articleId
    private Long timestamp;    // 幂等去重用
}
```

### 二、RestTemplate 超时配置(防止线程卡死)

#### 在 DeepSeekService 中配置超时

```java
package com.blog.blog.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;

@Service
public class DeepSeekService {

    @Value("${deepseek.api.key}")
    private String apiKey;

    @Value("${deepseek.api.url}")
    private String apiUrl;

    private RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        // 连接超时:建立 TCP 握手的最大等待时间(防止目标服务器挂了)
        factory.setConnectTimeout(5000);     // 5 秒
        // 读取超时:发送请求后等待响应的最大时间(AI API 通常 2-30 秒)
        factory.setReadTimeout(30000);       // 30 秒
        this.restTemplate = new RestTemplate(factory);
    }

    public String generateSummary(String content) {
        // ... 原有逻辑不变
    }
}
```

#### 企业规范:超时时间设计原则

| 超时类型       | 推荐值               | 设计理由                         |
| :------------- | :------------------- | :------------------------------- |
| ConnectTimeout | 3-10 秒              | 网络握手,超过说明目标不可达      |
| ReadTimeout    | 业务 P99 × 2         | AI API 正常 5-15 秒,给 30 秒兜底 |
| 超时异常       | 归类为**可重试异常** | 网络抖动/超时,重投一次可能就成功 |

#### application.yml 可配置化(进阶)

```yaml
deepseek:
  api:
    key: your-key
    url: https://api.deepseek.com/chat/completions
    timeout:
      connect: 5000
      read: 30000
```

Java 里用 `@Value` 读取,不改代码调超时。

### 三、AI 调用限流(防止打爆 API 付费额度)

#### ·方案:Redis 令牌桶 + 消费者并发限制

#### Redis 令牌桶限流：用 Redis + Lua 实现分布式令牌桶,**全局每秒 N 次请求**。

新建 RedisRateLimiter.java(common/util 包)

```java
package com.blog.blog.common.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
public class RedisRateLimiter {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    // Lua 脚本:令牌桶算法(原子操作,无并发问题)
    // KEYS[1] = 限流 key, ARGV[1] = 桶容量, ARGV[2] = 每秒生成令牌数, ARGV[3] = 当前时间戳(秒)
    private static final String TOKEN_BUCKET_SCRIPT =
            "local capacity = tonumber(ARGV[1])\n" +
            "local rate = tonumber(ARGV[2])\n" +
            "local now = tonumber(ARGV[3])\n" +
            "local key = KEYS[1]\n" +
            "local data = redis.call('HMGET', key, 'tokens', 'lastTime')\n" +
            "local tokens = tonumber(data[1]) or capacity\n" +
            "local lastTime = tonumber(data[2]) or now\n" +
            "local delta = math.max(0, now - lastTime)\n" +
            "tokens = math.min(capacity, tokens + delta * rate)\n" +
            "if tokens >= 1 then\n" +
            "  tokens = tokens - 1\n" +
            "  redis.call('HMSET', key, 'tokens', tokens, 'lastTime', now)\n" +
            "  redis.call('EXPIRE', key, 86400)\n" +
            "  return 1\n" +
            "else\n" +
            "  return 0\n" +
            "end";

    /**
     * 尝试获取令牌
     * @param key      限流维度(如 "deepseek:summary")
     * @param capacity 令牌桶容量(瞬时最大突发)
     * @param rate     每秒生成令牌数(长期平均速率)
     * @return true=获取到,允许请求;false=限流,拒绝请求
     */
    public boolean tryAcquire(String key, int capacity, int rate) {
        DefaultRedisScript<Long> script = new DefaultRedisScript<>(TOKEN_BUCKET_SCRIPT, Long.class);
        Long nowSeconds = System.currentTimeMillis() / 1000;
        Long result = stringRedisTemplate.execute(script,
                Collections.singletonList(key),
                String.valueOf(capacity),
                String.valueOf(rate),
                String.valueOf(nowSeconds));
        return Long.valueOf(1L).equals(result);
    }
}
```

##### SummaryConsumer 中使用

```java
@Autowired
private RedisRateLimiter rateLimiter;

@RabbitListener(queues = RabbitMQConfig.SUMMARY_QUEUE)
public void handleSummaryGeneration(SummaryGenerateMessage message) {
    Long articleId = message.getArticleId();

    // 限流:全局每秒 3 次,突发最多 5 次(按需调整)
    boolean allowed = rateLimiter.tryAcquire("deepseek:summary", 5, 3);
    if (!allowed) {
        log.warn("AI API 限流触发,articleId={},稍后重试", articleId);
        // 抛异常 → 进入死信队列,后续手动批量重试
        throw new RuntimeException("AI API 限流,进入死信队列,articleId=" + articleId);
    }

    // ... 后续正常流程
}
```

#### 消费者并发限制(简单粗暴,不需要限流组件)

在 `@RabbitListener` 上限制并发数,**同时最多 N 个消费者线程在跑 AI 请求**。

```java
@RabbitListener(queues = RabbitMQConfig.SUMMARY_QUEUE, concurrency = "2-5")
// concurrency = "2-5" 表示最少 2 个并发,最多 5 个并发(按需调整)
public void handleSummaryGeneration(SummaryGenerateMessage message) {
    // ...
}
```

### 四、幂等性的具体实现(替换 TODO)

在 SummaryConsumer 中：

```java
@RabbitListener(queues = RabbitMQConfig.SUMMARY_QUEUE)
public void handleSummaryGeneration(SummaryGenerateMessage message) {
    Long articleId = message.getArticleId();
    log.info("开始异步生成文章摘要,articleId={}", articleId);

    // ① 幂等性检查(替换原 TODO)
    // key: summary:done:{articleId}  → 标记该文章摘要已生成
    String doneKey = "blog:summary:done:" + articleId;
    Boolean isFirst = redisUtil.setIfAbsent(doneKey, "1", 86400);  // 24小时
    if (!Boolean.TRUE.equals(isFirst)) {
        log.info("摘要已生成,跳过重复消费,articleId={}", articleId);
        return;  // 直接 ACK,不进入后续流程
    }

    // ② 限流检查(可选,如果用了令牌桶)
    boolean allowed = rateLimiter.tryAcquire("deepseek:summary", 5, 3);
    if (!allowed) {
        log.warn("AI API 限流,articleId={},稍后重试", articleId);
        // 注意:限流时要撤销幂等标记,否则重试时 SETNX 会认为已处理
        redisUtil.delete(doneKey);
        throw new RuntimeException("AI API 限流,进入死信队列");
    }

    // ③ 业务逻辑:查文章 → 调 AI → 更新 DB → 删缓存
    // ...
}
```
