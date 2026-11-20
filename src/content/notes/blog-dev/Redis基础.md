---
title: "Redis基础"
date: 2026-07-15
planet: blog-dev
tags: ["后端", "实战"]
summary: "链接🔗：https://blog.csdn.net/weixin52741870/article/details/157426069"
private: false
---
# Redis基础

1.术语速览

| 术语                    | 通俗解释                                                     | 类比                                     |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| **Redis**               | 内存型键值数据库，读写速度极快，用来做缓存、分布式锁、计数器等 | 高速缓存仓库                             |
| **Jedis**               | Java 操作 Redis 的原生客户端，底层直接发命令                 | 手动扳手（基础工具）                     |
| **Lettuce**             | SpringBoot 2.x + 默认的 Redis 客户端，支持异步、集群、连接池 | 智能电动工具（更省力）                   |
| **RedisTemplate**       | Spring 对 Redis 客户端的封装，支持所有数据类型、自定义序列化，企业级通用 | 万能工具箱                               |
| **StringRedisTemplate** | RedisTemplate 的子类，专门处理字符串类型，默认序列化更友好   | 字符串专用工具箱                         |
| **Redis 连接池**        | 提前创建好一批 Redis 连接，复用给请求，避免频繁创建销毁连接  | 银行窗口（不用每次开新窗口）             |
| **序列化 / 反序列化**   | 把 Java 对象转成 Redis 能存的字节（序列化），再读出来转回对象（反序列化） | 打包 / 拆快递                            |
| **分布式锁**            | 用 Redis 控制多个服务 / 请求互斥执行同一操作，防止重复提交、并发问题 | 公共卫生间的门锁                         |
| **Lua 脚本**            | 在 Redis 里执行的脚本，用来保证多个命令的原子性（要么全成功要么全失败） | 一次性执行的 “组合拳” 指令               |
| **过期时间（expire）**  | 给 Redis 的 key 设置自动删除时间，防止数据一直占内存         | 超市食品的保质期                         |
| **缓存穿透**            | 请求查不存在的数据，一直打到数据库，压垮 DB                  | 有人反复问不存在的快递单号               |
| **缓存击穿**            | 热点 key 过期瞬间，大量请求打到数据库                        | 热门景点门票突然售罄，游客全挤到售票窗口 |
| **缓存雪崩**            | 大量 key 同时过期，所有请求瞬间压垮数据库                    | 所有航班同时取消，旅客全挤到柜台         |
| **@Cacheable**          | Spring 缓存注解，方法结果自动存 Redis，下次调用直接读缓存    | 常用知识点抄到小抄上                     |
| **@CacheEvict**         | Spring 缓存注解，删除 Redis 里的缓存数据                     | 擦掉过时的小抄                           |

#### 二、Java 原生环境操作 Redis（Jedis）

链接🔗：https://blog.csdn.net/weixin_52741870/article/details/157426069

​             https://blog.csdn.net/2503_92145588/article/details/148574225





# 给文章列表添加分页查询，替换全量 `findAll`

**项目改造任务**：

1：`blog/src/main/java/com/blog/blog/entity/Article.java`

```
@Column(name="summary", length=1000)   // length 500 → 1000，给 summary 留足空间
private String summary;
```

2：`blog/src/main/java/com/blog/blog/repository/ArticleRepository.java`

```
// 新增：分页查询，按创建时间倒序
Page<Article> findAllByOrderByCreateTimeDesc(Pageable pageable);  //该方法在问题一的getAllArticlesPage有使用
```

3：`blog/src/main/java/com/blog/blog/service/ArticleService.java`

```
// 分页查询文章列表（返回 PageResult，避免序列化 PageImpl）
PageResult<Article> getAllArticlesPage(int page, int size);
```

4：`blog/src/main/java/com/blog/blog/service/impl/ArticleServiceImpl.java`

```
    @Override
    public Article getArticle(Long id) {
        String key = ARTICLE_DETAIL_KEY_PREFIX + id;

        // 1. 先从 Redis 查
        Object cacheObj = redisUtil.get(key);
        if (!ObjectUtils.isEmpty(cacheObj)) {
            return (Article) cacheObj;
        }

        // 2. 缓存未命中，从数据库查
        Article article = articleRepository.findById(id).orElseThrow(() -> new RuntimeException("文章不存在"));

        // 3. 写入 Redis，过期时间 30 分钟
        redisUtil.set(key, article, ARTICLE_DETAIL_EXPIRE);
        return article;
    }
```

5：`blog/src/main/java/com/blog/blog/controller/ArticleController.java`

    //替换老 list 方法
    @GetMapping("/list")
    public Result<PageResult<Article>> getAllArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageResult<Article> articles = articleService.getAllArticlesPage(page, size);
        return Result.success(articles);
    }



## 问题：

#### 问题一：Serializing PageImpl 警告

现象：HTTP 431。

1.新建 VO 类。新建PageResult.java

```
@Data
public class PageResult<T> {
    private List<T> content;     //当前页数据列表
    private long totalElements;  //总记录数
    private int totalPages;      //总页数
    private int number;          //当前页码（从 0 开始）
    private int size;            //每页大小
    private boolean first;       //是否是第一页
    private boolean last;        //是否是最后一页
    private boolean hasNext;     //是否有下一页
    private boolean hasPrevious; //是否有上一页
    
    //从 Spring Data 的 Page 对象构造 PageResult
    //手动构造 PageResult（用于缓存命中时）
```

2.ArticleServiceImpl.java

- 新增分页缓存 key 常量 `ARTICLE_LIST_PAGE_KEY`

```
    private static final String ARTICLE_LIST_PAGE_KEY = "article:list:page:";  //分页文章数据的前缀
```

- 修复 `getAllArticlesPage()` 添加缓存读取逻辑

