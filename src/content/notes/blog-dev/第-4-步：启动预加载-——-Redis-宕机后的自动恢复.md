---
title: "第 4 步：启动预加载 —— Redis 宕机后的自动恢复"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战", 第 4 步：启动预加载 —— Redis 宕机后的自动恢复, blog-dev]
summary: "项目启动时，通过 ApplicationRunner 自动从 DB 查询所有禁用用户，批量写入 Redis。这样 Redis 宕机重启后，禁用列表可以自动恢复，不需要人工干预。"
private: false
---

## 第 4 步：启动预加载 —— Redis 宕机后的自动恢复

### 思路

项目启动时，通过 `ApplicationRunner` 自动从 DB 查询所有禁用用户，批量写入 Redis。这样 Redis 宕机重启后，禁用列表可以自动恢复，不需要人工干预。

### 新增文件

**文件**：`DisabledUserLoader.java`

```java
@Configuration
public class DisabledUserLoader {

    @Bean
    public ApplicationRunner preloadDisabledUsers(UserRepository userRepository,
                                                   RedisUtil redisUtil) {
        return args -> {
            List<Long> disabledIds = userRepository.findDisabledUserIds();
            for (Long id : disabledIds) {
                redisUtil.set(USER_DISABLED_KEY + id, "1");
            }
            if (!disabledIds.isEmpty()) {
                log.info("已从 DB 恢复 {} 个禁用用户到 Redis", disabledIds.size());
            }
        };
    }
}
```

### 恢复流程

```
Redis 宕机 → 重启
       │
       ▼
Spring Boot 启动
       │
       ▼
ApplicationRunner.preloadDisabledUsers() 执行
       │
       ├─ SELECT id FROM user WHERE enabled = false
       │
       └─ 对每个 id: SET blog:user:disabled:{id} = "1"
              │
              ▼
      Filter 恢复正常检查，被禁用的用户继续被拦截
```

---
