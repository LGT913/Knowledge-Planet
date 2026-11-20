---
title: "文章搜索功能 + MySQL 全文索引"
date: 2026-07-29
planet: blog-dev
tags: ["后端", "实战"]
summary: "在 getArticle 方法后、getAllArticles 方法前插入："
private: false
---
# 文章搜索功能 + MySQL 全文索引

### 步骤：

#### 修改 1：ArticleController.java — 新增 `/search` 端点

在 `getArticle` 方法后、`getAllArticles` 方法前插入：

```java
// 文章搜索（语义化入口，内部复用 getAllArticlesPage，避免逻辑重复）
    // 与 GET /list?keyword=xxx 等价，但 /search 语义更清晰，前端搜索场景专用
    @GetMapping("/search")
    public Result<PageResult<Article>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        // 参数校验：空关键词直接返回空页，不发 DB 查询
        if (keyword == null || keyword.trim().isEmpty())    {
            return Result.success(PageResult.empty(page, size));
        }
        // 关键词限长：防止超长字符串拖慢 LIKE 匹配（输入边界校验）
        String kw = keyword.trim();
        if (kw.length() > 50) {
            kw = kw.substring(0, 50);
        }
        // 复用 Service 分页查询（内部已有 Redis 缓存 + 分页 + 分类过滤）
        PageResult<Article> result = articleService.getAllArticlesPage(page, size, null, kw);
        return Result.success(result);
    }
```

**为什么复用 `getAllArticlesPage`？**：该方法已支持 `keyword` 参数，内部会走 ArticleRepository.findByTitleContainingOrContentContainingOrderByCreateTimeDesc() 分页查询。传 `categoryId=null` 表示不按分类过滤，只按关键词搜索。

### 修改 2：vo/PageResult.java — 加 `empty()` 静态方法

```java
// 快速构造空结果（关键词为空时用，避免发 DB 查询）
public static <T> PageResult<T> empty(int page, int size) {
    PageResult<T> result = new PageResult<>();
    result.setContent(Collections.emptyList());
    result.setPage(page);
    result.setSize(size);
    result.setTotalElements(0);
    result.setTotalPages(0);
    return result;
}
```

### 搜索链路全景图

```
用户请求：GET /api/article/search?keyword=Spring&page=0&size=10
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  Controller 层（参数校验 + 转发）                   │
│                                                    │
│  ① keyword.trim().isEmpty()?                      │
│     └─ 是 → PageResult.empty(0,10) → 返回空页      │
│     └─ 否 → 继续                                   │
│                                                    │
│  ② kw.length() > 50?                              │
│     └─ 是 → kw = kw.substring(0, 50)  截断         │
│     └─ 否 → 不变                                   │
│                                                    │
│  ③ articleService.getAllArticlesPage(0, 10, null, "Spring") │
└──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  Service 层（缓存 + 分页 + 分类逻辑）               │
│                                                    │
│  ④ 缓存 key = blog:article:list:page:0:kw:Spring  │
│                                                    │
│  ⑤ Redis 命中?                                     │
│     └─ 是 → 直接返回（~1ms）                      │
│     └─ 否 → 继续                                   │
│                                                    │
│  ⑥ DB 查询（带分页）                               │
│     ArticleRepository                              │
│       .findByTitleContainingOrContentContaining   │
│       OrderByCreateTimeDesc("Spring", "Spring",   │
│           PageRequest.of(0, 10))                   │
│                                                    │
│  ⑦ 写回 Redis（10-12 分钟随机过期）                 │
└──────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  DB 层（JPA 自动生成 SQL）                         │
│                                                    │
│  SELECT * FROM article                             │
│  WHERE title LIKE '%Spring%'                      │
│     OR content LIKE '%Spring%'                    │
│  ORDER BY create_time DESC                        │
│  LIMIT 10                                         │
└──────────────────────────────────────────────────┘
```

| 学习计划要求   | 实际落地                                                     |
| :------------- | :----------------------------------------------------------- |
| 文章搜索功能   | ✅ `/api/article/search` + `/api/article/list?keyword=` 双入口 |
| MySQL 全文索引 | ⚠️ 用 `LIKE` + 分页替代。博客数据量（<10 万）用 LIKE 足够，不需要 FULLTEXT。面试时能讲出 LIKE → FULLTEXT → Elasticsearch 的演进路径即可 |
| 分页搜索       | ✅ 复用已有分页逻辑，自动带缓存                               |
