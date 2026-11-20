---
title: "TCP"
date: 2026-09-26
planet: system
tags: [八股, 一、TCP, system]
summary: "TCP 是面向连接、可靠、基于字节流的传输层协议。可靠性靠序号、确认、超时重传、滑动窗口等机制保证；面向字节流意味着应用层数据被看作无结构字节流，由 TCP 自行分块成报文段。"
private: false
---

## 一、TCP

TCP 是面向连接、可靠、基于字节流的传输层协议。可靠性靠序号、确认、超时重传、滑动窗口等机制保证；面向字节流意味着应用层数据被看作无结构字节流，由 TCP 自行分块成报文段。

### 1.1 三次握手与四次挥手

#### 三次握手过程

建立连接需要交换三个报文，核心目标是同步双方序号（ISN）并协商窗口大小。

```
Client                                  Server
  |                                       |
  |  --- SYN, seq=x ------------------->  |  (SYN_RCVD)
  |                                       |
  |  <-- SYN+ACK, seq=y, ack=x+1 -------  |
  |  (ESTABLISHED)                        |
  |                                       |
  |  --- ACK, ack=y+1 ------------------> |  (ESTABLISHED)
```

第一次握手：客户端发送 SYN 报文，seq=x，进入 SYN_SENT。服务端收到后确认客户端发送能力正常、自己接收能力正常。

第二次握手：服务端回 SYN+ACK，seq=y，ack=x+1，进入 SYN_RCVD。客户端收到后确认双方收发能力都正常。

第三次握手：客户端发 ACK，ack=y+1，进入 ESTABLISHED。服务端收到后确认自己发送能力、客户端接收能力正常。至此双方都进入 ESTABLISHED。

**为什么不是两次？** 两次握手只能确认客户端的发送能力和服务端的收发能力，无法确认客户端的接收能力。更关键的是无法防止历史失效连接：若客户端先发了一个失效的 SYN（网络滞留），服务端两次握手后就直接建立连接并分配资源，但客户端根本不会响应，服务端资源被白白占用。第三次握手让服务端确认客户端确实"活着且愿意建立本次连接"，才能避免这种资源浪费。

**为什么不是四次？** 第二次握手中的 SYN 和 ACK 可以合并成一个 SYN+ACK 报文，没必要拆成两步。三次已经是可靠确认双方双向通道的最小次数，四次冗余。

#### 四次挥手过程

断开连接需要四个报文，因为 TCP 是全双工的，两个方向的关闭需要独立确认。

```
Client                                  Server
  |                                       |
  |  --- FIN, seq=u ------------------->  |  (CLOSE_WAIT)
  |  (FIN_WAIT_1)                         |
  |                                       |
  |  <-- ACK, ack=u+1 ------------------  |  (被动方仍可发数据)
  |  (FIN_WAIT_2)                         |
  |            ...服务端处理剩余数据...      |
  |                                       |
  |  <-- FIN, seq=v -------------------   |  (LAST_ACK)
  |                                       |
  |  --- ACK, ack=v+1 ------------------> |  (CLOSED)
  |  (TIME_WAIT -> 2MSL -> CLOSED)        |
```

主动方先发 FIN 表示"我没有数据要发了"，被动方回 ACK，此时被动方进入 CLOSE_WAIT，仍可继续发送未发完的数据。等被动方数据发完后也发 FIN，主动方回 ACK 并进入 TIME_WAIT。

**为什么需要四次而不是三次？** 因为全双工。第一次 FIN 只表示主动方不再发数据，但被动方此时可能还有数据要发，所以 ACK 和被动方的 FIN 不能合并——必须等被动方把剩余数据发完，才能发自己的 FIN。如果被动方恰好也没有数据要发，理论上 ACK+FIN 可以合并，看起来像三次，但协议为通用情况设计为四个独立报文。

#### 状态变迁

```
                          LISTEN
                            |
                          recv SYN
                            v
                         SYN_RCVD
                            |
                        send SYN+ACK
                            v
                         ESTABLISHED <-- (三次握手完成)
                            |
                        recv FIN (被动关闭)
                            v
                         CLOSE_WAIT  --send FIN--> LAST_ACK
                            |                            |
                                                     recv ACK
                                                            v
                                                         CLOSED

ESTABLISHED --send FIN--> FIN_WAIT_1 --recv ACK--> FIN_WAIT_2
                                                            |
                                                       recv FIN
                                                            v
                                                         send ACK
                                                            |
                                                         TIME_WAIT
                                                            |
                                                        2MSL 超时
                                                            v
                                                         CLOSED
```

#### 面试题

