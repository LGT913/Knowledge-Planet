---
title: "JVM"
date: 2026-09-26
planet: system
tags: [八股, 一、JVM, system]
summary: "JVM 运行时数据区划分为五个部分，核心区别在于是否线程共享和是否可能 OOM。"
private: false
---

## 一、JVM

### 1.1 内存区域

JVM 运行时数据区划分为五个部分，核心区别在于**是否线程共享**和**是否可能 OOM**。

| 区域 | 线程性 | 作用 | OOM 场景 |
| --- | --- | --- | --- |
| 堆（Heap） | 共享 | 存放对象实例与数组，GC 主战场 | `java.lang.OutOfMemoryError: Java heap space` |
| 虚拟机栈 | 私有 | 栈帧存储局部变量表、操作数栈、动态链接、返回地址 | 深递归触发 `StackOverflowError`；无法扩展触发 OOM |
| 方法区 / 元空间 | 共享 | 类元信息、运行时常量池、静态变量 | `Metaspace` 超限触发 OOM |
| 程序计数器 | 私有 | 记录当前线程执行的字节码行号 | 唯一不会 OOM 的区域 |
| 本地方法栈 | 私有 | 为 Native 方法服务 | 同虚拟机栈 |

**为什么把堆设计成线程共享？** 对象实例是跨线程传递的数据载体，集中管理便于 GC 统一回收，同时避免每个线程各自维护对象带来的内存碎片与拷贝开销。栈则设计成线程私有：方法调用的局部状态无需同步，进出栈天然隔离，既快又安全。

JDK 8 用元空间（Metaspace）替换永久代，根本原因是永久代大小固定且与堆连续，容易 OOM 却又难以调优；元空间直接使用本地内存，大小受限于物理内存，类元数据不再挤占堆空间，也避免了 JRockit/J9 合并时的历史包袱。

**面试题：JVM 运行时内存区域有哪些？哪些是线程私有的？**

> 五个区域：堆、方法区（元空间）、虚拟机栈、本地方法栈、程序计数器。线程私有的是虚拟机栈、本地方法栈、程序计数器；共享的是堆和方法区。堆存放对象，方法区存放类信息与常量池，程序计数器记录执行位置。

**面试题：为什么 JDK 8 把永久代替换为元空间？**

> 永久代固定大小、易 OOM 且难调优；元空间使用本地内存，容量随物理内存扩展，类元数据不再挤占堆。合并 JRockit 时也无需再维护两套内存模型，元空间让 GC 行为更可预测。

---

### 1.2 GC 算法

四种基础算法各有取舍，本质是在**吞吐量、停顿时间、空间利用率**之间权衡。

| 算法 | 原理 | 优点 | 缺点 | 适用区域 |
| --- | --- | --- | --- | --- |
| 标记-清除 | 标记存活后清除死亡对象 | 实现简单、不需移动 | 大量碎片、效率随对象增多下降 | 老年代（CMS） |
| 复制 | 存活对象复制到另一半，清空原区 | 无碎片、分配快 | 牺牲一半空间 | 新生代 |
| 标记-整理 | 标记后存活对象向一端移动 | 无碎片、不浪费空间 | 移动对象慢、需更新引用 | 老年代 |
| 分代收集 | 新生代复制、老年代标记整理 | 针对性优化、综合性能好 | 实现复杂 | 整堆 |

**为什么新生代用复制算法？** 新生代对象朝生夕灭，存活率极低，复制开销小；Eden 与 Survivor 8:1:1 的设计把空间浪费压到 10%，而非经典复制的 50%。老年代存活率高、对象大，复制代价大，因此用标记-清除或标记-整理。

判断对象死亡用**可达性分析**而非引用计数：GCRoots（栈中引用、静态变量、JNI 引用）作为起点遍历引用链，不可达即回收。引用计数无法解决循环引用（如 A、B 互相引用但已无外部引用）。

**面试题：简述 JVM 垃圾回收算法及适用场景**

