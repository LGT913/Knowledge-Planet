---
title: "步骤 3：点赞 Controller"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 步骤 3：点赞 Controller, blog-dev]
summary: "文件：controller/LikeController.java"
private: false
---

### 步骤 3：点赞 Controller

**文件**：`controller/LikeController.java`

**设计思路**：
- 先通过 `SISMEMBER` 判断当前状态，实现**幂等性**：已点赞再点"like"直接返回，已取消再点"unlike"直接返回
- 点赞/取消时，Redis 先写（即时响应），MQ 异步发（最终一致）
- 脏标记 `ARTICLE_LIKE_DIRTY_KEY` 用 Set 存储，避免重复同步

```java
@RestController
@RequestMapping("/api/like")
@RequiredArgsConstructor
public class LikeController {

    private final RedisUtil redisUtil;
    private final RabbitTemplate rabbitTemplate;

    @PostMapping("/article/{articleId}")
    public Result<Map<String, Object>> likeArticle(
            @PathVariable Long articleId,
            @RequestParam(defaultValue = "like") String action,
            @AuthenticationPrincipal UserPrincipal principal) {

        Long userId = principal.getUserId();
        String userSetKey = BlogCacheConstants.ARTICLE_LIKE_USER_SET_KEY + articleId;
        String countKey = BlogCacheConstants.ARTICLE_LIKE_COUNT_KEY + articleId;

        // 判断当前状态
        boolean isLiked = Boolean.TRUE.equals(redisUtil.sismember(userSetKey, userId));

        // 幂等：已点赞再点"like" 或 未点赞再点"unlike" → 直接返回当前状态
        if (("like".equals(action) && isLiked) || ("unlike".equals(action) && !isLiked)) {
            Object count = redisUtil.get(countKey);
            int likeCount = count instanceof Number ? ((Number) count).intValue() : 0;
            Map<String, Object> result = new HashMap<>();
            result.put("liked", isLiked);
            result.put("likeCount", likeCount);
            return Result.success(result);
        }

        // 执行点赞/取消点赞
        int delta;
        if ("like".equals(action)) {
            redisUtil.sadd(userSetKey, userId);       // Set 记录点赞用户
            redisUtil.increment(countKey);             // 计数 +1
            delta = 1;
        } else {
            redisUtil.srem(userSetKey, userId);        // Set 移除用户
            redisUtil.incrementBy(countKey, -1);       // 计数 -1
            delta = -1;
        }
        redisUtil.sadd(BlogCacheConstants.ARTICLE_LIKE_DIRTY_KEY, articleId); // 脏标记

        // 发送 MQ 异步持久化
        LikeMessage msg = new LikeMessage();
        msg.setArticleId(articleId);
        msg.setUserId(userId);
        msg.setDelta(delta);
        msg.setTimestamp(System.currentTimeMillis());
        rabbitTemplate.convertAndSend(RabbitMQConfig.LIKE_EXCHANGE,
                RabbitMQConfig.LIKE_ROUTING_KEY, msg);

        // 返回最新状态
        Object count = redisUtil.get(countKey);
        int likeCount = count instanceof Number ? ((Number) count).intValue() : 0;
        Map<String, Object> result = new HashMap<>();
        result.put("liked", "like".equals(action));
        result.put("likeCount", likeCount);
        return Result.success(result);
    }
}
```
