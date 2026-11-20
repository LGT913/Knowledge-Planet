---
title: "UDP"
date: 2026-09-26
planet: system
tags: [八股, 二、UDP, system]
summary: "UDP 是无连接的传输层协议，发送前不需要建立连接，直接把报文扔给网络。特点："
private: false
---

## 二、UDP

### 2.1 无连接特性

UDP 是无连接的传输层协议，发送前不需要建立连接，直接把报文扔给网络。特点：

- **不可靠**：不保证交付、不保证顺序、不保证不重复。
- **面向报文**：应用层交下来的报文不拆分不合并，添加首部后直接发送，保留报文边界。
- **首部开销小**：仅 8 字节（源端口、目的端口、长度、校验和）。
- **无拥塞控制**：发送速率不受网络拥塞反馈调节，适合实时性要求高、允许少量丢包的场景。

```
 0      7 8     15 16    23 24    31
+--------+--------+--------+--------+
|  源端口  |  目的端口 |     UDP 首部
+--------+--------+--------+--------+
|   长度   |  校验和  |              |
+--------+--------+--------+--------+
|          数据 ...                  |
+--------+--------+--------+--------+
```

#### 面试题

**Q：UDP 为什么不可靠还要用它？**

参考答案：UDP 牺牲可靠性换取低延迟、低开销和实现简单。对于实时性要求高、能容忍少量丢包的场景（音视频、游戏同步），可靠重传反而带来延迟抖动；对于一问一答的短交互（DNS），建立 TCP 连接的开销大于数据本身；对于广播/多播场景，无连接特性天然适合。如果需要可靠性，可在应用层自行实现（如 QUIC 在 UDP 上构建可靠传输）。

---

### 2.2 适用场景（DNS、QUIC、音视频）

- **DNS**：一问一答短查询，UDP 无需建连开销，响应快；大响应会切换 TCP。
- **QUIC**：HTTP/3 的底层协议，在 UDP 上实现可靠传输、连接迁移、0-RTT 建连，解决 TCP 队头阻塞和握手慢的问题。
- **音视频/直播**：允许少量丢包，追求低延迟，丢包重传会引入卡顿。
- **游戏实时同步**：位置/状态更新容忍丢帧，对延迟敏感。
- **广播/多播**：DHCP、IGMP、组播视频等利用 UDP 的无连接特性。

#### 面试题

**Q：为什么 DNS 用 UDP 而不用 TCP？**

参考答案：DNS 查询通常是一问一答的短报文，UDP 无需三次握手建连，一次往返就能完成查询，延迟低、开销小。但 UDP 报文受限于 512 字节（传统限制），当响应数据量大（区域传输、DNSSEC）会切换到 TCP。所以 DNS 默认 UDP，大响应用 TCP，体现了按场景选择。

---

### 2.3 TCP vs UDP 对比

| 对比维度 | TCP | UDP |
|----------|-----|-----|
| 连接性 | 面向连接（三次握手） | 无连接 |
| 可靠性 | 可靠交付、不丢不重不乱 | 不可靠，尽力而为 |
| 有序性 | 保证顺序 | 不保证顺序 |
| 数据模式 | 面向字节流 | 面向报文（保留边界） |
| 首部大小 | 20 字节（带选项更大） | 8 字节 |
| 流量/拥塞控制 | 有（滑动窗口、慢启动等） | 无 |
| 传输效率 | 较低（握手、确认、重传开销） | 高 |
| 适用场景 | 文件传输、网页、邮件、数据库 | DNS、音视频、游戏、QUIC |
| 首部字段 | 序号、确认号、窗口、标志位等 | 仅端口、长度、校验和 |
| 广播/多播 | 不支持 | 支持 |

#### 面试题

**Q：TCP 和 UDP 的区别？**

参考答案：TCP 面向连接、可靠、有序、面向字节流，首部 20 字节，有流量控制和拥塞控制，适合文件传输、网页等对完整性要求高的场景；UDP 无连接、不可靠、不保序、面向报文，首部仅 8 字节，无拥塞控制，适合 DNS、音视频、游戏等追求低延迟、容忍丢包的场景。TCP 不支持广播多播，UDP 支持。选择取决于应用对可靠性、延迟、开销的权衡。

