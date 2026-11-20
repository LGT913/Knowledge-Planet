---
title: "改造全流程：Redis & Redisson 冲突问题"
date: 2026-08-12
planet: blog-dev
tags: ["后端", "实战", 二、改造全流程：Redis & Redisson 冲突问题, blog-dev]
summary: "IDE 提示：应为无参构造，但代码传入 ObjectMapper 实参，标红。"
private: false
---

## 二、改造全流程：Redis & Redisson 冲突问题

### 问题 1：IDE 编译红线 `GenericJackson2JsonRedisSerializer` 构造器报错

#### 现象

IDE 提示：应为无参构造，但代码传入 `ObjectMapper` 实参，标红。

#### 根因

1. SB 3.5.4 中 `GenericJackson2JsonRedisSerializer` **支持 ObjectMapper 入参构造**，代码本身正确；
2. 降级后未执行 Maven Reimport，IDEA 本地依赖索引缓存未刷新，静态检查误报。

#### 解决方案

1. Maven 侧边栏刷新全部依赖，执行 `mvn clean compile`（命令行无报错即证明代码合法）；
2. IDEA 清除缓存：File → Invalidate Caches → 重启 IDE；
3. 兜底：删除 `.m2/repository` 对应 Jackson、spring-data-redis 目录，重新下载。

### 问题 2：运行启动报错 Redis AUTH 空密码拒绝连接

#### 现象

启动日志：`ERR AUTH <password> ... no password configured`，本地 Docker Redis 未设密码。

#### 根因

应用程序配置 `password：[已隐藏] 在无环境变量时解析为空字符串 `""`，Redisson/Redis 客户端将空字符串当作有效密码发送 AUTH 指令，本地无密码 Redis 拒绝。

#### 解决方案

密码配置默认值设为 null 而非空字符串：

```yaml
spring:
  data:
    redis:
      password：[已隐藏]
```

`#{null}` 是 SpEL 表达式，解析为 Java null，客户端判断 null 时跳过 AUTH。

### 问题 3：手动 RedissonClient Bean 与 Starter 自动配置冲突

#### 现象

`RedisConfig.java` 中手动创建了 `RedissonClient` Bean，同时 `pom.xml` 引入了 `redisson-spring-boot-starter`。两者产生重复的 `RedissonClient` Bean 定义，且手动 Bean 绕过了 Starter 对 `spring.data.redis.*` 配置的自动读取。

#### 根因

这是 SB 4.x 遗留的临时 hack。SB 4.x 将 `RedisProperties` 重命名为 `DataRedisProperties`，导致 Redisson 3.31.0 的 `RedissonAutoConfigurationV2` 引用旧类失败，当时只能手动创建。但 SB 3.5.4 中 `RedisProperties` 未改名，Starter 自动配置完全正常。

#### 解决方案

**删除 `RedisConfig.java` 中的 `redissonClient()` 方法及相关 `@Value` 字段**，让 `redisson-spring-boot-starter` 自动装配。`RedisUtil` 通过构造器注入自动获取 `RedissonClient`。

### 问题 4：`deleteByPattern` 使用底层连接，存在 NPE 风险

#### 现象

`RedisUtil.java` 中：

```java
try (Cursor<byte[]> cursor = redisTemplate.getConnectionFactory().getConnection()
        .scan(options)) {
```

`getConnectionFactory()` 可能返回 null，`getConnection()` 直接操作底层连接，绕过了 RedisTemplate 的序列化机制。

#### 解决方案

改用 `redisTemplate.scan()`：

```java
try (Cursor<String> cursor = redisTemplate.scan(options)) {
    while (cursor.hasNext()) {
        redisTemplate.delete(cursor.next());
    }
}
```

`redisTemplate.scan()` 返回 `Cursor<String>`（key 用 StringRedisSerializer 序列化），无需手动 `new String()` 转换。

---
