---
title: "Producer"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Producer, system]
summary: "DefaultMQProducer 是生产者的默认实现类"
private: false
---

### Producer

#### 生产者类

##### 生产者类

DefaultMQProducer 是生产者的默认实现类

成员变量：

* 生产者实现类：

  ```java
  protected final transient DefaultMQProducerImpl defaultMQProducerImpl
  ```

* 生产者组：发送事务消息，Broker 端进行事务回查（补偿机制）时，选择当前生产者组的下一个生产者进行事务回查

  ```java
  private String producerGroup;
  ```

* 默认主题：isAutoCreateTopicEnable 开启时，当发送消息指定的 Topic 在 Namesrv 未找到路由信息，使用该值创建 Topic 信息

  ```java
  private String createTopicKey = TopicValidator.AUTO_CREATE_TOPIC_KEY_TOPIC;
  // 值为【TBW102】，Just for testing or demo program
  ```

* 消息重投：系统特性消息重试部分详解了三个参数的作用

  ```java
  private int retryTimesWhenSendFailed = 2;		// 同步发送失败后重试的发送次数，加上第一次发送，一共三次
  private int retryTimesWhenSendAsyncFailed = 2;	// 异步
  private boolean retryAnotherBrokerWhenNotStoreOK = false;	// 消息未存储成功，选择其他 Broker 重试
  ```

* 消息队列：

  ```java
  private volatile int defaultTopicQueueNums = 4;		// 默认 Broker 创建的队列数
  ```

