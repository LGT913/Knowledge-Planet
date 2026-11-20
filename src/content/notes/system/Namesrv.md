---
title: "Namesrv"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Namesrv, system]
summary: "NamesrvStartup 类中有 Namesrv 服务的启动方法："
private: false
---

## 原理解析

### Namesrv

#### 服务启动

##### 启动方法

NamesrvStartup 类中有 Namesrv 服务的启动方法：

```java
public static void main(String[] args) {
    // 如果启动时 使用 -c  -p  设置参数了，这些参数存储在 args 中
    main0(args);
}

public static NamesrvController main0(String[] args) {
    try {
        // 创建 namesrv 控制器，用来初始化 namesrv 启动 namesrv 关闭 namesrv
        NamesrvController controller = createNamesrvController(args);
		// 启动 controller
        start(controller);
        return controller;
    } catch (Throwable e) {
        // 出现异常，停止系统
        System.exit(-1);
    }
    return null;
}
```

NamesrvStartup#createNamesrvController：读取配置信息，初始化 Namesrv 控制器

* `ServerUtil.parseCmdLine("mqnamesrv", args, buildCommandlineOptions(options)，..)`：解析启动时的参数信息

* `namesrvConfig = new NamesrvConfig()`：创建 Namesrv 配置对象

  * `private String rocketmqHome`：获取 ROCKETMQ_HOME 值
  * `private boolean orderMessageEnable = false`：**顺序消息**功能是否开启

* `nettyServerConfig = new NettyServerConfig()`：Netty 的服务器配置对象

* `nettyServerConfig.setListenPort(9876)`：Namesrv 服务器的**监听端口设置为 9876**

* `if (commandLine.hasOption('c'))`：读取命令行 -c 的参数值

  `in = new BufferedInputStream(new FileInputStream(file))`：读取指定目录的配置文件

  `properties.load(in)`：将配置文件信息加载到 properties 对象，相关属性会复写到 Namesrv 配置和 Netty 配置对象

  `namesrvConfig.setConfigStorePath(file)`：将配置文件的路径保存到配置保存字段

* `if (null == namesrvConfig.getRocketmqHome())`：检查 ROCKETMQ_HOME 配置是否是空，是空就报错

* `lc = (LoggerContext) LoggerFactory.getILoggerFactory()`：创建日志对象

* `controller = new NamesrvController(namesrvConfig, nettyServerConfig)`：**创建 Namesrv 控制器**

NamesrvStartup#start：启动 Namesrv 控制器

* `boolean initResult = controller.initialize()`：初始化方法

* ` Runtime.getRuntime().addShutdownHook(new ShutdownHookThread())`：JVM HOOK 平滑关闭的逻辑， 当 JVM 被关闭时，主动调用 controller.shutdown() 方法，让服务器平滑关机
* `controller.start()`：启动服务器



源码解析参考视频：https://space.bilibili.com/457326371



****





##### 控制器类

NamesrvController 用来初始化和启动 Namesrv 服务器

* 成员变量：

  ```java
  private final ScheduledExecutorService scheduledExecutorService;	// 调度线程池，用来执行定时任务
  private final RouteInfoManager routeInfoManager;					// 管理【路由信息】的对象
  private RemotingServer remotingServer;								// 【网络层】封装对象
  private BrokerHousekeepingService brokerHousekeepingService;		// 用于监听 channel 状态
  ```

  `private ExecutorService remotingExecutor`：业务线程池，**netty 线程解析报文成 RemotingCommand 对象，然后将该对象交给业务线程池再继续处理**

