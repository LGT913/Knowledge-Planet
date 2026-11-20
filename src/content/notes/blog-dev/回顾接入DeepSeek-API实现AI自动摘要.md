---
title: "回顾接入DeepSeek API实现AI自动摘要"
date: 2026-07-15
planet: blog-dev
tags: ["后端", "实战"]
summary: "2.appliaction.properties新增配置："
private: false
---
# 回顾接入DeepSeek API实现AI自动摘要

### 一.整体流程：

```
用户在博客创建文章
    ↓
后端接收到文章内容
    ↓
调用 DeepSeekService.generateSummary(content)
    ↓
DeepSeekService 构造 HTTP 请求 → 调用 DeepSeek API
    ↓
DeepSeek API 返回摘要结果
    ↓
将摘要存入 Article 对象的 summary 字段
    ↓
保存文章到数据库
```

### 二.核心逻辑代码编写：

1.在pom.xml中添加：

```
        <!--API接口-->
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>okhttp</artifactId>
            <version>4.12.0</version>
        </dependency>
```

2.appliaction.properties新增配置：

```
deepseek.api.key=[密钥已隐藏]   #你的deepseek api
deepseek.api.url=https://api.deepseek.com/v1/chat/completions  #URL地址
```

3.Article实体类新增summary字段（摘要存储位置）：

```
    @Column(name="summary",length=500)
    private String summary;
```

4.新建DeepSeekService(封装调用API的逻辑)：

```
@Service
public class DeepSeekService {

    @Value("${deepseek.api.key}")
    private String apiKey;

    @Value("${deepseek.api.url}")
    private String apiUrl;

    public String generateSummary(String content) {
        // 1. 构造请求体（model + messages）
        // 2. 设置请求头（Authorization: Bearer API Key）
        // 3. 发送 HTTP POST 请求
        // 4. 解析响应，提取摘要文本
        // 5. 返回摘要
    }
}
```

5.修改ArticleServiceImpl注入DeepSeekService：

```
@Autowired
private DeepSeekService deepSeekService;
```

修改createArticle方法：

```
// 调用 AI 生成摘要
String summary = deepSeekService.generateSummary(content);
article.setSummary(summary);
```

- 面试回答：分了 5 步：先在配置文件里配好 API Key 和 URL，然后在实体类里加 summary 字段，接着新建一个 DeepSeekService 封装调用 API 的逻辑，最后在 ArticleServiceImpl 里注入 Service，在创建文章时调用生成摘要并存入数据库。



# 完善JWT

```
┌────────────────────────────────────────────────────────────────────────┐
│                     后端 Spring Boot                                   │
│                                                                        │
│  ┌───────────────┐    ┌────────────────┐    ┌───────────────────┐      │
│  │ SecurityConfig│───▶│ WebMvcConfig   │───▶│  JwtInterceptor   │      │
│  │ permitAll()   │    │ 注册拦截器      │    │  preHandle()校验   │      │
│  └───────────────┘    └────────────────┘    └───────────────────┘      │
│                                                   │                    │
│                              ┌────────────────────┼──────────┐         │
│                              ▼                    ▼          ▼         │
│                        ① 路径在放行列表     ② 无 token     ③ 有 token    │
│                          直接放行 ✅         返回 401 ❌    解析 userId │
│                                                            请求放行 ✅  │
└────────────────────────────────────────────────────────────────────────┘
```

## 一.核心逻辑代码编写

#### 1. pom.xml — 依赖管理

引入 JWT 库（jjwt）和 Spring Security（用于 BCrypt 密码加密）:

