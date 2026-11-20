---
title: "Java多线程 笔记（第一课）"
date: 2026-08-31
planet: growth
tags: ["面试", "八股"]
summary: "适用：三七互娱秋招笔试+面试  关联项目：博客项目线程池、ThreadLocal内存泄漏、分布式锁底层并发基础"
private: false
---
# Java多线程 笔记（第一课）
> 适用：三七互娱秋招笔试+面试
> 关联项目：博客项目线程池、ThreadLocal内存泄漏、分布式锁底层并发基础

## 一、线程基础
### 1. start() 与 run() 区别
1. `run()`：普通成员方法调用，**不会创建新线程**，在当前调用线程内执行业务逻辑。
2. `start()`：向JVM申请操作系统资源，创建操作系统内核线程，自动回调`run()`方法。
3. 限制：一个Thread对象只能调用一次`start()`，多次调用抛出 `IllegalThreadStateException`。

### 2. Java线程5种状态
`NEW（新建） → RUNNABLE（可运行） → BLOCKED（锁阻塞） → WAITING/TIMED_WAITING（等待） → TERMINATED（终止）`

- `NEW`：new Thread()之后，未调用start()。
- `RUNNABLE`：包含操作系统层面**就绪 + 运行中**两种状态。
- `BLOCKED`：仅在争抢`synchronized`监视器锁失败时进入该状态。
- `WAITING/TIMED_WAITING`：主动等待；`wait()`、`sleep()`、`join()`进入；需要被唤醒或超时。
- `TERMINATED`：线程执行完毕或者异常终止。

### 3. sleep() 与 wait() 对比（笔试简答高频）
| 对比项 | sleep() | wait() |
|--------|---------|--------|
| 归属 | Thread静态方法 | Object实例方法 |
| 锁行为 | **不释放synchronized锁，抱着锁睡眠** | **释放持有的监视器锁**，进入对象等待池 |
| 唤醒条件 | 时间到期自动恢复 | `notify()/notifyAll()`唤醒；也可设置超时wait(long) |
| 调用位置 | 任意位置均可调用 | **必须在synchronized同步代码块内，否则抛异常** |

> 记忆口诀：sleep抱着锁睡觉；wait交出锁等待。

## 二、synchronized 与锁升级
### 1. 锁升级顺序（MarkWord对象头存储锁标记）
**无锁 → 偏向锁 → 轻量级锁(自旋锁) → 重量级锁**
1. **偏向锁**：消除无竞争场景下CAS开销；适合**单线程反复获取锁**；出现多线程竞争，撤销偏向锁。
2. **轻量级锁**：基于CAS自旋，不陷入内核阻塞；适合线程交替使用锁；自旋消耗CPU。
3. **重量级锁**：操作系统互斥锁；线程阻塞进入内核态。

### 2. synchronized特性
- 可重入、默认非公平锁。
- 修饰实例方法：锁当前`this`对象。
- 修饰static静态方法：锁该类的`Class`对象。
- 修饰代码块：锁括号内传入的对象。

## 三、volatile关键字
### 核心三大特性
1. **保证可见性**：基于MESI缓存一致性协议 + 内存屏障；一个线程修改后立刻对其他线程可见。
2. **禁止指令重排序**。
3. ❗**不保证原子性**。

### 典型使用场景
1. 布尔状态标记；
2. DCL双重检查锁单例模式。

> 简答考点：为什么volatile不能保证`i++`线程安全？
`i++`分为三步：读取i → +1运算 → 写回主内存。volatile仅保证单步读写可见，**不能合并三步为原子操作**。多线程会出现穿插执行，发生写覆盖，丢失更新。

## 四、CAS & ABA问题
1. **CAS(Compare And Swap) 比较并交换**
    - 乐观锁思想；底层依赖Unsafe调用CPU硬件指令。
    - 逻辑：预期值与内存值相等才更新，否则失败重试。
2. **ABA问题**
    - 现象：变量A → 修改为B → 再改回A；CAS只对比值，识别不到中间变更。
    - 解决方案：增加**版本戳**，使用`AtomicStampedReference`。
3. 代表类：`AtomicInteger`底层使用CAS。

