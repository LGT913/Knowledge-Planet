---
title: "完善Redis基础"
date: 2026-07-12
planet: blog-dev
tags: ["后端", "实战"]
summary: "目前加入redis的疑问：redis是只有哪个实现类调用才会起作用是吗，那要怎么判断哪些模块需要我加入redis优化。"
private: false
---
# 完善Redis基础
- **目前加入redis的疑问**：**redis**是只有哪个实现类调用才会起作用是吗，那要怎么判断哪些模块需要我加入**redis**优化。

1.Redis 本身是独立服务，**谁调用 Redis 工具类 / RedisTemplate，谁才会走缓存逻辑**；不调用的 Service/Mapper，完全还是原生查 MySQL，和 Redis 无关。

2.**查询频率高、修改频率低**（最核心标准）：大量用户反复查，但数据很少增删改。

**数据量固定 / 变化慢**：比如分类、标签、公告、系统配置，长期不变。

**接口响应慢、数据库压力大**：列表页、首页、排行页，一次性查大量数据。

**纯查询业务，无实时强一致性要求**：允许缓存和数据库短暂不同步（博客完全满足）。

❌ 不建议加 Redis：频繁增删改、要求数据**强实时一致**的模块（比如支付、订单状态）。

#### 补充两个关键点

1. 配置类 `RedisConfig` 是全局生效

   

   只要项目启动，RedisTemplate就被 `Spring` 容器创建好了，所有类都可以注入使用，配置只需要写一次，不用每个模块重复配置。

2. 工具类 `RedisUtil` 是通用工具

   

   封装了增删改查、过期时间等方法，哪个 Service 需要缓存，就把它 `@Autowired`注入进去调用即可。
   



### 确定今日任务：增加个人博客的Redis优化，站点基础数据和排行类数据加入Redis；熟悉Redis命令

#### 步骤：

1.由于之前已经配置过`RedisConfig`和`RedisConfig`了，所以只需要修改.

2.对ArticleServiceImpl.java文件进行优化：

- 原错误代码：

```
// 旧写法（有并发风险）
redisUtil.set(ARTICLE_DETAIL_KEY + id, article, 1800);
```

修复后：加入Redis常量区

```
/** 文章列表缓存过期时间：10分钟(秒) */
private static final long ARTICLE_LIST_EXPIRE = 600L;
/** 文章详情缓存过期时间：30分钟(秒) */
private static final long ARTICLE_DETAIL_EXPIRE = 1800L;
```

```
// 标准写法：更新只删缓存 
redisUtil.delete(ARTICLE_DETAIL_KEY_PREFIX + id);
```

逻辑：数据库更新 → 让旧缓存失效，**下次查询自动重建缓存**，规避并发数据不一致。

- 使用 Spring 自带 `ObjectUtils.isEmpty()`，比 `null == obj` 更健壮，兼容集合、对象、空值场景。

原代码：

```
if (article != null)
if (articles != null)
```

修复后：

```
        Object cacheObj = redisUtil.get(任意对象);
        if (!ObjectUtils.isEmpty(cacheObj)) {
            return (数据类型) cacheObj;
        }
```

- 后续需要增加的功能：1.**区分前后台**:后台管理接口直接跳过缓存，强制查库，保证数据实时性。

  ​                              2.**分页查询适配**:新增**分页文章列表**，设计分页专属 Key，增删改统一删除所有分页缓存。

  ​                              3.**缓存预热**:使用 `@PostConstruct` 项目启动时，提前加载文章列表到 Redis。

  ​                              4.**自定义业务异常**:把 `RuntimeException` 替换为自定义业务异常，统一异常处理

3.增加站点基础数据(网站配置和公告)，同时加入redis：

- 先处理后端：在实体类，Reponsitory，Service接口，ServiceImpl，Controller五个层添加SiteConfig(网站配置)和Notice(公告)

entity层：SiteConfig建id，configKey，description，createTime，updateTime六个实体；

​              Notice建id，title，content，createTime，updateTime五个实体；

Service实现类：**SiteConfig 缓存** — [SiteConfigServiceImpl.java]

