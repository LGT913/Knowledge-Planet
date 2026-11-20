---
title: "解决方案"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 解决方案, system]
summary: "发一个包建立一次连接，这样连接建立到连接断开之间就是消息的边界，缺点就是效率很低"
private: false
---

### 解决方案

#### 短连接

发一个包建立一次连接，这样连接建立到连接断开之间就是消息的边界，缺点就是效率很低

客户端代码改造：

```java
public class HelloWorldClient {
    public static void main(String[] args) {
        // 分 10 次发送
        for (int i = 0; i < 10; i++) {
            send();
        }
    }
}
```



****



#### 固定长度

服务器端加入定长解码器，每一条消息采用固定长度。如果是半包消息，会缓存半包消息并等待下个包到达之后进行拼包合并，直到读取一个完整的消息包；如果是粘包消息，空余的位置会进行补 0，会浪费空间

```java
serverBootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ch.pipeline().addLast(new FixedLengthFrameDecoder(10));
        // LoggingHandler 用来打印消息
        ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
    }
});
```

```java
10:29:06.522 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x38a70fbf, L:/127.0.0.1:8080 - R:/127.0.0.1:10144] READ: 10B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 31 31 00 00 00 00 00 00 00 00                   |11........      |
+--------+-------------------------------------------------+----------------+
10:29:06.522 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x38a70fbf, L:/127.0.0.1:8080 - R:/127.0.0.1:10144] READ: 10B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 32 32 32 32 32 32 00 00 00 00                   |222222....      |
+--------+-------------------------------------------------+----------------+
```



****



#### 分隔符

服务端加入行解码器，默认以 `\n` 或 `\r\n` 作为分隔符，如果超出指定长度仍未出现分隔符，则抛出异常：

```java
serverBootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ch.pipeline().addLast(new FixedLengthFrameDecoder(8));
        ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
    }
});
```

客户端在每条消息之后，加入 `\n` 分隔符：

```java
public void channelActive(ChannelHandlerContext ctx) throws Exception {
    Random r = new Random();
    char c = 'a';
    ByteBuf buffer = ctx.alloc().buffer();
    for (int i = 0; i < 10; i++) {
        for (int j = 1; j <= r.nextInt(16)+1; j++) {
            buffer.writeByte((byte) c);
        }
        // 10 代表 '\n'
        buffer.writeByte(10);
        c++;
    }
    ctx.writeAndFlush(buffer);
}
```



****



#### 预设长度

LengthFieldBasedFrameDecoder 解码器自定义长度解决 TCP 粘包黏包问题

```java
int maxFrameLength		// 数据最大长度
int lengthFieldOffset 	// 长度字段偏移量，从第几个字节开始是内容的长度字段
int lengthFieldLength	// 长度字段本身的长度
int lengthAdjustment 	// 长度字段为基准，几个字节后才是内容
int initialBytesToStrip	// 从头开始剥离几个字节解码后显示
```

```java
lengthFieldOffset   = 1 (= the length of HDR1)
lengthFieldLength   = 2
lengthAdjustment    = 1 (= the length of HDR2)
initialBytesToStrip = 3 (= the length of HDR1 + LEN)

BEFORE DECODE (16 bytes)                       AFTER DECODE (13 bytes)//解码
+------+--------+------+----------------+      +------+----------------+
| HDR1 | Length | HDR2 | Actual Content |----->| HDR2 | Actual Content |
| 0xCA | 0x000C | 0xFE | "HELLO, WORLD" |      | 0xFE | "HELLO, WORLD" |
+------+--------+------+----------------+      +------+----------------+
```

代码实现：

```java
public class LengthFieldDecoderDemo {
    public static void main(String[] args) {
        EmbeddedChannel channel = new EmbeddedChannel(
                // int 占 4 字节，版本号一个字节
                new LengthFieldBasedFrameDecoder(1024, 0, 4, 1,5),
                new LoggingHandler(LogLevel.DEBUG)
        );

        // 4 个字节的内容长度， 实际内容
        ByteBuf buffer = ByteBufAllocator.DEFAULT.buffer();
        send(buffer, "Hello, world");
        send(buffer, "Hi!");
        // 写出缓存
        channel.writeInbound(buffer);
    }
    // 写入缓存
    private static void send(ByteBuf buffer, String content) {
        byte[] bytes = content.getBytes();  // 实际内容
        int length = bytes.length;          // 实际内容长度
        buffer.writeInt(length);
        buffer.writeByte(1);                // 表示版本号
        buffer.writeBytes(bytes);
    }
}
```

```java
10:49:59.344 [main] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0xembedded, L:embedded - R:embedded] READ: 12B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 48 65 6c 6c 6f 2c 20 77 6f 72 6c 64             |Hello, world    |
+--------+-------------------------------------------------+----------------+
10:49:59.344 [main] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0xembedded, L:embedded - R:embedded] READ: 3B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 48 69 21                                        |Hi!             |
+--------+-------------------------------------------------+----------------+
```



****
