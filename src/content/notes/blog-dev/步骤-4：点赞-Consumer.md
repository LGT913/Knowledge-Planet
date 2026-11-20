---
title: "步骤 4：点赞 Consumer"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 步骤 4：点赞 Consumer, blog-dev]
summary: "文件：service/LikeConsumer.java"
private: false
---

### 步骤 4：点赞 Consumer

**文件**：`service/LikeConsumer.java`

**设计思路**：
- 幂等性 key 格式：`blog:like:done:{articleId}:{userId}:{timestamp}`，包含时间戳
- DB 端使用 `UPDATE SET like_count = like_count + delta`，原子操作避免并发覆盖
- 失败抛出 RuntimeException → 进入死信队列

```java
@Component
@RequiredArgsConstructor
public class LikeConsumer {
    private static final Logger log = LoggerFactory.getLogger(LikeConsumer.class);

    private final ArticleRepository articleRepository;
    private final RedisUtil redisUtil;

    @RabbitListener(queues = RabbitMQConfig.LIKE_QUEUE)
    @Transactional
    public void handleLikeMessage(LikeMessage message) {
        // 幂等性检查
        String doneKey = BlogCacheConstants.LIKE_DONE_PREFIX
                + message.getArticleId() + ":" + message.getUserId()
                + ":" + message.getTimestamp();
        Boolean isFirst = redisUtil.setIfAbsent(doneKey, "1", 86400);
        if (!Boolean.TRUE.equals(isFirst)) {
            log.info("点赞消息已处理,跳过, articleId={}, userId={}",
                    message.getArticleId(), message.getUserId());
            return;
        }

        try {
            articleRepository.incrementLikeCount(message.getArticleId(), message.getDelta());
            log.info("点赞持久化成功, articleId={}, delta={}", message.getArticleId(), message.getDelta());
        } catch (Exception e) {
            log.error("点赞持久化失败, articleId={}", message.getArticleId(), e);
            throw new RuntimeException("点赞持久化失败,进入死信队列", e);
        }
    }
}
```

**ArticleRepository 中的原子更新方法**：

```java
// 原子增量更新：like_count = like_count + delta
@Modifying
@Transactional
@Query("UPDATE Article a SET a.likeCount = a.likeCount + :delta WHERE a.id = :id")
int incrementLikeCount(@Param("id") Long id, @Param("delta") int delta);

// 覆盖更新：like_count = count（用于定时任务兜底）
@Modifying
@Transactional
@Query("UPDATE Article a SET a.likeCount = :count WHERE a.id = :id")
int updateLikeCount(@Param("id") Long id, @Param("count") int count);
```
