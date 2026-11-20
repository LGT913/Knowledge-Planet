---
title: "步骤 8：浏览历史查询 Controller"
date: 2026-08-04
planet: blog-dev
tags: ["后端", "实战", 步骤 8：浏览历史查询 Controller, blog-dev]
summary: "文件：controller/UserHistoryController.java"
private: false
---

### 步骤 8：浏览历史查询 Controller

**文件**：`controller/UserHistoryController.java`

**设计思路**：
- 优先从 Redis List 读取（分页），响应快
- Redis 无数据时回源 DB（首次访问或缓存过期）
- 使用 `LinkedHashMap` 保持浏览顺序（最新在前）

```java
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserHistoryController {

    private final RedisUtil redisUtil;
    private final ArticleRepository articleRepository;
    private final BrowseHistoryRepository browseHistoryRepository;

    @GetMapping("/history")
    public Result<List<Article>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        Long userId = principal.getUserId();
        String historyKey = BlogCacheConstants.USER_HISTORY_KEY + userId;

        // 优先从 Redis 读取
        List<Object> articleIds = redisUtil.lRange(historyKey, page * size, (page + 1) * size - 1);
        if (articleIds != null && !articleIds.isEmpty()) {
            List<Long> ids = articleIds.stream()
                    .map(id -> Long.valueOf(id.toString()))
                    .collect(Collectors.toList());
            Map<Long, Article> orderedMap = new LinkedHashMap<>();
            for (Long id : ids) {
                articleRepository.findById(id).ifPresent(a -> orderedMap.put(id, a));
            }
            return Result.success(new ArrayList<>(orderedMap.values()));
        }

        // Redis 无数据 → 回源 DB
        Page<BrowseHistory> historyPage = browseHistoryRepository
                .findByUserIdOrderByBrowseTimeDesc(userId, PageRequest.of(page, size));
        List<Article> articles = historyPage.getContent().stream()
                .map(h -> articleRepository.findById(h.getArticleId()).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        return Result.success(articles);
    }
}
```

**BrowseHistory 实体**（含索引修复）：

```java
@Data
@Entity
@Table(name = "browse_history", indexes = {
        @Index(name = "idx_user_time", columnList = "userId, browse_time DESC")})
public class BrowseHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long articleId;

    @Column(nullable = false)
    private LocalDateTime browseTime;
}
```

**RedisUtil 中使用的 List 方法**：

```java
// 从左侧推入元素（最新浏览在前）
public Long lPush(String key, Object value) {
    return redisTemplate.opsForList().leftPush(key, value);
}

// 修剪列表，只保留指定范围
public void lTrim(String key, long start, long end) {
    redisTemplate.opsForList().trim(key, start, end);
}

// 获取列表指定范围内的元素（分页）
public List<Object> lRange(String key, long start, long end) {
    return redisTemplate.opsForList().range(key, start, end);
}
```

---