```private static final String SITE_CONFIG_KEY = "site:config";       // Redis Key 规范
private static final long SITE_CONFIG_EXPIRE = 600L;               // 统一 10 分钟
// 查询：查缓存 → ObjectUtils.isEmpty 判空 → 未命中查 DB → 写入缓存
getByConfigKey()  →  redisUtil.get(SITE_CONFIG_KEY)

// 增/改/删：只删缓存，不主动写入
saveConfig()      →  redisUtil.delete(SITE_CONFIG_KEY)
deleteConfig()    →  redisUtil.delete(SITE_CONFIG_KEY)
```

​                       **Notice 缓存** — [NoticeServiceImpl.java]

```
private static final String NOTICE_LIST_KEY = "notice:list";       // Redis Key 规范
private static final long NOTICE_LIST_EXPIRE = 600L;               // 统一 10 分钟

// 查询：查缓存 → 未命中查 DB → 写入缓存
getAllNotices()   →  redisUtil.get(NOTICE_LIST_KEY)

// 增/改/删：只删缓存
createNotice()    →  redisUtil.delete(NOTICE_LIST_KEY)
updateNotice()    →  redisUtil.delete(NOTICE_LIST_KEY)
deleteNotice()    →  redisUtil.delete(NOTICE_LIST_KEY)
```

API:

![image-20260712183930334](/notes-assets/完善Redis基础/image-20260712183930334.png)

- 排行榜：在Article的文件里添加

`Article`：新新增 `viewCount` 字段

`ArticleRepository`：新增 `findTop10ByOrderByViewCountDesc()` 和 `findTop10ByOrderByCreateTimeDesc()` 两个查询方法

`ArticleService`：新增 `getArticleRankingByViews()` 和 `getArticleRankingByLatest()` 两个接口方法

`ArticleServiceImpl`： 新增 2 个常量 + 2 个方法实现 + 增/删/改中补充清理排行缓存

`ArticleController`：新增 `GET /api/article/ranking/views`(阅读量排行) 和 `GET /api/article/ranking/latest`(最新发布排行)

对外暴露的接口：

![image-20260712202522633](/notes-assets/完善Redis基础/image-20260712202522633.png)

缓存策略：查询：查 Redis → ObjectUtils.isEmpty 判空 → 未命中查 DB → 写入 Redis（300s） 增/删/改：只删缓存，不主动写入（下次查询自动回源）

**为什么只删不写？**

- 排行数据是**高频读、低频写**场景，只在文章变更时失效足够满足一致性
- 避免在写操作中额外计算排行写入的复杂度和耦合
- 5 分钟过期时间确保了数据"最终新鲜"，也防止缓存长期不刷新



- `WebConfig`：在 `excludePathPatterns` 中新增了 3 个公开接口路径：
```
registry.addInterceptor(jwtInterceptor).addPathPatterns("/api/**")
        .excludePathPatterns("/api/user/login",
                "/api/user/register",
                "/api/article/list",
                "/api/article/ranking/views",     // ← 新增
                "/api/article/ranking/latest",    // ← 新增
                "/api/category/list",
                "/api/notice/list",);             // ← 新增
```

  `JwtInterceptor`： GET 绕过逻辑中新增 `/api/site/config`

```
if ("GET".equalsIgnoreCase(method)) {
    if (requestURI.matches("/api/article/\\d+") ||
        requestURI.matches("/api/category/\\d+") ||
        requestURI.matches("/api/comment/article/\\d+") ||
        requestURI.matches("/api/site/config")) {   //← 新增
        return true;
    }
}
```

权限逻辑：GET  /api/site/config?configKey=blog_info  → 匿名可访问（公开）
               POST /api/site/config                       → 需要 JWT token（仅管理员）

！知识点：为什么严格匹配精确路径而非通配符？

如果用 `/api/article/*` 做通配符放行，那么 `/api/article/create`（POST, 需要登录）也会被绕过。所以只放行**确切的公开接口路径**，保证该保护的接口依然受拦截器保护。
