---
title: "Redis 配置演进"
date: 2026-08-12
planet: blog-dev
tags: ["后端", "实战", 五、Redis 配置演进, blog-dev]
summary: "阶段 2：SB 4.x 遗留 hack   排除 RedissonAutoConfigurationV2 + 手动创建 RedissonClient Bean   问题：SB 3.5.4 下不需要，手动 Bean 与 Starter 自动装"
private: false
---

## 五、Redis 配置演进

### 5.1 两个客户端的分工

| 客户端 | 用途 | 配置方式 |
|--------|------|---------|
| Lettuce（RedisTemplate） | 业务缓存读写 | Spring Boot 自动配置 |
| Redisson（RedissonClient） | 分布式锁、布隆过滤器 | `redisson-spring-boot-starter` 自动装配 |

### 5.2 密码配置演进

```
阶段 1：本地 Redis 无密码
  password：[已隐藏]
  问题：无环境变量时解析为空字符串 ""，客户端发送 AUTH "" → 报错

阶段 2：SB 4.x 遗留 hack
  排除 RedissonAutoConfigurationV2 + 手动创建 RedissonClient Bean
  问题：SB 3.5.4 下不需要，手动 Bean 与 Starter 自动装配冲突

阶段 3：最终方案
  password：[已隐藏]
  RedissonClient 由 Starter 自动装配
  RedisTemplate 由 Spring Boot 自动配置
  密码 null 时跳过 AUTH，有值时正常鉴权
```

### 5.3 RedisConfig 最终形态

只保留 `RedisTemplate` Bean，`RedissonClient` 由 Starter 自动装配：

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        objectMapper.activateDefaultTyping(
                objectMapper.getPolymorphicTypeValidator(),
                ObjectMapper.DefaultTyping.NON_FINAL
        );
        objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);

        GenericJackson2JsonRedisSerializer jsonSerializer =
                new GenericJackson2JsonRedisSerializer(objectMapper);
        StringRedisSerializer stringSerializer = new StringRedisSerializer();

        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }
}
```

### 5.4 RedisUtil deleteByPattern 修复

```java
// 错误写法（NPE 风险 + 绕过序列化）
try (Cursor<byte[]> cursor = redisTemplate.getConnectionFactory()
        .getConnection().scan(options)) { ... }

// 正确写法
try (Cursor<String> cursor = redisTemplate.scan(options)) {
    while (cursor.hasNext()) {
        redisTemplate.delete(cursor.next());
    }
}
```

---
