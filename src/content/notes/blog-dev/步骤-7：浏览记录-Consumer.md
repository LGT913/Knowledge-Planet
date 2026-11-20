---
title: "步骤 7：浏览记录 Consumer"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 步骤 7：浏览记录 Consumer, blog-dev]
summary: "文件：service/BrowseHistoryConsumer.java"
private: false
---

### 步骤 7：浏览记录 Consumer

**文件**：`service/BrowseHistoryConsumer.java`

**设计思路**：
- 幂等性 key：`userId:articleId:timestamp`，确保同一次投递的重复消息被拦截，但不同时间点浏览同一篇文章能正常记录
- 使用 `LocalDateTime.now()` 作为浏览时间，而非消息中的 timestamp（消息投递可能有延迟）

```java
@Component
@RequiredArgsConstructor
public class BrowseHistoryConsumer {
    private static final Logger log = LoggerFactory.getLogger(BrowseHistoryConsumer.class);

    private final BrowseHistoryRepository browseHistoryRepository;
    private final RedisUtil redisUtil;

    @RabbitListener(queues = RabbitMQConfig.HISTORY_QUEUE)
    @Transactional
    public void handleBrowseHistory(BrowseHistoryMessage message) {
        // 幂等性检查：防止 MQ 重复投递
        String doneKey = BlogCacheConstants.HISTORY_DONE_PREFIX
                + message.getUserId() + ":" + message.getArticleId()
                + ":" + message.getTimestamp();
        Boolean isFirst = redisUtil.setIfAbsent(doneKey, "1", 86400);
        if (!Boolean.TRUE.equals(isFirst)) {
            return;
        }

        try {
            BrowseHistory history = new BrowseHistory();
            history.setUserId(message.getUserId());
            history.setArticleId(message.getArticleId());
            history.setBrowseTime(LocalDateTime.now());
            browseHistoryRepository.save(history);
        } catch (Exception e) {
            log.error("浏览记录持久化失败, userId={}, articleId={}",
                    message.getUserId(), message.getArticleId(), e);
            throw new RuntimeException("浏览记录持久化失败,进入死信队列", e);
        }
    }
}
```
