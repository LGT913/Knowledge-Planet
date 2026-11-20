---
title: "第 1 周：Redis 基础巩固与缓存重构"
date: 2026-07-11
planet: growth
tags: ["面试", "复习", 第 1 周：Redis 基础巩固与缓存重构, growth]
summary: "// 第 41-57 行：替换 loadArticles 方法     const loadArticles = async  = {       loading.value = true       error.value = ''   "
private: false
---

## 第 1 周：Redis 基础巩固与缓存重构

### 第 1 周 星期一（第 1 天）
- **今日目标**：搭建 Redis 可视化环境 + 重构博客 RedisTemplate 配置
- **项目改造任务**：
  - 修改文件：`blog/src/main/java/com/blog/blog/config/RedisConfig.java`（新建）
  - 具体操作：
    ```java
    // 第 3-8 行：添加 Jackson2JsonRedisSerializer 配置
    @Configuration
    public class RedisConfig {
        @Bean
        public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
            RedisTemplate<String, Object> template = new RedisTemplate<>();
            template.setConnectionFactory(factory);
            // key 用 String 序列化
            template.setKeySerializer(new StringRedisSerializer());
            // value 用 Jackson2JsonRedisSerializer
            Jackson2JsonRedisSerializer<Object> serializer = new Jackson2JsonRedisSerializer<>(Object.class);
            ObjectMapper mapper = new ObjectMapper();
            mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
            mapper.activateDefaultTyping(LazyValidatorFactory.ObjectMapperDefaultTyping.NON_FINAL);
            serializer.setObjectMapper(mapper);
            template.setValueSerializer(serializer);
            template.setHashKeySerializer(new StringRedisSerializer());
            template.setHashValueSerializer(serializer);
            template.afterPropertiesSet();
            return template;
        }
    }
    ```
  - 预期效果：Redis 中存储的缓存数据可读，不再显示二进制乱码