```
<!-- JWT 核心库（JJWT 0.12.6） -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>    <!-- API：Jwts, Claims 等 -->
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>    <!-- 实现类（运行期需要） -->
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId> <!-- JSON 序列化（运行期需要） -->
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>

<!-- Spring Security（只用了 BCryptPasswordEncoder） -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

1. `jjwt-api` — JWT 的核心 API，提供 `Jwts`、`Claims`、`Keys` 等类
2. `jjwt-impl` — JJWT 的实现类（运行期需要）
3. `jjwt-jackson` — JJWT 的 JSON 序列化支持（运行期需要）



#### 2.application.properties — JWT 配置

````
# JWT??
jwt.secret-key=MySecretKeyForJWTTokenGeneration2026BlogProject
jwt.expiration-time=86400000
````

存储JWT配置私密信息，防止被人直接获取用来攻破JWT。

- 定义一个**足够长的密钥**（至少 256 位，否则 HMAC-SHA256 会报错）
- 定义过期时间（24 小时，单位毫秒）

#### 3. JwtUtil.java — JWT 工具类

拦截 HTTP 请求，校验 token，通过后把 userId 设置到 request 属性

```
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationTime;

    // 构造方法注入，Spring一定会执行
    public JwtUtil(@Value("${jwt.secret-key}") String secretKey,
                   @Value("${jwt.expiration-time}") long expirationTime) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalArgumentException("❌ JWT secret-key 未配置");
        }
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.expirationTime = expirationTime;
        System.out.println("✅ JWT Key 初始化成功");
    }
    
    // 方法1：生成 token — 用 userId 做 subject，带上签发时间和过期时间
    public String generateToken(Long userId) {
        return Jwts.builder().subject(userId.toString())    // 把 userId 存入 payload
                .issuedAt(new Date())                       // 签发时间
                .expiration(new Date(System.currentTimeMillis()+expirationTime))  // 过期时间
                .signWith(key)                               // HMAC-SHA256 签名
                .compact();
    }
    
    // 方法2：解析 token → 取出 userId,从 token 解析出用户 ID
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.parseLong(claims.getSubject());
    }
    
    // 方法3：校验 token 是否有效（捕获所有异常，无效就返回 false）
     public boolean validateToken(String token) {
        try{
            Jwts.parser().verifyWith(key)
                    .build()
                    .parseClaimsJws(token);
            return true;
        }catch(Exception e){
            return false;  // 过期、签名错误、格式错误全部返回 false
        }
     }
}
```

- **编写思路：**

1. 先声明`final`字段，
2. `JwtUtil`：用构造方法注入，`@Value`封装`sertKey`和`expirationTime`；接着空值校验，没配密钥直接启动时报错；`Keys.hmacShaKeyFor(...)`把字符串密钥转成JJWT能识别的SecretKey对象
3. `generateToken`：用 `Jwts.builder()` 构建 token，把 `userId.toString()` 放进 `subject`，设置签发时间 `issuedAt` 和过期时间 `expiration`，用 `signWith(key)` 签名，最后 `compact()` 输出字符串
4. `getUserIdFromToken`：解析 token 拿 `Claims`，从 `getSubject()` 取出 userId 字符串转成 Long
5. `validateToken`：用 `try-catch` 包裹——JWT 过期会抛 `ExpiredJwtException`，签名错误会抛 `SignatureException`，格式错误也会抛异常，统一返回 `false`

#### 4. JwtInterceptor.java — JWT 拦截器

拦截 HTTP 请求，校验 token，通过后把 userId 设置到 request 属性

```
@Override
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    String requestURI = request.getRequestURI();

    // 第一层：GET 请求的某些详情接口直接放行（不需要 token）
    if ("GET".equalsIgnoreCase(method)) {
        if (匹配详情路径) return true;
    }

    // 第二层：取 Authorization 头
    String token = request.getHeader("Authorization");
    if (token == null || token.isEmpty()) {
        response.setStatus(401);  // 未登录
        return false;
    }

    // 第三层：校验 token 有效性
    if (!jwtUtil.validateToken(token)) {
        response.setStatus(401);  // token 过期或无效
        return false;
    }

    // 第四层：解析 userId，放到请求属性中供 Controller 使用
    Long userId = jwtUtil.getUserIdFromToken(token);
    request.setAttribute("userId", userId);
    return true;
}
```

```
① 请求进来
  ↓
② 请求是否匹配 GET 绕过路径？（如文章详情、站点配置等公开的 GET 接口）
  ├─ 是 → 直接放行 ✅
  └─ 否 → 进入下一步
  ↓
③ 请求头中是否携带 Authorization？
  ├─ 无 → 返回 401 "未登录" ❌
  └─ 有 → 进入下一步
  ↓
④ Token 是否有效？（调用 jwtUtil.validateToken）
  ├─ 无效 → 返回 401 "token无效或已过期" ❌
  └─ 有效 → 进入下一步
  ↓
⑤ 解析 userId，存入 request.setAttribute("userId", userId)
  ↓
