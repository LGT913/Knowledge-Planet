---
title: "SQL 调优与统计优化"
date: 2026-07-09
planet: growth
tags: ["面试", "复习", 5. SQL 调优与统计优化, growth]
summary: "批量插入 5000 条快递 + 3000 条代取订单后，管理员仪表盘响应 2-3 秒。"
private: false
---

## 5. SQL 调优与统计优化

### 5.1 统计优化完整过程（⚠️ 面试必问，脱稿复述）

**第一步：发现**

批量插入 5000 条快递 + 3000 条代取订单后，管理员仪表盘响应 2-3 秒。

**第二步：定位瓶颈（分段计时法）**

```java
// Controller 入口测总耗时
long totalStart = System.currentTimeMillis();
int count = statisticsService.getPendingExpressCount();
long totalEnd = System.currentTimeMillis();
System.out.println("接口总耗时：" + (totalEnd - totalStart) + "ms");

// Service 内分段测
long dbStart = System.currentTimeMillis();
List<Express> all = expressMapper.findAll();  // DB查询
long dbEnd = System.currentTimeMillis();
System.out.println("DB查耗时：" + (dbEnd - dbStart) + "ms");

long javaStart = System.currentTimeMillis();
int count = (int) all.stream().filter(e -> e.getStatus() == 0).count();  // Java过滤
long javaEnd = System.currentTimeMillis();
System.out.println("Java过滤耗时：" + (javaEnd - javaStart) + "ms");
```

结果：DB查 250ms（10%），Java过滤 2200ms（90%）。瓶颈明确：不是数据库慢，是 Java 过滤慢。

**第三步：优化**

```java
// 改之前
List<Express> all = expressMapper.findAll();          // SELECT * FROM express
int count = (int) all.stream().filter(e -> e.getStatus() == 0).count();

// 改之后
int count = expressMapper.countByStatus(0);           // SELECT COUNT(*) FROM express WHERE status = 0
```

**进阶：某快递员派送中数量**
```java
// 改之前
List<Express> all = expressMapper.findAll();
int count = (int) all.stream()
    .filter(e -> e.getCourierId().equals(courierId) && e.getStatus() == 1).count();

// 改之后
int count = expressMapper.countByCourierAndStatus(courierId, 1);
// SQL: SELECT COUNT(*) FROM express WHERE courier_id = ? AND status = ?
```

**第四步：验证效果**

1. 预热一轮（排除首次查询和 Mapper 初始化开销）
2. 连测 5 轮取平均：52、68、71、55、63ms → **50-80ms**
3. 清 `RESET QUERY CACHE` 再测，结果一致（不是缓存假象）
4. 插入更多数据后再测，耗时只多几毫秒

**第五步：EXPLAIN 验证**

```sql
EXPLAIN SELECT COUNT(*) FROM express WHERE courier_id = 5 AND status = 1;
```

| 字段 | 优化前（全表） | 优化后（走索引） |
|------|--------------|----------------|
| type | ALL | ref |
| key | NULL | idx_courier_status |
| rows | 5000 | 15 |
| Extra | Using where | Using index |

> ⚠️ **为什么有效**：WHERE 条件在数据库层过滤（B+树索引快速定位），COUNT 是数据库高度优化的操作，只返回一个数字，不需要传大量数据到应用层。

### 5.2 EXPLAIN 关键字段（⚠️ 必背）

| 字段 | 含义 | 好的值 | 差的值 |
|------|------|--------|--------|
| type | 访问类型 | ref / range / index | ALL（全表扫描） |
| key | 实际用到的索引 | 具体索引名 | NULL |
| rows | 预估扫描行数 | 远小于总行数 | 接近总行数 |
| Extra | 额外信息 | Using index（覆盖索引） | Using filesort / Using where |

### 5.3 登录接口查询问题（⚠️ 同类优化）

**问题**：登录时 `findAll()` 全表查再 Java 遍历匹配 username。

**风险**：用户量增大后全表扫描 + 大量数据加载到内存 → OOM。

**正确做法**：
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
```
再加索引：`CREATE INDEX idx_username ON user(username);`

---
