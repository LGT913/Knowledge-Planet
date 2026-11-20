---
title: "Gateway 专项改造"
date: 2026-08-12
planet: blog-dev
tags: ["后端", "实战", 六、Gateway 专项改造, blog-dev]
summary: "blog-common 引入了 spring-boot-starter-web（Tomcat）和 spring-boot-starter-data-jpa（Hibernate），Gateway 必须排除："
private: false
---

## 六、Gateway 专项改造

### 6.1 依赖冲突解决

blog-common 引入了 `spring-boot-starter-web`（Tomcat）和 `spring-boot-starter-data-jpa`（Hibernate），Gateway 必须排除：

```xml
<dependency>
    <groupId>com.blog</groupId>
    <artifactId>blog-common</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

配合 `application.yml` 排除自动配置：

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
      - org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
      - org.springframework.boot.autoconfigure.transaction.TransactionAutoConfiguration
```

### 6.2 SC 2025.0.0 配置 key 迁移

| 旧 key（弃用） | 新 key |
|---|---|
| `spring.cloud.gateway.routes` | `spring.cloud.gateway.server.webflux.routes` |
| `spring.cloud.gateway.discovery.locator.enabled` | `spring.cloud.gateway.server.webflux.discovery.locator.enabled` |
| `spring.cloud.gateway.discovery.locator.lower-case-service-id` | `spring.cloud.gateway.server.webflux.discovery.locator.lower-case-service-id` |

### 6.3 CORS 正确配置

Gateway 的 CORS 不能用 `cors.allowed-origins`（那是业务服务的配置），必须用 Gateway 内置的 `globalcors`：

```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          globalcors:
            cors-configurations:
              '[/**]':
                allowedOrigins: ${CORS_ALLOW:http://localhost:5173}
                allowedMethods:
                  - GET
                  - POST
                  - PUT
                  - DELETE
                  - OPTIONS
                allowedHeaders: "*"
                allowCredentials: true
```

---