> 标记-清除产生碎片、用于 CMS；复制算法无碎片但费空间、用于新生代；标记-整理无碎片但移动慢、用于老年代；分代收集按对象存活周期分区，新生代复制、老年代整理，是当前主流策略。判断存活用可达性分析，以 GCRoots 为起点搜索引用链。

---

### 1.3 垃圾回收器

| 收集器 | 分代 | 线程 | 算法 | 停顿特点 | 适用场景 |
| --- | --- | --- | --- | --- | --- |
| Serial | 新生代/老年代 | 单线程 | 复制/标记整理 | STW 全程停 | 客户端、小堆 |
| Parallel Scavenge/GC | 新生代/老年代 | 多线程 | 复制/标记整理 | STW、吞吐优先 | 后台计算、批处理 |
| ParNew + CMS | 新生代+老年代 | 多线程 | 复制+标记清除 | CMS 低停顿、并发标记 | Web 服务 |
| G1 | 整堆分区 | 多线程 | Region 复制+整理 | 可预测停顿 | 大堆、低延迟 |
| ZGC | 整堆 | 多线程 | 染色指针+读屏障 | 亚毫秒停顿 | 超大堆、低延迟 |

G1 把堆划分为大小相等的 Region（1-32MB），每个 Region 可动态扮演 Eden、Survivor、Old 或 Humongous（大对象）。回收时优先回收垃圾最多的 Region（Garbage First），由此得名。Mixed GC 指回收全部新生代 + 部分老年代 Region，而非 Full GC，避免全堆扫描。

ZGC 低延迟的关键在**染色指针**与**读屏障**：把 GC 信息编码进 64 位指针的空闲位，并发标记、转移、重定位阶段都不需要 STW 全堆对象；读屏障在每次对象访问时检查指针染色，按需转发到新地址，使停顿与堆大小解耦。

**面试题：G1 和 CMS 的区别？**

> CMS 用标记-清除，产生碎片，并发清除阶段若空间不足触发 Concurrent Mode Failure 退化为 Serial Full GC，停顿长。G1 基于 Region，标记整理无碎片；回收垃圾最多的 Region 实现 Garbage First，可设 `-XX:MaxGCPauseMillis` 预测停顿；Mixed GC 回收新生代 + 部分老年代 Region，避免 Full GC。G1 更适合大堆与可预测延迟场景。

**面试题：ZGC 为什么能做到低延迟？**

> ZGC 用染色指针把标记信息编码进指针空闲位，并发标记/转移/重定位阶段几乎不 STW；读屏障在访问对象时按染色转发到新地址，使垃圾回收与业务线程并发执行。核心是把 GC 元数据下放到指针，省去对象头访问与内存屏障的批量开销，停顿与堆大小解耦，可达亚毫秒级。

---

### 1.4 类加载机制

类加载分五步：**加载→验证→准备→解析→初始化**。加载读取字节流生成 Class 对象；验证确保字节码合法；准备为静态变量分配内存并赋零值；解析把符号引用解析为直接引用；初始化执行 `<clinit>` 静态块赋值。

**双亲委派模型**：类加载请求先委托父加载器，父加载器失败才自己加载。自底向上检查是否已加载，自顶向下执行加载。意义在于**安全与一致**：核心类（如 `java.lang.Object`）总由启动类加载器加载，防止用户伪造核心类篡改；同时避免重复加载，保证类的唯一性。

**打破双亲委派**的三个典型场景，本质都是因为"父加载器看不到子加载器的类"：

1. **SPI 机制**：`DriverManager` 由启动类加载器加载，但 JDBC 驱动实现类在 classpath，启动类加载器看不到。JDK 用 `ServiceLoader` 配合 `Thread.currentThread().getContextClassLoader()`（通常为 AppClassLoader）反向加载实现类。
2. **Tomcat**：每个 WebApp 用独立 ClassLoader，先加载 WebApp 自己的类，再委托父加载器，实现应用间类隔离——两个应用依赖不同版本的同名类互不干扰。
3. **热部署**：自定义 ClassLoader 重新加载修改后的类，旧 ClassLoader 失效触发 GC 回收旧类。

**面试题：什么是双亲委派模型？为什么要打破？**