⑥ 放行 ✅ → Controller 正常处理
```

- **为什么 GET 路径还要单独绕过？**
  因为某些详情接口（如查看文章详情 `/api/article/1`）是公开的，不需要登录也能看。但路径中有动态参数（ID），无法在 `WebMvcConfig` 的 `excludePathPatterns` 中用精确路径写死，所以用 `matches()` 正则匹配。需要登录才能访问的 GET 接口（如 `/api/article/user/1`）不会匹配这些正则，继续走 token 校验。

#### 5. WebMvcConfig.java — 拦截器注册

把 JwtInterceptor 注册到拦截器链中，配置哪些路径放行

```
@Override
public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(jwtInterceptor)
            .addPathPatterns("/api/**")     // 拦截所有 /api/ 开头的请求
            .excludePathPatterns(           // 以下路径不拦截（白名单）
                "/api/user/login",          // 登录不需要 token
                "/api/user/register",       // 注册不需要 token
                "/api/article/list",        // 文章列表公开
                "/api/article/ranking/views", // 阅读排行公开
                "/api/article/ranking/latest",// 最新发布公开
                "/api/category/list",       // 分类列表公开
                "/api/notice/list"          // 公告列表公开
            );
}
```

拦截情况：

![image-20260713174401532](/notes-assets/回顾接入DeepSeek-API实现AI自动摘要/image-20260713174401532.png)

#### 6. UserController.java — 登录/注册接口

登录成功后调用 JwtUtil 生成 token，和 user 一起返回给前端

```
@PostMapping("/login")
public Result<Map<String, Object>> login(@RequestBody User user) {
    // 1. 校验用户名密码（密码用 BCrypt 比对）
    User loggedInUser = userService.login(user.getUsername(), user.getPassword());

    // 2. 校验通过 → 生成 JWT token
    String token = JwtUtil.generateToken(loggedInUser.getId());

    // 3. 返回 user + token
    Map<String, Object> data = new HashMap<>();
    data.put("user", loggedInUser);
    data.put("token", token);
    return Result.success(data);
}
```

登录返回token流程

```
① 接收前端传的 {username, password}
  ↓
② userService.login(username, password)
  ├─ 用户不存在 → 抛异常 "用户不存在"
  ├─ 密码错误 → 抛异常 "密码错误"
  └─ 校验通过 → 返回 User 对象
  ↓
③ JwtUtil.generateToken(userId) → 生成 token 字符串
  ↓
④ 构造 Map → { user: User对象, token: "xxx" }
  ↓
⑤ Result.success(map) → 返回给前端
```

- **为什么返回 Map 而不是直接返回 User？**
  因为登录接口不仅要返回用户信息，还要返回 token 给前端保存。所以把 `user` 和 `token` 放在一个 Map 里一起返回，前端收到后分别存到 store。



## 二.放行路径的设计原则

#### ·原则 1：不需要登录就能访问的接口 → 放行

#### ·原则 2：需要登录才能操作的接口 → 拦截

#### ·原则 3：用两层放行（精确路径 + 正则绕过）

```
第一层（WebMvcConfig.excludePathPatterns）：
  → 静态精确路径，如 /api/article/list

第二层（JwtInterceptor.preHandle 中的 GET 绕过）：
  → 动态路径正则匹配，如 GET /api/article/123
  → 只在 GET 方法下生效，POST/PUT/DELETE 照常拦截
```

#### ·原则 4：最小权限原则

能放行 GET 就不放行 POST，能放行精确路径就不放行通配符。比如 `POST /api/site/config` 需要登录，而 `GET /api/site/config` 公开——用两层放行实现**同路径不同方法的差异化权限**。



## 三.面试话术

**面试官问："你项目里 JWT 怎么实现的？"**

```
"我们项目用的是自实现 JWT 认证，没有用 Spring Security 的认证框架。整体流程是这样的：

后端：有一个 JwtUtil 工具类，提供三个方法——generateToken 生成 token、validateToken 校验 token、getUserIdFromToken 从 token 解析用户 ID。toke 用 HMAC-SHA256 签名，24 小时过期。

拦截器：写了一个 JwtInterceptor 实现 HandlerInterceptor，在 preHandle 里对每个请求做三层判断——首先看路径是不是在白名单里（登录、注册、公开列表等），然后看有没有 Authorization 请求头，最后校验 token 有没有过期或篡改。

前端：登录成功后把 token 存到 localStorage，然后在封装的 request 函数里用拦截器逻辑，每次请求自动从 localStorage 读取 token 并放到 Authorization 请求头里。

总的来说就是：登录发 token → 前端存 token → 请求带 token → 后端验 token。"
```