---


## 补充材料 · UDP

### UDP

#### 基本介绍

UDP（User Datagram Protocol）协议的特点：

* 面向无连接的协议，发送端只管发送，不确认对方是否能收到，速度快，但是不可靠，会丢失数据
* 尽最大努力交付，没有拥塞控制
* 基于数据包进行数据传输，发送数据的包的大小限制 **64KB** 以内
* 支持一对一、一对多、多对一、多对多的交互通信

UDP 协议的使用场景：在线视频、网络语音、电话



***



#### 实现UDP

UDP 协议相关的两个类：

* DatagramPacket（数据包对象）：用来封装要发送或要接收的数据，比如：集装箱
* DatagramSocket（发送对象）：用来发送或接收数据包，比如：码头

**DatagramPacket**：

* DatagramPacket 类：

  `public new DatagramPacket(byte[] buf, int length, InetAddress address, int port)`：创建发送端数据包对象 

  * buf：要发送的内容，字节数组
  * length：要发送内容的长度，单位是字节
  * address：接收端的IP地址对象
  * port：接收端的端口号

  `public new DatagramPacket(byte[] buf, int length)`：创建接收端的数据包对象

  * buf：用来存储接收到内容		
  * length：能够接收内容的长度

* DatagramPacket 类常用方法：
  
  * `public int getLength()`：获得实际接收到的字节个数
  * `public byte[] getData()`：返回数据缓冲区

**DatagramSocket**：

* DatagramSocket 类构造方法：
  * `protected DatagramSocket()`：创建发送端的 Socket 对象，系统会随机分配一个端口号
  * `protected DatagramSocket(int port)`：创建接收端的 Socket 对象并指定端口号
* DatagramSocket 类成员方法：
  * `public void send(DatagramPacket dp)`：发送数据包
  * `public void receive(DatagramPacket p)`：接收数据包
  * `public void close()`：关闭数据报套接字

```java
public class UDPClientDemo {
    public static void main(String[] args) throws Exception {
        System.out.println("===启动客户端===");
        // 1.创建一个集装箱对象，用于封装需要发送的数据包!
        byte[] buffer = "我学Java".getBytes();
        DatagramPacket packet = new DatagramPacket(buffer,bubffer.length,InetAddress.getLoclHost,8000);
        // 2.创建一个码头对象
        DatagramSocket socket = new DatagramSocket();
        // 3.开始发送数据包对象
        socket.send(packet);
        socket.close();
    }
}
public class UDPServerDemo{
    public static void main(String[] args) throws Exception {
        System.out.println("==启动服务端程序==");
        // 1.创建一个接收客户都端的数据包对象（集装箱）
        byte[] buffer = new byte[1024*64];
        DatagramPacket packet = new DatagramPacket(buffer, bubffer.length);
        // 2.创建一个接收端的码头对象
        DatagramSocket socket = new DatagramSocket(8000);
        // 3.开始接收
        socket.receive(packet);
        // 4.从集装箱中获取本次读取的数据量
        int len = packet.getLength();
        // 5.输出数据
        // String rs = new String(socket.getData(), 0, len)
        String rs = new String(buffer , 0 , len);
        System.out.println(rs);
        // 6.服务端还可以获取发来信息的客户端的IP和端口。
        String ip = packet.getAddress().getHostAdress();
        int port = packet.getPort();
        socket.close();
    }
}
```



***



#### 通讯方式

UDP 通信方式：

+ 单播：用于两个主机之间的端对端通信

+ 组播：用于对一组特定的主机进行通信
  
  IP : [公网IP已隐藏]

  Socket 对象 : MulticastSocket
  
+ 广播：用于一个主机对整个局域网上所有主机上的数据通信
  
  IP : 255.255.255.255

  Socket 对象 : DatagramSocket
  
  

***
