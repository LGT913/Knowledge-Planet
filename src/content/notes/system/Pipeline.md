---
title: "Pipeline"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Pipeline, system]
summary: "ChannelHandler 用来处理 Channel 上的各种事件，分为入站出站两种，所有 ChannelHandler 连接成双向链表就是 Pipeline"
private: false
---

### Pipeline

ChannelHandler 用来处理 Channel 上的各种事件，分为入站出站两种，所有 ChannelHandler 连接成双向链表就是 Pipeline

* 入站处理器通常是 ChannelInboundHandlerAdapter 的子类，主要用来读取客户端数据，写回结果
* 出站处理器通常是 ChannelOutboundHandlerAdapter 的子类，主要对写回结果进行加工（入站和出站是对于服务端来说的）

```java
public static void main(String[] args) {
    new ServerBootstrap()
        .group(new NioEventLoopGroup())
        .channel(NioServerSocketChannel.class)
        .childHandler(new ChannelInitializer<NioSocketChannel>() {
            @Override
            protected void initChannel(NioSocketChannel ch) throws Exception {
                // 1. 通过 channel 拿到 pipeline
                ChannelPipeline pipeline = ch.pipeline();
                // 2. 添加处理器 head -> h1 -> h2 -> h3 -> h4 -> tail
                pipeline.addLast("h1", new ChannelInboundHandlerAdapter() {
                    @Override
                    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                        log.debug("1");
                        ByteBuf buf = (ByteBuf) msg;
                        String s = buf.toString(Charset.defaultCharset());
                        // 将数据传递给下一个【入站】handler，如果不调用该方法则链会断开
                        super.channelRead(ctx, s);
                    }
                });
                pipeline.addLast("h2", new ChannelInboundHandlerAdapter() {
                    @Override
                    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                        log.debug("2");
                        // 从【尾部开始向前触发】出站处理器
                        ch.writeAndFlush(ctx.alloc().buffer().writeBytes("server".getBytes()));
                        // 该方法会让管道从【当前 handler 向前】寻找出站处理器
                        // ctx.writeAndFlush();
                    }
                });
                pipeline.addLast("h3", new ChannelOutboundHandlerAdapter() {
                    @Override
                    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
                        log.debug("3");
                        super.write(ctx, msg, promise);
                    }
                });
                pipeline.addLast("h4", new ChannelOutboundHandlerAdapter() {
                    @Override
                    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
                        log.debug("4");
                        super.write(ctx, msg, promise);
                    }
                });
            }
        })
        .bind(8080);
}
```

服务器端依次打印：1 2 4 3 ，所以**入站是按照 addLast 的顺序执行的，出站是按照 addLast 的逆序执行**

一个 Channel 包含了一个 ChannelPipeline，而 ChannelPipeline 中又维护了一个由 ChannelHandlerContext 组成的双向链表，并且每个 ChannelHandlerContext 中关联着一个 ChannelHandler

入站事件和出站事件在一个双向链表中，两种类型的 handler 互不干扰：

* 入站事件会从链表 head 往后传递到最后一个入站的 handler
* 出站事件会从链表 tail 往前传递到最前一个出站的 handler

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Netty-ChannelPipeline.png)



****
