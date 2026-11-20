---
title: "SQL 调优与统计优化"
date: 2026-07-09
planet: growth
tags: ["面试", "复习", 五、SQL 调优与统计优化, growth]
summary: "问题本身：  问：你项目里统计模块是怎么优化的？  追问：优化前慢在哪里？具体怎么定位的？  再追问：优化后的 SQL 是什么？  再追问：2-3秒到50-80ms是怎么测出来的？  再追问：怎么判断瓶颈在 Java 过滤而不是数据库？  "
private: false
---

## 五、SQL 调优与统计优化

### 问题 10：统计模块是怎么优化的？

**问题本身**：
> 问：你项目里统计模块是怎么优化的？
> 追问：优化前慢在哪里？具体怎么定位的？
> 再追问：优化后的 SQL 是什么？
> 再追问：2-3秒到50-80ms是怎么测出来的？
> 再追问：怎么判断瓶颈在 Java 过滤而不是数据库？
> 再追问：怎么排除缓存影响？

**为什么要这么做**：
- 全表查询再 Java 过滤，数据量大时性能差（数据传输量大、Java 过滤效率低）
- 将过滤逻辑移到数据库层，利用索引和 COUNT 优化，性能提升显著

**具体怎么做**：

**第一步：发现问题**
- 批量插入 5000 条快递 + 3000 条代取订单后，管理员仪表盘响应 2-3 秒

**第二步：定位瓶颈（分段计时法）**
```java
// Controller 入口测总耗时
long totalStart = System.currentTimeMillis();
int count = statisticsService.getPendingExpressCount();
long totalEnd = System.currentTimeMillis();

// Service 内分段测
long dbStart = System.currentTimeMillis();
List<Express> all = expressMapper.findAll();  // DB查询
long dbEnd = System.currentTimeMillis();

long javaStart = System.currentTimeMillis();
int count = (int) all.stream().filter(e -> e.getStatus() == 0).count();  // Java过滤
long javaEnd = System.currentTimeMillis();
```
结果：DB查 250ms（10%），Java过滤 2200ms（90%）

**第三步：优化方案**
```java
// 改之前
List<Express> all = expressMapper.findAll();
int count = (int) all.stream().filter(e -> e.getStatus() == 0).count();

// 改之后
int count = expressMapper.countByStatus(0);
// SQL: SELECT COUNT(*) FROM express WHERE status = 0
```

**第四步：验证效果**
1. 预热一轮（排除首次查询开销）
2. 连测 5 轮取平均：52、68、71、55、63ms → 50-80ms
3. 清 `RESET QUERY CACHE` 再测，结果一致
4. EXPLAIN 验证：type: ALL→ref, rows: 5000→15

**项目实战**：
- 统计"待派件数量"：`SELECT COUNT(*) FROM express WHERE status = 0`
- 统计"某快递员派送中数量"：`SELECT COUNT(*) FROM express WHERE courier_id = ? AND status = 1`

**如何验证**：
1. 对比优化前后接口耗时（2-3秒 vs 50-80ms）
2. 使用 EXPLAIN 查看执行计划变化
3. 清空查询缓存后重新测试
4. 插入更多数据验证优化效果

---

### 问题 11：登录接口查询用户为什么不直接用 username 查？

**问题本身**：
> 问：你登录接口是怎么查用户的？
> 追问：为什么先查所有用户再遍历匹配 username？
> 再追问：用户量上来以后最大的风险是什么？

**为什么要这么做**：
- 全表查询再遍历匹配，用户量大时会全表扫描 + 大量数据加载到内存
- 应该用 username 直接查询，加索引，只查一行数据

**具体怎么做**：
```java
// UserMapper.java
@Select("SELECT * FROM user WHERE username = #{username}")
User findByUsername(@Param("username") String username);

// UserServiceImpl.java
public User login(String username, String password) {
    User user = userMapper.findByUsername(username);
    if (user != null && PasswordEncoder.matches(password, user.getPassword())) {
        return user;
    }
    return null;
}

// 加索引
CREATE INDEX idx_username ON user(username);
```

**项目实战**：
- 当前登录接口用 `findAll()` 全表查再遍历，需优化
- 优化后每次登录只查一行数据，不管用户量多大都是毫秒级

**如何验证**：
1. 使用 EXPLAIN 查看查询执行计划
2. 确认 type 从 ALL 变成 ref
3. 确认 key 显示 idx_username
4. 确认 rows 为 1

---