**Q：请详细描述 TCP 三次握手过程。**

参考答案：客户端和服务端初始都处于 CLOSED/LISTEN。第一步，客户端发送 SYN 报文（SYN=1，seq=x）进入 SYN_SENT，服务端收到后进入 SYN_RCVD。第二步，服务端回 SYN+ACK（SYN=1，ACK=1，seq=y，ack=x+1）。第三步，客户端回 ACK（ack=y+1），双方进入 ESTABLISHED，连接建立完成。三次握手的作用是同步双方初始序号 ISN、确认双方收发能力正常，并防止历史失效连接。SYN 和 SYN+ACK 中还会携带 MSS、窗口缩放、SACK 等选项。

**Q：为什么 TCP 握手是三次而不是两次？**

参考答案：两次握手无法确认客户端的接收能力，也无法防止失效的 SYN 重传导致服务端建立无效连接。三次握手让服务端确认客户端确实收到了自己的 SYN+ACK 且愿意建立本次连接。同时 ISN 是动态生成的，三次握手能让双方都确认对端的 ISN，为后续可靠传输建立序号基准。

**Q：三次握手可以携带数据吗？**

参考答案：第一、二次握手由于尚未确认双向通道，一般不携带数据（SYN 报文段不消耗序号但携带选项）。第三次握手的 ACK 报文可以携带数据，因为此时客户端已进入 ESTABLISHED，发送的数据会从 ack=y+1 开始编号。但携带数据会增加首次交互复杂度，工程上通常等连接建立后再传数据。

**Q：SYN 攻击是什么？如何防御？**

参考答案：SYN Flood 攻击者发送大量伪造源 IP 的 SYN，服务端为每个连接分配资源并回 SYN+ACK，但永远收不到第三次 ACK，导致半连接队列耗尽。防御手段包括：开启 `tcp_syncookies`，服务端在 SYN_RCVD 时不立即分配资源，而是用加密 Cookie 编码序号返回，收到合法 ACK 后再还原建立连接；增大 `tcp_max_syn_backlog`；减少 SYN+ACK 重试次数；配合防火墙做源地址清洗。

---

### 1.2 流量控制（滑动窗口）

#### 滑动窗口原理

滑动窗口是 TCP 流量控制的核心，解决"发送方发送过快导致接收方处理不过来"的问题。接收方在 ACK 中携带窗口通告（rwnd），告诉发送方自己还能接收多少字节，发送方据此调节发送窗口大小。

窗口将字节流划分为四段：

```
已确认   |   已发送未确认   |   允许发送未发送   |   不允许发送
        <-------- 发送窗口 -------->
```

发送窗口随 ACK 到达而向右滑动：收到确认后左沿右移，根据新的 rwnd 调整右沿。窗口只有右移，不会回缩（协议要求窗口不能收缩，工程上可能回缩但属于边界情况）。

#### 零窗口与窗口探测

当接收方缓冲区满，会通告 rwnd=0，发送方暂停发送。但零窗口通告本身可能丢失，导致死锁：接收方以为发送方知道窗口为 0 在等待，发送方以为接收方窗口仍为 0 不敢发。为此发送方维护一个持续计时器（persist timer），周期性发送窗口探测报文（Zero Window Probe，1 字节），强制接收方重新通告窗口，直到窗口打开或连接断开。

#### 面试题

**Q：TCP 如何实现流量控制？**

参考答案：靠滑动窗口。接收方在 ACK 中通告自己的接收窗口 rwnd，发送方据此调整发送窗口大小，确保不会发送超过接收方缓冲能力的数据。当接收方处理慢导致窗口为 0 时，发送方停止发送，并通过持续计时器周期性发送窗口探测报文，等接收方窗口恢复后继续发送。这样发送速率被接收方动态反压，实现了端到端流量控制。

**Q：窗口Probe 报文有什么作用？**

参考答案：窗口探测用于打破零窗口死锁。当接收方通告 rwnd=0 后，发送方停止发送；但后续窗口打开的通告若丢失，双方会陷入死锁。探测报文（ZWP）让接收方必须回 ACK 并重新通告当前窗口，从而恢复数据传输。

---

### 1.3 拥塞控制

流量控制解决"接收方处理不过来"，拥塞控制解决"网络中间设备（路由器/交换机）处理不过来"。发送方维护一个拥塞窗口 cwnd，实际发送窗口 = min(rwnd, cwnd)。

#### 四个算法

```
cwnd
 ^
 |                       /  (拥塞避免 线性增长)
 |                      /
 |                     /
 |                    /................ (快恢复: ssthresh=cwnd/2)
 |                  /
 |                /  (慢启动 指数增长)
 |              /
 |            /
 |__________/______________________> 时间
            ^ ssthresh
```