## 五、AQS 抽象队列同步器
`AQS = AbstractQueuedSynchronizer`，`ReentrantLock`底层核心。
1. `state`：同步状态变量；0代表无锁；大于0代表持有锁，数值代表重入次数。
2. CLH双向阻塞队列：抢锁失败的线程封装成节点入队阻塞等待。
3. 两种模式
    - 独占模式：`ReentrantLock`；同一时刻仅一个线程获取锁。
    - 共享模式：`CountDownLatch`、`Semaphore`；多个线程可以同时获取许可。

### ReentrantLock特点
- 可重入；支持公平锁 / 非公平锁；
- `lockInterruptibly()`支持获取锁过程响应中断；synchronized不支持中断；
- 支持`Condition`条件变量；
- 必须手动`unlock()`，放置在`finally`代码块，防止锁泄露。

## 六、并发工具类辨析（选择题高频）
1. **CountDownLatch**：减法计数器，**只能使用一次**。主线程await等待，等待多个子线程countDown完成，计数器归零后主线程继续。
2. **CyclicBarrier**：循环栅栏，**可重复使用**。一组线程互相等待，全部到达栅栏位置，再一起继续执行。
3. **Semaphore**：信号量；控制同时访问资源的许可数，用作限流。

> 考题：等待所有子线程全部执行完毕，主线程再继续执行，选用 `CountDownLatch`。

## 七、ThreadLocal
1. 原理：每个Java线程内部持有`ThreadLocalMap`；key为`ThreadLocal`对象，存储线程私有数据。
2. 内存泄漏原因（面试重点，游戏线程池高危坑）
    - ThreadLocalMap中Entry的**key是弱引用，value是强引用**。
    - 当外部ThreadLocal对象被GC回收，key置为null；但value仍然被Entry强引用。
    - 如果使用**线程池（线程复用，线程不会销毁）**，value对象永远得不到回收，发生内存泄漏。
3. 解决方案
    - 使用完成调用 `remove()`，直接删除整个Entry。
    - ❌不要仅使用`set(null)`，只会把value置null，Entry对象仍然保留在map中，无法彻底释放。
4. 业务风险：线程池场景忘记remove，会出现**线程复用导致数据串号、越权**。

## 八、课后自测题 + 参考答案
### 简答
1. sleep() 和 wait() 的区别
> 参考答案：
> 1. 所属类：`sleep()`是Thread的静态方法；`wait()`是Object的实例方法。
> 2. 锁处理：`sleep()`不会释放synchronized锁；`wait()`会释放监视器锁，进入对象等待池。
> 3. 唤醒：`sleep(time)`时间到自动恢复；`wait()`由`notify()/notifyAll()`唤醒，也可设置超时。
> 4. 调用位置：`sleep()`任意地方可调用；`wait()`必须在synchronized同步块内调用，否则抛异常。

2. volatile为什么不能保证i++原子性？
> 参考答案：
> `i++`分为三步：读取i的值、执行+1运算、写回主内存。volatile只能保证单步读写的可见性、禁止指令重排序，**不能把读‑改‑写三步合并为一个原子操作**。多线程会穿插执行这三步，出现写覆盖，发生丢失更新。

3. ThreadLocal内存泄漏原因与解决方案
> 参考答案：
> 原因：ThreadLocalMap的Entry中key是弱引用，value是强引用。当ThreadLocal对象被GC回收，key变为null；如果是线程池场景，线程复用不会销毁，value被Entry强引用无法回收，造成内存泄漏。
> 解决：使用完毕调用`remove()`，直接删除整个Entry；不要只用`set(null)`，set(null)仅清空value，Entry还存在，无法彻底释放。

### 选择
1. 等待全部子线程执行完毕主线程再继续（）
A.Semaphore B.CountDownLatch C.CyclicBarrier

> 参考答案：**B**

### 算法
1. 迭代反转单向链表（手写Java代码）
> 参考答案：
```java
public class ListNode{
    int val;
    ListNode next;
    ListNode(){}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode cur = head;
        ListNode pre = null;
        while(cur != null){
            //保存下一个节点
            ListNode temp = cur.next;
            //反转指针
            cur.next = pre;
            //双指针前移
            pre = cur;
            cur = temp;
        }
        return pre;
    }
}
```
