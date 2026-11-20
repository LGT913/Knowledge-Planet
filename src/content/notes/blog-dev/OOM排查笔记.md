---
title: "OOM 排查笔记"
date: 2026-09-08
planet: blog-dev
tags: ["后端", "实战"]
summary: "适用本项目（Spring Boot 3.5.4 单体 + JVM 内存调优）+ 面试。"
private: false
---
# OOM 排查笔记

> 适用本项目（Spring Boot 3.5.4 单体 + JVM 内存调优）+ 面试。

## 一、先分清是哪一种 OOM

先看日志异常栈，不同 OOM 排查方向和工具完全不同，**别急着 dump**。

| 类型 | 含义 | 主攻方向 |
|------|------|---------|
| `Java heap space` | 堆内存满（最常见，~90%） | 堆上泄漏 / 堆太小 |
| `GC Overhead limit exceeded` | GC 疯狂回收仍回收不到，>98% 时间在 GC | 基本=堆泄漏 |
| `Direct buffer memory` | 堆外 / 直接内存（NIO、DirectByteBuffer） | 忘了释放 / ByteBuffer 池未回收 |
| `Metaspace` | 方法区 / 类元数据 | 动态生成类（反射、CGLIB、脚本）|

> 面试开场白：**"堆上 OOM 才用 heap dump 分析；非堆 OOM 堆快照看不出问题，得改查类加载或堆外监控。"**

---

## 二、抓现场：生成堆快照（dump）

### 推荐：事先预防（自动落盘）

在启动参数（Java 命令 / systemd `ExecStart` / `JAVA_OPTS`）里加上：

```bash
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/opt/blog/logs/heap.hprof
```

OOM 发生时 JVM 自动把快照写到指定路径，不用应急去手工抓。

### 应急抓现场（进程还活着时）

```bash
# 先看堆使用率，确认确实堆高（且高优先级才抓，抓 dump 会 STW 暂停用户线程）
jstat -gcutil <pid> 1000 5

# 方式一：jmap（传统，枚举次堆，可能卡顿）
jmap -dump:live,format=b,file=/opt/blog/logs/heap.hprof <pid>

# 方式二：jcmd（推荐，JDK8+ 自带，更轻）
jcmd <pid> GC.heap_dump /opt/blog/logs/heap.hprof
```

> **注意**：线上抓 heap dump 会触发 Full STW。先用 `jstat` 判断"是否紧急但可控"，避免高峰期贸然抓取。从容时优先用自动落盘方案。

---

## 三、用 MAT 分析快照

MAT（Memory Analyzer Tool）打开 `heap.hprof`，按套顺序：

1. **Histogram（直方图）**：按 `Class → 对象数 → Shallow/Retained Size` 统计，先看哪种类型数量/占用异常。
2. **Leak Suspects Report（泄漏嫌疑人）**：MAT 自动给出"最可能泄漏的对象"，最快入口。
3. **Dominator Tree（支配树）**：看 **Retained Heap** 最大的节点。**Retained Heap = 若此对象可被回收、连带能被回收的内存**，它大 = 它被拽着不放开 = 泄漏集中点。
4. **Path to GC Roots**：对嫌疑对象右键反查，沿引用链找到业务代码里的持有者。

> 核心思路一句话：**"我的堆内存到底被谁拽着不放？"** —— 用 Retained Heap 排序找最大持有者，再用 GC Roots 引用链定位代码。

MAT 入口：`File → Open Heap Dump` → 双击打开 → 顶部选上面任一视图。

---

## 四、沿引用链定位代码

选中嫌疑对象 → 右键 → **`Path to GC Roots`** → 用默认（exclude weak/soft references）→ 沿链路走到底，就能看到业务层的持有者。

### 本项目 5 类高频泄漏来源

| 泄漏来源 | 特征 | 本项目对应 |
|---------|------|-----------|
| 集合无限增长 | Map/List 只 add 不清理 | 若某缓存用 List 又无淘汰策略 |
| 线程池队列堆积 | 任务只入队不消费 | cacheRebuild / warmup 队列被塞爆 |
| ThreadLocal 未 remove | 线程池复用线程，残留值被线程兜住 | JWT SecurityContext *若* 忘清理 |
| 缓存无上限 | key 无限增长不淘汰 | 缓存 key 设计无 TTL |
| 全局 static 大对象 | 静态变量挂着大集合 | 常量/静态缓存持有大 List |

> **呼应本项目 ThreadLocal 知识点**：线程池线程被复用，`remove()` 没做时值会残留在线程本地。MAT 中表现为**大量同名对象被线程持有**，Path to GC Roots 会看到 `ThreadLocalMap / Thread$ThreadLocalMap` 节点。这正是本项目中 `JwtAuthenticationFilter` 在拿到无效 token 时要用 `SecurityContextHolder.clearContext()` 清理的原因。

---

## 五、修复 + 回归验证

1. 修复：释放引用 / 加淘汰 / `ThreadLocal.remove()` / 限制缓存规模。
2. 验证：重启 → `jstat -gcutil <pid> 1000 10`，观察 O、E 区稳定、FGC 频率回落。
3. 压测：确认内存不再单调上涨（画内存曲线）。
4. 留存 hprof 作为后续回归比对样本。

---

## 六、排查工具速查

| 工具 | 用途 | 常用命令 |
|------|------|---------|
| `jstat` | 实时堆/GC 状态 | `jstat -gcutil <pid> 1000 5` |
| `jmap` | 生成堆快照 | `jmap -dump:live,format=b,file=x.hprof <pid>` |
| `jcmd` | 轻量堆快照 | `jcmd <pid> GC.heap_dump x.hprof` |
| `jstack` | 线程快照（堵死/死锁）| `jstack <pid> > thread.txt` |
| `jhsdb` | 无 jmap 时可替代 | `jhsdb jmap --pid <pid>` |
| MAT | 离线分析快照 | 图形化，Leak Suspects / Dominator Tree |
| jvisualvm | 图形化堆 dump 浏览 | 官方自带 |

---

## 面试话术（背这段）

> 线上 OOM 我**先分类型**——堆 OOM 走 heap dump，非堆（Metaspace/Direct）走别的排查。
> 堆的就**抓现场**：优先 `-XX:+HeapDumpOnOutOfMemoryError` 让 JVM 自动落盘，应急用 `jmap` / `jcmd GC.heap_dump`，抓前用 `jstat` 确认堆使用率、评估 STW 影响。
> 然后**开 MAT**：先看 Histogram 找异常数量大的对象，再看 Leak Suspects，重点看 Dominator Tree 里 Retained Heap 最大的节点，右键 `Path to GC Roots` 反查谁持有它。
> **定位到代码后修复**，再用 `jstat -gcutil` 观察 GC 是否恢复正常，压测确认内存不再单调上涨。