> 类加载时先委托父加载器，父失败才自行加载，保证核心类不被篡改、避免重复加载。打破发生在父加载器看不到子路径类的场景：SPI 用上下文类加载器反向加载实现类，Tomcat 用独立 ClassLoader 隔离不同 WebApp，热部署用自定义 ClassLoader 重新加载类。打破是为了满足隔离、动态性或服务发现需求，而非否定模型本身。

---

### 1.5 JMM（Java 内存模型）

JMM 规定**主内存**与**工作内存**的交互：所有共享变量存于主内存，每线程有工作内存副本，线程对变量的读写须经过 8 种原子操作（`read`/`load`/`use`/`assign`/`store`/`write`/`lock`/`unlock`）。

**happens-before** 定义先行操作的结果对后续操作可见，它是一组偏序规则，核心八条：程序顺序规则、管程锁定规则、volatile 变量规则、线程启动规则、线程终止规则、中断规则、对象终结规则、传递性。它并非"实际执行顺序"，而是保证可见性的逻辑先后。

**volatile** 的可见性靠内存屏障：写操作后插入 StoreLoad 屏障，强制刷回主内存并使其他线程工作内存失效；底层是 x86 的 **Lock 前缀指令**，触发缓存一致性（MESI）将其他 CPU 缓存行置为失效态。禁止重排序通过在读写前后插入不同屏障实现。

