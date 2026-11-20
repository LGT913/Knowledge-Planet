---
title: "Socket 编程"
date: 2026-09-26
planet: system
tags: [八股, 五、Socket 编程, system]
summary: "while true {     selector.select; // 阻塞至有就绪事件     Iterator<SelectionKey it = selector.selectedKeys.iterator;     while i"
private: false
---

## 五、Socket 编程

### 5.1 BIO / NIO / AIO 模型对比

| 维度 | BIO | NIO | AIO |
|------|-----|-----|-----|
| 通信模型 | 阻塞同步 | 非阻塞同步（多路复用） | 非阻塞异步（回调） |
| 连接处理 | 一连接一线程 | 多路复用器轮询就绪事件 | 事件回调驱动 |
| API | `ServerSocket.accept()` 阻塞 | `Selector` + `SocketChannel` | `AsynchronousChannel` + `CompletionHandler` |
| 线程开销 | 高（连接数=线程数） | 低（少量线程管大量连接） | 低 |
| 适用场景 | 连接少且短 | 连接多、IO 密集 | 高并发、Linux 支持有限 |
| Linux 实现 | 阻塞 IO | epoll | epoll 模拟（非真异步） |

#### BIO 示例

```java
// BIO：一连接一线程
ServerSocket server = new ServerSocket(8080);
while (true) {
    Socket client = server.accept(); // 阻塞等待连接
    new Thread(() -> {
        try (InputStream in = client.getInputStream()) {
            byte[] buf = new byte[1024];
            int len = in.read(buf); // 阻塞读
            System.out.println(new String(buf, 0, len));
        } catch (IOException e) { /* ... */ }
    }).start();
}
```

#### NIO 示例

```java
// NIO 多路复用
Selector selector = Selector.open();
ServerSocketChannel ssc = ServerSocketChannel.open();
ssc.configureBlocking(false);
ssc.register(selector, SelectionKey.OP_ACCEPT);
ssc.bind(new InetSocketAddress(8080));

while (true) {
    selector.select(); // 阻塞至有就绪事件
    Iterator<SelectionKey> it = selector.selectedKeys().iterator();
    while (it.hasNext()) {
        SelectionKey key = it.next();
        if (key.isAcceptable()) {
            SocketChannel sc = ssc.accept();
            sc.configureBlocking(false);
            sc.register(selector, SelectionKey.OP_READ);
        } else if (key.isReadable()) {
            SocketChannel sc = (SocketChannel) key.channel();
            ByteBuffer buf = ByteBuffer.allocate(1024);
            sc.read(buf); // 非阻塞
            // 业务处理
        }
        it.remove();
    }
}
```

#### 面试题

**Q：BIO、NIO、AIO 的区别？**

参考答案：BIO 是阻塞同步 IO，accept 和 read 都阻塞，一个连接占一个线程，连接数受限、线程开销大。NIO 是非阻塞同步 IO，配合 Selector 多路复用，一个线程管理大量连接，事件就绪再处理，适合连接多、IO 久的场景。AIO 是非阻塞异步 IO，发起 IO 后由操作系统完成后回调 CompletionHandler，真正异步。但 Linux 下 AIO 用 epoll 模拟，成熟度不如 Windows IOCP，Java 服务端（Netty）主流仍用 NIO + Reactor。

**Q：为什么 Java 服务端主流用 NIO 而不是 AIO？**

参考答案：Linux 的 AIO 对网络 IO 支持有限，本质用 epoll 模拟，性能优势不明显；而 NIO + epoll + Reactor 模型在 Netty 上已经成熟稳定、生态完善。AIO 的回调模型对业务代码侵入大、调试复杂。综合稳定性、生态和性能，Java 后端（Netty、Vert.x 等）普遍选 NIO。

---

### 5.2 select / poll / epoll 原理与区别

三者都是 IO 多路复用机制，让单线程监视多个 fd 的就绪事件。

