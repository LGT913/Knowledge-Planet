---
title: "java备战第一天"
date: 2026-07-13
planet: growth
tags: ["后端", "实战"]
summary: "今日目标：搭建 Redis 可视化环境 + 重构博客 RedisTemplate 配置"
private: false
---
- ## **今日目标**：搭建 Redis 可视化环境 + 重构博客 RedisTemplate 配置

- **项目改造任务**：

  - 修改文件：`blog/src/main/java/com/blog/blog/config/RedisConfig.java`

  ```
  @Configuration
  public class RedisConfig {
  
      @Bean
      public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
          RedisTemplate<String, Object> template = new RedisTemplate<>();
          template.setConnectionFactory(factory);
  
          // 1. 创建并配置 ObjectMapper（支持 LocalDateTime）
          ObjectMapper objectMapper = new ObjectMapper();
          objectMapper.registerModule(new JavaTimeModule());
          objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
  
          // 2. 【关键修复】开启默认类型，让 JSON 包含 @class 字段
          // 这样 Jackson 就知道反序列化时要转成 Article 而不是 LinkedHashMap
          objectMapper.activateDefaultTyping(
                  objectMapper.getPolymorphicTypeValidator(),
                  ObjectMapper.DefaultTyping.NON_FINAL
          );
  
          // 3. 设置可见性（可选，但推荐加上确保字段能被访问）
          objectMapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
  
          GenericJackson2JsonRedisSerializer jacksonSerializer = new GenericJackson2JsonRedisSerializer(objectMapper);
          StringRedisSerializer stringSerializer = new StringRedisSerializer();
  
          template.setKeySerializer(stringSerializer);
          template.setHashKeySerializer(stringSerializer);
          template.setValueSerializer(jacksonSerializer);
          template.setHashValueSerializer(jacksonSerializer);
  
          template.afterPropertiesSet();
          return template;
      }
  }
  ```

​        预期效果：Redis 中存储的缓存数据可读，不再显示二进制乱码

![image-20260711210405529](/notes-assets/java备战第一天/image-20260711210405529.png)

![image-20260711210441465](/notes-assets/java备战第一天/image-20260711210441465.png)

redis-cli 进入redis

KEYS * 查看所有缓存

FLUSHDB 删除所有缓存



- **每日作业LeetCode刷题**：链表：LCR 023,LCR 077,LCR 024,206

  知识点：ListNode 变量名=head   让 `cur` 指针从链表的头结点（head）开始

  ​            反转链表：设一个null，循环里先保存下一个节点next，反转指针cur.next=pre，接着pre和cur向前移动，直到循环结束

  ​            找链表中间节点（快慢指针）：一个.next，一个.next.next

  ​            合并两个有序链表：关键设ListNode dummy=new ListNode(-1);  虚拟头节点。

  ​            排序链表：1.把链表统计长度，转换成数组，用数组Arrays.sort(arr);自动排序，在转换成链表；

  ​                           2.（分组排序）**分割**：用快慢指针找到链表中点，把链表拆成左右两段，递归拆分直到只剩单个节点。

  ​                                               **合并**：把两段有序链表用你之前学过的双指针法合并成一个有序链表。

-
