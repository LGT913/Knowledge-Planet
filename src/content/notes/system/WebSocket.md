---
title: "WebSocket"
date: 2026-09-26
planet: system
tags: [八股, 四、WebSocket, system]
summary: "WebSocket 复用 HTTP 完成握手，再切换为独立的二进制协议。"
private: false
---

## 四、WebSocket

### 4.1 握手过程（Upgrade 头部）

WebSocket 复用 HTTP 完成握手，再切换为独立的二进制协议。

```
Client 请求:
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

Server 响应:
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

服务端将 `Sec-WebSocket-Key` 拼接固定 magic string `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`，做 SHA-1 再 Base64，得到 `Sec-WebSocket-Accept`。客户端验证该值即确认服务端理解 WebSocket 协议。响应 101 后，TCP 连接升级为 WebSocket 双工通道。

```java
// Java（Java-WebSocket 库）服务端示例
WebSocketServer server = new WebSocketServer(new InetSocketAddress(8080)) {
    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        conn.send("welcome");
    }
    @Override
    public void onMessage(WebSocket conn, String message) {
        conn.send("echo: " + message); // 全双工
    }
    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {}
    @Override
    public void onError(WebSocket conn, Exception ex) {}
};
server.start();
```

#### 面试题

**Q：WebSocket 握手为什么要用 Sec-WebSocket-Key？**

参考答案：握手复用 HTTP，需防止普通 HTTP 缓存或代理误把响应当 HTTP 内容。客户端发随机 Key，服务端按固定算法（拼接 magic string + SHA-1 + Base64）回 Accept，客户端验证后才升级协议。这既确认服务端支持 WebSocket，又防止跨协议攻击——普通 HTTP 服务器不会按这个算法响应，握手会失败。

---

### 4.2 帧格式（opcode、mask、payload length）

握手后通信使用 WebSocket 帧协议：

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127    |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set (4)   |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
```

关键字段：

- **FIN**：是否为最后一帧，支持分片。
- **opcode**：帧类型，0x0 续帧、0x1 文本、0x2 二进制、0x8 关闭、0x9 Ping、0xA Pong。
- **MASK**：客户端→服务端的帧必须掩码，服务端→客户端不掩码。掩码键 4 字节，与 payload 异或。
- **payload length**：7 位（<126）、16 位（126，中等长度）、64 位（127，大消息）三档。

客户端帧必须 mask 是为了防止中间代理被缓存投毒——掩码使每条数据的字节流不可预测。

#### 面试题

**Q：WebSocket 帧为什么客户端要 mask？**

参考答案：客户端到服务端的帧必须用 4 字节掩码键对 payload 异或掩码。这是为了防止缓存投毒攻击：早期中间代理可能误把 WebSocket 流当 HTTP 缓存，攻击者可构造特定字节骗代理缓存恶意内容。掩码使每帧字节流不可预测，代理无法解析，从而隔离了 WebSocket 流和 HTTP 缓存。服务端到客户端不需要掩码，因为攻击方向不同。

---

### 4.3 与 HTTP 长轮询 / SSE 对比

| 维度 | WebSocket | HTTP 长轮询 | SSE（Server-Sent Events） |
|------|-----------|-------------|---------------------------|
| 通信方向 | 全双工 | 单向（客户端轮询拉取） | 单向（服务端推送） |
| 协议 | WS（基于 HTTP 握手后升级） | HTTP | HTTP |
| 连接 | 持久 | 每次轮询建连/复用 | 持久 |
| 实时性 | 高（服务端主动推） | 低（受轮询间隔限制） | 高（服务端推） |
| 开销 | 低（帧协议） | 高（HTTP 头重复） | 中 |
| 浏览器支持 | 好 | 好 | 好 |
| 适用场景 | 即时通讯、游戏、协同编辑 | 兼容性要求高、低频 | 服务端单向通知、行情推送 |
| 重连 | 需自行实现 | 自动（每次轮询） | 浏览器自动重连 |

**长轮询**：客户端发请求，服务端没数据就 hold 住，有数据或超时才返回，客户端处理完立即再发——模拟"服务端推送"，但每次都带 HTTP 头开销，且有请求间隔。

**SSE**：基于 HTTP，服务端用 `Content-Type: text/event-stream` 持续推送事件，浏览器原生支持自动重连，适合单向推送（行情、通知）。

#### 面试题

**Q：WebSocket 和 HTTP 长轮询的区别？**

参考答案：长轮询本质还是 HTTP 请求-响应，服务端没数据时 hold 住连接，有数据才返回，客户端再立即发下一个请求模拟推送，每次都带 HTTP 头开销、有请求间隔，实时性受限。WebSocket 握手升级后是独立的全双工协议，帧协议开销小，服务端随时可推、客户端随时可发，真正实时。对双向高频交互（聊天、游戏）用 WebSocket，对简单单向通知可用 SSE 或长轮询兜底。

---

### 4.4 心跳保活机制

WebSocket 连接可能因 NAT 超时、负载均衡空闲回收或网络中断变成半开状态。用 Ping/Pong 帧保活：一方发 Ping（opcode 0x9），对端回 Pong（0xA），无业务数据但维持连接活性。

```java
// Netty WebSocket 心跳示例
ChannelPipeline pipeline = ch.pipeline();
// 服务端读空闲 60s 触发，发 Ping；90s 无数据则断开
pipeline.addLast(new IdleStateHandler(60, 0, 90, TimeUnit.SECONDS));
pipeline.addLast(new ChannelInboundHandlerAdapter() {
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        if (evt instanceof IdleStateEvent) {
            IdleStateEvent e = (IdleStateEvent) evt;
            if (e.state() == IdleState.READER_IDLE) {
                // 客户端长时间无响应，关闭连接
                ctx.close();
            }
        }
    }
});
```

#### 面试题

**Q：WebSocket 为什么需要心跳？**

参考答案：一是检测半开连接：NAT 网关、负载均衡器会按空闲时长回收映射，连接表面还在实际已断；二是穿透保活：Ping/Pong 帧让中间设备维持映射、不回收；三是及时清理失效连接释放资源。用心跳周期（一般短于中间设备超时，如 30~60s）主动探测，比依赖 TCP 超时更可控。

---