| 维度 | select | poll | epoll |
|------|--------|------|-------|
| fd 上限 | 1024（FD_SETSIZE） | 无上限 | 无上限 |
| 数据结构 | bitmap | 链表 | 红黑树 + 就绪链表 |
| 事件传递 | 每次全量拷贝 fd 集到内核 | 每次全量拷贝 | 增删改通过 epoll_ctl，事件直接就绪链表 |
| 返回后定位 | 线性扫描全部 fd | 线性扫描 | 直接遍历就绪链表 |
| 时间复杂度 | O(n) | O(n) | O(1)（取就绪） |
| 触发方式 | 水平触发（LT） | 水平触发（LT） | 支持 LT 与边缘触发（ET） |
| 大量连接性能 | 差 | 差 | 好 |

**epoll 原理**：

- `epoll_create`：创建 epoll 实例，内核维护红黑树（监听 fd）和就绪链表。
- `epoll_ctl(ADD/MOD/DEL)`：增删改监听 fd，红黑树插入/更新，O(log n)。
- `epoll_wait`：只把就绪链表中的 fd 拷回用户态，O(就绪数) 而非 O(总数)。

**LT vs ET**：

- 水平触发（LT）：只要 fd 有数据可读，每次 epoll_wait 都会通知，不读就一直通知。
- 边缘触发（ET）：只在状态变化时通知一次（如从无数据到有数据），必须一次读到 EAGAIN，否则不会再通知。ET 性能更高但编程复杂、需非阻塞 + 循环读。

#### 面试题

**Q：select、poll、epoll 的区别？**

参考答案：select 有 fd 上限 1024，每次调用要把 fd 集全量拷贝到内核，返回后线性扫描全部 fd 找就绪，O(n)。poll 解除了 fd 上限，但仍是全量拷贝和线性扫描。epoll 用红黑树管理监听 fd，增删改 O(log n)；就绪事件维护在独立链表，epoll_wait 只返回就绪 fd，O(就绪数)；并支持边缘触发，性能远优于前两者，是高并发服务端首选。

**Q：epoll 的 LT 和 ET 区别？**

参考答案：水平触发只要 fd 可读就一直通知，不读也会持续通知，编程简单但可能多次唤醒。边缘触发只在状态变化时通知一次，必须配合非阻塞 IO 一次读到 EAGAIN，否则会漏数据；ET 减少了 epoll_wait 被唤醒次数，性能更高，但编程要小心处理"读到 EAGAIN"和"缓冲区满"的情况。Netty 默认用 LT。

---

### 5.3 零拷贝（sendfile、mmap、splice）

传统读文件再发网络的流程要经过 4 次上下文切换和 4 次数据拷贝（其中 2 次是 CPU 拷贝、2 次 DMA 拷贝）：

```
磁盘 --DMA--> 内核缓冲 --CPU拷贝--> 用户缓冲 --CPU拷贝--> Socket缓冲 --DMA--> 网卡
       上下文切换：read 调用(用户->内核) + 返回(内核->用户) + write + 返回
```

零拷贝技术减少不必要的 CPU 拷贝和上下文切换。

| 技术 | 原理 | 减少的拷贝 | 典型场景 |
|------|------|------------|----------|
| `sendfile` | 内核态直接把文件数据从页缓存送到 Socket 缓冲，不经过用户态 | 省 2 次 CPU 拷贝 | 静态文件下载、Kafka |
| `mmap` | 把文件映射到用户态内存，用户态直接读写页缓存 | 省 1 次 CPU 拷贝（读） | 随机读写、RocketMQ CommitLog |
| `splice` | 内核管道连接两个 fd，纯内核态搬移 | 省 CPU 拷贝 | 管道转发 |

```
sendfile: 磁盘 --DMA--> 内核缓冲 --DMA--> 网卡   (2 次 DMA，0 次 CPU 拷贝)
mmap:     磁盘 --DMA--> 内核缓冲 == 映射 == 用户内存 (用户态直接访问页缓存)
```

Java 层通过 `FileChannel.transferTo` 调用底层 sendfile：

