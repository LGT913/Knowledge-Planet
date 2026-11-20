---
title: "MySQL 数据库设计"
date: 2026-07-09
planet: growth
tags: ["面试", "复习", 4. MySQL 数据库设计, growth]
summary: "表关联关系：  user用户表   ├─→ express          courierid → user.id（快递员）   ├─→ deliveryorder   userid → user.id（学生发布）   ├─→ deliv"
private: false
---

## 4. MySQL 数据库设计

### 4.1 6 张核心表及关系

| 表名 | 核心字段 | 作用 |
|------|---------|------|
| user | id, username, password, phone, role, status | 用户基础信息 |
| express | id, express_no, courier_id, status(0/1/2) | 快递信息 |
| delivery_order | id, delivery_no, user_id, proxy_id, express_no, status(0-4) | 代取订单（核心枢纽） |
| order | id, order_no, user_id, status | 寄件订单 |
| proxy_user | id, user_id, balance, total_orders | 代取人员信息 |
| system_config | id, config_key, config_value | 系统配置 |

**表关联关系**：
```
user(用户表)
  ├─→ express          courier_id → user.id（快递员）
  ├─→ delivery_order   user_id → user.id（学生发布）
  ├─→ delivery_order   proxy_id → proxy_user.id（代取员接单）
  ├─→ order            user_id → user.id（学生寄件）
  └─→ proxy_user       user_id → user.id（1:1 代取员账户）

delivery_order.express_no → express.express_no（关联快递）
```

**代取订单完整链路**（⚠️ 面试必问）：

学生发布（写入 delivery_order，user_id 填学生ID，proxy_id=NULL，status=0）→ 代取员接单（更新 proxy_id，status=1）→ 取件（status=2）→ 送达（status=3，同时更新 proxy_user 的 balance+和 total_orders+，更新 express 的 status=2）→ 取消（status=4，仅限待取件之前）

> delivery_order 是核心枢纽表，关联了学生（user_id）、代取员（proxy_id）、快递（express_no）三方。

### 4.2 索引设计

| 表 | 索引 | 字段 | 类型 | 原因 |
|----|------|------|------|------|
| user | idx_phone | phone | 普通 | 登录/注册按手机号查询 |
| user | idx_role | role | 普通 | 按角色筛选 |
| user | — | username | ❌未建 | 需优化：加 idx_username |
| express | idx_express_no | express_no | **唯一** | 防止重复入库 |
| express | idx_courier_status | (courier_id, status) | **联合** | 快递员工作台高频查询 |
| delivery_order | idx_delivery_no | delivery_no | **唯一** | 代取单号唯一 |
| delivery_order | idx_user_id | user_id | 普通 | 学生查自己的订单 |
| delivery_order | idx_proxy_id | proxy_id | 普通 | 代取员查自己的任务 |
| delivery_order | idx_status | status | 普通 | 管理员按状态筛选 |

### 4.3 联合索引 vs 单列索引（⚠️ 连环追问）

**问：为什么建 (courier_id, status) 联合索引，不分别建两个单列索引？**

> 最左前缀匹配原则：联合索引 `(courier_id, status)` 能覆盖两种查询：
> - `WHERE courier_id = ?` ✅ 走索引（只用最左列）
> - `WHERE courier_id = ? AND status = ?` ✅ 走索引（联合使用）
> - `WHERE status = ?` ❌ 不走索引（跳过最左列）
>
> 两个单列索引的问题：组合查询时 MySQL 只选一个索引，另一个条件做回表过滤；且多索引维护成本高。

**对应业务场景**：快递员工作台（角色=快递员，页面=/courier），查"我的待派件"和"我的派送中"列表，`WHERE courier_id = ? AND status = ?`，每天调用几十上百次，是最高频的查询。

**追问：如果 status=0 的数据涨到 3000 条，还要 ORDER BY create_time DESC LIMIT 20，联合索引还够吗？**

> 不够。`(courier_id, status)` 只能定位到 courier_id + status 的数据，ORDER BY 还需要 filesort。应该建联合索引 `(status, create_time)`，这样 `WHERE status = 0 ORDER BY create_time DESC LIMIT 20` 能走索引范围扫描 + 有序返回，不需要额外排序。用 EXPLAIN 验证 Extra 列从 `Using filesort` 变成 `Using index`。

### 4.4 收件人冗余 vs 快递员外键（设计取舍）

**收件人冗余（receiver, phone, address 存 express 表）**：
- 收件人不一定是系统用户（校外人员、访客）
- 单表查询性能更优（快递员工作台不需要 JOIN）
- 快递录入后很少修改，一致性风险低

**快递员外键（courier_id 关联 user 表）**：
- 快递员必须是系统用户
- 信息可能变动（换手机号），外键保证一致性
- 方便权限控制

**核心原则**：谁必须是用户 + 谁信息会频繁变动 → 外键关联；谁可能不是用户 + 录入后很少变动 → 冗余存储。

**追问：express 表扁平化设计的缺点？**

> 收件人信息如果需要修改（比如学生换宿舍），要在 express 表中逐条改，而不是改 user 表一行就行。但校园场景下快递录入后很少修改，可以接受。

### 4.5 状态流转设计（⚠️ 重点背熟）

**快递表状态**：0-待派件 → 1-派送中 → 2-已完成（终态）

**代取订单状态**（5 个状态，⚠️ 不能背错）：

| 步骤 | 状态 | 操作 | 角色 |
|------|------|------|------|
| 发布 | 0-待分配 | 学生发布代取订单 | 学生 |
| 接单 | 1-待取件 | 代取员接单/管理员分配 | 代取员/管理员 |
| 取件 | 2-已取件 | 代取员已从快递点取到快递 | 代取员 |
| 送达 | 3-已完成 | 用户收到快递，代取员余额+ | 代取员 |
| 取消 | 4-已取消 | 待取件之前可取消 | 学生/管理员 |

**状态机防护三层**：
1. **Controller 层**：权限校验（谁能改）
2. **Service 层**：状态流转校验（怎么改）+ 兜底权限校验
3. **数据库层**：唯一约束（不能重复入库）

### 4.6 并发控制（⚠️ 连环追问）

**问：怎么防止并发签收导致状态改乱？**

> UPDATE 带状态条件，利用数据库原子性：
> ```sql
> UPDATE express SET status=2 WHERE id=? AND status=1
> ```
> 返回受影响行数：1 成功，0 说明状态已被他人改过。

**问：怎么测试"取消"和"已取件"并发不会同时成功？**

> 用多线程模拟并发请求：
> ```java
> ExecutorService pool = Executors.newFixedThreadPool(2);
> CountDownLatch latch = new CountDownLatch(1);
> 
> pool.submit(() -> {
>     latch.await();
>     // 线程1：取消订单
>     deliveryOrderService.cancel(orderId);
> });
> pool.submit(() -> {
>     latch.await();
>     // 线程2：确认取件
>     deliveryOrderService.pickup(orderId);
> });
> 
> latch.countDown(); // 同时触发
> pool.shutdown();
> ```
> 两个线程同时请求，预期只有一个成功，查询数据库验证最终状态一致。

---
