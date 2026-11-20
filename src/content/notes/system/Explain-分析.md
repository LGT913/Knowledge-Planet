---
title: "Explain 分析"
date: 2026-09-26
planet: system
tags: [八股, 1.5 Explain 分析, system]
summary: "type 列表示 MySQL 如何查找数据，从好到差："
private: false
---

### 1.5 Explain 分析

#### type 字段等级

`type` 列表示 MySQL 如何查找数据，从好到差：

| 等级 | 说明 | 典型场景 |
|------|------|---------|
| system | 表只有一行 | 系统表 |
| const | 通过主键或唯一索引等值查询 | `WHERE id = 1` |
| eq_ref | 联合查询中使用主键/唯一索引 | JOIN 被驱动表用主键关联 |
| ref | 通过普通索引等值查询 | `WHERE name = '张三'` |
| range | 索引范围扫描 | `WHERE id BETWEEN 1 AND 100` |
| index | 全索引扫描 | 查询字段全在索引中但无过滤条件 |
| ALL | 全表扫描 | 无索引或索引失效 |

**优化目标**：至少达到 range 级别，最好达到 ref 级别。

#### Extra 字段含义

| Extra 值 | 含义 | 是否需要优化 |
|---------|------|-------------|
| Using index | 覆盖索引，无需回表 | 理想状态 |
| Using where | Server 层过滤 | 检查是否可优化索引 |
| Using index condition | 索引下推 ICP | 已优化 |
| Using filesort | 额外排序 | 需优化，检查 ORDER BY 字段是否有索引 |
| Using temporary | 使用临时表 | 需优化，常见于 GROUP BY、DISTINCT |
| Using join buffer | Join 无索引走 Block Nested Loop | 需加索引 |

#### 面试题

**Q：如何分析一条 SQL 的执行计划？**

A：用 `EXPLAIN SELECT ...` 查看。重点看四个字段：`type` 表示访问类型，从 const 到 ALL，至少要 range；`key` 显示实际使用的索引，如果为 NULL 说明没走索引；`rows` 是预估扫描行数，越小越好；`Extra` 中 `Using filesort` 和 `Using temporary` 是危险信号需要优化，`Using index` 表示覆盖索引是理想状态。还会看 `possible_keys`（可能用的索引）和 `key` 对比，如果 possible_keys 有值但 key 为 NULL，说明优化器选错了，可能需要 `force index`。

```sql
EXPLAIN SELECT * FROM user WHERE city = '北京' ORDER BY age;

-- 理想结果示例：
-- type: ref
-- key: idx_city_age
-- rows: 1200
-- Extra: Using index condition
```

---