* 消息属性：

  ```java
  private int sendMsgTimeout = 3000;					// 发送消息的超时限制
  private int compressMsgBodyOverHowmuch = 1024 * 4;	// 压缩阈值，当 msg body 超过 4k 后使用压缩
  private int maxMessageSize = 1024 * 1024 * 4;		// 消息体的最大限制，默认 4M
  private TraceDispatcher traceDispatcher = null;		// 消息轨迹

构造方法：

* 构造方法：

  ```java
  public DefaultMQProducer(final String namespace, final String producerGroup, RPCHook rpcHook) {
      this.namespace = namespace;
      this.producerGroup = producerGroup;
      // 创建生产者实现对象
      defaultMQProducerImpl = new DefaultMQProducerImpl(this, rpcHook);
  }
  ```

成员方法：

* start()：启动方法

  ```java
  public void start() throws MQClientException {
      // 重置生产者组名，如果传递了命名空间，则 【namespace%group】
      this.setProducerGroup(withNamespace(this.producerGroup));
      // 生产者实现对象启动
      this.defaultMQProducerImpl.start();
      if (null != traceDispatcher) {
        	// 消息轨迹的逻辑
     		traceDispatcher.start(this.getNamesrvAddr(), this.getAccessChannel());
      }
  }
  ```

* send()：**发送消息**：

  ```java
  public SendResult send(Message msg){
      // 校验消息
      Validators.checkMessage(msg, this);
      // 设置消息 Topic
      msg.setTopic(withNamespace(msg.getTopic()));
      return this.defaultMQProducerImpl.send(msg);
  }
  ```

* request()：请求方法，**需要消费者回执消息**

  ```java
  public Message request(final Message msg, final MessageQueue mq, final long timeout) {
      msg.setTopic(withNamespace(msg.getTopic()));
      return this.defaultMQProducerImpl.request(msg, mq, timeout);
  }
  ```




***



##### 实现者类

DefaultMQProducerImpl 类是默认的生产者实现类

成员变量：

* 实例对象：

  ```java
  private final DefaultMQProducer defaultMQProducer;	// 持有默认生产者对象，用来获取对象中的配置信息
  private MQClientInstance mQClientFactory;			// 客户端实例对象，生产者启动后需要注册到该客户端对象内
  ```

* 主题发布信息映射表：key 是 Topic，value 是发布信息

  ```java
  private final ConcurrentMap<String, TopicPublishInfo> topicPublishInfoTable = new ConcurrentHashMap<String, TopicPublishInfo>();
  ```

* 异步发送消息：相关信息

  ```java
  private final BlockingQueue<Runnable> asyncSenderThreadPoolQueue;// 异步发送消息，异步线程池使用的队列
  private final ExecutorService defaultAsyncSenderExecutor;	// 异步发送消息默认使用的线程池
  private ExecutorService asyncSenderExecutor;				// 异步消息发送线程池，指定后就不使用默认线程池了
  ```

* 定时器：执行定时任务

  ```java
  private final Timer timer = new Timer("RequestHouseKeepingService", true);	// 守护线程
  ```

* 状态信息：服务的状态，默认创建状态

  ```java
  private ServiceState serviceState = ServiceState.CREATE_JUST;
  ```

* 压缩等级：ZIP 压缩算法的等级，默认是 5，越高压缩效果好，但是压缩的更慢

  ```java
  private int zipCompressLevel = Integer.parseInt(System.getProperty..., "5"));
  ```

* 容错策略：选择队列的容错策略

  ```java
  private MQFaultStrategy mqFaultStrategy = new MQFaultStrategy();
  ```

* 钩子：用来进行前置或者后置处理

  ```java
  ArrayList<SendMessageHook> sendMessageHookList;			// 发送消息的钩子，留给用户扩展使用
  ArrayList<CheckForbiddenHook> checkForbiddenHookList;	// 对比上面的钩子，可以抛异常，控制消息是否可以发送
  private final RPCHook rpcHook;						 	// 传递给 NettyRemotingClient
  ```

构造方法：

* 默认构造：

  ```java
  public DefaultMQProducerImpl(final DefaultMQProducer defaultMQProducer) {
      // 默认 RPC HOOK 是空
      this(defaultMQProducer, null);
  }
  ```

* 有参构造：

  ```java
  public DefaultMQProducerImpl(final DefaultMQProducer defaultMQProducer, RPCHook rpcHook) {
      // 属性赋值
      this.defaultMQProducer = defaultMQProducer;
      this.rpcHook = rpcHook;
  
      // 创建【异步消息线程池任务队列】，长度是 5w
      this.asyncSenderThreadPoolQueue = new LinkedBlockingQueue<Runnable>(50000);
      // 创建默认的异步消息任务线程池
      this.defaultAsyncSenderExecutor = new ThreadPoolExecutor(
          // 核心线程数和最大线程数都是 系统可用的计算资源（8核16线程的系统就是 16）...
  }
  ```

  

****



##### 实现方法

* start()：启动方法，参数默认是 true，代表正常的启动路径

  ```java
  public void start(final boolean startFactory)
  ```

  * `this.serviceState = ServiceState.START_FAILED`：先修改为启动失败，成功后再修改，这种思想很常见

  * `this.checkConfig()`：判断生产者组名不能是空，也不能是 default_PRODUCER

  * `if (!getProducerGroup().equals(MixAll.CLIENT_INNER_PRODUCER_GROUP))`：条件成立说明当前生产者不是内部产生者，内部生产者是**处理消息回退**的这种情况使用的生产者

    `this.defaultMQProducer.changeInstanceNameToPID()`：修改生产者实例名称为当前进程的 PID

  * ` this.mQClientFactory = ...`：获取当前进程的 MQ 客户端实例对象，从 factoryTable 中获取 key 为 客户端 ID，格式是`ip@pid`，**一个 JVM 进程只有一个 PID，也只有一个 MQClientInstance**

  * `boolean registerOK = mQClientFactory.registerProducer(...)`：将生产者注册到 RocketMQ 客户端实例内

  * `this.topicPublishInfoTable.put(...)`：添加一个主题发布信息，key 是 **TBW102** ，value 是一个空对象

  * `mQClientFactory.start()`：启动 RocketMQ 客户端实例对象

  * `this.mQClientFactory.sendHeartbeatToAllBrokerWithLock()`：RocketMQ **客户端实例向已知的 Broker 节点发送一次心跳**（也是定时任务）

  * `this.timer.scheduleAtFixedRate()`： request 发送的消息需要消费着回执信息，启动定时任务每秒一次删除超时请求
    
    * 生产者 msg 添加信息关联 ID 发送到 Broker
    * 消费者从 Broker 拿到消息后会检查 msg 类型是一个需要回执的消息，处理完消息后会根据 msg 关联 ID 和客户端 ID 生成一条响应结果消息发送到 Broker，Broker 判断为回执消息，会根据客户端ID 找到 channel 推送给生产者
    * 生产者拿到回执消息后，读取出来关联 ID 找到对应的 RequestFuture，将阻塞线程唤醒

* sendDefaultImpl()：发送消息

  ```java
  //参数1：消息；参数2：发送模式（同步异步单向）；参数3：回调函数，异步发送时需要；参数4：发送超时时间, 默认 3 秒
  private SendResult sendDefaultImpl(msg, communicationMode, sendCallback,timeout) {}
  ```

  * `this.makeSureStateOK()`：校验生产者状态是运行中，否则抛出异常

  * `topicPublishInfo = this.tryToFindTopicPublishInfo(msg.getTopic())`：**获取当前消息主题的发布信息**

    * `this.topicPublishInfoTable.get(topic)`：先尝试从本地主题发布信息映射表获取信息，获取不到继续执行

    * `this.mQClientFactory.update...FromNameServer(topic)`：然后从 Namesrv 更新该 Topic 的路由数据

    * `this.mQClientFactory.update...FromNameServer(...)`：**路由数据是空，获取默认 TBW102 的数据**

      `return topicPublishInfo`：返回 TBW102 主题的发布信息

  * `String[] brokersSent = new String[timesTotal]`：下标索引代表第几次发送，值代表这次发送选择 Broker name

  * `for (; times < timesTotal; times++)`：循环发送，**发送成功或者发送尝试次数达到上限，结束循环**

  * `String lastBrokerName = null == mq ? null : mq.getBrokerName()`：获取上次发送失败的 BrokerName

  * `mqSelected = this.selectOneMessageQueue(topicPublishInfo, lastBrokerName)`：从发布信息中选择一个队列，生产者的**负载均衡策略**，参考系统特性章节

  * `brokersSent[times] = mq.getBrokerName()`：将本次选择的 BrokerName 存入数组

  * `msg.setTopic(this.defaultMQProducer.withNamespace(msg.getTopic()))`：**产生重投，重投消息需要加上标记**

  * `sendResult = this.sendKernelImpl`：核心发送方法

  * `switch (communicationMode)`：异步或者单向消息直接返回 null，异步通过回调函数处理，同步发送进入逻辑判断

    `if (sendResult.getSendStatus() != SendStatus.SEND_OK)`：**服务端 Broker 存储失败，需要重试其他 Broker**

  * `throw new MQClientException()`：未找到当前主题的路由数据，无法发送消息，抛出异常

* sendKernelImpl()：**核心发送方法**

  ```java
  //参数1：消息；参数2：选择的队列；参数3：发送模式（同步异步单向）；参数4：回调函数，异步发送时需要；参数5：主题发布信息；参数6：剩余超时时间限制
  private SendResult sendKernelImpl(msg, mq, communicationMode, sendCallback, topicPublishInfo, timeout)
  ```

  * `brokerAddr = this.mQClientFactory(...)`：**获取指定 BrokerName 对应的 mater 节点的地址**，master 节点的 ID 为 0，集群模式下，**发送消息要发到主节点**

  * `brokerAddr = MixAll.brokerVIPChannel()`：Broker 启动时会绑定两个服务器端口，一个是普通端口，一个是 VIP 端口，服务器端根据不同端口创建不同的的 NioSocketChannel

  * `byte[] prevBody = msg.getBody()`：获取消息体

  * `if (!(msg instanceof MessageBatch))`：非批量消息，需要重新设置消息 ID

    `MessageClientIDSetter.setUniqID(msg)`：**msg id 由两部分组成**，一部分是 ip 地址、进程号、Classloader 的 hashcode，另一部分是时间差（当前时间减去当月一号的时间）和计数器的值

  * `if (this.tryToCompressMessage(msg))`：判断消息是否压缩，压缩需要设置压缩标记

  * `hasCheckForbiddenHook、hasSendMessageHook`：执行钩子方法

  * `requestHeader = new SendMessageRequestHeader()`：设置发送消息的消息头

  * `if (requestHeader.getTopic().startsWith(MixAll.RETRY_GROUP_TOPIC_PREFIX))`：重投的发送消息

  * `switch (communicationMode)`：异步发送一种处理方式，单向和同步同样的处理逻辑

    `sendResult = this.mQClientFactory.getMQClientAPIImpl().sendMessage()`：**发送消息**

    * `request = RemotingCommand.createRequestCommand()`：创建一个 RequestCommand 对象
    * `request.setBody(msg.getBody())`：**将消息放入请求体**
    * `switch (communicationMode)`：**根据不同的模式 invoke 不同的方法**

* request()：请求方法，消费者回执消息，这种消息是异步消息

  * `requestResponseFuture = new RequestResponseFuture(correlationId, timeout, null)`：创建请求响应对象

  * `getRequestFutureTable().put(correlationId, requestResponseFuture)`：放入RequestFutureTable 映射表中

  * `this.sendDefaultImpl(msg, CommunicationMode.ASYNC, new SendCallback())`：**发送异步消息，有回调函数**

  * `return waitResponse(msg, timeout, requestResponseFuture, cost)`：用来挂起请求的方法

    ```java
    public Message waitResponseMessage(final long timeout) throws InterruptedException {
        // 请求挂起
        this.countDownLatch.await(timeout, TimeUnit.MILLISECONDS);
        return this.responseMsg;
    }

  * 当消息被消费后，客户端处理响应时通过消息的关联 ID，从映射表中获取消息的 RequestResponseFuture，执行下面的方法唤醒挂起线程

    ```java
    public void putResponseMessage(final Message responseMsg) {
        this.responseMsg = responseMsg;
        this.countDownLatch.countDown();
    }
    ```




***



#### 路由信息

TopicPublishInfo 类用来存储路由信息

成员变量：

* 顺序消息：

  ```java
  private boolean orderTopic = false;
  ```

* 消息队列：

  ```java
  private List<MessageQueue> messageQueueList = new ArrayList<>();			// 主题全部的消息队列
  private volatile ThreadLocalIndex sendWhichQueue = new ThreadLocalIndex();	// 消息队列索引
  ```

  ```java
  // 【消息队列类】
  public class MessageQueue implements Comparable<MessageQueue>, Serializable {
      private String topic;
      private String brokerName;
      private int queueId;// 队列 ID
  }
  ```

* 路由数据：主题对应的路由数据

  ```java
  private TopicRouteData topicRouteData;
  ```

  ```java
  public class TopicRouteData extends RemotingSerializable {
      private String orderTopicConf;
      private List<QueueData> queueDatas;		// 队列数据
      private List<BrokerData> brokerDatas;	// Broker 数据
      private HashMap<String/* brokerAddr */, List<String>/* Filter Server */> filterServerTable;
  }
  ```

  ```java
  public class QueueData implements Comparable<QueueData> {
      private String brokerName;	// 节点名称
      private int readQueueNums;	// 读队列数
      private int writeQueueNums;	// 写队列数
      private int perm;			// 权限
      private int topicSynFlag;
  }
  ```

  ```java
  public class BrokerData implements Comparable<BrokerData> {
      private String cluster;		// 集群名
      private String brokerName;	// Broker节点名称
      private HashMap<Long/* brokerId */, String/* broker address */> brokerAddrs;
  }
  ```

核心方法：

* selectOneMessageQueue()：**选择消息队列**使用

  ```java
  // 参数是上次失败时的 brokerName，可以为 null
  public MessageQueue selectOneMessageQueue(final String lastBrokerName) {
      if (lastBrokerName == null) {
          return selectOneMessageQueue();
      } else {
          // 遍历消息队列
          for (int i = 0; i < this.messageQueueList.size(); i++) {
              // 【获取队列的索引，+1】
              int index = this.sendWhichQueue.getAndIncrement();
              // 获取队列的下标位置
              int pos = Math.abs(index) % this.messageQueueList.size();
              if (pos < 0)
                  pos = 0;
              // 获取消息队列
              MessageQueue mq = this.messageQueueList.get(pos);
              // 与上次选择的不同就可以返回
              if (!mq.getBrokerName().equals(lastBrokerName)) {
                  return mq;
              }
          }
          return selectOneMessageQueue();
      }
  }
  ```




***



#### 公共配置

公共的配置信息类

* ClientConfig 类

  ```java
  public class ClientConfig {
      // Namesrv 地址配置
      private String namesrvAddr = NameServerAddressUtils.getNameServerAddresses();
      // 客户端的 IP 地址
      private String clientIP = RemotingUtil.getLocalAddress();
      // 客户端实例名称
      private String instanceName = System.getProperty("rocketmq.client.name", "DEFAULT");
      // 客户端回调线程池的数量，平台核心数，8核16线程的电脑返回16
      private int clientCallbackExecutorThreads = Runtime.getRuntime().availableProcessors();
      // 命名空间
      protected String namespace;
      protected AccessChannel accessChannel = AccessChannel.LOCAL;
  
      // 获取路由信息的间隔时间 30s
      private int pollNameServerInterval = 1000 * 30;
      // 客户端与 broker 之间的心跳周期 30s
      private int heartbeatBrokerInterval = 1000 * 30;
      // 消费者持久化消费的周期 5s
      private int persistConsumerOffsetInterval = 1000 * 5;
      private long pullTimeDelayMillsWhenException = 1000;
      private boolean unitMode = false;
      private String unitName;
      // vip 通道，broker 启动时绑定两个端口，其中一个是 vip 通道
      private boolean vipChannelEnabled = Boolean.parseBoolean();
      // 语言，默认是 Java
      private LanguageCode language = LanguageCode.JAVA;
  }
  ```

* NettyClientConfig

  ```java
  public class NettyClientConfig {
      // 客户端工作线程数
      private int clientWorkerThreads = 4;
      // 回调处理线程池 线程数：平台核心数
      private int clientCallbackExecutorThreads = Runtime.getRuntime().availableProcessors();
      // 单向请求并发数，默认 65535
      private int clientOnewaySemaphoreValue = NettySystemConfig.CLIENT_ONEWAY_SEMAPHORE_VALUE;
      // 异步请求并发数，默认 65535
      private int clientAsyncSemaphoreValue = NettySystemConfig.CLIENT_ASYNC_SEMAPHORE_VALUE;
      // 客户端连接服务器的超时时间限制 3秒
      private int connectTimeoutMillis = 3000;
      // 客户端未激活周期，60s（指定时间内 ch 未激活，需要关闭）
      private long channelNotActiveInterval = 1000 * 60;
      // 客户端与服务器 ch 最大空闲时间 2分钟
      private int clientChannelMaxIdleTimeSeconds = 120;
  
      // 底层 Socket 写和收 缓冲区的大小 65535  64k
      private int clientSocketSndBufSize = NettySystemConfig.socketSndbufSize;
      private int clientSocketRcvBufSize = NettySystemConfig.socketRcvbufSize;
      // 客户端 netty 是否启动内存池
      private boolean clientPooledByteBufAllocatorEnable = false;
      // 客户端是否超时关闭 Socket 连接
      private boolean clientCloseSocketIfTimeout = false;
  }
  ```

  

***



#### 客户端类

##### 成员属性

MQClientInstance 是 RocketMQ 客户端实例，在一个 JVM 进程中只有一个客户端实例，**既服务于生产者，也服务于消费者**

成员变量：

* 配置信息：

  ```java
  private final int instanceIndex;			// 索引一般是 0，因为客户端实例一般都是一个进程只有一个
  private final String clientId;				// 客户端 ID ip@pid
  private final long bootTimestamp;			// 客户端的启动时间
  private ServiceState serviceState;			// 客户端状态
  ```

* 生产者消费者的映射表：key 是组名

  ```java
  private final ConcurrentMap<String, MQProducerInner> producerTable
  private final ConcurrentMap<String, MQConsumerInner> consumerTable
  private final ConcurrentMap<String, MQAdminExtInner> adminExtTable
  ```

* 网络层配置：

  ```java
  private final NettyClientConfig nettyClientConfig;
  ```

* 核心功能的实现：负责将 MQ 业务层的数据转换为网络层的 RemotingCommand 对象，使用内部持有的 NettyRemotingClient 对象的 invoke 系列方法，完成网络 IO（同步、异步、单向）

  ```java
  private final MQClientAPIImpl mQClientAPIImpl;
  ```

* 本地路由数据：key 是主题名称，value 路由信息

  ```java
  private final ConcurrentMap<String, TopicRouteData> topicRouteTable = new ConcurrentHashMap<>();
  ```

* 锁信息：两把锁，锁不同的数据

  ```java
  private final Lock lockNamesrv = new ReentrantLock();
  private final Lock lockHeartbeat = new ReentrantLock();
  ```

* 调度线程池：单线程，执行定时任务

  ```java
  private final ScheduledExecutorService scheduledExecutorService;
  ```

* Broker 映射表：key 是 BrokerName

  ```java
  // 物理节点映射表，value：Long 是 brokerID，【ID=0 的是主节点，其他是从节点】，String 是地址 ip:port
  private final ConcurrentMap<String, HashMap<Long, String>> brokerAddrTable;
  // 物理节点版本映射表，String 是地址 ip:port，Integer 是版本
  ConcurrentMap<String, HashMap<String, Integer>> brokerVersionTable;
  ```

* **客户端的协议处理器**：用于处理 IO 事件

  ```java
  private final ClientRemotingProcessor clientRemotingProcessor;
  ```

* 消息服务：

  ```java
  private final PullMessageService pullMessageService;		// 拉消息服务
  private final RebalanceService rebalanceService;			// 消费者负载均衡服务
  private final ConsumerStatsManager consumerStatsManager;	// 消费者状态管理
  ```

* 内部生产者实例：处理消费端**消息回退**，用该生产者发送回退消息

  ```java
  private final DefaultMQProducer defaultMQProducer;
  ```

* 心跳次数统计：

  ```java
  private final AtomicLong sendHeartbeatTimesTotal = new AtomicLong(0)
  ```

构造方法：

* MQClientInstance 有参构造：

  ```java
  public MQClientInstance(ClientConfig clientConfig, int instanceIndex, String clientId, RPCHook rpcHook) {
      this.clientConfig = clientConfig;
      this.instanceIndex = instanceIndex;
      // Netty 相关的配置信息
      this.nettyClientConfig = new NettyClientConfig();
      // 平台核心数
      this.nettyClientConfig.setClientCallbackExecutorThreads(...);
      this.nettyClientConfig.setUseTLS(clientConfig.isUseTLS());
      // 【创建客户端协议处理器】
      this.clientRemotingProcessor = new ClientRemotingProcessor(this);
      // 创建 API 实现对象
      // 参数一：客户端网络配置
      // 参数二：客户端协议处理器，注册到客户端网络层
      // 参数三：rpcHook，注册到客户端网络层
      // 参数四：客户端配置
      this.mQClientAPIImpl = new MQClientAPIImpl(this.nettyClientConfig, this.clientRemotingProcessor, rpcHook, clientConfig);
  
      //...
      // 内部生产者，指定内部生产者的组
      this.defaultMQProducer = new DefaultMQProducer(MixAll.CLIENT_INNER_PRODUCER_GROUP);
  }
  ```

* MQClientAPIImpl 有参构造：

  ```java
  public MQClientAPIImpl(nettyClientConfig, clientRemotingProcessor, rpcHook, clientConfig) {
      this.clientConfig = clientConfig;
      topAddressing = new TopAddressing(MixAll.getWSAddr(), clientConfig.getUnitName());
      // 创建网络层对象，参数二为 null 说明客户端并不关心 channel event
      this.remotingClient = new NettyRemotingClient(nettyClientConfig, null);
      // 业务处理器
      this.clientRemotingProcessor = clientRemotingProcessor;
      // 注册 RpcHook
      this.remotingClient.registerRPCHook(rpcHook);
  	// ...
      // 注册回退消息的请求码
      this.remotingClient.registerProcessor(RequestCode.PUSH_REPLY_MESSAGE_TO_CLIENT, this.clientRemotingProcessor, null);
  }
  ```



***



##### 成员方法

* start()：启动方法

  * `synchronized (this)`：加锁保证线程安全，保证只有一个实例对象启动
  * `this.mQClientAPIImpl.start()`：启动客户端网络层，底层调用 RemotingClient 类 
  * `this.startScheduledTask()`：启动定时任务
  * `this.pullMessageService.start()`：启动拉取消息服务
  * `this.rebalanceService.start()`：启动负载均衡服务
  * `this.defaultMQProducer...start(false)`：启动内部生产者，参数为 false 代表不启动实例

* startScheduledTask()：**启动定时任务**，调度线程池是单线程

  * `if (null == this.clientConfig.getNamesrvAddr())`：Namesrv 地址是空，需要两分钟拉取一次 Namesrv 地址

  * 定时任务 1：**从 Namesrv 更新客户端本地的路由数据**，周期 30 秒一次

    ```java
    // 获取生产者和消费者订阅的主题集合，遍历集合，对比从 namesrv 拉取最新的主题路由数据和本地数据，是否需要更新
    MQClientInstance.this.updateTopicRouteInfoFromNameServer();
    ```

  * 定时任务 2：周期 30 秒一次，两个任务

    * **清理下线的 Broker 节点**，遍历客户端的 Broker 物理节点映射表，将所有主题数据都不包含的 Broker 物理节点清理掉，如果被清理的 Broker 下所有的物理节点都没有了，就将该 Broker 的映射数据删除掉
    * **向在线的所有的 Broker 发送心跳数据**，同步发送的方式，返回值是 Broker 物理节点的版本号，更新版本映射表

    ```java
    MQClientInstance.this.cleanOfflineBroker();
    MQClientInstance.this.sendHeartbeatToAllBrokerWithLock();
    ```

    ```java
    // 心跳数据
    public class HeartbeatData extends RemotingSerializable {
        // 客户端 ID  ip@pid
        private String clientID;
        // 存储客户端所有生产者数据
        private Set<ProducerData> producerDataSet = new HashSet<ProducerData>();
        // 存储客户端所有消费者数据
        private Set<ConsumerData> consumerDataSet = new HashSet<ConsumerData>();
    }
    ```

  * 定时任务 3：消费者持久化消费数据，周期 5 秒一次

    ```java
    MQClientInstance.this.persistAllConsumerOffset();
    ```

  * 定时任务 4：动态调整消费者线程池，周期 1 分钟一次

    ```java
    MQClientInstance.this.adjustThreadPool();
    ```

* updateTopicRouteInfoFromNameServer()：**更新路由数据**，通过加锁保证当前实例只有一个线程去更新

  * `if (isDefault && defaultMQProducer != null)`：需要默认数据

    `topicRouteData = ...getDefaultTopicRouteInfoFromNameServer()`：从 Namesrv 获取默认的 TBW102 的路由数据

  * `topicRouteData = ...getTopicRouteInfoFromNameServer(topic)`：需要**从 Namesrv 获取**路由数据（同步）

  * `old = this.topicRouteTable.get(topic)`：获取客户端实例本地的该主题的路由数据

  * `boolean changed = topicRouteDataIsChange(old, topicRouteData)`：对比本地和最新下拉的数据是否一致

  * `if (changed)`：不一致进入更新逻辑

    `this.brokerAddrTable.put(...)`：更新客户端 broker 物理**节点映射表**

    `Update Pub info`：更新生产者信息
    
    * `publishInfo = topicRouteData2TopicPublishInfo(topic, topicRouteData)`：将主题路由数据转化为发布数据，会**创建消息队列 MQ**，放入发布数据对象的集合中
    * `impl.updateTopicPublishInfo(topic, publishInfo)`：生产者将主题的发布数据保存到它本地，方便发送消息使用
  
    `Update sub info`：更新消费者信息，创建 MQ 队列，更新订阅信息，用于负载均衡
    
    `this.topicRouteTable.put(topic, cloneTopicRouteData)`：**将数据放入本地路由表**



****



#### 网络通信

##### 成员属性

NettyRemotingClient 类负责客户端的网络通信

成员变量：

* Netty 服务相关属性：

  ```java
  private final NettyClientConfig nettyClientConfig;			// 客户端的网络层配置
  private final Bootstrap bootstrap = new Bootstrap();		// 客户端网络层启动对象
  private final EventLoopGroup eventLoopGroupWorker;			// 客户端网络层 Netty IO 线程组
  ```

* Channel 映射表：

  ```java
  private final ConcurrentMap<String, ChannelWrapper> channelTables;// key 是服务器的地址，value 是通道对象
  private final Lock lockChannelTables = new ReentrantLock();		  // 锁，控制并发安全
  ```

* 定时器：启动定时任务

  ```java
  private final Timer timer = new Timer("ClientHouseKeepingService", true)
  ```

* 线程池：

  ```java
  private ExecutorService publicExecutor;		// 公共线程池
  private ExecutorService callbackExecutor; 	// 回调线程池，客户端发起异步请求，服务器的响应数据由回调线程池处理
  ```

* 事件监听器：客户端这里是 null

  ```java
  private final ChannelEventListener channelEventListener;
  ```

构造方法

* 无参构造：

  ```java
  public NettyRemotingClient(final NettyClientConfig nettyClientConfig) {
      this(nettyClientConfig, null);
  }
  ```

* 有参构造：

  ```java
  public NettyRemotingClient(nettyClientConfig, channelEventListener) {
      // 父类创建了2个信号量，1、控制单向请求的并发度，2、控制异步请求的并发度
      super(nettyClientConfig.getClientOnewaySemaphoreValue(), nettyClientConfig.getClientAsyncSemaphoreValue());
      this.nettyClientConfig = nettyClientConfig;
      this.channelEventListener = channelEventListener;
  
      // 创建公共线程池
      int publicThreadNums = nettyClientConfig.getClientCallbackExecutorThreads();
      if (publicThreadNums <= 0) {
          publicThreadNums = 4;
      }
      this.publicExecutor = Executors.newFixedThreadPool(publicThreadNums,);
  
      // 创建 Netty IO 线程，1个线程
      this.eventLoopGroupWorker = new NioEventLoopGroup(1, );
  
      if (nettyClientConfig.isUseTLS()) {
    		sslContext = TlsHelper.buildSslContext(true);
      }
  }
  ```



****



##### 成员方法

* start()：启动方法

  ```java
  public void start() {
      // channel pipeline 内的 handler 使用的线程资源，默认 4 个
      this.defaultEventExecutorGroup = new DefaultEventExecutorGroup();
      // 配置 netty 客户端启动类对象
      Bootstrap handler = this.bootstrap.group(this.eventLoopGroupWorker).channel(NioSocketChannel.class)
          //...
          .handler(new ChannelInitializer<SocketChannel>() {
              @Override
              public void initChannel(SocketChannel ch) throws Exception {
                  ChannelPipeline pipeline = ch.pipeline();
                  // 加几个handler
                  pipeline.addLast(
                      // 服务端的数据，都会来到这个
                      new NettyClientHandler());
              }
          });
      // 注意 Bootstrap 只是配置好客户端的元数据了，【在这里并没有创建任何 channel 对象】
      // 定时任务 扫描 responseTable 中超时的 ResponseFuture，避免客户端线程长时间阻塞
      this.timer.scheduleAtFixedRate(() -> {
       	NettyRemotingClient.this.scanResponseTable();
      }, 1000 * 3, 1000);
      // 这里是 null，不启动
      if (this.channelEventListener != null) {
          this.nettyEventExecutor.start();
      }
  }
  ```

* 单向通信：

  ```java
  public RemotingCommand invokeSync(String addr, final RemotingCommand request, long timeoutMillis) {
      // 开始时间
      long beginStartTime = System.currentTimeMillis();
      // 获取或者创建客户端与服务端（addr）的通道 channel
      final Channel channel = this.getAndCreateChannel(addr);
      // 条件成立说明客户端与服务端 channel 通道正常，可以通信
      if (channel != null && channel.isActive()) {
          try {
              // 执行 rpcHook 拓展点
              doBeforeRpcHooks(addr, request);
              // 计算耗时，如果当前耗时已经超过 timeoutMillis 限制，则直接抛出异常，不再进行系统通信
              long costTime = System.currentTimeMillis() - beginStartTime;
              if (timeoutMillis < costTime) {
                  throw new RemotingTimeoutException("invokeSync call timeout");
              }
              // 参数1：客户端-服务端通道channel
              // 参数二：网络层传输对象，封装着请求数据
              // 参数三：剩余的超时限制
              RemotingCommand response = this.invokeSyncImpl(channel, request, ...);
              // 后置处理
              doAfterRpcHooks(RemotingHelper.parseChannelRemoteAddr(channel), request, response);
              // 返回响应数据
              return response;
          } catch (RemotingSendRequestException e) {}
      } else {
          this.closeChannel(addr, channel);
          throw new RemotingConnectException(addr);
      }
  }
  ```





***



#### 延迟消息

##### 消息处理

BrokerStartup 初始化 BrokerController 调用 `registerProcessor()` 方法将 SendMessageProcessor 注册到 NettyRemotingServer 中，对应的请求 ID 为 `SEND_MESSAGE = 10`，NettyServerHandler 在处理请求时通过 CMD 会获取处理器执行 processRequest

```java
// 参数一：处理通道的事件；   参数二：客户端
public RemotingCommand processRequest(ChannelHandlerContext ctx, RemotingCommand request)  {
    RemotingCommand response = null;
   	response = asyncProcessRequest(ctx, request).get();
    return response;
}
```

SendMessageProcessor#asyncConsumerSendMsgBack：异步发送消费者的回调消息

* `final RemotingCommand response`：创建一个服务器响应对象

* `final ConsumerSendMsgBackRequestHeader requestHeader`：解析出客户端请求头信息，几个**核心字段**：

  * `private Long offset`：回退消息的 CommitLog offset
  * `private Integer delayLevel`：延迟级别，一般是 0
  * `private String originMsgId, originTopic`：原始的消息 ID，主题
  * `private Integer maxReconsumeTimes`：最大重试次数，默认是 16 次

* `if ()`：鉴权，是否找到订阅组配置、Broker 是否支持写请求、订阅组是否支持消息重试

* `String newTopic = MixAll.getRetryTopic(...)`：**获取消费者组的重试主题**，规则是 `%RETRY%GroupName`

* `int queueIdInt = Math.abs()`：**重试主题下的队列 ID 是 0**

* `TopicConfig topicConfig`：获取重试主题的配置信息

* `MessageExt msgExt`：根据消息的物理 offset 到存储模块查询，内部先查询出这条消息的 size，然后再根据 offset 和 size 查询出整条 msg

* `final String retryTopic`：获取消息的原始主题

* `if (null == retryTopic)`：条件成立说明**当前消息是第一次被回退**， 添加 `RETRY_TOPIC` 属性

* `msgExt.setWaitStoreMsgOK(false)`：异步刷盘

* `if (msgExt...() >= maxReconsumeTimes || delayLevel < 0)`：消息重试次数超过最大次数，不支持重试

  `newTopic = MixAll.getDLQTopic()`：**获取消费者的死信队列**，规则是 `%DLQ%GroupName`

  `queueIdInt, topicConfig`：死信队列 ID 为 0，创建死信队列的配置

* `if (0 == delayLevel)`：说明延迟级别由 Broker 控制

  `delayLevel = 3 + msgExt.getReconsumeTimes()`：**延迟级别默认从 3 级开始**，每重试一次，延迟级别 +1

* `msgExt.setDelayTimeLevel(delayLevel)`：**将延迟级别设置进消息属性**，存储时会检查该属性，该属性值 > 0 会**将消息的主题和队列修改为调度主题和调度队列 ID**

* `MessageExtBrokerInner msgInner`：创建一条空消息，消息属性从 offset 查询出来的 msg 中拷贝

* `msgInner.setReconsumeTimes)`：重试次数设置为原 msg 的次数 +1

* `UtilAll.isBlank(originMsgId)`：判断消息是否是初次返回到服务器

  *  true：说明 msgExt 消息是第一次被返回到服务器，此时使用该 msg 的 id 作为 originMessageId
  * false：说明原始消息已经被重试不止 1 次，此时使用 offset 查询出来的 msg 中的 originMessageId

* `CompletableFuture putMessageResult = ..asyncPutMessage(msgInner)`：调用存储模块存储消息

  `DefaultMessageStore#asyncPutMessage`：

  * `PutMessageResult result = this.commitLog.asyncPutMessage(msg)`：**将新消息存储到 CommitLog 中**



***



##### 调度服务

DefaultMessageStore 中有成员属性 ScheduleMessageService，在 start 方法中会启动该调度服务

成员变量：

* 延迟级别属性表：

  ```java
  // 存储延迟级别对应的 延迟时间长度 （单位：毫秒）
  private final ConcurrentMap<Integer /* level */, Long/* delay timeMillis */> delayLevelTable;
  // 存储延迟级别 queue 的消费进度 offset，该 table 每 10 秒钟，会持久化一次，持久化到本地磁盘
  private final ConcurrentMap<Integer /* level */, Long/* offset */> offsetTable;
  ```

* 最大延迟级别：

  ```java
  private int maxDelayLevel;
  ```

* 模块启动状态：

  ```java
  private final AtomicBoolean started = new AtomicBoolean(false);
  ```

* 定时器：内部有线程资源，可执行调度任务

  ```java
  private Timer timer;
  ```

成员方法：

* load()：加载调度消息，**初始化 delayLevelTable 和 offsetTable**

  ```java
  public boolean load()
  ```

* start()：启动消息调度服务

  ```java
  public void start()
  ```

  * `if (started.compareAndSet(false, true))`：将启动状态设为 true

  * `this.timer`：创建定时器对象

  * `for (... : this.delayLevelTable.entrySet())`：为**每个延迟级别创建一个延迟任务**提交到 timer ，周期执行，这样就可以**将延迟消息得到及时的消费**

  * `this.timer.scheduleAtFixedRate()`：提交周期型任务，延迟 10 秒执行，周期为 10 秒，持久化延迟队列消费进度任务

    `ScheduleMessageService.this.persist()`：持久化消费进度



***



##### 调度任务

DeliverDelayedMessageTimerTask 是一个任务类

成员变量：

* 延迟级别：延迟队列任务处理的延迟级别

  ```java
  private final int delayLevel;
  ```

* 消费进度：延迟队列任务处理的延迟队列的消费进度

  ```java
  private final long offset;
  ```

成员方法：

* run()：执行任务

  ```java
  public void run() {
      if (isStarted()) {
          this.executeOnTimeup();
  }
  ```

* executeOnTimeup()：执行任务

  ```java
  public void executeOnTimeup()
  ```

  * `ConsumeQueue cq`：获取出该延迟队列任务处理的**延迟队列 ConsumeQueue**

  * `SelectMappedBufferResult bufferCQ`：根据消费进度查询出 SMBR 对象

  * `for (; i < bufferCQ.getSize(); i += ConsumeQueue.CQ_STORE_UNIT_SIZE)`：每次读取 20 各字节的数据

  * `offsetPy, sizePy`：延迟消息的物理偏移量和消息大小

  * `long tagsCode`：延迟消息的交付时间，在 ReputMessageService 转发时根据消息的 DELAY 属性是否 >0 ，会在 tagsCode 字段存储交付时间

  * `long deliver... = this.correctDeliverTimestamp(..)`：**校准交付时间**，延迟时间过长会调整为当前时间立刻执行

  * `long countdown = deliverTimestamp - now`：计算差值
  
  * `if (countdown <= 0)`：**消息已经到达交付时间了**

    `MessageExt msgExt`：根据物理偏移量和消息大小获取这条消息

    `MessageExtBrokerInner msgInner`：**构建一条新消息**，将原消息的属性拷贝过来

    * `long tagsCodeValue`：不再是交付时间了
    * `MessageAccessor.clearProperty(msgInner, DELAY..)`：清理新消息的 DELAY 属性，避免存储时重定向到延迟队列
    * `msgInner.setTopic()`：**修改主题为原始的主题 `%RETRY%GroupName`**
    * `String queueIdStr`：修改队列 ID 为原始的 ID
  
    `PutMessageResult putMessageResult`：**将新消息存储到 CommitLog**，消费者订阅的是目标主题，会再次消费该消息
  
  * `else`：消息还未到达交付时间

    `ScheduleMessageService.this.timer.schedule()`：创建该延迟级别的任务，延迟 countDown 毫秒之后再执行

    `ScheduleMessageService.this.updateOffset()`：更新延迟级别队列的消费进度

  * `PutMessageResult putMessageResult`

  * `bufferCQ == null`：说明通过消费进度没有获取到数据

    `if (offset < cqMinOffset)`：如果消费进度比最小位点都小，说明是过期数据，重置为最小位点 

  * `ScheduleMessageService.this.timer.schedule()`：重新提交该延迟级别对应的延迟队列任务，延迟 100 毫秒后执行



****



#### 事务消息

##### 生产者类

TransactionMQProducer 类发送事务消息时使用

成员变量：

* 事务回查线程池资源：

  ```java
  private ExecutorService executorService;

* 事务监听器：

  ```java
  private TransactionListener transactionListener;
  ```

核心方法：

* start()：启动方法

  ```java
  public void start()
  ```

  * `this.defaultMQProducerImpl.initTransactionEnv()`：初始化生产者实例和回查线程池资源
  * `super.start()`：启动生产者实例

* sendMessageInTransaction()：发送事务消息

  ```java
  public TransactionSendResult sendMessageInTransaction(final Message msg, final Object arg) {
      msg.setTopic(NamespaceUtil.wrapNamespace(this.getNamespace(), msg.getTopic()));
      // 调用实现类的发送方法
      return this.defaultMQProducerImpl.sendMessageInTransaction(msg, null, arg);
  }
  ```

  * `TransactionListener transactionListener = getCheckListener()`：获取监听器

  * `if (null == localTransactionExecuter && null == transactionListener)`：两者都为 null 抛出异常

  * `MessageAccessor.putProperty(msg, MessageConst.PROPERTY_TRANSACTION_PREPARED, "true")`：**设置事务标志**

  * `sendResult = this.send(msg)`：发送消息，同步发送

  * `switch (sendResult.getSendStatus())`：**判断发送消息的结果状态**

  * `case SEND_OK`：消息发送成功

    `msg.setTransactionId(transactionId)`：**设置事务 ID 为消息的 UNIQ_KEY 属性**

    `localTransactionState = ...executeLocalTransactionBranch(msg, arg)`：**执行本地事务**

  * `case SLAVE_NOT_AVAILABLE`：其他情况都需要回滚事务

    `localTransactionState = LocalTransactionState.ROLLBACK_MESSAGE`：**事务状态设置为回滚**

  * `this.endTransaction(sendResult, ...)`：结束事务

    * `EndTransactionRequestHeader requestHeader`：构建事务结束头对象
    * `this.mQClientFactory.getMQClientAPIImpl().endTransactionOneway()`：向 Broker 发起事务结束的单向请求
  
  

***



##### 接受消息

SendMessageProcessor 是服务端处理客户端发送来的消息的处理器，`processRequest()` 方法处理请求

核心方法：

* `asyncProcessRequest()`：处理请求

  ```java
  public CompletableFuture<RemotingCommand> asyncProcessRequest(ChannelHandlerContext ctx,
                                                                RemotingCommand request) {
      final SendMessageContext mqtraceContext;
      switch (request.getCode()) {
              // 回调消息回退
          case RequestCode.CONSUMER_SEND_MSG_BACK:
              return this.asyncConsumerSendMsgBack(ctx, request);
          default:
              // 解析出请求头对象
              SendMessageRequestHeader requestHeader = parseRequestHeader(request);
              if (requestHeader == null) {
                  return CompletableFuture.completedFuture(null);
              }
              // 创建上下文对象
              mqtraceContext = buildMsgContext(ctx, requestHeader);
              // 前置处理器
              this.executeSendMessageHookBefore(ctx, request, mqtraceContext);
              // 判断是否是批量消息
              if (requestHeader.isBatch()) {
                  return this.asyncSendBatchMessage(ctx, request, mqtraceContext, requestHeader);
              } else {
                  return this.asyncSendMessage(ctx, request, mqtraceContext, requestHeader);
              }
      }
  }
  ```

* asyncSendMessage()：异步处理发送消息

  ```java
  private CompletableFuture<RemotingCommand> asyncSendMessage(ChannelHandlerContext ctx, RemotingCommand request, SendMessageContext mqtraceContext, SendMessageRequestHeader requestHeader)
  ```

  * `RemotingCommand response`：创建响应对象

  * `MessageExtBrokerInner msgInner = new MessageExtBrokerInner()`：创建 msgInner 对象，并赋值相关的属性，主题和队列 ID 都是请求头中的

  * `String transFlag`：**获取事务属性**

  * `if (transFlag != null && Boolean.parseBoolean(transFlag))`：判断事务属性是否是 true，走事务消息的存储流程

    * `putMessageResult = ...asyncPrepareMessage(msgInner)`：**事务消息处理流程**

      ```java
      public CompletableFuture<PutMessageResult> asyncPutHalfMessage(MessageExtBrokerInner messageInner) {
          // 调用存储模块，将修改后的 msg 存储进 Broker(CommitLog)
          return store.asyncPutMessage(parseHalfMessageInner(messageInner));
      }
      ```

      TransactionalMessageBridge#parseHalfMessageInner：

      * `MessageAccessor.putProperty(...)`：**将消息的原主题和队列 ID 放入消息的属性中**
      * `msgInner.setSysFlag(...)`：消息设置为非事务状态
      * `msgInner.setTopic(TransactionalMessageUtil.buildHalfTopic())`：**消息主题设置为半消息主题**
      * `msgInner.setQueueId(0)`：**队列 ID 设置为 0**

  * `else`：普通消息存储



***



##### 回查处理

ClientRemotingProcessor 是客户端用于处理请求，创建 MQClientAPIImpl 时将该处理器注册到 Netty 中，`processRequest()` 方法根据请求的命令码，进行不同的处理，事务回查的处理命令码为 `CHECK_TRANSACTION_STATE`

Broker 端有定时任务发送回查请求

成员方法：

* checkTransactionState()：检查事务状态

  ```java
  public RemotingCommand checkTransactionState(ChannelHandlerContext ctx, RemotingCommand request)
  ```

  * `final CheckTransactionStateRequestHeader requestHeader`：解析出请求头对象
  * `final MessageExt messageExt`：从请求 body 中解析出服务器回查的事务消息
  * `String transactionId`：提取 UNIQ_KEY 字段属性值赋值给事务 ID
  * `final String group`：提取生产者组名
  * `MQProducerInner producer = this...selectProducer(group)`：根据生产者组获取生产者对象
  * `String addr = RemotingHelper.parseChannelRemoteAddr()`：解析出要回查的 Broker 服务器的地址
  * `producer.checkTransactionState(addr, messageExt, requestHeader)`：生产者的事务回查
    * `Runnable request = new Runnable()`：**创建回查事务状态任务对象**
      * 获取生产者的 TransactionCheckListener 和 TransactionListener，选择一个不为 null 的监听器进行事务状态回查
      * `this.processTransactionState()`：处理回查状态
        * `EndTransactionRequestHeader thisHeader`：构建 EndTransactionRequestHeader 对象
        * `DefaultMQProducerImpl...endTransactionOneway()`：向 Broker 发起结束事务单向请求，**二阶段提交**
    * `this.checkExecutor.submit(request)`：提交到线程池运行



参考图：https://www.processon.com/view/link/61c8257e0e3e7474fb9dcbc0

参考视频：https://space.bilibili.com/457326371



***



##### 事务提交

EndTransactionProcessor 类是服务端用来处理客户端发来的提交或者回滚请求

* processRequest()：处理请求

  ```java
  public RemotingCommand processRequest(ChannelHandlerContext ctx, RemotingCommand request)
  ```

  * `EndTransactionRequestHeader requestHeader`：从请求中解析出 EndTransactionRequestHeader
  
  * `if (MessageSysFlag.TRANSACTION_COMMIT_TYPE)`：**事务提交**
  
    `result = this.brokerController...commitMessage(requestHeader)`：根据 commitLogOffset 提取出 halfMsg 消息
  
    `MessageExtBrokerInner msgInner`：根据 result 克隆出一条新消息
  
    * `msgInner.setTopic(msgExt.getUserProperty(...))`：**设置回原主题**
  
    * `msgInner.setQueueId(Integer.parseInt(msgExt.getUserProperty(..)))`：**设置回原队列 ID**
    * `MessageAccessor.clearProperty()`：清理上面的两个属性
  
    `MessageAccessor.clearProperty(msgInner, ...)`：**清理事务属性**
  
    `RemotingCommand sendResult = sendFinalMessage(msgInner)`：调用存储模块存储至 Broker
  
    `this.brokerController...deletePrepareMessage(result.getPrepareMessage())`：**向删除（OP）队列添加消息**，消息体的数据是 halfMsg 的 queueOffset，**表示半消息队列指定的 offset 的消息已被删除**
  
    * `if (this...putOpMessage(msgExt, TransactionalMessageUtil.REMOVETAG))`：添加一条 OP 数据
      * `MessageQueue messageQueue`：新建一个消息队列，OP 队列
      * `return addRemoveTagInTransactionOp(messageExt, messageQueue)`：添加数据
        * `Message message`：创建 OP 消息
        * `writeOp(message, messageQueue)`：写入 OP 消息
  
  * `else if (MessageSysFlag.TRANSACTION_ROLLBACK_TYPE)`：**事务回滚**
  
    `this.brokerController...deletePrepareMessage(result.getPrepareMessage())`：**也需要向 OP 队列添加消息**



****
```
