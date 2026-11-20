---
title: "CompletableFuture 异步"
date: 2026-09-26
planet: system
tags: [八股, 2.9 CompletableFuture, system]
summary: "CompletableFuture 是 JDK 8 的异步编排工具，实现 Future 与 CompletionStage，支持回调链式调用，避免 Future.get 阻塞等待。"
private: false
---

### 2.9 CompletableFuture

`CompletableFuture` 是 JDK 8 的异步编排工具，实现 `Future` 与 `CompletionStage`，支持回调链式调用，避免 `Future.get()` 阻塞等待。

```java
// 异步编排示例：并行查用户与订单，合并后转 DTO
Executor executor = Executors.newFixedThreadPool(4);

CompletableFuture<User> userFuture = CompletableFuture
        .supplyAsync(() -> userService.findById(uid), executor);

CompletableFuture<List<Order>> orderFuture = CompletableFuture
        .supplyAsync(() -> orderService.findByUser(uid), executor);

// 两个都完成后合并
CompletableFuture<UserDTO> dtoFuture = userFuture
        .thenCombine(orderFuture, (user, orders) -> {
            UserDTO dto = new UserDTO();
            dto.setName(user.getName());
            dto.setOrderCount(orders.size());
            return dto;
        });

// 异常处理
CompletableFuture<UserDTO> safeFuture = dtoFuture
        .exceptionally(ex -> { log.error("查询失败", ex); return new UserDTO(); });

// 阻塞获取最终结果（或交给下游异步消费）
UserDTO result = safeFuture.join();
```

常用回调方法：

| 方法 | 语义 | 输入/输出 |
| --- | --- | --- |
| `thenApply` | 转换结果 | 有入参有返回 |
| `thenAccept` | 消费结果 | 有入参无返回 |
| `thenRun` | 完成后执行 | 无入参无返回 |
| `thenCombine` | 合并两个 future | 两个入参返回合并 |
| `thenCompose` | 串联另一个 future | 入参返回新 future（flatMap） |
| `allOf` | 等待全部完成 | 无返回，需手动 join 取各 future |
| `anyOf` | 任一完成即返回 | 返回最快完成的值 |
| `exceptionally` | 异常恢复 | 异常入参返回兜底值 |

`thenApply` 是同步映射（map），`thenCompose` 是异步串联（flatMap）——当下一步本身返回 `CompletableFuture` 时用 `thenCompose` 避免嵌套。

**面试题：CompletableFuture 如何实现异步编排？**

> 它基于 `CompletionStage` 接口提供链式回调：`supplyAsync` 提交异步任务到线程池，`thenApply/thenAccept` 注册上一步完成后的回调，`thenCombine` 合并两个独立 future，`allOf/anyOf` 做聚合等待。回调由上一步完成的线程触发，避免 `Future.get()` 阻塞。多步串联用 `thenCompose`（flatMap）避免 `CompletableFuture<CompletableFuture>` 嵌套。异常用 `exceptionally` 兜底或 `whenComplete` 记录。本质是把回调注册进依赖图，上游完成时驱动下游执行。

---
