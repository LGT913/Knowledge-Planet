---
title: "ReentrantLock"
date: 2026-09-26
planet: system
tags: [八股, 2.5 ReentrantLock, system]
summary: "ReentrantLock 基于 AQS，支持公平、非公平两种模式，并可通过 Condition 实现多条件变量等待。"
private: false
---

### 2.5 ReentrantLock

`ReentrantLock` 基于 AQS，支持公平、非公平两种模式，并可通过 `Condition` 实现多条件变量等待。

| 特性 | 公平锁 | 非公平锁 |
| --- | --- | --- |
| 获取顺序 | 严格 FIFO，先到先得 | 新线程可插队 |
| 吞吐量 | 较低 | 较高 |
| 饥饿 | 不会 | 可能 |
| 适用 | 严格公平场景 | 大多数默认场景 |

**为什么默认非公平？** 线程切换有内核态开销，非公平锁让刚释放锁的线程或新到线程直接 CAS 抢锁，避免队列唤醒开销，吞吐量显著更高。公平锁每次获取都检查队列是否有前驱，增加了线程切换。

`Condition` 相比 `Object.wait/notify` 的优势：一个锁可绑定多个 `Condition`，实现"不同条件分别唤醒"，如生产者消费者用 `notFull` 和 `notEmpty` 两个条件队列精准唤醒。

```java
// Condition 实现的生产者-消费者
public class BoundedBuffer<T> {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    private final Object[] items = new Object[10];
    private int count, putIdx, takeIdx;

    public void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length)
                notFull.await();          // 满了，等待 notFull
            items[putIdx] = item;
            if (++putIdx == items.length) putIdx = 0;
            count++;
            notEmpty.signal();            // 通知消费者
        } finally { lock.unlock(); }
    }

    @SuppressWarnings("unchecked")
    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0)
                notEmpty.await();         // 空了，等待 notEmpty
            T item = (T) items[takeIdx];
            items[takeIdx] = null;
            if (++takeIdx == items.length) takeIdx = 0;
            count--;
            notFull.signal();             // 通知生产者
            return item;
        } finally { lock.unlock(); }
    }
}
```

**ReentrantLock vs synchronized 对比**

| 维度 | synchronized | ReentrantLock |
| --- | --- | --- |
| 实现 | JVM 内置，monitor | AQS，Java 层 |
| 公平性 | 非公平 | 可选公平/非公平 |
| 中断响应 | 不支持 | `lockInterruptibly()` 支持 |
| 超时获取 | 不支持 | `tryLock(time)` 支持 |
| 条件变量 | 一个 `wait`/`notify` | 多个 `Condition` |
| 释放锁 | 自动释放 | 必须手动 `unlock()`，须放 finally |
| 性能 | JDK6 后优化接近 | 高竞争下略优 |

**面试题：ReentrantLock 和 synchronized 的区别？**

> synchronized 是 JVM 关键字，基于 monitor，自动释放锁，只有一个等待队列；ReentrantLock 基于 AQS，需手动释放（必须 finally），支持公平/非公平选择、可中断、可超时获取、多 Condition 条件变量。功能上 ReentrantLock 更灵活，synchronized 更简洁不易泄漏锁。高竞争或需高级特性（超时、公平、多条件）选 ReentrantLock，否则优先 synchronized。

---
