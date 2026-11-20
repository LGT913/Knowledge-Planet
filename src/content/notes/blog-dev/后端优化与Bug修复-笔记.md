---
title: "后端优化与 Bug 修复 — 笔记"
date: 2026-08-03
planet: blog-dev
tags: ["后端", "实战"]
summary: "在完成企业级 Redis 改造后，对项目其余代码进行统一审查，发现以下问题："
private: false
---
# 后端优化与 Bug 修复 — 笔记

## 一、优化背景

在完成企业级 Redis 改造后，对项目其余代码进行统一审查，发现以下问题：

- 多处使用 `@Autowired` 字段注入，不推荐
- `SummaryConsumer` 和 `CacheWarmup` 中常量与 `BlogCacheConstants` 重复
- `SummaryConsumer` 自行实现缓存清理，与 `CacheCleaner` 重复
- `CommentServiceImpl.deleteComment` 逻辑错误
- 评论无缓存，每次查询都走 DB
- 评论通知消费者无幂等性
- 全局异常处理粒度太粗
- 无定时任务线程池配置
- CORS 配置硬编码在 SecurityConfig 中

## 二、修改思路与步骤

### 1. SummaryConsumer 改造

**问题**：
- 使用 `@Autowired` 字段注入
- 本地常量与 `BlogCacheConstants` 重复
- 自行实现 `clearRelatedCaches` 与 `CacheCleaner` 重复
- 注入 `ArticleServiceImpl` 只为调用缓存清理方法，存在循环依赖风险

**步骤**：
1. 改为 `@RequiredArgsConstructor` 构造器注入
2. 移除本地常量，全部引用 `BlogCacheConstants`
3. 移除 `clearRelatedCaches` 方法，注入 `CacheCleaner` 调用
4. 移除 `ArticleServiceImpl` 注入

**涉及文件**：`SummaryConsumer.java`

### 2. CommentServiceImpl 改造

**问题**：
- 使用 `@Autowired` 字段注入
- `deleteComment` 逻辑错误：`findByParentId(comment.getParentId())` 查找的是兄弟评论，不是子回复
- 无缓存，每次查询评论都走 DB
- 创建评论后未通知文章作者

**步骤**：
1. 改为 `@RequiredArgsConstructor` 构造器注入
2. **修复 deleteComment**：`findByParentId(id)` 查找目标评论的所有子回复，先删子回复再删评论本身
3. `getCommentsByArticleId` 添加 Redis 缓存（Key: `blog:comment:article:{articleId}`，过期 600s）
4. `createComment` 添加：
   - 清除该文章评论缓存，保证数据一致性
   - 发送 `CommentNotifyMessage` 到 RabbitMQ 异步通知文章作者
   - 过滤自己评论自己的场景（不通知）

**涉及文件**：`CommentServiceImpl.java`、`CommentRepository.java`

### 3. CacheWarmup 改造

**问题**：
- 使用 `@Autowired` 字段注入
- 本地常量与 `BlogCacheConstants` 重复

**步骤**：
1. 改为 `@RequiredArgsConstructor` 构造器注入
2. 所有常量替换为 `BlogCacheConstants` 引用

**涉及文件**：`CacheWarmup.java`

### 4. CommentNotifyConsumer 幂等性

**问题**：RabbitMQ 可能重复投递消息，消费者未做幂等性处理。

**步骤**：
1. 改为 `@RequiredArgsConstructor` 构造器注入
2. 基于 `articleId + commentUserId + timestamp` 构造唯一 Key
3. 用 `redisUtil.setIfAbsent` 做 SET NX 去重，24 小时过期
4. 重复消息直接 ACK 跳过，不进入后续逻辑

**涉及文件**：`CommentNotifyConsumer.java`

### 5. GlobalExceptionHandler 细粒度处理

**问题**：只有 `RuntimeException` 和 `Exception` 两个兜底，缺少具体异常类型。

**步骤**：新增以下异常处理器：

| 异常类型 | 返回信息 |
|---------|---------|
| `MethodArgumentNotValidException` | 参数校验失败详情（字段名 + 错误原因） |
| `MissingServletRequestParameterException` | 缺少必要参数 |
| `HttpMessageNotReadableException` | 请求数据格式错误 |
| `DataIntegrityViolationException` | 数据冲突（如唯一约束） |
| `IllegalArgumentException` | 非法参数 |
| `RuntimeException` | 业务异常（保留原行为） |
| `Exception` | 服务器内部错误（兜底，打印完整堆栈） |

**涉及文件**：`GlobalExceptionHandler.java`

### 6. SchedulingConfig 定时任务线程池

**问题**：`@Scheduled` 默认使用单线程执行器，多个定时任务会互相阻塞。

**步骤**：
1. 配置 `ThreadPoolTaskScheduler` Bean
2. 设置 `poolSize=5`、优雅关闭（`awaitTerminationSeconds=30`）
3. 添加 `ErrorHandler` 兜底日志，避免异常被吞掉

**涉及文件**：`SchedulingConfig.java`

### 7. CORS 配置抽取

**问题**：允许的前端来源硬编码在 `SecurityConfig.java` 中，修改需要重新编译。

**步骤**：
1. `application.yml` 新增 `cors.allowed-origins` 配置项，支持环境变量 `CORS_ALLOWED_ORIGINS` 覆盖
2. `SecurityConfig` 通过 `@Value` 注入，`split(",")` 解析为列表

**涉及文件**：`SecurityConfig.java`、`application.yml`

## 三、涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `service/SummaryConsumer.java` | 修改 | 构造器注入、CacheCleaner、公共常量 |
| `service/impl/CommentServiceImpl.java` | 重写 | 构造器注入、修复deleteComment、缓存、MQ通知 |
| `config/CacheWarmup.java` | 修改 | 构造器注入、公共常量 |
| `service/CommentNotifyConsumer.java` | 修改 | 构造器注入、幂等性检查 |
| `common/exception/GlobalExceptionHandler.java` | 修改 | 细粒度异常处理 |
| `config/SchedulingConfig.java` | 修改 | 定时任务线程池 |
| `config/SecurityConfig.java` | 修改 | CORS配置抽取到yml |
| `resources/application.yml` | 修改 | 新增cors配置 |

## 四、总结

- **依赖注入规范化**：所有文件统一使用 `@RequiredArgsConstructor` 构造器注入，消除 `@Autowired` 字段注入
- **代码复用**：`CacheCleaner` 统一缓存清理，`BlogCacheConstants` 统一常量引用
- **Bug 修复**：`deleteComment` 子回复删除逻辑从错误修复为正确查找
- **功能增强**：评论添加 Redis 缓存 + RabbitMQ 异步通知作者
- **可靠性**：评论通知消费者添加幂等性检查，防止重复消费
- **异常治理**：全局异常处理细化到具体异常类型，区分可预知和不可预知异常
- **基础设施**：定时任务专用线程池，优雅关闭 + 异常兜底日志
- **配置外置**：CORS allowed origins 从代码硬编码改为配置文件 + 环境变量
