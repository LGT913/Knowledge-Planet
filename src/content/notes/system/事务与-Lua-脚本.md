---
title: "事务与 Lua 脚本"
date: 2026-09-26
planet: system
tags: [八股, 2.8 事务与 Lua 脚本, system]
summary: "Redis 事务不是真正的原子事务，而是一组命令的顺序执行："
private: false
---

### 2.8 事务与 Lua 脚本

#### MULTI/EXEC/DISCARD/WATCH

Redis 事务不是真正的原子事务，而是一组命令的顺序执行：

| 命令 | 作用 |
|------|------|
| MULTI | 开启事务，后续命令进入队列 |
| EXEC | 执行队列中的所有命令 |
| DISCARD | 放弃事务，清空队列 |
| WATCH key | 乐观锁，监控 key，事务执行前若被修改则放弃 |

```redis
# WATCH 实现乐观锁（扣减库存）
WATCH stock:10086
stock = GET stock:10086        # 读取当前库存
MULTI
DECR stock:10086               # 入队
EXEC                           # 执行，执行前检查 stock:10086 是否被改
# 如果在 WATCH 后 EXEC 前，stock:10086 被其他客户端修改了，EXEC 返回 nil，事务放弃
```

**Redis 事务的局限**：
- 命令入队时不会报错（语法错误除外），执行时某条命令失败不影响后续命令继续执行，不支持回滚。
- WATCH 只能检测到 key 被修改，无法像数据库事务那样保证 ACID。

#### Lua 脚本原子性

Redis 用单线程执行命令，执行 Lua 脚本期间不会被其他命令打断，天然原子性。复杂的多步操作用 Lua 脚本比用 WATCH 乐观锁更可靠高效。

```lua
-- Lua 脚本实现原子扣减库存
-- KEYS[1] = 库存key, ARGV[1] = 扣减数量
local stock = redis.call('GET', KEYS[1])
if not stock then
    return -1  -- key不存在
end
if tonumber(stock) < tonumber(ARGV[1]) then
    return 0  -- 库存不足
end
redis.call('DECRBY', KEYS[1], ARGV[1])
return 1  -- 成功
```

```java
// Java 调用 Lua 脚本（Jedis）
String script = 
    "local stock = redis.call('GET', KEYS[1]) " +
    "if not stock then return -1 end " +
    "if tonumber(stock) < tonumber(ARGV[1]) then return 0 end " +
    "redis.call('DECRBY', KEYS[1], ARGV[1]) return 1";

Object result = jedis.eval(
    script, 
    Collections.singletonList("stock:10086"), 
    Collections.singletonList("1")
);
```

#### Redis 事务 vs MySQL 事务

| | Redis 事务 | MySQL 事务 |
|---|-----------|-----------|
| 原子性 | 不支持回滚，命令间独立 | 支持，可 ROLLBACK |
| 隔离性 | 单线程串行执行，天然隔离 | MVCC + 锁机制 |
| 持久性 | 依赖 RDB/AOF，不保证 | redo log 保证 |
| 一致性 | 弱 | 强 |
| 回滚 | 不支持 | 支持 |
| 适用场景 | 乐观锁、批量减少网络开销 | 业务数据一致性保证 |

#### 面试题

**Q：Redis 事务和 MySQL 事务的区别？**

A：核心区别在于 Redis 事务不支持回滚，不是真正的 ACID 事务。Redis 事务用 MULTI 开启后命令入队，EXEC 依次执行，某条命令失败不会中断后续命令也不会回滚已执行的命令。MySQL 事务支持原子性，任一语句失败可 ROLLBACK 回滚全部。隔离性方面 Redis 单线程串行执行天然隔离，MySQL 靠 MVCC 和锁实现。持久性方面 Redis 依赖 RDB/AOF 可能丢数据，MySQL 靠 redo log 保证持久。所以 Redis 事务不能替代 MySQL 事务，它的价值在于减少网络 RTT（批量命令一次发送）和配合 WATCH 实现乐观锁。需要严格原子性的操作（如扣减库存）建议用 Lua 脚本，Redis 单线程执行 Lua 脚本期间不会被其他命令打断，天然保证原子性。