* 初始化：

  ```java
  public boolean initialize() {
      // 加载本地kv配置（我还不明白 kv 配置是啥）
      this.kvConfigManager.load();
      // 创建网络服务器对象，【将 netty 的配置和监听器传入】
      // 监听器监听 channel 状态的改变，会向事件队列发起事件，最后交由 service 处理
      this.remotingServer = new NettyRemotingServer(this.nettyServerConfig, this.brokerHousekeepingService);
      // 【创建业务线程池，默认线程数 8】
      this.remotingExecutor = Executors.newFixedThreadPool(nettyServerConfig.getServerWorkerThreads().);
  
      // 注册协议处理器（缺省协议处理器），【处理器是 DefaultRequestProcessor】，线程使用的是刚创建的业务的线程池
      this.registerProcessor();
  
      // 定时任务1：每 10 秒钟检查 broker 存活状态，将 IDLE 状态的 broker 移除【扫描机制，心跳检测】
      this.scheduledExecutorService.scheduleAtFixedRate(new Runnable() {
          @Override
          public void run() {
              // 扫描 brokerLiveTable 表，将两小时没有活动的 broker 关闭，
              // 通过 next.getKey() 获取 broker 的地址，然后【关闭服务器与broker物理节点的 channel】
              NamesrvController.this.routeInfoManager.scanNotActiveBroker();
          }
      }, 5, 10, TimeUnit.SECONDS);
  
      // 定时任务2：每 10 分钟打印一遍 kv 配置。
      this.scheduledExecutorService.scheduleAtFixedRate(new Runnable() {
          @Override
          public void run() {
              NamesrvController.this.kvConfigManager.printAllPeriodically();
          }
      }, 1, 10, TimeUnit.MINUTES);
  
      return true;
  }
  ```
  
* 启动方法：

  ```java
  public void start() throws Exception {
      // 服务器网络层启动。
      this.remotingServer.start();
  
      if (this.fileWatchService != null) {
          this.fileWatchService.start();
      }
  }
  ```

  



***



#### 网络通信

##### 通信原理

RocketMQ 的 RPC 通信采用 Netty 组件作为底层通信库，同样也遵循了 Reactor 多线程模型，NettyRemotingServer 类负责框架的通信服务，同时又在这之上做了一些扩展和优化

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/RocketMQ-Reactor设计.png)

RocketMQ 基于 NettyRemotingServer 的 Reactor 多线程模型：

* 一个 Reactor 主线程（eventLoopGroupBoss）负责监听 TCP 网络连接请求，建立好连接创建 SocketChannel（RocketMQ 会自动根据 OS 的类型选择 NIO 和 Epoll，也可以通过参数配置），并注册到 Selector 上，然后监听真正的网络数据

* 拿到网络数据交给 Worker 线程池（eventLoopGroupSelector，默认设置为 3），在真正执行业务逻辑之前需要进行 SSL 验证、编解码、空闲检查、网络连接管理，这些工作交给 defaultEventExecutorGroup（默认设置为 8）去做
* 处理业务操作放在业务线程池中执行，根据 RomotingCommand 的**业务请求码 code** 去 processorTable 这个本地缓存变量中找到对应的 processor，封装成 task 任务提交给对应的 processor 处理线程池来执行（sendMessageExecutor，以发送消息为例）
* 从入口到业务逻辑的几个步骤中线程池一直再增加，这跟每一步逻辑复杂性相关，越复杂，需要的并发通道越宽

| 线程数 | 线程名                         | 线程具体说明              |
| ------ | ------------------------------ | ------------------------- |
| 1      | NettyBoss_%d                   | Reactor 主线程            |
| N      | NettyServerEPOLLSelector_%d_%d | Reactor 线程池            |
| M1     | NettyServerCodecThread_%d      | Worker 线程池             |
| M2     | RemotingExecutorThread_%d      | 业务 processor 处理线程池 |

RocketMQ 的异步通信流程：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/RocketMQ-异步通信流程.png)



==todo：后期对 Netty 有了更深的认知后会进行扩充，现在暂时 copy 官方文档==

官方文档：https://github.com/apache/rocketmq/blob/master/docs/cn/design.md#2-%E9%80%9A%E4%BF%A1%E6%9C%BA%E5%88%B6



***



##### 成员属性

NettyRemotingServer 类成员变量：

* 服务器相关属性：

  ```java
  private final ServerBootstrap serverBootstrap;				// netty 服务端启动对象
  private final EventLoopGroup eventLoopGroupSelector;		// netty worker 组线程池，【默认 3 个线程】
  private final EventLoopGroup eventLoopGroupBoss;			// netty boss 组线程池，【一般是 1 个线程】
  private final NettyServerConfig nettyServerConfig;			// netty 服务端网络配置
  private int port = 0;										// 服务器绑定的端口
  ```

* 公共线程池：注册处理器时如果未指定线程池，则业务处理使用公共线程池，线程数量默认是 4 

  ```java
  private final ExecutorService publicExecutor;
  ```

* 事件监听器：Nameserver 使用 BrokerHouseKeepingService，Broker 使用 ClientHouseKeepingService

  ```java
  private final ChannelEventListener channelEventListener;
  ```