- **慢启动**：连接建立或超时后，cwnd 从 1（或 IW10）开始，每收到一个 ACK 翻倍，呈指数增长。让网络逐步承受流量，避免冷启动时一次性灌满。
- **拥塞避免**：cwnd 达到慢启动门限 ssthresh 后，改为每经过一个 RTT 增加一个 MSS，线性增长，缓慢探测带宽。
- **快重传**：不等超时，收到 3 个重复 ACK 时立即重传丢失报文段，触发拥塞响应。
- **快恢复**：配合快重传，认为只是轻度拥塞，不回到慢启动。令 ssthresh = cwnd/2，cwnd = ssthresh + 3（为收到 3 个重复 ACK），进入拥塞避免线性增长，而非从 1 开始指数增长。

当发生超时（RTO 触发），认为是重度拥塞：ssthresh = cwnd/2，cwnd 重置为 1，重新慢启动。

#### 面试题

**Q：TCP 拥塞控制的四个算法是什么？**

参考答案：慢启动、拥塞避免、快重传、快恢复。慢启动阶段 cwnd 指数增长到 ssthresh；之后进入拥塞避免线性增长；收到 3 个重复 ACK 触发快重传，立即重传丢失段；同时进入快恢复，ssthresh 减半但 cwnd 不回到 1，从新 ssthresh 继续线性增长。若超时则判定重度拥塞，cwnd 回到 1 重新慢启动。这样既探测带宽又快速响应轻度丢包。

**Q：为什么要区分快重传和超时两种拥塞信号？**

参考答案：3 个重复 ACK 说明后续报文仍能到达，只是中间丢了一个，网络只是轻度拥塞，用快重传+快恢复快速恢复，性能好；超时（RTO）则意味着多报文都没拿到 ACK，网络重度拥塞，必须回到慢启动彻底降速。两种信号对应不同严重程度，分别处置。

---

### 1.4 TIME_WAIT

#### 存在原因

主动关闭方在回完最后一个 ACK 后进入 TIME_WAIT，持续 2MSL（最大报文段寿命，Linux 默认 60s）才进入 CLOSED。两个作用：

1. **防止旧连接的报文残留**：本次连接的延迟报文若在网络中游荡，2MSL 后必然消亡，不会干扰复用同四元组的新连接。
2. **确保被动方能正常关闭**：最后一次 ACK 可能丢失，被动方会重传 FIN。主动方在 TIME_WAIT 期间保留状态，能再次回 ACK，帮助被动方正常关闭；若主动方已关闭，被动方重传 FIN 时会收到 RST，无法正常进入 CLOSED。

#### 影响与优化

TIME_WAIT 占用本地端口和少量内核内存。高并发短连接服务端（如反向代理）作为主动关闭方会积累大量 TIME_WAIT，可能耗尽端口（ephemeral port 范围有限）。

优化手段：

- `SO_REUSEADDR`：允许绑定处于 TIME_WAIT 的地址，但需对端配合。
- `tcp_tw_reuse=1`：允许将 TIME_WAIT 连接用于新的出向连接（客户端侧），结合时间戳保证安全性。
- `tcp_tw_recycle`：在 NAT 环境下会引发问题，已废弃（Linux 4.12 后移除）。
- `tcp_max_tw_buckets`：限制 TIME_WAIT 数量上限，超过直接关闭。
- 让客户端主动关闭，使 TIME_WAIT 留在客户端侧。
- 使用长连接（Keep-Alive）减少连接频繁建拆。

#### 面试题

**Q：为什么 TCP 需要 TIME_WAIT 状态？**

参考答案：TIME_WAIT 持续 2MSL 有两个作用。一是防止本次连接的残留报文影响复用同四元组的新连接，2MSL 足够让网络中游荡的报文消亡。二是确保被动关闭方能正常关闭：最后一次 ACK 可能丢失，被动方会重传 FIN，主动方在 TIME_WAIT 期间保留状态可再次回 ACK；若主动方已关闭，被动方收到的将是 RST，无法正常进入 CLOSED。所以 TIME_WAIT 是主动关闭方必须承担的责任。

**Q：服务器出现大量 TIME_WAIT 怎么解决？**

参考答案：先定位是谁主动关闭。若服务端大量 TIME_WAIT，说明服务端频繁主动关闭短连接。解决方案：开启长连接复用减少建拆；让客户端作为主动关闭方；调大 `tcp_max_tw_buckets` 和端口范围 `ip_local_port_range`；客户端开启 `tcp_tw_reuse` 复用 TIME_WAIT 端口（配合时间戳）；调整 `tcp_fin_timeout`。生产环境优先用长连接，从源头减少 TIME_WAIT。

