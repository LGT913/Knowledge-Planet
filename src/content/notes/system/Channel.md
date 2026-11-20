---
title: "Channel"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Channel, system]
summary: "ChannelFuture close：关闭通道  ChannelPipeline pipeline：添加处理器  ChannelFuture writeObject msg：数据写入缓冲区  ChannelFuture writeAndF"
private: false
---

### Channel

#### 连接操作

Channel 类 API：

* `ChannelFuture close()`：关闭通道
* `ChannelPipeline pipeline()`：添加处理器
* `ChannelFuture write(Object msg)`：数据写入缓冲区
* `ChannelFuture writeAndFlush(Object msg)`：数据写入缓冲区并且刷出

ChannelFuture 类 API：

* `ChannelFuture sync()`：同步阻塞等待连接成功
* `ChannelFuture addListener(GenericFutureListener listener)`：异步等待

代码实现：

* connect 方法是异步的，不等连接建立完成就返回，因此 channelFuture 对象中不能立刻获得到正确的 Channel 对象，需要等待
* 连接未建立 channel 打印为 `[id: 0x2e1884dd]`；建立成功打印为 `[id: 0x2e1884dd, L:/127.0.0.1:57191 - R:/127.0.0.1:8080]`

```java
public class ChannelClient {
    public static void main(String[] args) throws InterruptedException {
        ChannelFuture channelFuture = new Bootstrap()
                .group(new NioEventLoopGroup())
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel ch) throws Exception {
                        ch.pipeline().addLast(new StringEncoder());
                    }
                })
                // 1. 连接服务器，【异步非阻塞】，main 调用 connect 方法，真正执行连接的是 nio 线程
                .connect(new InetSocketAddress("127.0.0.1", 8080));
        // 2.1 使用 sync 方法【同步】处理结果，阻塞当前线程，直到 nio 线程连接建立完毕
        channelFuture.sync();
        Channel channel = channelFuture.channel();
        System.out.println(channel); // 【打印】
        // 向服务器发送数据
        channel.writeAndFlush("hello world");
        
**************************************************************************************二选一
        // 2.2 使用 addListener 方法【异步】处理结果
        channelFuture.addListener(new ChannelFutureListener() {
            @Override
            // nio 线程连接建立好以后，回调该方法
            public void operationComplete(ChannelFuture future) throws Exception {
                if (future.isSuccess()) {
                    Channel channel = future.channel();
                	channel.writeAndFlush("hello, world");
                } else {
                    // 建立失败，需要关闭
                    future.channel().close();
                }
            }
        });
    }
}
```



***



#### 关闭操作

关闭 EventLoopGroup 的运行，分为同步关闭和异步关闭

```java
public class CloseFutureClient {
    public static void main(String[] args) throws InterruptedException {
        NioEventLoopGroup group = new NioEventLoopGroup();
        ChannelFuture channelFuture = new Bootstrap()
                // ....
                .connect(new InetSocketAddress("127.0.0.1", 8080));
        Channel channel = channelFuture.sync().channel();
        // 发送数据
        new Thread(() -> {
            Scanner sc = new Scanner(System.in);
            while (true) {
                String line = sc.nextLine();
                if (line.equals("q")) {
                    channel.close();
                    break;
                }
                channel.writeAndFlush(line);
            }
        }, "input").start();
        // 获取 CloseFuture 对象
        ChannelFuture closeFuture = channel.closeFuture();
        
        // 1. 同步处理关闭
        System.out.println("waiting close...");
        closeFuture.sync();
        System.out.println("处理关闭后的操作");
****************************************************
        // 2. 异步处理关闭
        closeFuture.addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture future) throws Exception {
                System.out.println("处理关闭后的操作");
                group.shutdownGracefully();
            }
        });
    }
}
```



****