* 事件处理线程池：默认是 8

  ```java
  private DefaultEventExecutorGroup defaultEventExecutorGroup;
  ```

* 定时器：执行循环任务，并且将定时器线程设置为守护线程

  ```java
   private final Timer timer = new Timer("ServerHouseKeepingService", true);
  ```

* 处理器：多个 Channel 共享的处理器 Handler，多个通道使用同一个对象

* Netty 配置对象：

  ```java
  public class NettyServerConfig implements Cloneable {
      // 服务端启动时监听的端口号
      private int listenPort = 8888;
      // 【业务线程池】 线程数量
      private int serverWorkerThreads = 8;
      // 根据该值创建 remotingServer 内部的一个 publicExecutor
      private int serverCallbackExecutorThreads = 0;
      // netty 【worker】线程数
      private int serverSelectorThreads = 3;
      // 【单向访问】时的并发限制
      private int serverOnewaySemaphoreValue = 256;
      // 【异步访问】时的并发限制
      private int serverAsyncSemaphoreValue = 64;
      // channel 最大的空闲存活时间 默认是 2min
      private int serverChannelMaxIdleTimeSeconds = 120;
      // 发送缓冲区大小 65535
      private int serverSocketSndBufSize = NettySystemConfig.socketSndbufSize;
      // 接收缓冲区大小 65535
      private int serverSocketRcvBufSize = NettySystemConfig.socketRcvbufSize;
      // 是否启用 netty 内存池 默认开启
      private boolean serverPooledByteBufAllocatorEnable = true;
  
      // 默认 linux 会启用 【epoll】
      private boolean useEpollNativeSelector = false;
  }
  ```


构造方法：

* 无监听器构造：

  ```java
  public NettyRemotingServer(final NettyServerConfig nettyServerConfig) {
      this(nettyServerConfig, null);
  }
  ```

* 有参构造方法：

  ```java
  public NettyRemotingServer(final NettyServerConfig nettyServerConfig,
                             final ChannelEventListener channelEventListener) {
      // 服务器对客户端主动发起请求时并发限制。【单向请求和异步请求】的并发限制
      super(nettyServerConfig.getServerOnewaySemaphoreValue(), nettyServerConfig.getServerAsyncSemaphoreValue());
  	// Netty 的启动器，负责组装 netty 组件
      this.serverBootstrap = new ServerBootstrap();
      // 成员变量的赋值
      this.nettyServerConfig = nettyServerConfig;
      this.channelEventListener = channelEventListener;
  
      // 公共线程池的线程数量，默认给的0，这里最终修改为4.
      int publicThreadNums = nettyServerConfig.getServerCallbackExecutorThreads();
      if (publicThreadNums <= 0) {
          publicThreadNums = 4;
      }
      // 创建公共线程池，指定线程工厂，设置线程名称前缀：NettyServerPublicExecutor_[数字]
      this.publicExecutor = Executors.newFixedThreadPool(publicThreadNums, new ThreadFactory(){.});
  
      // 创建两个 netty 的线程组，一个是boss组，一个是worker组，【linux 系统默认启用 epoll】
      if (useEpoll()) {...} else {...}
  	// SSL 相关
      loadSslContext();
  }
  ```

  



***



##### 启动方法

核心方法的解析：