---

### 1.5 Nagle 算法与延迟确认

#### Nagle 算法原理

Nagle 算法解决"小包问题"：当发送方有未确认的小数据时，先缓存，等收到 ACK 或积累到 MSS 再发送，减少网络上的小包数量。本质是用延迟换取带宽效率。

#### 延迟确认机制

接收方收到数据后不立即回 ACK，而是等待一小段时间（默认 200ms）或等有数据要回时，把 ACK 捎带出去，减少纯 ACK 报文。

#### 两者结合的副作用

Nagle 需要等待 ACK 才发下一个小包，延迟确认又故意推迟 ACK，两者叠加会导致明显延迟。典型场景：交互式应用（如 SSH、游戏）发送小包后，要等 200ms 延迟确认的 ACK 才能发下一个，响应迟钝。

**禁用方式**：设置 `TCP_NODELAY` 关闭 Nagle 算法，适用于低延迟交互场景。

```java
// Java 关闭 Nagle
Socket socket = new Socket();
socket.setTcpNoDelay(true); // 关闭 Nagle，小包立即发送
```

#### 面试题

**Q：Nagle 算法和延迟确认有什么影响？**

参考答案：Nagle 算法缓存小包、积累到 MSS 或等 ACK 才发，减少小包数量提升带宽利用率；延迟确认推迟回 ACK 以便捎带数据，减少纯 ACK。两者单独使用都有意义，但叠加时 Nagle 等 ACK、延迟确认又压着 ACK，导致交互延迟。对延迟敏感场景（SSH、游戏、实时控制）应设置 `TCP_NODELAY` 关闭 Nagle，并避免依赖延迟确认。

---

### 1.6 Keepalive 机制

#### TCP Keepalive 原理

TCP Keepalive 是协议栈层面的保活机制：连接空闲超过一定时间（`tcp_keepalive_time`，默认 7200s）后，发送探测包，若对端响应则保持连接、重置计时器；连续多次（`tcp_keepalive_probes`）无响应则判定连接失效，通知应用层。用于检测半开连接（对端崩溃、网线断开但未发 FIN 的情况）。

#### 与 HTTP Keep-Alive 的区别

| 维度 | TCP Keepalive | HTTP Keep-Alive |
|------|---------------|------------------|
| 所属层 | 传输层（TCP 协议栈） | 应用层（HTTP 语义） |
| 作用 | 检测连接是否存活 | 复用 TCP 连接发多个 HTTP 请求 |
| 触发 | 连接空闲超时自动探测 | 由 HTTP 头部 `Connection: keep-alive` 控制 |
| 周期 | 系统级，默认 2 小时 | 通常几十秒，应用配置 |

#### 与应用层心跳的区别

TCP Keepalive 在内核态，对应用透明，但默认周期长、参数全局、不能携带业务语义。应用层心跳由应用自己定义频率和内容，更灵活、能同步业务状态，且能在中间设备（NAT、负载均衡）超时回收连接前主动保活。生产环境推荐用应用层心跳（如 Netty 的 IdleStateHandler）。

#### 面试题

**Q：TCP Keepalive 和应用层心跳的区别？**

参考答案：TCP Keepalive 是内核保活，连接空闲超时后发探测包，用于检测半开连接，但默认周期长（2 小时）、参数系统级、不能携带业务语义。应用层心跳由应用自定义频率和内容，灵活可控，能在 NAT/负载均衡回收连接前保活，还能同步业务状态（如最后活跃时间）。生产环境通常用应用层心跳（Netty 的 IdleStateHandler + 自定义心跳包），TCP Keepalive 作为兜底。

**Q：为什么需要心跳机制？**

参考答案：TCP 连接可能因为对端崩溃、断电、网线断开而变成"半开"状态——本端以为连接还在，但对端已不在，数据发出去会超时。心跳周期性探测连接活性，及时清理失效连接，避免无效连接占用资源。此外 NAT 网关、负载均衡器会按空闲时长回收映射，心跳能保持连接不被中间设备清理。

---


## 补充材料 · TCP

### TCP

#### 基本介绍

TCP/IP (Transfer Control Protocol) 协议，传输控制协议

TCP/IP 协议的特点：

* 面向连接的协议，提供可靠交互，速度慢
* 点对点的全双工通信
* 通过**三次握手**建立连接，连接成功形成数据传输通道；通过**四次挥手**断开连接
* 基于字节流进行数据传输，传输数据大小没有限制