```java
// volatile 经典应用：DCL 单例
public class Singleton {
    // volatile 防止指令重排序：new 对象非原子，可能先赋引用再初始化
    private static volatile Singleton instance;

    public static Singleton getInstance() {
        if (instance == null) {                 // 第一次检查，避免无竞争时加锁
            synchronized (Singleton.class) {
                if (instance == null) {         // 第二次检查，防止重复创建
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

`new Singleton()` 分三步：分配内存、初始化、引用赋值。无 volatile 时编译器可能重排为"分配→赋值→初始化"，其他线程在赋值后、初始化前拿到未完成对象。**as-if-serial** 语义允许这种重排，因为在单线程下语义不变；但多线程下会暴露问题，volatile 通过禁止重排序修复。

**面试题：什么是 happens-before 规则？**

> happens-before 是 JMM 定义的偏序关系，规定一个操作的结果对另一个操作可见，保证可见性而非执行顺序。核心包括：解锁先行于后续加锁、volatile 写先行于后续读、线程 start 先行于其 run 内动作。通过这套规则，程序员无需理解 CPU 缓存与指令重排细节，也能写出正确的并发程序。

**面试题：volatile 为什么不能保证 i++ 原子性？**

> volatile 只保证可见性与禁止重排序，不保证复合操作原子性。`i++` 分读、加、写三步，两线程同时读到旧值、各自加一、写回，结果丢失一次更新。原子性需用 `synchronized`、`AtomicInteger`（CAS）或 `Lock` 保证。

---

### 1.6 JVM 调优参数

| 参数 | 作用 | 推荐值 |
| --- | --- | --- |
| `-Xms` | 堆初始大小 | 与 `-Xmx` 相等，避免动态扩容抖动 |
| `-Xmx` | 堆最大值 | 物理内存 60-70% |
| `-Xmn` | 新生代大小 | 堆的 1/3 左右 |
| `-XX:MetaspaceSize` | 元空间初始阈值 | 触发 Full GC 的水位线 |
| `-XX:+UseG1GC` | 启用 G1 收集器 | JDK 9+ 默认 |
| `-XX:MaxGCPauseMillis` | G1 目标停顿 | 200ms 默认，按 SLA 调 |
| `-XX:+PrintGCDetails` | 打印 GC 日志 | 线上必开 |
| `-XX:+HeapDumpOnOutOfMemoryError` | OOM 时导出堆 dump | 事后分析必备 |

调优思路：先用监控（GC 日志、`jstat`）定位问题（频繁 Full GC、停顿长、内存泄漏），再针对性调参。**停顿长**优先选低延迟收集器（G1/ZGC）并调停顿目标；**吞吐低**检查新生代过小导致频繁 Minor GC；**OOM** 用 dump 分析对象占用。

**面试题：线上 OOM 怎么排查？**

> 第一步看监控确认是 Heap OOM 还是 Metaspace OOM。若 `-XX:+HeapDumpOnOutOfMemoryError` 已开启，用 MAT 或 VisualVM 分析 dump 文件，找支配树定位占用最大的对象。常见原因：静态集合无限增长、ThreadLocal 未 remove、大对象缓存未设上限、连接/流未关闭。定位后改代码或设容量上限。若没有 dump，用 `jmap -dump:format=b,file=heap.bin <pid>` 现场抓取。

---

## 二、多线程

### 2.1 线程生命周期

`Thread.State` 枚举定义 6 种状态，描述线程在 JVM 与操作系统层面的生命周期。

| 状态 | 含义 | 进入条件 |
| --- | --- | --- |
| NEW | 已创建未启动 | `new Thread()` |
| RUNNABLE | 可运行（就绪 + 运行中） | 调用 `start()` |
| BLOCKED | 阻塞等待 monitor 锁 | 等待进入 `synchronized` 块 |
| WAITING | 无限等待 | `wait()` / `join()` / `LockSupport.park()` |
| TIMED_WAITING | 超时等待 | `sleep(t)` / `wait(t)` / `join(t)` |
| TERMINATED | 终止 | run 方法执行结束 |

**为什么 RUNNABLE 合并了就绪和运行？** Java 把线程调度交给操作系统，JVM 层不感知"是否分到 CPU 时间片"，统一记为可运行。

**面试题：sleep() 和 wait() 的区别？**

> 四点区别：归属不同——`sleep` 是 `Thread` 静态方法，`wait` 是 `Object` 实例方法；锁释放不同——`sleep` 不释放锁，`wait` 释放锁；唤醒方式不同——`sleep` 超时自动醒，`wait` 需 `notify`/`notifyAll` 或超时；使用位置不同——`wait` 必须在 `synchronized` 块内调用，`sleep` 任意位置。`wait` 释放锁是为让其他线程能进入同步块调用 `notify` 唤醒自己。

---

### 2.2 synchronized 原理

`synchronized` 基于**对象监视器（monitor）**实现，锁信息存在对象头的 **MarkWord** 中。JDK 6 引入锁升级，针对无竞争到高竞争场景逐级优化。

| 锁级别 | 适用场景 | 原理 | 性能 |
| --- | --- | --- | --- |
| 无锁 | 无竞争 | MarkWord 存对象 hashCode | 无开销 |
| 偏向锁 | 单线程访问 | CAS 记录线程 ID，后续无 CAS | 近乎无开销 |
| 轻量级锁 | 轻度竞争 | 自旋 CAS，栈帧锁记录存 MarkWord | 自旋开销 |
| 重量级锁 | 高竞争 | monitor 互斥量，未获锁线程入队阻塞 | 内核态切换开销大 |

**为什么偏向锁要存在？** 绝大多数对象实际只被一个线程访问（如 StringBuffer 的局部使用），偏向锁让该线程进入同步块后零开销——后续进入只需比对线程 ID 无需 CAS。竞争出现才升级为轻量级锁，用自旋避免阻塞。高竞争时自旋空耗 CPU，升级为重量级锁把线程挂起。

锁升级**不可逆**：一旦升级到重量级锁不会降级回轻量级。偏向锁撤销也需 STW。JDK 15 已默认废弃偏向锁（JEP 374），因为现代 CAS 自旋开销已很低，偏向锁带来的复杂性与收益不再匹配。

```java
// synchronized 两种用法对比
public void methodBlock(Object lock) {
    synchronized (lock) {        // 代码块：锁指定对象，粒度可控
        // critical section
    }
}

public synchronized void instanceMethod() {   // 实例方法：锁 this
}