* start()：启动方法，**创建 BootStrap，并添加 NettyServerHandler 处理器**

  ```java
  public void start() {
      // Channel Pipeline 内的 handler 使用的线程资源，【线程分配给 handler 处理事件】
      this.defaultEventExecutorGroup = new DefaultEventExecutorGroup(...);
  
      // 创建通用共享的处理器 handler，【非常重要的 NettyServerHandler】
      prepareSharableHandlers();
  
      ServerBootstrap childHandler =
          // 配置工作组 boss（数量1） 和 worker（数量3） 组
          this.serverBootstrap.group(this.eventLoopGroupBoss, this.eventLoopGroupSelector)
          // 设置服务端 ServerSocketChannel 类型， Linux 用 epoll
          .channel(useEpoll() ? EpollServerSocketChannel.class : NioServerSocketChannel.class)
          // 设置服务端 channel 选项
          .option(ChannelOption.SO_BACKLOG, 1024)
          // 客户端 channel 选项
          .childOption(ChannelOption.TCP_NODELAY, true)
          // 设置服务器端口
          .localAddress(new InetSocketAddress(this.nettyServerConfig.getListenPort()))
          // 向 channel pipeline 添加了很多 handler，【包括 NettyServerHandler】
          .childHandler(new ChannelInitializer<SocketChannel>() {});
              
  	// 客户端开启 内存池，使用的内存池是  PooledByteBufAllocator.DEFAULT
      if (nettyServerConfig.isServerPooledByteBufAllocatorEnable()) {
          childHandler.childOption(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT);
      }
  
      try {
          // 同步等待建立连接，并绑定端口。
          ChannelFuture sync = this.serverBootstrap.bind().sync();
          InetSocketAddress addr = (InetSocketAddress) sync.channel().localAddress();
          // 将服务器成功绑定的端口号赋值给字段 port。
          this.port = addr.getPort();
      } catch (InterruptedException e1) {}
  
      // housekeepingService 不为空，则创建【网络异常事件处理器】
      if (this.channelEventListener != null) {
          // 线程一直轮询 nettyEvent 状态，根据 CONNECT,CLOSE,IDLE,EXCEPTION 四种事件类型
          // CONNECT 不做操作，其余都是回调 onChannelDestroy 【关闭服务器与 Broker 物理节点的 Channel】
          this.nettyEventExecutor.start();
      }
  
      // 提交定时任务，每一秒 执行一次。扫描 responseTable 表，将过期的数据移除
      this.timer.scheduleAtFixedRate(new TimerTask() {
          @Override
          public void run() {
         		NettyRemotingServer.this.scanResponseTable();
          }
      }, 1000 * 3, 1000);
  }
  ```
  
* registerProcessor()：注册业务处理器

  ```java
  public void registerProcessor(int requestCode, NettyRequestProcessor processor, ExecutorService executor) {
      ExecutorService executorThis = executor;
      if (null == executor) {
          // 未指定线程池资源，将公共线程池赋值
          executorThis = this.publicExecutor;
      }
      // pair 对象，第一个参数代表的是处理器， 第二个参数是线程池，默认是公共的线程池
      Pair<NettyRequestProcessor, ExecutorService> pair = new Pair<NettyRequestProcessor, ExecutorService>(processor, executorThis);
  
      // key 是请求码，value 是 Pair 对象
      this.processorTable.put(requestCode, pair);
  }
  ```

* getProcessorPair()：**根据请求码获取对应的处理器和线程池资源**

  ```java
  public Pair<NettyRequestProcessor, ExecutorService> getProcessorPair(int requestCode) {
      return processorTable.get(requestCode);
  }
  ```



***



##### 请求方法

在 RocketMQ 消息队列中支持通信的方式主要有同步（sync）、异步（async）、单向（oneway）三种，其中单向通信模式相对简单，一般用在发送心跳包场景下，无需关注其 Response

服务器主动向客户端发起请求时，使用三种方法

* invokeSync()： 同步调用，**服务器需要阻塞等待调用的返回结果**
  * `int opaque = request.getOpaque()`：获取请求 ID（与请求码不同）
  * `responseFuture = new ResponseFuture(...)`：**创建响应对象**，没有回调函数和 Once
  * `this.responseTable.put(opaque, responseFuture)`：**加入到响应映射表中**，key 为请求 ID
  * `SocketAddress addr = channel.remoteAddress()`：获取客户端的地址信息
  * `channel.writeAndFlush(request).addListener(...)`：将**业务 Command 信息**写入通道，业务线程将数据交给 Netty ，Netty 的 IO 线程接管写刷数据的操作，**监听器由 IO 线程在写刷后回调**
    * `if (f.isSuccess())`：写入成功会将响应对象设置为成功状态直接 return，写入失败设置为失败状态
    * `responseTable.remove(opaque)`：将当前请求的 responseFuture **从映射表移除**
    * `responseFuture.setCause(f.cause())`：设置错误的信息
    * `responseFuture.putResponse(null)`：响应 Command 设置为 null
  * `responseCommand = responseFuture.waitResponse(timeoutMillis)`：当前线程设置超时时间挂起，**同步等待响应**
  * `if (null == responseCommand)`：超时或者出现异常，直接报错
  * `return responseCommand`：返回响应 Command 信息