TCP 协议的使用场景：文件上传和下载、邮件发送和接收、远程登录

注意：**TCP 不会为没有数据的 ACK 超时重传**

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/三次握手.png" alt="三次握手" style="zoom: 50%;" />

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/四次挥手.png" alt="四次挥手" style="zoom: 67%;" />

推荐阅读：https://yuanrengu.com/2020/77eef79f.html



***



#### Socket

TCP 通信也叫 **Socket 网络编程**，只要代码基于 Socket 开发，底层就是基于了可靠传输的 TCP 通信

双向通信：Java Socket 是全双工的，在任意时刻，线路上存在 `A -> B` 和 `B -> A` 的双向信号传输，即使是阻塞 IO，读和写也是可以同时进行的，只要分别采用读线程和写线程即可，读不会阻塞写、写也不会阻塞读

TCP 协议相关的类：

* Socket：一个该类的对象就代表一个客户端程序。
* ServerSocket：一个该类的对象就代表一个服务器端程序。

Socket 类：

* 构造方法：
  
  * `Socket(InetAddress address,int port)`：创建流套接字并将其连接到指定 IP 指定端口号
  
  * `Socket(String host, int port)`：根据 IP 地址字符串和端口号创建客户端 Socket 对象
  
    注意事项：**执行该方法，就会立即连接指定的服务器，连接成功，则表示三次握手通过**，反之抛出异常
* 常用 API：
  
  * `OutputStream getOutputStream()`：获得字节输出流对象
  * `InputStream getInputStream()`：获得字节输入流对象
  * `void shutdownInput()`：停止接受
  * `void shutdownOutput()`：停止发送数据，终止通信
  * `SocketAddress getRemoteSocketAddress() `：返回套接字连接到的端点的地址，未连接返回 null

ServerSocket 类：

* 构造方法：`public ServerSocket(int port)`
* 常用 API：`public Socket accept()`，**阻塞等待**接收一个客户端的 Socket 管道连接请求，连接成功返回一个 Socket 对象

  三次握手后 TCP 连接建立成功，服务器内核会把连接从 SYN 半连接队列（一次握手时在服务端建立的队列）中移出，移入 accept 全连接队列，等待进程调用 accept 函数时把连接取出。如果进程不能及时调用 accept 函数，就会造成 accept 队列溢出，最终导致建立好的 TCP 连接被丢弃
  
  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Netty-TCP三次握手.png" style="zoom:67%;" />

**相当于**客户端和服务器建立一个数据管道（虚连接，不是真正的物理连接），管道一般不用 close



***



#### 实现TCP

##### 开发流程

客户端的开发流程：

1. 客户端要请求于服务端的 Socket 管道连接
2. 从 Socket 通信管道中得到一个字节输出流
3. 通过字节输出流给服务端写出数据

服务端的开发流程：

1. 用 ServerSocket 注册端口
2. 接收客户端的 Socket 管道连接
3. 从 Socket 通信管道中得到一个字节输入流
4. 从字节输入流中读取客户端发来的数据

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/BIO工作机制.png)

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/TCP-工作模型.png)

* 如果输出缓冲区空间不够存放主机发送的数据，则会被阻塞，输入缓冲区同理
* 缓冲区不属于应用程序，属于内核
* TCP 从输出缓冲区读取数据会加锁阻塞线程



***



##### 实现通信

需求一：客户端发送一行数据，服务端接收一行数据

````java
public class ClientDemo {
    public static void main(String[] args) throws Exception {
        // 1.客户端要请求于服务端的socket管道连接。
        Socket socket = new Socket("127.0.0.1", 8080);
        // 2.从socket通信管道中得到一个字节输出流
        OutputStream os = socket.getOutputStream();
        // 3.把低级的字节输出流包装成高级的打印流。
        PrintStream ps = new PrintStream(os);
        // 4.开始发消息出去
        ps.println("我是客户端");
        ps.flush();//一般不关闭IO流
        System.out.println("客户端发送完毕~~~~");
    }
}
public class ServerDemo{
    public static void main(String[] args) throws Exception {
        System.out.println("----服务端启动----");
        // 1.注册端口: public ServerSocket(int port)
        ServerSocket serverSocket = new ServerSocket(8080);
        // 2.开始等待接收客户端的Socket管道连接。
        Socket socket = serverSocket.accept();
        // 3.从socket通信管道中得到一个字节输入流。
        InputStream is = socket.getInputStream();
        // 4.把字节输入流转换成字符输入流
        BufferedReader br = new BufferedReader(new InputStreamReader(is));
        // 6.按照行读取消息 。
        String line;
        if((line = br.readLine()) != null){
            System.out.println(line);
        }
    }
}
````



