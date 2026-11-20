---
title: "Spring / Spring Boot"
date: 2026-07-07
planet: growth
tags: ["面试", "复习", 二、Spring / Spring Boot, growth]
summary: "- 把对象的创建和依赖关系交给 Spring 容器管理 - 好处：解耦、方便管理、降低代码侵入性 - 实现方式：DI（依赖注入）→ 构造器注入、setter 注入、@Autowired 注入"
private: false
---

## 二、Spring / Spring Boot

### 1. Spring 核心（⭐⭐⭐⭐⭐）

**IOC（控制反转）**

- 把对象的创建和依赖关系交给 Spring 容器管理
- 好处：解耦、方便管理、降低代码侵入性
- 实现方式：DI（依赖注入）→ 构造器注入、setter 注入、@Autowired 注入

**AOP（面向切面编程）**

- 在不修改原有代码的前提下，对方法进行增强
- 底层：动态代理
  - JDK 动态代理：有接口时用
  - CGLIB 动态代理：无接口时用
- 常见应用：日志、事务、权限、性能监控

**Spring Bean 生命周期**

1. 实例化（调用构造方法）
2. 属性注入（@Autowired 赋值）
3. 初始化前（BeanPostProcessor#postProcessBeforeInitialization）
4. 初始化（InitializingBean#afterPropertiesSet / init-method）
5. 初始化后（BeanPostProcessor#postProcessAfterInitialization）
6. 使用
7. 销毁（DisposableBean#destroy / destroy-method）

**Bean 的作用域**

- `singleton`：单例（默认）
- `prototype`：多例
- `request`：一次请求
- `session`：一次会话

**@Autowired 和 @Resource 区别**

| 对比项 | @Autowired | @Resource |
|--------|------------|-----------|
| 来源 | Spring | JDK |
| 注入方式 | byType 优先，找不到 byName | byName 优先，找不到 byType |

---

### 2. Spring Boot（⭐⭐⭐⭐⭐）

**Spring Boot 优点**

- 自动配置，开箱即用
- 内嵌 Tomcat，不用打 war 包
- Starter 依赖，简化配置
- 提供 Actuator 监控

**自动装配原理**

1. `@SpringBootApplication` 组合注解
   - `@SpringBootConfiguration` → 配置类
   - `@EnableAutoConfiguration` → 开启自动配置（核心）
   - `@ComponentScan` → 组件扫描
2. `@EnableAutoConfiguration` 加载 `spring.factories` 文件中的自动配置类
3. 根据条件注解（`@ConditionalOnClass`、`@ConditionalOnMissingBean`）判断是否生效

**Spring Boot Starter 是什么**

- 一个依赖聚合包，引入一个 starter 就把相关依赖都带进来了
- 例如 `spring-boot-starter-web` 包含了 Spring MVC、Tomcat、Jackson 等

---

### 3. Spring MVC（⭐⭐⭐）

**Spring MVC 工作流程**

1. 请求 → DispatcherServlet（前端控制器）
2. DispatcherServlet → HandlerMapping（找 Handler）
3. 返回 HandlerExecutionChain
4. DispatcherServlet → HandlerAdapter（适配器）
5. 执行 Handler（Controller）
6. 返回 ModelAndView
7. ViewResolver 解析视图
8. 渲染视图，返回响应

**@RequestMapping / @GetMapping / @PostMapping**

**@RequestParam vs @PathVariable**

- `@RequestParam`：取查询参数 ?id=1
- `@PathVariable`：取路径变量 /user/1

---

### 4. 事务（⭐⭐⭐⭐）

**事务的 ACID**

- A 原子性：要么全成功，要么全失败
- C 一致性：数据状态一致
- I 隔离性：事务之间互不干扰
- D 持久性：提交后永久保存

**事务隔离级别**

| 级别 | 脏读 | 不可重复读 | 幻读 |
|------|------|------------|------|
| 读未提交 | ✅ | ✅ | ✅ |
| 读已提交 | ❌ | ✅ | ✅ |
| 可重复读 | ❌ | ❌ | ✅（MySQL 通过 MVCC 解决） |
| 串行化 | ❌ | ❌ | ❌ |

**Spring 事务传播行为**

- `REQUIRED`：有事务就加入，没有就新建（默认）
- `REQUIRES_NEW`：新建事务，挂起当前事务
- `SUPPORTS`：有事务就加入，没有就非事务执行
- `NOT_SUPPORTED`：非事务执行，挂起当前事务
- `MANDATORY`：必须有事务，否则抛异常
- `NEVER`：必须没事务，否则抛异常
- `NESTED`：嵌套事务

**@Transactional 失效场景（重点！）**

1. 方法不是 public
2. 类没有被 Spring 管理（没加 @Service 等）
3. 方法用 static 修饰
4. 同一个类中方法调用（A 调 B，B 有事务，事务不生效）
5. 异常类型不对（默认只回滚 RuntimeException）
6. 自己 catch 了异常没抛出

---
