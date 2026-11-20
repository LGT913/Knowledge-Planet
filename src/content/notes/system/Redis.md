---
title: "Redis"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Redis, system]
summary: "@Test       public void testSet {           //存入数据           redisTemplate.boundValueOps'name'.set'zhangsan';       }   "
private: false
---

### Redis

#### 基本使用

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

* 配置redis相关属性

  ```yaml
  spring:
    redis:
      host: 127.0.0.1 # redis的主机ip
      port: 6379
  ```

* 注入 RedisTemplate 模板

  ```java
  @RunWith(SpringRunner.class)
  @SpringBootTest
  public class SpringbootRedisApplicationTests {
      @Autowired
      private RedisTemplate redisTemplate;
  
      @Test
      public void testSet() {
          //存入数据
          redisTemplate.boundValueOps("name").set("zhangsan");
      }
      @Test
      public void testGet() {
          //获取数据
          Object name = redisTemplate.boundValueOps("name").get();
          System.out.println(name);
      }
  }
  ```



****



#### 自动配置

RedisAutoConfiguration 自动配置类

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(RedisOperations.class)
@EnableConfigurationProperties(RedisProperties.class)
@Import({ LettuceConnectionConfiguration.class, JedisConnectionConfiguration.class })
public class RedisAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean(name = "redisTemplate")
    @ConditionalOnSingleCandidate(RedisConnectionFactory.class)
    public RedisTemplate<Object, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<Object, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);
        return template;
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnSingleCandidate(RedisConnectionFactory.class)
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory redisConnectionFactory) {
        StringRedisTemplate template = new StringRedisTemplate();
        template.setConnectionFactory(redisConnectionFactory);
        return template;
    }

}
```

- 配置项：`spring.redis`
- 自动导入了连接工厂配置类：LettuceConnectionConfiguration、JedisConnectionConfiguration

- 自动注入了模板类：RedisTemplate<Object, Object> 、StringRedisTemplate，k v 都是 String 类型

- 使用 @Autowired 注入模板类就可以操作 redis





****