需求二：客户端可以反复发送数据，服务端可以反复数据

```java
public class ClientDemo {
    public static void main(String[] args) throws Exception {
        // 1.客户端要请求于服务端的socket管道连接。
        Socket socket = new Socket("127.0.0.1",8080);
        // 2.从socket通信管道中得到一个字节输出流
        OutputStream os = socket.getOutputStream();
        // 3.把低级的字节输出流包装成高级的打印流。
        PrintStream ps = new PrintStream(os);
        // 4.开始发消息出去
         while(true){
            Scanner sc = new Scanner(System.in);
            System.out.print("请说：");
            ps.println(sc.nextLine());
            ps.flush();
        }
    }
}
public class ServerDemo{
    public static void main(String[] args) throws Exception {
        System.out.println("----服务端启动----");
        // 1.注册端口: public ServerSocket(int port)
        ServerSocket serverSocket = new ServerSocket(8080);
        // 2.开始等待接收客户端的Socket管道连接。
        Socket socket = serverSocket.accept();
        // 3.从socket通信管道中得到一个字节输入流。
        InputStream is = socket.getInputStream();
        // 4.把字节输入流转换成字符输入流
        BufferedReader br = new BufferedReader(new InputStreamReader(is));
        // 6.按照行读取消息 。
        String line;
        while((line = br.readLine()) != null){
            System.out.println(line);
        }
    }
}
```



需求三：实现一个服务端可以同时接收多个客户端的消息

```java
public class ClientDemo {
    public static void main(String[] args) throws Exception {
        Socket socket = new Socket("127.0.0.1",8080);
        OutputStream os = new socket.getOutputStream();
        PrintStream ps = new PrintStream(os);
		while(true){
            Scanner sc = new Scanner(System.in);
            System.out.print("请说：");
            ps.println(sc.nextLine());
            ps.flush();
        }
    }
}
public class ServerDemo{
    public static void main(String[] args) throws Exception {
        System.out.println("----服务端启动----");
        ServerSocket serverSocket = new ServerSocket(8080);
        while(true){
            // 开始等待接收客户端的Socket管道连接。
             Socket socket = serverSocket.accept();
            // 每接收到一个客户端必须为这个客户端管道分配一个独立的线程来处理与之通信。
            new ServerReaderThread(socket).start();
        }
    }
}
class ServerReaderThread extends Thread{
    privat Socket socket;
    public ServerReaderThread(Socket socket){this.socket = socket;}
    @Override
    public void run() {
        try(InputStream is = socket.getInputStream();
           	BufferedReader br = new BufferedReader(new InputStreamReader(is))
           ){
            String line;
            while((line = br.readLine()) != null){
                sout(socket.getRemoteSocketAddress() + ":" + line);
            }
        }catch(Exception e){
            sout(socket.getRemoteSocketAddress() + "下线了~~~~~~");
        }
    }
}
```



***



##### 伪异步

一个客户端要一个线程，并发越高系统瘫痪的越快，可以在服务端引入线程池，使用线程池来处理与客户端的消息通信

* 优势：不会引起系统的死机，可以控制并发线程的数量

* 劣势：同时可以并发的线程将受到限制

```java
public class BIOServer {
    public static void main(String[] args) throws Exception {
        //线程池机制
        //创建一个线程池，如果有客户端连接，就创建一个线程，与之通讯(单独写一个方法)
        ExecutorService newCachedThreadPool = Executors.newCachedThreadPool();
        //创建ServerSocket
        ServerSocket serverSocket = new ServerSocket(6666);
        System.out.println("服务器启动了");
        while (true) {
            System.out.println("线程名字 = " + Thread.currentThread().getName());
            //监听，等待客户端连接
            System.out.println("等待连接....");
            final Socket socket = serverSocket.accept();
            System.out.println("连接到一个客户端");
            //创建一个线程，与之通讯
            newCachedThreadPool.execute(new Runnable() {
                public void run() {
                    //可以和客户端通讯
                    handler(socket);
                }
            });
        }
    }

    //编写一个handler方法，和客户端通讯
    public static void handler(Socket socket) {
        try {
            System.out.println("线程名字 = " + Thread.currentThread().getName());
            byte[] bytes = new byte[1024];
            //通过socket获取输入流
            InputStream inputStream = socket.getInputStream();
            int len;
            //循环的读取客户端发送的数据
            while ((len = inputStream.read(bytes)) != -1) {
                System.out.println("线程名字 = " + Thread.currentThread().getName());
                //输出客户端发送的数据
                System.out.println(new String(bytes, 0, read));
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            System.out.println("关闭和client的连接");
            try {
                socket.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
```