public static synchronized void staticMethod() { // 静态方法：锁 Class 对象
}
```

**面试题：synchronized 的锁升级过程？**

> 无锁状态下，单线程首次进入 CAS 设置 MarkWord 为偏向锁并记录线程 ID，此后该线程进入无需 CAS。出现第二个线程竞争，撤销偏向升级为轻量级锁，线程自旋 CAS 争用栈帧锁记录。自旋超过阈值或竞争激烈，升级为重量级锁，未获锁线程进入 monitor 等待队列阻塞，依赖操作系统互斥量。升级不可逆。

---

### 2.3 volatile

volatile 提供两个保证：**可见性**与**禁止重排序**，但不保证原子性。

可见性机制：写 volatile 变量后插入 StoreLoad 屏障，强制将工作内存值刷回主内存，并使其他线程该缓存行失效；读 volatile 变量前插入 LoadLoad 屏障，强制从主内存重新读。底层是 x86 的 Lock 前缀指令，触发 MESI 协议让其他 CPU 缓存行失效。

禁止重排序：编译器与处理器在 volatile 读写前后插入内存屏障，阻止屏障两侧指令重排。这修复了 DCL 单例的半初始化问题（见 1.5 代码）。

```java
// volatile 不保证原子性的演示
public class VolatileCounter {
    private volatile int count = 0;

    public void increment() {
        count++;   // 非原子：读-加-写三步，并发会丢失更新
    }
    // 正确做法：用 AtomicInteger
    private final AtomicInteger atomicCount = new AtomicInteger();
    public void safeIncrement() {
        atomicCount.incrementAndGet();   // CAS 保证原子
    }
}
```

**面试题：volatile 为什么不能保证 i++ 原子性？**

> `i++` 是读、加、写三个独立操作，volatile 保证每次读能看到最新值，但无法阻止两线程同时读到同一旧值、各自加一后写回，结果丢失一次更新。可见性解决不了复合操作的原子性，需要 `synchronized` 或基于 CAS 的 `AtomicInteger`。

---

### 2.4 AQS

**AbstractQueuedSynchronizer** 是 `ReentrantLock`、`Semaphore`、`CountDownLatch`、`ReentrantReadWriteLock` 的基础框架。核心是 `volatile int state` 同步状态与一个 **CLH 变体双向队列**管理等待线程。

**为什么用 CLH 队列？** CLH（Craig, Landin, Hagersten）队列是 FIFO 公平队列，每节点自旋检查前驱状态，避免所有线程同时争抢锁造成的惊群效应。AQS 改造为双向链表，支持取消、超时与共享模式判断前驱是否释放。

独占模式（`ReentrantLock`）与共享模式（`Semaphore`/`CountDownLatch`）的核心流程：

```java
// AQS 独占模式获取锁的核心逻辑（简化）
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&                    // 1. 尝试获取，子类实现
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))  // 2. 入队+自旋/阻塞
        selfInterrupt();                       // 3. 补上中断标记
}

// 队列中节点获取逻辑：前驱是头且获取成功才出队
final boolean acquireQueued(Node node, int arg) {
    for (;;) {
        Node p = node.predecessor();           // 检查前驱
        if (p == head && tryAcquire(arg)) {    // 前驱是头且获取成功
            setHead(node);                     // 出队
            return false;
        }
        if (shouldParkAfterFailedAcquire(p, node)) // 判断是否应阻塞
            parkAndCheckInterrupt();           // 阻塞当前线程
    }
}
```

`state` 语义因同步器而异：`ReentrantLock` 用 state 记重入次数；`Semaphore` 用 state 记许可数；`CountDownLatch` 用 state 记计数。Node 节点状态有 `CANCELLED`、`SIGNAL`、`CONDITION`、`PROPAGATE` 四种，控制队列行为。

**面试题：AQS 的原理是什么？**

> AQS 用 `volatile int state` 表达同步状态，配合 CLH 变体双向队列管理等待线程。获取失败时构造 Node 入队，自旋检查前驱是否为头并尝试 CAS 获取；前驱非头则阻塞。释放时唤醒后继节点。独占模式由 `tryAcquire`/`tryRelease` 控制，共享模式由 `tryAcquireShared` 控制。子类只需重写 try 方法，模板方法控制队列与阻塞逻辑，实现锁的复用。

---