* invokeAsync()：异步调用，有回调对象，无返回值
  * `boolean acquired = this.semaphoreAsync.tryAcquire(timeoutMillis, TimeUnit.MILLISECONDS)`：获取信号量的许可证，信号量用来**限制异步请求**的数量
  * `if (acquired)`：许可证获取失败说明并发较高，会抛出异常
  * `once = new SemaphoreReleaseOnlyOnce(this.semaphoreAsync)`：Once 对象封装了释放信号量的操作
  * `costTime = System.currentTimeMillis() - beginStartTime`：计算一下耗费的时间，超时不再发起请求
  * `responseFuture = new ResponseFuture()`：**创建响应对象，包装了回调函数和 Once 对象**
  * `this.responseTable.put(opaque, responseFuture)`：加入到响应映射表中，key 为请求 ID
  * `channel.writeAndFlush(request).addListener(...)`：写刷数据
    * `if (f.isSuccess())`：写刷成功，设置 responseFuture 发生状态为 true
    * `requestFail(opaque)`：写入失败，使用 publicExecutor **公共线程池异步执行回调对象的函数**
    * `responseFuture.release()`：出现异常会释放信号量

* invokeOneway()：单向调用，不关注响应结果
  * `request.markOnewayRPC()`：设置单向标记，对端检查标记可知该请是单向请求
  * `boolean acquired = this.semaphoreOneway.tryAcquire(timeoutMillis, TimeUnit.MILLISECONDS)`：获取信号量的许可证，信号量用来**限制单向请求**的数量





***



#### 处理器类

##### 协议设计

在 Client 和 Server 之间完成一次消息发送时，需要对发送的消息进行一个协议约定，所以自定义 RocketMQ 的消息协议。在 RocketMQ 中，为了高效地在网络中传输消息和对收到的消息读取，就需要对消息进行编解码，RemotingCommand 这个类在消息传输过程中对所有数据内容的封装，不但包含了所有的数据结构，还包含了编码解码操作

| Header字段 | 类型                    | Request 说明                                                 | Response 说明                               |
| ---------- | ----------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| code       | int                     | 请求操作码，应答方根据不同的请求码进行不同的处理             | 应答响应码，0 表示成功，非 0 则表示各种错误 |
| language   | LanguageCode            | 请求方实现的语言                                             | 应答方实现的语言                            |
| version    | int                     | 请求方程序的版本                                             | 应答方程序的版本                            |
| opaque     | int                     | 相当于 requestId，在同一个连接上的不同请求标识码，与响应消息中的相对应 | 应答不做修改直接返回                        |
| flag       | int                     | 区分是普通 RPC 还是 onewayRPC 的标志                         | 区分是普通 RPC 还是 onewayRPC的标志         |
| remark     | String                  | 传输自定义文本信息                                           | 传输自定义文本信息                          |
| extFields  | HashMap<String, String> | 请求自定义扩展信息                                           | 响应自定义扩展信息                          |

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/RocketMQ-消息协议.png)

传输内容主要可以分为以下四部分：

* 消息长度：总长度，四个字节存储，占用一个 int 类型

* 序列化类型&消息头长度：同样占用一个 int 类型，第一个字节表示序列化类型，后面三个字节表示消息头长度

* 消息头数据：经过序列化后的消息头数据

* 消息主体数据：消息主体的二进制字节数据内容



官方文档：https://github.com/apache/rocketmq/blob/master/docs/cn/design.md



****



##### 处理方法

NettyServerHandler 类用来处理 Channel 上的事件，在 NettyRemotingServer 启动时注册到 Netty 中，可以处理 RemotingCommand 相关的数据，针对某一种类型的**请求处理**

```java
class NettyServerHandler extends SimpleChannelInboundHandler<RemotingCommand> {
    @Override
    protected void channelRead0(ChannelHandlerContext ctx, RemotingCommand msg) throws Exception {
        // 服务器处理接受到的请求信息
        processMessageReceived(ctx, msg);
    }
}
public void processMessageReceived(ChannelHandlerContext ctx, RemotingCommand msg) throws Exception {
    final RemotingCommand cmd = msg;
    if (cmd != null) {
		// 根据请求的类型进行处理
        switch (cmd.getType()) {
            case REQUEST_COMMAND:// 客户端发起的请求，走这里
                processRequestCommand(ctx, cmd);
                break;
            case RESPONSE_COMMAND:// 客户端响应的数据，走这里【当前类本身是服务器类也是客户端类】
                processResponseCommand(ctx, cmd);
                break;
            default:
                break;
        }
    }
}
```

NettyRemotingAbstract#processRequestCommand：**处理请求的数据**