****



#### 文件传输

##### 字节流

客户端：本地图片:  ‪E:\seazean\图片资源\beautiful.jpg
服务端：服务器路径：E:\seazean\图片服务器

UUID. randomUUID() : 方法生成随机的文件名

**socket.shutdownOutput()**：这个必须执行，不然服务器会一直循环等待数据，最后文件损坏，程序报错

```java
//常量包
public class Constants {
    public static final String SRC_IMAGE = "D:\\seazean\\图片资源\\beautiful.jpg";
    public static final String SERVER_DIR = "D:\\seazean\\图片服务器\\";
    public static final String SERVER_IP = "127.0.0.1";
    public static final int SERVER_PORT = 8888;

}
public class ClientDemo {
    public static void main(String[] args) throws Exception {
        Socket socket = new Socket(Constants.ERVER_IP,Constants.SERVER_PORT);
        BufferedOutputStream bos=new BufferedOutputStream(socket.getOutputStream());
        //提取本机的图片上传给服务端。Constants.SRC_IMAGE
        BufferedInputStream bis = new BufferedInputStream(new FileInputStream());
        byte[] buffer = new byte[1024];
        int len ;
        while((len = bis.read(buffer)) != -1) {
            bos.write(buffer, 0 ,len);
        }
        bos.flush();// 刷新图片数据到服务端！！
        socket.shutdownOutput();// 告诉服务端我的数据已经发送完毕，不要在等我了！
        bis.close();
        
        //等待着服务端的响应数据！！
        BufferedReader br = new BufferedReader(
           				 new InputStreamReader(socket.getInputStream()));
        System.out.println("收到服务端响应："+br.readLine());
    }
}
```

```java
public class ServerDemo {
    public static void main(String[] args) throws Exception {
        System.out.println("----服务端启动----");
        // 1.注册端口: 
        ServerSocket serverSocket = new ServerSocket(Constants.SERVER_PORT);
        // 2.定义一个循环不断的接收客户端的连接请求
        while(true){
            // 3.开始等待接收客户端的Socket管道连接。
            Socket socket = serverSocket.accept();
            // 4.每接收到一个客户端必须为这个客户端管道分配一个独立的线程来处理与之通信。
            new ServerReaderThread(socket).start();
        }
    }
}
class ServerReaderThread extends Thread{
    private Socket socket ;
    public ServerReaderThread(Socket socket){this.socket = socket;}
    @Override
    public void run() {
        try{
            InputStream is = socket.getInputStream();
           	BufferedInputStream bis = new BufferedInputStream(is);
            BufferedOutputStream bos = new BufferedOutputStream(
                new FileOutputStream
                (Constants.SERVER_DIR+UUID.randomUUID().toString()+".jpg"));
            byte[] buffer = new byte[1024];
            int len;
            while((len = bis.read(buffer)) != -1){
                bos.write(buffer,0,len);
            }
            bos.close();
            System.out.println("服务端接收完毕了！");
            
            // 4.响应数据给客户端
            PrintStream ps = new PrintStream(socket.getOutputStream());
            ps.println("您好，已成功接收您上传的图片！");
            ps.flush();
            Thread.sleep(10000);
        }catch (Exception e){
            sout(socket.getRemoteSocketAddress() + "下线了");
        }
    }
}
```



****



##### 数据流

构造方法：

* `DataOutputStream(OutputStream out)` : 创建一个新的数据输出流，以将数据写入指定的底层输出流
* `DataInputStream(InputStream in) ` : 创建使用指定的底层 InputStream 的 DataInputStream

常用API：

* `final void writeUTF(String str)` : 使用机器无关的方式使用 UTF-8 编码将字符串写入底层输出流
* `final String readUTF()` : 读取以 modified UTF-8 格式编码的 Unicode 字符串，返回 String 类型

