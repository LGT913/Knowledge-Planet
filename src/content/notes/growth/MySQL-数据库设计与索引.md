---
title: "MySQL 数据库设计与索引"
date: 2026-07-09
planet: growth
tags: ["面试", "复习", 四、MySQL 数据库设计与索引, growth]
summary: "问题本身：  问：你项目里 MySQL 设计了哪些索引？为什么这么设计？  追问：联合索引和单列索引有什么区别？  再追问：为什么建 courierid, status 联合索引，不建两个单列索引？  再追问：这个组合查询对应哪个业务场景？"
private: false
---

## 四、MySQL 数据库设计与索引

### 问题 8：你设计了哪些索引？为什么这么设计？

**问题本身**：
> 问：你项目里 MySQL 设计了哪些索引？为什么这么设计？
> 追问：联合索引和单列索引有什么区别？
> 再追问：为什么建 (courier_id, status) 联合索引，不建两个单列索引？
> 再追问：这个组合查询对应哪个业务场景？
> 再追问：如果 status=0 的数据涨到 3000 条，还要 ORDER BY create_time DESC LIMIT 20，联合索引还够吗？

**为什么要这么做**：
- 高频查询字段加普通索引，加速查询
- 业务唯一字段加唯一索引，保证数据唯一性
- 外键关联字段加索引，加速 JOIN 查询
- 联合索引利用最左前缀匹配原则，覆盖多种查询场景

**具体怎么做**：

| 表 | 索引 | 字段 | 类型 | 原因 |
|----|------|------|------|------|
| user | idx_phone | phone | 普通 | 登录/注册按手机号查询 |
| express | idx_express_no | express_no | 唯一 | 防止重复入库 |
| express | idx_courier_status | (courier_id, status) | 联合 | 快递员工作台高频查询 |
| delivery_order | idx_delivery_no | delivery_no | 唯一 | 代取单号唯一 |

**联合索引最左前缀匹配**：
- `(courier_id, status)` 能覆盖：`WHERE courier_id = ?`、`WHERE courier_id = ? AND status = ?`
- 不能覆盖：`WHERE status = ?`（跳过最左列）

**项目实战**：
- 快递员工作台查询"我的待派件"：`WHERE courier_id = ? AND status = 0`
- 查询"我的派送中"：`WHERE courier_id = ? AND status = 1`
- 这是系统中查询频率最高的场景之一

**进阶追问：数据量增大后的索引演进**：
- 如果 status=0 数据涨到 3000 条 + ORDER BY create_time DESC LIMIT 20
- 原联合索引 `(courier_id, status)` 不够，因为 ORDER BY 需要 filesort
- 应建联合索引 `(status, create_time)`，实现索引范围扫描 + 有序返回
- EXPLAIN 验证：Extra 列从 `Using filesort` 变成 `Using index`

**如何验证**：
1. 使用 EXPLAIN 查看查询执行计划
2. 确认 type 从 ALL 变成 ref/range
3. 确认 key 显示具体索引名
4. 确认 rows 大幅减少
5. 确认 Extra 显示 `Using index`（覆盖索引）

---

### 问题 9：为什么收件人信息冗余存储，而快递员信息用外键关联？

**问题本身**：
> 问：express 表里的收件人信息（receiver, phone, address）为什么不关联 user 表？
> 追问：那快递员信息为什么又用外键关联 user 表？
> 再追问：这种扁平化设计有什么缺点？

**为什么要这么做**：
- **收件人冗余**：收件人不一定是系统用户（校外人员、访客），单表查询性能更优
- **快递员外键**：快递员必须是系统用户，信息可能变动，外键保证一致性

**具体怎么做**：
- 收件人信息（receiver, phone, address）直接存 express 表
- 快递员信息通过 courier_id 外键关联 user 表
- 核心原则：谁必须是用户 + 谁信息会频繁变动 → 外键关联；谁可能不是用户 + 录入后很少变动 → 冗余存储

**项目实战**：
- 快递员工作台查询自己的任务，只查 express 表，不需要 JOIN user 表
- 如果需要显示快递员姓名，才 JOIN user 表，但这个场景频率很低

**扁平化设计缺点**：
- 收件人信息如果需要修改，要在 express 表中逐条改，而不是改 user 表一行就行
- 但校园场景下快递录入后很少修改，可以接受

**如何验证**：
1. 查询数据库，确认 express 表有 receiver、phone、address 字段
2. 查询 user 表，确认 courier_id 外键关联
3. 测试快递员查询自己的任务，确认不需要 JOIN user 表

---
