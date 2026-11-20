---
title: "ThreadLocal"
date: 2026-09-26
planet: system
tags: [八股, 2.7 ThreadLocal, system]
summary: "ThreadLocal 为每线程提供变量副本，实现线程隔离。数据结构是 Thread 持有的 ThreadLocalMap，key 是 ThreadLocal 弱引用，value 是强引用。"
private: false
---

### 2.7 ThreadLocal

`ThreadLocal` 为每线程提供变量副本，实现线程隔离。数据结构是 `Thread` 持有的 `ThreadLocalMap`，key 是 `ThreadLocal` 弱引用，value 是强引用。

**为什么 key 用弱引用？** 若 key 是强引用，`ThreadLocal` 实例即便外部无引用也不会被回收，造成内存泄漏。弱引用下外部无强引用时 key 可被 GC，但 value 仍强引用存在——这才是泄漏根源。

泄漏链：`Thread → ThreadLocalMap → Entry(value)`，只要线程存活（尤其线程池中线程长生不死），value 无法回收。`remove()` 是唯一根治方案。

```java
// 正确用法：finally remove
public class RequestContext {
    private static final ThreadLocal<User> USER_HOLDER = new ThreadLocal<>();

    public static void set(User user) {
        USER_HOLDER.set(user);
    }

    public static User get() {
        return USER_HOLDER.get();
    }

    public static void clear() {
        USER_HOLDER.remove();   // 必须 remove，防泄漏
    }
}

// 业务层
try {
    RequestContext.set(currentUser);
    // business logic
} finally {
    RequestContext.clear();      // 用完即清理
}
```

`InheritableThreadLocal` 解决父子线程传递：子线程创建时复制父线程的 `InheritableThreadLocal` 值。但线程池中线程复用，只在首次创建时复制，后续任务拿不到新值，需用阿里的 `TransmittableThreadLocal` 跨线程池传递。

**面试题：ThreadLocal 为什么会内存泄漏？**

> `ThreadLocalMap` 的 Entry 中 key 是 `ThreadLocal` 弱引用、value 是强引用。key 被 GC 后变 null，但 value 仍被 Entry 强引用，而 Entry 又被线程的 ThreadLocalMap 持有。线程池中线程长生不死，这条链使 value 无法回收，形成泄漏。解决方法是使用后 `remove()`，并在 get/set 时它会顺带清理 key 为 null 的 entry（启发式清理），但显式 remove 才可靠。

---

### 2.8 CAS 与 ABA

**CAS（Compare And Swap）** 是无锁并发的基石，三个操作数：内存值 V、预期旧值 A、新值 B，当 V==A 时把 V 更新为 B，否则自旋重试。Java 通过 `Unsafe` 类调用 CPU 的 `cmpxchg` 指令，单 CPU 内原子。

**ABA 问题**：线程 1 读到值 A，线程 2 把 A 改 B 又改回 A，线程 1 的 CAS 仍成功，但中间变化被掩盖。数值未变的"假象"在只关心最终值的场景无害，但在栈场景（引用指向曾变化的对象）有风险。

```java
// ABA 解决：AtomicStampedReference 加版本号
AtomicStampedReference<Integer> ref = new AtomicStampedReference<>(100, 0);  // 初始值100，版本0

// 线程1：模拟 ABA
new Thread(() -> {
    int stamp = ref.getStamp();
    ref.compareAndSet(100, 200, stamp, stamp + 1);   // 100->200
    ref.compareAndSet(200, 100, stamp + 1, stamp + 2); // 200->100
}).start();

// 线程2：版本校验失败，CAS 不成功
new Thread(() -> {
    int stamp = ref.getStamp();
    try { Thread.sleep(100); } catch (InterruptedException e) {}
    // 期望 100 版本 0，实际版本已是 2，CAS 失败
    boolean ok = ref.compareAndSet(100, 300, stamp, stamp + 1);
    System.out.println("更新成功? " + ok);   // false
}).start();
```

CAS 的问题：ABA、自旋开销（竞争激烈时空转 CPU）、只能保证单变量原子性。多变量需用 `AtomicReference` 包装对象整体 CAS 或用锁。

**面试题：CAS 有什么问题？如何解决 ABA？**

> CAS 三个问题：ABA——值被改又改回，CAS 检测不到，用 `AtomicStampedReference` 加版本号或 `AtomicMarkableReference` 加布尔标记解决；自旋开销——竞争激烈时大量空转 CPU，可用自旋次数限制退化为阻塞锁；只能保证单变量——多变量原子性需封装为对象整体 CAS 或加锁。

---