```java
public class Client {
    public static void main(String[] args) {
		InputStream is = new FileInputStream("path");
            //  1、请求与服务端的Socket链接
            Socket socket = new Socket("127.0.0.1" , 8888);
            //  2、把字节输出流包装成一个数据输出流
            DataOutputStream dos = new DataOutputStream(socket.getOutputStream());
            //  3、先发送上传文件的后缀给服务端
            dos.writeUTF(".png");
            //  4、把文件数据发送给服务端进行接收
            byte[] buffer = new byte[1024];
            int len;
            while((len = is.read(buffer)) > 0 ){
                dos.write(buffer , 0 , len);
            }
            dos.flush();
            Thread.sleep(10000);
    }
}

public class Server {
    public static void main(String[] args) {
        ServerSocket ss = new ServerSocket(8888);
        Socket socket = ss.accept();
 		// 1、得到一个数据输入流读取客户端发送过来的数据
		DataInputStream dis = new DataInputStream(socket.getInputStream());
		// 2、读取客户端发送过来的文件类型
		String suffix = dis.readUTF();
		// 3、定义一个字节输出管道负责把客户端发来的文件数据写出去
		OutputStream os = new FileOutputStream("path"+
                    UUID.randomUUID().toString()+suffix);
		// 4、从数据输入流中读取文件数据，写出到字节输出流中去
		byte[] buffer = new byte[1024];
		int len;
		while((len = dis.read(buffer)) > 0){
 			os.write(buffer,0, len);
		}
		os.close();
		System.out.println("服务端接收文件保存成功！");
    }
}
```



***

## NIO

### 基本介绍

**NIO的介绍**：

Java NIO（New IO、Java non-blocking IO），从 Java 1.4 版本开始引入的一个新的 IO API，可以替代标准的 Java IO API，NIO 支持面向缓冲区的、基于通道的 IO 操作，以更加高效的方式进行文件的读写操作

* NIO 有三大核心部分：**Channel（通道），Buffer（缓冲区），Selector（选择器）**
* NIO 是非阻塞 IO，传统 IO 的 read 和 write 只能阻塞执行，线程在读写 IO 期间不能干其他事情，比如调用 socket.accept()，如果服务器没有数据传输过来，线程就一直阻塞，而 NIO 中可以配置 Socket 为非阻塞模式
* NIO 可以做到用一个线程来处理多个操作的。假设有 1000 个请求过来，根据实际情况可以分配 20 或者 80 个线程来处理，不像之前的阻塞 IO 那样分配 1000 个

NIO 和 BIO 的比较：

* BIO 以流的方式处理数据，而 NIO 以块的方式处理数据，块 I/O 的效率比流 I/O 高很多

* BIO 是阻塞的，NIO 则是非阻塞的

* BIO 基于字节流和字符流进行操作，而 NIO 基于 Channel 和 Buffer 进行操作，数据从通道读取到缓冲区中，或者从缓冲区写入到通道中。Selector 用于监听多个通道的事件（比如：连接请求，数据到达等），因此使用单个线程就可以监听多个客户端通道

  | NIO                       | BIO                 |
  | ------------------------- | ------------------- |
  | 面向缓冲区（Buffer）      | 面向流（Stream）    |
  | 非阻塞（Non Blocking IO） | 阻塞IO(Blocking IO) |
  | 选择器（Selectors）       |                     |



***

### 实现原理

NIO 三大核心部分：Channel (通道)、Buffer (缓冲区)、Selector (选择器)

* Buffer 缓冲区

  缓冲区本质是一块可以写入数据、读取数据的内存，**底层是一个数组**，这块内存被包装成 NIO Buffer 对象，并且提供了方法用来操作这块内存，相比较直接对数组的操作，Buffer 的 API 更加容易操作和管理

* Channel 通道

  Java NIO 的通道类似流，不同的是既可以从通道中读取数据，又可以写数据到通道，流的读写通常是单向的，通道可以非阻塞读取和写入通道，支持读取或写入缓冲区，也支持异步地读写

* Selector 选择器

  Selector 是一个 Java NIO 组件，能够检查一个或多个 NIO 通道，并确定哪些通道已经准备好进行读取或写入，这样一个单独的线程可以管理多个 channel，从而管理多个网络连接，提高效率

NIO 的实现框架：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/NIO框架.png)

* 每个 Channel 对应一个 Buffer
* 一个线程对应 Selector ， 一个 Selector 对应多个 Channel（连接）
* 程序切换到哪个 Channel 是由事件决定的，Event 是一个重要的概念
* Selector 会根据不同的事件，在各个通道上切换
* Buffer 是一个内存块 ， 底层是一个数组
* 数据的读取写入是通过 Buffer 完成的 , BIO 中要么是输入流，或者是输出流，不能双向，NIO 的 Buffer 是可以读也可以写， flip() 切换 Buffer 的工作模式

Java NIO 系统的核心在于：通道和缓冲区，通道表示打开的 IO 设备（例如：文件、 套接字）的连接。若要使用 NIO 系统，获取用于连接 IO 设备的通道以及用于容纳数据的缓冲区，然后操作缓冲区，对数据进行处理。简而言之，Channel 负责传输， Buffer 负责存取数据



***