- **核心知识点**：
  - 学习内容：Redis 数据类型（String/List/Hash/Set/ZSet）及底层数据结构
  - 学习资源：[Redis 官方文档 - 数据类型](https://redis.io/docs/data-types/)（读 Introduction to Redis data types 部分）
- **LeetCode刷题**：
  - 题目：[206. 反转链表](https://leetcode.cn/problems/reverse-linked-list/)（考察：链表指针操作）
- **今日检查项**：
  - [ ] 项目能正常启动，不报 Redis 连接错误
  - [ ] 写一篇测试文章，用 RedisInsight / Redis CLI 查看缓存数据是 JSON 格式
- **常见问题与解决方案**：
  - `ClassCastException`：Jackson 序列化时未启用类型信息，添加 `activateDefaultTyping` 即可
  - Redis 连不上：检查 `application.properties` 的 host/port 是否正确，Redis 服务是否启动

---

### 第 1 周 星期二（第 2 天）
- **今日目标**：给文章列表添加分页查询，替换全量 `findAll`
- **项目改造任务**：
  - 修改文件 1：`blog/src/main/java/com/blog/blog/entity/Article.java`（第 34 行）
    ```java
    @Column(name="summary", length=1000)  // length 500 → 1000，给 summary 留足空间
    private String summary;
    ```
  - 修改文件 2：`blog/src/main/java/com/blog/blog/repository/ArticleRepository.java`
    ```java
    // 新增：分页查询，按创建时间倒序
    Page<Article> findAllByOrderByCreateTimeDesc(Pageable pageable);
    ```
  - 修改文件 3：`blog/src/main/java/com/blog/blog/service/ArticleService.java`
    ```java
    // 新增方法
    Page<Article> getAllArticlesPage(int page, int size);
    ```
  - 修改文件 4：`blog/src/main/java/com/blog/blog/service/impl/ArticleServiceImpl.java`
    ```java
    // 第 73-86 行：新增 getArticlePage 实现
    @Override
    public Page<Article> getAllArticlesPage(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"));
        Page<Article> pageResult = articleRepository.findAllByOrderByCreateTimeDesc(pageable);
        // 缓存整个 Page 对象（JSON 序列化支持）
        redisUtil.set(ARTICLE_LIST_KEY, pageResult, 600);
        return pageResult;
    }
    ```
  - 修改文件 5：`blog/src/main/java/com/blog/blog/controller/ArticleController.java`
    ```java
    // 第 29-32 行：替换老 list 方法
    @GetMapping("/list")
    public Result<Page<Article>> getAllArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<Article> articles = articleService.getAllArticlesPage(page, size);
        return Result.success(articles);
    }
    ```
  - 预期效果：`GET /api/article/list?page=0&size=10` 返回分页数据，包含 totalPages、totalElements
- **核心知识点**：
  - 学习内容：Spring Data JPA 分页（Pageable/Page/PageRequest）、排序（Sort）
  - 学习资源：[Spring Data JPA 官方文档 - Pagination](https://docs.spring.io/spring-data/jpa/reference/repositories/core-concepts.html)（搜索 "Paging and sorting" 部分）
- **LeetCode刷题**：
  - 题目：[146. LRU 缓存](https://leetcode.cn/problems/lru-cache/)（考察：HashMap + 双向链表，Redis 淘汰策略类似思想）
- **今日检查项**：
  - [ ] `/api/article/list?page=0&size=10` 返回正确分页 JSON
  - [ ] 缓存中存的是分页后的数据（不是全量）
  - [ ] `Page` 对象序列化不报错
- **常见问题与解决方案**：
  - `Page` 序列化报错：Spring Data JPA 的 `Page` 接口默认序列化可能有问题，可以用 `PagedModel` 或手动构造返回 Map
  - 前端接收分页数据后展示不对：检查前端 `articleApi.list()` 是否传了分页参数

---

### 第 1 周 星期三（第 3 天）
- **今日目标**：前端对接分页接口 + 添加分页组件，替换全量加载
- **项目改造任务**：
  - 修改文件 1：`blog-vue/src/api/index.js`（第 63 行）
    ```javascript
    // 修改 articleApi.list()
    list: (page = 0, size = 10) => request(`/article/list?page=${page}&size=${size}`),
    ```
  - 修改文件 2：`blog-vue/src/views/Home.vue`
    ```javascript
    // 第 6 行：新增响应式变量
    const currentPage = ref(0)
    const pageSize = ref(10)
    const totalPages = ref(0)
    
    // 第 41-57 行：替换 loadArticles 方法
    const loadArticles = async () => {
      loading.value = true
      error.value = ''
      try {
        const result = await articleApi.list(currentPage.value, pageSize.value)
        console.log('[Home] 分页数据:', result)
        articles.value = result.content || []
        totalPages.value = result.totalPages || 0
      } catch (e) {
        error.value = e.message || '获取文章失败'
      } finally {
        loading.value = false
      }
    }
    
    // 新增：切换页码
    const changePage = (page) => {
      currentPage.value = page
      loadArticles()
    }
    ```
  - 修改文件 3：`blog-vue/src/views/Home.vue`（template 部分，文章列表下方添加分页控件）
    ```html
    <!-- 分页控件，放在文章列表下方 -->
    <div v-if="totalPages > 1" class="pagination">
      <button @click="changePage(currentPage - 1)" :disabled="currentPage === 0" class="page-btn">
        上一页
      </button>
      <span class="page-info">{{ currentPage + 1 }} / {{ totalPages }}</span>
      <button @click="changePage(currentPage + 1)" :disabled="currentPage >= totalPages - 1" class="page-btn">
        下一页
      </button>
    </div>
    ```
  - 预期效果：首页文章列表支持分页浏览
- **核心知识点**：
  - 学习内容：前端分页原理、Vue 响应式数据更新
  - 学习资源：Vue3 官方文档 - Reactivity Fundamentals
- **LeetCode刷题**：
  - 题目：[160. 相交链表](https://leetcode.cn/problems/intersection-of-two-linked-lists/)（考察：双指针/哈希集合）
- **今日检查项**：
  - [ ] 分页控件能正常工作，点击切换不报错
  - [ ] 数据量少时隐藏分页组件
  - [ ] 切换分类后分页重置为第 1 页
- **常见问题与解决方案**：
  - 切换分类后当前页没重置：在 `activeCategory` 的 watch 中重置 `currentPage = 0`
  - 分页信息显示 NaN：检查 `totalPages` 是否从后端正确取到

---

### 第 1 周 星期四（第 4 天）
- **今日目标**：解决 Redis 缓存三大问题（穿透/击穿/雪崩）
- **项目改造任务**：
  - 修改文件：`blog/src/main/java/com/blog/blog/service/impl/ArticleServiceImpl.java`
  - 具体操作：
    ```java
    // 第 56-70 行：修改 getArticle 方法，加入缓存击穿防护
    @Override
    public Article getArticle(Long id) {
        String key = ARTICLE_DETAIL_KEY + id;
        
        // 1. 先从 Redis 查
        Article article = (Article) redisUtil.get(key);
        if (article != null) {
            return article;  // 缓存命中
        }
        
        // 2. 缓存未命中，加分布式锁防止缓存击穿
        String lockKey = "article:lock:" + id;
        Boolean locked = redisTemplate.opsForValue().setIfAbsent(lockKey, "locked", 
                Duration.ofSeconds(30));
        
        if (Boolean.TRUE.equals(locked)) {
            try {
                // 3. 二次检查（double check），防止并发
                article = (Article) redisUtil.get(key);
                if (article != null) {
                    return article;
                }
                
                // 4. 从数据库查
                article = articleRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("文章不存在"));
                
                // 5. 写入缓存
                redisUtil.set(key, article, 1800);
                return article;
            } finally {
                redisUtil.delete(lockKey);  // 释放锁
            }
        } else {
            // 6. 没拿到锁，自旋等待
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return getArticle(id);  // 递归重试
        }
    }
    
    // 新增：缓存穿透防护（查数据库时，如果没找到，缓存空值）
    // 第 44-58 行：修改 getAllArticlePage 方法
    private static final String ARTICLE_NULL_VALUE = "NULL";
    
    @Override
    public Page<Article> getAllArticlesPage(int page, int size) {
        String key = ARTICLE_LIST_KEY + ":" + page + ":" + size;
        
        // 1. 查缓存
        Object cached = redisUtil.get(key);
        if (cached != null) {
            if (ARTICLE_NULL_VALUE.equals(cached)) {
                return Page.empty();  // 缓存空值，防穿透
            }
            return (Page<Article>) cached;
        }
        
        // 2. 数据库查
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"));
        Page<Article> pageResult = articleRepository.findAllByOrderByCreateTimeDesc(pageable);
        
        // 3. 缓存结果或空值
        if (pageResult.hasContent()) {
            redisUtil.set(key, pageResult, 600);
        } else {
            redisUtil.set(key, ARTICLE_NULL_VALUE, 120);  // 缓存空值，短过期
        }
        return pageResult;
    }
    
    // 修改 updateArticle 和 deleteArticle：删除详情锁（如果存在的话）
    ```
  - 预期效果：高并发场景下缓存不被打穿
- **核心知识点**：
  - 学习内容：缓存穿透（空值缓存/布隆过滤器）、缓存击穿（互斥锁/永不过期）、缓存雪崩（随机过期时间/多级缓存）
  - 学习资源：[美团技术 - Redis 缓存三大问题](https://tech.meituan.com/)（搜索"缓存穿透"）
- **LeetCode刷题**：
  - 题目：[705. 设计哈希集合](https://leetcode.cn/problems/design-hashset/)（考察：底层 hash 实现思想）
- **今日检查项**：
  - [ ] `setIfAbsent` 能成功拿到/释放锁
  - [ ] 同时发起多个请求，只有一个请求查数据库
  - [ ] 缓存空值不会撑爆 Redis（设置了短过期）
- **常见问题与解决方案**：
  - 递归自旋可能导致栈溢出：改用 `while` 循环 + 自旋次数限制（如 3 次）
  - `setIfAbsent` 是 `RedisTemplate` 的方法，需要注入 `RedisTemplate` 而不是 `RedisUtil`

---

### 第 1 周 星期五（第 5 天）
- **今日目标**：Redis 分布式锁进阶 + 实现幂等性防止重复提交
- **项目改造任务**：
  - 修改文件：`blog/src/main/java/com/blog/blog/common/RedisUtil.java`
    ```java
    // 第 16-22 行之间新增：分布式锁方法
    /**
     * 尝试获取分布式锁
     * @param key 锁的key
     * @param value 唯一标识（如 UUID）
     * @param timeout 过期时间（秒）
     * @return true 获取成功，false 失败
     */
    public boolean tryLock(String key, String value, long timeout) {
        return Boolean.TRUE.equals(redisTemplate.opsForValue()
                .setIfAbsent(key, value, timeout, TimeUnit.SECONDS));
    }
    
    /**
     * 释放分布式锁（Lua 脚本保证原子性）
     * @param key 锁的key
     * @param value 唯一标识（必须是自己的 value 才能释放）
     */
    public boolean unlock(String key, String value) {
        String script = "if redis.call('get', KEYS[1]) == ARGV[1] then " +
                "return redis.call('del', KEYS[1]) else return 0 end";
        DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>(script, Long.class);
        Long result = redisTemplate.execute(redisScript, Collections.singletonList(key), value);
        return Long.valueOf(1).equals(result);
    }
    ```
  - 修改文件：`blog/src/main/java/com/blog/blog/controller/ArticleController.java`
    ```java
    // 第 18-20 行：修改 create 方法，加锁防止重复提交
    @PostMapping("/create")
    public Result<Article> create(@RequestBody Article article) {
        // 生成请求唯一ID（可用 title + userId + 时间戳）
        String requestId = article.getTitle() + ":" + article.getUserId() + ":" + System.currentTimeMillis();
        String lockKey = "article:create:lock:" + requestId.hashCode();
        String lockValue = UUID.randomUUID().toString();
        
        try {
            boolean locked = redisUtil.tryLock(lockKey, lockValue, 5);
            if (!locked) {
                return Result.error("操作太频繁，请稍后重试");
            }
            Article createdArticle = articleService.createArticle(
                    article.getTitle(), article.getContent(), 
                    article.getUserId(), article.getCategoryId());
            return Result.success(createdArticle);
        } finally {
            redisUtil.unlock(lockKey, lockValue);
        }
    }
    ```
  - 预期效果：快速点击"发布文章"按钮不会创建多条相同文章
- **核心知识点**：
  - 学习内容：Redis 分布式锁原理、Lua 脚本保证原子性、Redisson 看门狗机制
  - 学习资源：[Redis 官方 - Distributed Locks](https://redis.io/docs/manual/patterns/distributed-locks/)（读 Introduction 部分）
- **LeetCode刷题**：
  - 题目：[20. 有效的括号](https://leetcode.cn/problems/valid-parentheses/)（考察：栈的应用）
- **今日检查项**：
  - [ ] 快速点击发布按钮只创建一条文章
  - [ ] Lua 脚本能正确释放锁（释放别人的锁不会成功）
  - [ ] `RedisUtil` 新增方法编译通过
- **常见问题与解决方案**：
  - `DefaultRedisScript` 导入的是 `org.springframework.data.redis.core.script.DefaultRedisScript`
  - Lua 脚本语法错误：先用 `redis-cli eval` 手动测试脚本

---

### 第 1 周 星期六 & 星期日
- **任务**：休息 / 补进度
- **复盘任务**（可选）：
  - 写一篇技术笔记：《Redis 缓存策略在博客项目中的实践》
  - 复习本周刷的 5 道 LeetCode 题

---
