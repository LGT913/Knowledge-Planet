---
title: "第三步：Spring Security + JWT 认证"
date: 2026-07-28
planet: blog-dev
tags: ["博客系统", "工程", 4. 第三步：Spring Security + JWT 认证, blog-dev]
summary: "从自定义拦截器升级为 Spring Security 标准 Filter Chain，实现无状态 JWT 认证。"
private: false
---

## 4. 第三步：Spring Security + JWT 认证

### 思路

从自定义拦截器升级为 Spring Security 标准 Filter Chain，实现无状态 JWT 认证。

### 认证流程图

```
┌────────┐    ① POST /api/user/login     ┌──────────┐
│  前端  │ ──────────────────────────────► │Controller│
│        │ ◄────────────────────────────── │          │
│        │    ② 返回 { user, token }       └──────────┘
└──┬─────┘
   │ ③ 后续请求携带 Authorization: Bearer <token>
   ▼
┌──────────────────────────────────────────────────────┐
│            JwtAuthenticationFilter                    │
│                                                       │
│  ④ 提取 token → ⑤ 验证签名 → ⑥ 解析 userId + role  │
│                                                       │
│  ⑦ 构造 UserPrincipal → ⑧ 写入 SecurityContext      │
└──────────────────────┬───────────────────────────────┘
                       │
              ⑨ 交给 Spring Security 判断权限
                       │
         ┌─────────────▼─────────────┐
         │  有权限 → 放行到 Controller │
         │  无权限 → 403 Forbidden    │
         │  未登录 → 401 Unauthorized │
         └───────────────────────────┘
```

### 关键代码

**UserPrincipal** — 桥接 	JWT 和 Spring Security 的核心：

```java
@Getter
public class UserPrincipal implements UserDetails {
    private final Long userId;
    private final String role;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // ROLE_ 前缀是 Spring Security 约定，hasRole() 会自动拼前缀
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getUsername() { return userId.toString(); }
    // ... 其他方法默认返回 true
}
```

**JwtAuthenticationFilter** — 每次请求都走这个过滤器：

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(...) {
        String token = request.getHeader("Authorization");

        // Bearer 前缀处理
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7).trim();
        }

        // 1. 没有 token → 放行（交给 Security 判断是否需要登录）
        if (token == null || token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. token 无效 → 清除上下文，放行
        if (!jwtUtil.validateToken(token)) {
            SecurityContextHolder.clearContext();
            filterChain.doFilter(request, response);
            return;
        }

        // 3. token 有效 → 解析 userId + role，构造认证信息
        Long userId = jwtUtil.getUserIdFromToken(token);
        String role = jwtUtil.getRoleFromToken(token);
        UserPrincipal principal = new UserPrincipal(userId, role);

        UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);

        // 4. 放行
        filterChain.doFilter(request, response);
    }
}
```

**SecurityConfig** — 安全策略总控：

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // 启用 @PreAuthorize
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())                              // 前后端分离不需要 CSRF
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS)) // 无状态
            .httpBasic(b -> b.disable())
            .formLogin(f -> f.disable())

            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/user/login", "/api/user/register").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/article/list", ...).permitAll()
                .anyRequest().authenticated()
            )

            .exceptionHandling(ex -> ex.authenticationEntryPoint(entryPoint))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

### 优化经验

| 问题 | 优化方式 |
|------|----------|
| 自定义拦截器无法与 Spring Security 深度集成 | 改用 `OncePerRequestFilter` |
| 前端传 `Bearer ` 前缀导致 token 解析失败 | `token.substring(7).trim()` |
| userId 可伪造的水平越权 | 用 `@AuthenticationPrincipal UserPrincipal` 从 SecurityContext 取 |
| 字段注入不安全 | 全部改构造器注入，保证依赖不可变 |

---