`ArticleService`返回对象改为` PageResult<Article>`,实现层使用 `PageResult.of()` 构造返回对象

```
@Override
    public PageResult<Article> getAllArticlesPage(int page, int size) {
        // 【参数校验】防止前端乱传导致 400
        if (page < 0) page = 0;
        if (size <= 0) size = 10;

        String listKey = ARTICLE_LIST_PAGE_KEY + page;
        String totalKey = ARTICLE_TOTAL_COUNT_KEY;

        // 1. 先从 Redis 查缓存（同时查列表和总数）
        Object cacheObj = redisUtil.get(listKey);
        Object totalObj = redisUtil.get(totalKey);

        // 2. 缓存命中：列表和总数都存在，直接返回，不查数据库
        if (!ObjectUtils.isEmpty(cacheObj) && !ObjectUtils.isEmpty(totalObj)) {
            @SuppressWarnings("unchecked")
            List<Article> cachedList = (List<Article>) cacheObj;
            long total = ((Number) totalObj).longValue();

            // 使用缓存的列表和总数构造 PageResult，完全不查数据库
            return PageResult.of(cachedList, total, page, size);
        }

        // 3. 缓存未命中：从数据库查询（排序规则封装在 Repository 方法中）
        Pageable pageable = PageRequest.of(page, size);
        Page<Article> pageResult = articleRepository.findAllByOrderByCreateTimeDesc(pageable);

        // 4. 写入 Redis 缓存
        redisUtil.set(listKey, pageResult.getContent(), ARTICLE_LIST_EXPIRE);
        redisUtil.set(totalKey, pageResult.getTotalElements(), ARTICLE_TOTAL_EXPIRE);

        // 5. 返回 PageResult（而不是 PageImpl）
        return PageResult.of(pageResult);
    }
```

- 修改 `clearRelatedCaches()` 删除分页缓存

```
//删除缓存
    private void clearRelatedCaches(Long articleId) {
        redisUtil.delete(ARTICLE_LIST_KEY);
        // 删除所有分页缓存（使用通配符，需要RedisTemplate支持）
        // 由于当前RedisUtil不支持模糊删除，这里删除常用分页缓存
        for (int i = 0; i < 10; i++) {
            redisUtil.delete(ARTICLE_LIST_PAGE_KEY + i);
        }
        redisUtil.delete(ARTICLE_DETAIL_KEY_PREFIX + articleId);
        redisUtil.delete(ARTICLE_RANKING_VIEWS_KEY);
        redisUtil.delete(ARTICLE_RANKING_LATEST_KEY);
        redisUtil.delete(ARTICLE_TOTAL_COUNT_KEY); //清除总数缓存
    }
```

3.ArticleController.java

返回类型从 `Result<Page<Article>>` 改为 `Result<PageResult<Article>>`



#### 问题二：缓存命中后仍查总数

**根因**：原代码在缓存命中后仍调用了 `articleRepository.findAll(pageable)` 获取总数

**解决方案**：修改`ArticleServiceImpl.java`的 `getAllArticlesPage` 方法

```// 修改前：缓存命中后仍创建 Pageable 查总数
Object cacheObj = redisUtil.get(listKey);
if (!ObjectUtils.isEmpty(cacheObj)) {
    // 问题：这里还创建了 pageable，会触发 count 查询
    Pageable pageable = PageRequest.of(page, size, ...);
    return new PageImpl<>(cachedList, pageable, total);
}


// 修改后：同时查列表和总数缓存，完全不查数据库
Object cacheObj = redisUtil.get(listKey);
Object totalObj = redisUtil.get(totalKey);
if (!ObjectUtils.isEmpty(cacheObj) && !ObjectUtils.isEmpty(totalObj)) {
    return PageResult.of(cachedList, total, page, size);  // ✅ 不查数据库
}
```

#### 问题三：HTTP 431 问题

**部分原因**：JWT 拦截器逻辑不完善，OPTIONS 预检请求和部分 GET 请求被拦截

**解决方案**：修改`JwtInterceptor.java`

```
// 新增：放行 OPTIONS 预检请求（跨域）
if ("OPTIONS".equalsIgnoreCase(method)) {
    return true;
}

// 完善：放行所有公开的 GET 请求
if ("GET".equalsIgnoreCase(method)) {
    if (requestURI.equals("/api/article/list") ||
        requestURI.equals("/api/category/list") ||
        // ... 其他公开接口
    ) {
        return true;
    }
}
```

**现象**：文章内容通过 URL 查询参数传递，导致 URL 过长，超过了服务器的请求头大小限制

**根本原因**：不是 JWT、不是 Redis、不是分页，而是**参数传递方式选择不当**。

短文本用 URL 参数没问题，但长文本（文章内容）必须用请求体传递。这是一个典型的"前端 API 调用方式错误"导致的问题。

**解决方案**：修改后端：使用请求体接收参数

```
// 修复前：@RequestParam 通过 URL 参数接收
@PutMapping("/update/{id}")
public Result<Article> updateArticle(@PathVariable Long id, 
    @RequestParam String title, @RequestParam String content) {

// 修复后：@RequestBody 通过请求体接收
@PutMapping("/update/{id}")
public Result<Article> updateArticle(@PathVariable Long id, 
    @RequestBody Article article) {
```

#### 问题四：文章分类修改失败

**根因**：后端接口没有接收 `categoryId` 参数，前端也没有传递。

**解决方案**：

| ArticleService.java     | createArticle和updateArticle方法接口添加 `categoryId` 参数 |
| ----------------------- | ---------------------------------------------------------- |
| ArticleServiceImpl.java | 同上更新逻辑添加 `setCategoryId(categoryId)`               |
| ArticleController.java  | 调用 service 时传入 `article.getCategoryId()`              |