```java
FileChannel file = new FileInputStream("data.bin").getChannel();
SocketChannel socket = ...;
file.transferTo(0, file.size(), socket); // 零拷贝发送
```

Netty 提供 `FileRegion`（封装 transferTo）和 `ByteBufAllocator.directBuffer()`（堆外内存，省一次堆内→堆外拷贝）。

#### 面试题

**Q：什么是零拷贝？sendfile 和 mmap 的区别？**

参考答案：零拷贝指减少数据传输中的 CPU 拷贝和上下文切换次数，不是真的"零拷贝"，而是省掉用户态与内核态之间的冗余拷贝。sendfile 让数据在内核态从页缓存直送 Socket 缓冲，全程不经用户态，适合文件→网络的顺序发送。mmap 把文件映射到用户态虚拟地址，用户态直接读页缓存，省一次 CPU 拷贝，适合需要随机读写文件内容的场景（如消息存储）。Kafka 用 sendfile 顺序发送日志，RocketMQ 用 mmap 读写 CommitLog。

**Q：Netty 的零拷贝和 OS 层零拷贝一样吗？**

参考答案：不一样。OS 层零拷贝是 sendfile/mmap，减少内核↔用户态拷贝。Netty 的零拷贝还有应用层含义：CompositeByteBuf 合并多个 ByteBuf 而不拷贝；slice() 切片共享内存不拷贝；用 direct 堆外内存避免 JVM 堆↔native 拷贝。两层零拷贝配合使用。

---

### 5.4 粘包拆包解决方案

TCP 是面向字节流的，不保留应用层消息边界，多条消息可能粘成一个包（粘包）或一条消息被拆成多段（拆包）。

```
发送: [AA][BB][CC]
粘包: 接收 [AABB][CC]       (多条粘一起)
拆包: 接收 [A][AB][BC][C]   (一条被拆)
正确: 接收 [AA][BB][CC]     (按边界还原)
```

常见方案：

| 方案 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| 定长包 | 每条固定长度，不足补齐 | 简单 | 浪费带宽、不灵活 |
| 分隔符 | 用特殊字符（如 `\r\n`）分隔 | 灵活 | 分隔符需转义、需扫描 |
| TLV（Length 字段） | 头部带 Type/Length/Value | 通用、精确 | 实现略复杂 |

Netty 内置解码器：

```java
// TLV 方案：基于长度字段
pipeline.addLast(new LengthFieldBasedFrameDecoder(
    65535,   // maxFrameLength
    0,       // lengthFieldOffset
    2,       // lengthFieldLength（前 2 字节是长度）
    0,       // lengthAdjustment
    2        // initialBytesToStrip（跳过长度字段本身）
));

// 分隔符方案
pipeline.addLast(new DelimiterBasedFrameDecoder(65535,
    Unpooled.wrappedBuffer("$$".getBytes())));

// 定长方案
pipeline.addLast(new FixedLengthFrameDecoder(64));
```

#### 面试题

**Q：为什么 TCP 会粘包拆包？怎么解决？**

参考答案：TCP 是字节流协议，不保留应用层消息边界，发送方的多条消息可能被合并成一个 TCP 段发出（粘包），或一条消息被拆成多段（拆包），取决于 MSS、发送缓冲区、Nagle 等。解决思路是在应用层定义消息边界，常见方案：定长包（固定长度）、分隔符（特殊字符）、TLV（头部带长度字段，最通用）。Netty 用 `LengthFieldBasedFrameDecoder` 实现 TLV 解码，按长度字段还原完整消息。

**Q：UDP 会粘包吗？**

参考答案：不会。UDP 是面向报文的，保留消息边界，一个 UDP 报文就是一条完整消息，应用层一次 send 对应一次 recv，不会粘。粘包拆包是 TCP 字节流特性的问题，UDP 天然有边界。

---

### 5.5 Reactor 模型（单线程 / 多线程 / 主从）

Reactor 模型是基于事件驱动的并发设计：用 Reactor（多路复用器）监听事件，事件就绪后分发给 Handler 处理，避免一连接一线程的阻塞开销。

