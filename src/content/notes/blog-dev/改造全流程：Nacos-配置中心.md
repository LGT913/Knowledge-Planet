---
title: "改造全流程：Nacos 配置中心"
date: 2026-08-12
planet: blog-dev
tags: ["后端", "实战", 三、改造全流程：Nacos 配置中心, blog-dev]
summary: "1. bootstrap.yml：Nacos 连接地址、命名空间、共享公共配置 blog-common.yaml； 2. Nacos 公共配置 blog-common.yaml：JWT 密钥、MySQL 数据源、Redis 全局配置，多服务"
private: false
---

## 三、改造全流程：Nacos 配置中心

### 前置背景

配置分层架构：

1. `bootstrap.yml`：Nacos 连接地址、命名空间、共享公共配置 `blog-common.yaml`；
2. Nacos 公共配置 `blog-common.yaml`：JWT 密钥、MySQL 数据源、Redis 全局配置，多服务复用；
3. 本地 `application.yml`：仅放服务私有配置（如 server.port），不存公共配置。

### 问题 1：bootstrap.yml IDE 报红

#### 现象

IDEA 对 `spring.cloud.nacos.config.shared-configs` 全部标红，提示无法解析属性。

#### 根因

Spring Cloud Alibaba Nacos 属于第三方扩展配置，无 Spring Boot 内置配置元数据，IDEA 无法识别，**纯静态检查误报，不影响运行**。

#### 解决方案

以启动日志为准，只要日志打印 `Loading nacos data, dataId: 'blog-common.yaml'` 即代表配置生效。

### 问题 2：shared-configs 语法错误

#### 错误写法

```yaml
shared-configs:
  - data-id: blog-common.yaml  # 错误：横杠
    weight: 1                   # 废弃字段
```

#### 正确写法

```yaml
shared-configs:
  - dataId: blog-common.yaml    # 驼峰
    group: DEFAULT_GROUP
    refresh: true
```

> `data-id`（横杠）会导致 Nacos 忽略这条共享配置，公共配置全部缺失，触发占位符解析异常。

### 问题 3：`Could not resolve placeholder 'jwt.secret-key'`

#### 三层根因

| 层级 | 原因 | 修复 |
|------|------|------|
| 依赖缺失 | 未引入 `spring-cloud-starter-bootstrap`，3.x 不自动识别 bootstrap.yml | 补全依赖 |
| 语法错误 | `data-id` 写成横杠，共享配置被忽略 | 改为 `dataId` |
| 配置丢失 | Docker Nacos 无持久化，容器删除后配置清空 | 挂载数据卷 |

#### 修复步骤

1. 补全依赖 `spring-cloud-starter-bootstrap`
2. 修正 `bootstrap.yml` 语法
3. Docker Nacos 持久化启动：

```powershell
docker run -d `
--name nacos `
-p 8848:8848 -p 9848:9848 `
-e MODE=standalone `
-v D:\docker-data\nacos:/home/nacos/data `
nacos/nacos-server:v2.4.1
```

> PowerShell 换行符用反引号 `` ` ``，CMD 用 `^`，两者不通用。

4. Nacos 控制台创建 `blog-common.yaml`：

```yaml
jwt:
  secret-key: 自定义32位以上密钥
  expire-time: 86400000

spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://host.docker.internal:3306/blog_db?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password：[已隐藏]
  data:
    redis:
      host: localhost
      port: 6379
      password:
      database: 0
```

> Docker 容器内访问宿主机 MySQL 不能用 `127.0.0.1`，必须用 `host.docker.internal`。

### 问题 4：Nacos 端点自动配置排除（SB 4.x 遗留 hack）

#### 现象

`application.yml` 中残留：

```yaml
spring:
  autoconfigure:
    exclude:
      - com.alibaba.cloud.nacos.endpoint.NacosConfigEndpointAutoConfiguration
      - com.alibaba.cloud.nacos.endpoint.NacosDiscoveryEndpointAutoConfiguration
```

#### 根因

SB 4.x 将 actuator 的 `org.springframework.boot.actuate.health.*` 迁移到 `org.springframework.boot.health.contributor.*`，SCA 2025.0.0.0 引用旧路径导致 `ClassNotFoundException`。但 SB 3.5.4 中 actuator 包路径未变，此排除多余。

#### 解决方案

**删除这 4 行**。

---

## 四、JWT 相关设计

### JwtUtil 设计要点

- 位置：`com.blog.user.security` 包（非 `util` 包），与 `JwtAuthenticationFilter` 同包内聚
- 注入方式：**构造器注入**（非字段 `@Value`），确保启动时即校验配置完整性
- Fail-fast：`secretKey.isBlank()` 时直接抛 `IllegalArgumentException`，避免运行中才发现配置缺失

```java
@Component
public class JwtUtil {
    private final SecretKey key;
    private final long expirationTime;

    public JwtUtil(@Value("${jwt.secret-key}") String secretKey,
                   @Value("${jwt.expiration-time}") long expirationTime) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalArgumentException("JWT secret-key 未配置");
        }
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        this.expirationTime = expirationTime;
    }
    // ...
}
```

---