* `matched = this.processorTable.get(cmd.getCode())`：根据业务请求码获取 Pair 对象，包含**处理器和线程池资源**

* `pair = null == matched ? this.defaultRequestProcessor : matched`：未找到处理器则使用缺省处理器

* `int opaque = cmd.getOpaque()`：获取请求 ID

* `Runnable run = new Runnable()`：创建任务对象，任务在提交到线程池后开始执行

  * `doBeforeRpcHooks()`：RPC HOOK 前置处理

  * `callback = new RemotingResponseCallback()`：**封装响应客户端的逻辑**

    * `doAfterRpcHooks()`：RPC HOOK 后置处理
    * `if (!cmd.isOnewayRPC())`：条件成立说明不是单向请求，需要结果
    * `response.setOpaque(opaque)`：将请求 ID 设置到 response
    * `response.markResponseType()`：**设置当前请求是响应**
    * `ctx.writeAndFlush(response)`： **将响应数据交给 Netty IO 线程，完成数据写和刷**

  * `if (pair.getObject1() instanceof AsyncNettyRequestProcessor)`：Nameserver 默认使用 DefaultRequestProcessor 处理器，是一个 AsyncNettyRequestProcessor 子类

  * `processor = (AsyncNettyRequestProcessor)pair.getObject1()`：获取处理器

  * `processor.asyncProcessRequest(ctx, cmd, callback)`：异步调用，首先 processRequest，然后 callback 响应客户端

    `DefaultRequestProcessor.processRequest`：**根据业务码处理请求，执行对应的操作**
    
    `ClientRemotingProcessor.processRequest`：处理事务回查消息，或者回执消息，需要消费者回执一条消息给生产者

* `requestTask = new RequestTask(run, ctx.channel(), cmd)`：将任务对象、通道、请求封装成 RequestTask 对象

* `pair.getObject2().submit(requestTask)`：**获取处理器对应的线程池，将 task 提交，从 IO 线程切换到业务线程**

NettyRemotingAbstract#processResponseCommand：**处理响应的数据**

* `int opaque = cmd.getOpaque()`：获取请求 ID
* `responseFuture = responseTable.get(opaque)`：**从响应映射表中获取对应的对象**
* `responseFuture.setResponseCommand(cmd)`：设置响应的 Command 对象
* `responseTable.remove(opaque)`：从映射表中移除对象，代表处理完成
* `if (responseFuture.getInvokeCallback() != null)`：包含回调对象，异步执行回调对象
* `responseFuture.putResponse(cmd)`：不包含回调对象，**同步调用时，唤醒等待的业务线程**

流程：客户端 invokeSync → 服务器的 processRequestCommand → 客户端的 processResponseCommand → 结束



***



#### 路由信息

##### 信息管理

RouteInfoManager 类负责管理路由信息，NamesrvController 的构造方法中创建该类的实例对象，管理服务端的路由数据

```java
public class RouteInfoManager {
    // Broker 两个小时不活跃，视为离线，被定时任务删除
    private final static long BROKER_CHANNEL_EXPIRED_TIME = 1000 * 60 * 2;
    // 读写锁，保证线程安全
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    // 主题队列数据，一个主题对应多个队列
    private final HashMap<String/* topic */, List<QueueData>> topicQueueTable;
    // Broker 数据列表
    private final HashMap<String/* brokerName */, BrokerData> brokerAddrTable;
    // 集群
    private final HashMap<String/* clusterName */, Set<String/* brokerName */>> clusterAddrTable;
    // Broker 存活信息
    private final HashMap<String/* brokerAddr */, BrokerLiveInfo> brokerLiveTable;
    // 服务过滤
    private final HashMap<String/* brokerAddr */, List<String>/* Filter Server */> filterServerTable;
}
```



***



##### 路由注册

DefaultRequestProcessor REGISTER_BROKER 方法解析：