#### 单线程 Reactor

一个线程完成 accept、read、decode、业务、write 全流程。

```
[Reactor 线程]
   |--- Selector 监听
   |--- Accept 处理连接
   |--- Read/Write/业务处理
```

简单，但业务处理慢会拖垮所有连接，适合 IO 密集、业务轻量的场景（Redis 类似单线程 Reactor）。

#### 多线程 Reactor

业务处理交给独立业务线程池，Reactor 只管 IO 事件分发。

```
[Reactor 线程]            [业务线程池]
   Selector 监听     <-->    业务处理
   Accept/Dispatch            Read/Write 回写
```

IO 与业务分离，业务慢不阻塞 IO，但单 Reactor 仍是 accept 与读写瓶颈。

#### 主从 Reactor（Main-Sub Reactor）

主 Reactor 专门 accept 新连接，接受后把连接分发给从 Reactor 处理读写，业务再交线程池。

```
[Main Reactor]              [Sub Reactor 池]         [业务线程池]
   accept 新连接  --分发-->   监听读写就绪  --派发-->   处理业务
                            多个从 Reactor
```

主 Reactor 解耦 accept 与读写，从 Reactor 多个并行处理读写，业务线程池隔离耗时逻辑。**Netty 默认采用主从 Reactor**：BossGroup 主 Reactor accept，WorkerGroup 从 Reactor 处理 IO，可选业务 Group 处理耗时业务。

```java
// Netty 主从 Reactor
EventLoopGroup bossGroup = new NioEventLoopGroup(1);   // 主 Reactor
EventLoopGroup workerGroup = new NioEventLoopGroup();   // 从 Reactor (默认 CPU*2)

ServerBootstrap b = new ServerBootstrap();
b.group(bossGroup, workerGroup)              // 主从分组
 .channel(NioServerSocketChannel.class)
 .childHandler(new ChannelInitializer<SocketChannel>() {
     @Override
     protected void initChannel(SocketChannel ch) {
         ch.pipeline()
           .addLast(new LengthFieldBasedFrameDecoder(65535, 0, 2, 0, 2))
           .addLast(new IdleStateHandler(60, 0, 0, TimeUnit.SECONDS))
           .addLast(new MyBusinessHandler()); // 业务 Handler
     }
 });
ChannelFuture f = b.bind(8080).sync();
```

#### Proactor 与 Reactor 对比

Reactor 是同步 IO（事件就绪通知后自己 read/write），Proactor 是异步 IO（发起 IO 后操作系统完成后回调）。Linux 下 AIO 不成熟，所以 Linux 服务端主流用 Reactor（epoll + ET）；Windows 用 Proactor（IOCP）。Netty 在 Linux 上用 NIO（epoll 的 Reactor）。

#### 面试题

**Q：Reactor 模型有哪几种？**

参考答案：单线程 Reactor：一个线程管 accept、读写、业务，简单但业务慢会阻塞所有连接。多线程 Reactor：业务交给线程池，IO 与业务分离，但单 Reactor 仍是瓶颈。主从 Reactor：主 Reactor 专管 accept，分发到多个从 Reactor 处理读写，业务再交线程池，并发能力最强。Netty 默认用主从 Reactor：BossGroup accept、WorkerGroup 处理 IO，业务可另开线程池隔离耗时逻辑。

**Q：Netty 的主从 Reactor 是怎么工作的？**

参考答案：BossGroup 通常 1 个线程（主 Reactor），负责 accept 新连接，accept 后把 SocketChannel 注册到 WorkerGroup 的某个 EventLoop。WorkerGroup 多个线程（从 Reactor），每个 EventLoop 绑一个 Selector，循环处理注册到自己的连接的读写事件。业务逻辑默认在 Worker 线程执行，耗时业务可通过 `addLast(businessGroup, handler)` 交给独立业务线程池，避免阻塞 IO 线程。一个 EventLoop 管多个 Channel 且全程绑定同一线程，避免了多线程切换。
