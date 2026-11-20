---
title: "Java 基础"
date: 2026-07-07
planet: growth
tags: ["面试", "复习", 一、Java 基础, growth]
summary: "ArrayList vs LinkedList"
private: false
---

## 一、Java 基础

### 1. 集合框架（⭐⭐⭐⭐⭐ 必问）

**ArrayList vs LinkedList**

| 对比项 | ArrayList | LinkedList |
|--------|-----------|------------|
| 底层结构 | 动态数组 | 双向链表 |
| 随机访问 | O(1) 快 | O(n) 慢 |
| 增删（头尾）| 慢（需要扩容/移动元素） | 快 O(1) |
| 增删（中间）| 慢（移动元素） | 慢（先找位置） |
| 内存占用 | 少 | 大（每个节点存两个指针） |

**HashMap 底层原理**

- JDK 1.8 之前：**数组 + 链表**
- JDK 1.8 之后：**数组 + 链表 + 红黑树**
  - 链表长度 > 8 且数组长度 > 64 → 转红黑树
  - 红黑树节点 < 6 → 转回链表
- **put 流程**：计算 key 的 hash → 计算数组下标 → 位置为空直接放 → 不为空 equals 比较 key → 相同覆盖，不同挂链表 → 链表过长转红黑树
- **扩容**：默认容量 16，负载因子 0.75，扩容为原来 2 倍
- **hash 冲突**：链表法（拉链法）

**HashMap vs HashTable**

| 对比项 | HashMap | HashTable |
|--------|---------|-----------|
| 线程安全 | ❌ 不安全 | ✅ 安全（synchronized） |
| 效率 | 高 | 低（全表锁） |
| null key/value | 允许 | 不允许 |
| 初始容量 | 16 | 11 |

**ConcurrentHashMap 线程安全原理**

- JDK 1.7：**分段锁**（Segment），每段一把锁
- JDK 1.8：**CAS + synchronized**
  - 数组位置为空 → CAS 插入
  - 数组位置不为空 → synchronized 锁链表头节点 / 红黑树根节点
  - 锁粒度更细，并发度更高

---

### 2. 多线程（⭐⭐⭐⭐）

**synchronized vs Lock**

| 对比项 | synchronized | Lock |
|--------|--------------|------|
| 层面 | JVM 关键字 | JDK 接口 |
| 释放锁 | 自动释放 | 手动 unlock() |
| 中断 | 不可中断 | 可中断 |
| 公平锁 | 非公平 | 可配置公平/非公平 |
| 锁状态 | 不可判断 | 可判断 |

**volatile 关键字**

两大作用：
1. **可见性**：一个线程修改了变量，其他线程立即可见（强制从主内存读）
2. **禁止指令重排**：内存屏障
- ❌ 不保证原子性
- 典型场景：单例模式双重检查锁（DCL）的 instance 变量

**线程池核心参数**

1. `corePoolSize` 核心线程数
2. `maximumPoolSize` 最大线程数
3. `keepAliveTime` 非核心线程空闲存活时间
4. `workQueue` 工作队列
5. `threadFactory` 线程工厂
6. `handler` 拒绝策略

**四种拒绝策略**

1. `AbortPolicy`：抛异常（默认）
2. `CallerRunsPolicy`：调用者线程自己执行
3. `DiscardOldestPolicy`：丢弃队列最老的任务
4. `DiscardPolicy`：直接丢弃

---

### 3. JVM（⭐⭐⭐）

**JVM 内存区域**

- 线程私有：程序计数器、虚拟机栈、本地方法栈
- 线程共享：堆、方法区（元空间）

**垃圾回收算法**

1. 标记-清除：碎片多
2. 复制算法：空间换时间，用于新生代
3. 标记-整理：无碎片，用于老年代
4. 分代回收：新生代复制，老年代标记-整理/清除

**GC 收集器**

- 新生代：Serial、ParNew、Parallel Scavenge
- 老年代：CMS、Serial Old、Parallel Old
- G1：分 Region，整堆收集

---

### 4. 其他常考

**String、StringBuilder、StringBuffer 区别**

| 类 | 可变性 | 线程安全 | 适用场景 |
|----|--------|----------|----------|
| String | 不可变 | 安全 | 少量字符串操作 |
| StringBuilder | 可变 | 不安全 | 单线程大量拼接 |
| StringBuffer | 可变 | 安全（synchronized） | 多线程大量拼接 |

**Java 多态的实现**

- 方法重写（Override）+ 父类引用指向子类对象
- 编译期看左边，运行期看右边

**Java 异常体系**

- `Throwable` 是顶层
  - `Error`：系统级错误（OOM、StackOverflow），程序无法处理
  - `Exception`：程序可处理
    - 受检异常（Checked）：编译期必须处理，如 IOException
    - 非受检异常（RuntimeException）：NullPointerException、ClassCastException、IndexOutOfBoundsException

---