```java
public RemotingCommand registerBroker(ChannelHandlerContext ctx, RemotingCommand request) {
    // 创建响应请求的对象，设置为响应类型，【先设置响应的状态码时系统错误码】
    // 反射创建 RegisterBrokerResponseHeader 对象设置到 response.customHeader 属性中
    final RemotingCommand response = RemotingCommand.createResponseCommand(RegisterBrokerResponseHeader.class);

    // 获取出反射创建的 RegisterBrokerResponseHeader 用户自定义header对象。
    final RegisterBrokerResponseHeader responseHeader = (RegisterBrokerResponseHeader) response.readCustomHeader();

    // 反射创建 RegisterBrokerRequestHeader 对象，并且将 request.extFields 中的数据写入到该对象中
    final RegisterBrokerRequestHeader requestHeader = request.decodeCommandCustomHeader(RegisterBrokerRequestHeader.class);

    // CRC 校验，计算请求中的 CRC 值和请求头中包含的是否一致
    if (!checksum(ctx, request, requestHeader)) {
        response.setCode(ResponseCode.SYSTEM_ERROR);
        response.setRemark("crc32 not match");
        return response;
    }

    TopicConfigSerializeWrapper topicConfigWrapper;
    if (request.getBody() != null) {
        // 【解析请求体 body】，解码出来的数据就是当前机器的主题信息
        topicConfigWrapper = TopicConfigSerializeWrapper.decode(request.getBody(), TopicConfigSerializeWrapper.class);
    } else {
        topicConfigWrapper = new TopicConfigSerializeWrapper();
        topicConfigWrapper.getDataVersion().setCounter(new AtomicLong(0));
        topicConfigWrapper.getDataVersion().setTimestamp(0);
    }

    // 注册方法
    // 参数1 集群、参数2：节点ip地址、参数3：brokerName、参数4：brokerId 注意brokerId=0的节点为主节点
    // 参数5：ha节点ip地址、参数6当前节点主题信息、参数7：过滤服务器列表、参数8：当前服务器和客户端通信的channel
    RegisterBrokerResult result = this.namesrvController.getRouteInfoManager().registerBroker(..);

    // 将结果信息 写到 responseHeader 中
    responseHeader.setHaServerAddr(result.getHaServerAddr());
    responseHeader.setMasterAddr(result.getMasterAddr());
    // 获取 kv配置，写入 response body 中，【kv 配置是顺序消息相关的】
    byte[] jsonValue = this.namesrvController.getKvConfigManager().getKVListByNamespace(NamesrvUtil.NAMESPACE_ORDER_TOPIC);
    response.setBody(jsonValue);

    // code 设置为 SUCCESS
    response.setCode(ResponseCode.SUCCESS);
    response.setRemark(null);
	// 返回 response ，【返回的 response 由 callback 对象处理】
    return response;
}
```

RouteInfoManager#registerBroker：注册 Broker 的信息

* `RegisterBrokerResult result = new RegisterBrokerResult()`：返回结果的封装对象

* `this.lock.writeLock().lockInterruptibly()`：加写锁后**同步执行**

* `brokerNames = this.clusterAddrTable.get(clusterName)`：获取当前集群上的 Broker 名称列表，是空就新建列表

* `brokerNames.add(brokerName)`：将当前 Broker 名字加入到集群列表

* `brokerData = this.brokerAddrTable.get(brokerName)`：获取当前 Broker 的 brokerData，是空就新建放入映射表

* `brokerAddrsMap = brokerData.getBrokerAddrs()`：获取当前 Broker 的物理节点 map 表，进行遍历，如果物理节点角色发生变化（slave → master），先将旧数据从物理节点 map 中移除，然后重写放入，**保证节点的唯一性**

* `if (null != topicConfigWrapper && MixAll.MASTER_ID == brokerId)`：Broker 上的 Topic 不为 null，并且当前物理节点是  Broker 上的 master 节点

  `tcTable = topicConfigWrapper.getTopicConfigTable()`：获取当前 Broker 信息中的主题映射表

  `if (tcTable != null)`：映射表不空就加入或者更新到 Namesrv 内

* ` prevBrokerLiveInfo = this.brokerLiveTable.put(brokerAddr)`：添加**当前节点的 BrokerLiveInfo** ，返回上一次心跳时当前 Broker 节点的存活对象数据。**NamesrvController  中的定时任务会扫描映射表 brokerLiveTable**

  ```java
  BrokerLiveInfo prevBrokerLiveInfo = this.brokerLiveTable.put(brokerAddr, new BrokerLiveInfo(
      System.currentTimeMillis(),topicConfigWrapper.getDataVersion(), channel,haServerAddr));
  ```

* `if (MixAll.MASTER_ID != brokerId)`：当前 Broker 不是 master 节点，**获取主节点的信息**设置到结果对象

* `this.lock.writeLock().unlock()`：释放写锁





****
