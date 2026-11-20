---
title: "Consumer"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Consumer, system]
summary: "DefaultMQPushConsumer 类是默认的消费者类"
private: false
---

### Consumer

#### 消费者类

##### 默认消费

DefaultMQPushConsumer 类是默认的消费者类

成员变量：

* 消费者实现类：

  ```java
  protected final transient DefaultMQPushConsumerImpl defaultMQPushConsumerImpl;
  ```

* 消费属性：

  ```java
  private String consumerGroup;									// 消费者组
  private MessageModel messageModel = MessageModel.CLUSTERING;	// 消费模式，默认集群模式
  ```

* 订阅信息：key 是主题，value 是过滤表达式，一般是 tag

  ```java
  private Map<String, String > subscription = new HashMap<String, String>()
  ```

* 消息监听器：**消息处理逻辑**，并发消费 MessageListenerConcurrently，顺序（分区）消费 MessageListenerOrderly

  ```java
  private MessageListener messageListener;
  ```

* 消费位点：当从 Broker 获取当前组内该 queue 的 offset 不存在时，consumeFromWhere 才有效，默认值代表从队列的最后 offset 开始消费，当队列内再有一条新的 msg 加入时，消费者才会去消费

  ```java
  private ConsumeFromWhere consumeFromWhere = ConsumeFromWhere.CONSUME_FROM_LAST_OFFSET;
  ```

* 消费时间戳：当消费位点配置的是 CONSUME_FROM_TIMESTAMP 时，并且服务器 Group 内不存在该 queue 的 offset 时，会使用该时间戳进行消费

  ```java
  private String consumeTimestamp = UtilAll.timeMillisToHumanString3(System.currentTimeMillis() - (1000 * 60 * 30));// 消费者创建时间 - 30秒，转换成 格式： 年月日小时分钟秒，比如 20220203171201
  ```

* 队列分配策略：主题下的队列分配策略，RebalanceImpl 对象依赖该算法

  ```java
  private AllocateMessageQueueStrategy allocateMessageQueueStrategy;
  ```

* 消费进度存储器：

  ```java
  private OffsetStore offsetStore;
  ```

核心方法：

* start()：启动消费者

  ```java
  public void start()
  ```

* shutdown()：关闭消费者

  ```java
  public void shutdown()
  ```

* registerMessageListener()：注册消息监听器

  ```java
  public void registerMessageListener(MessageListener messageListener) 
  ```

* subscribe()：添加订阅信息，**将订阅信息放入负载均衡对象的 subscriptionInner 中**

  ```java
  public void subscribe(String topic, String subExpression)
  ```

* unsubscribe()：删除订阅指定主题的信息

  ```java
  public void unsubscribe(String topic)
  ```

* suspend()：停止消费

  ```java
  public void suspend()
  ```

* resume()：恢复消费

  ```java
  public void resume()
  ```



***



##### 默认实现

DefaultMQPushConsumerImpl 是默认消费者的实现类

成员变量：

* 客户端实例：整个进程内只有一个客户端实例对象

  ```java
  private MQClientInstance mQClientFactory;
  ```

* 消费者实例：门面对象

  ```java
   private final DefaultMQPushConsumer defaultMQPushConsumer;
  ```

* **负载均衡**：分配订阅主题的队列给当前消费者，20 秒钟一个周期执行 Rebalance 算法（客户端实例触发）

  ```java
  private final RebalanceImpl rebalanceImpl = new RebalancePushImpl(this);
  ```

* 消费者信息：

  ```java
  private final long consumerStartTimestamp;	// 消费者启动时间
  private volatile ServiceState serviceState;	// 消费者状态
  private volatile boolean pause = false;		// 是否暂停
  private boolean consumeOrderly = false;		// 是否顺序消费
  ```

* **拉取消息**：封装拉消息的 API，服务器 Broker 返回结果中包含下次 Pull 时推荐的 BrokerId，根据本次请求数据的冷热程度进行推荐

  ```java
  private PullAPIWrapper pullAPIWrapper;
  ```

* **消息消费**服务：并发消费和顺序消费

  ```java
  private ConsumeMessageService consumeMessageService;
  ```

* 流控：

  ```java
  private long queueFlowControlTimes = 0;			// 队列流控次数，默认每1000次流控，进行一次日志打印
  private long queueMaxSpanFlowControlTimes = 0;	// 流控使用，控制打印日志
  ```

* HOOK：钩子方法

  ```java
  // 过滤消息 hook
  private final ArrayList<FilterMessageHook> filterMessageHookList;
  // 消息执行hook，在消息处理前和处理后分别执行 hook.before  hook.after 系列方法
  private final ArrayList<ConsumeMessageHook> consumeMessageHookList;
  ```

核心方法：

* start()：加锁保证线程安全

  ```java
  public synchronized void start() 
  ```

  * `this.checkConfig()`：检查配置，包括组名、消费模式、订阅信息、消息监听器等
  * `this.copySubscription()`：拷贝订阅信息到 RebalanceImpl 对象
    * `this.rebalanceImpl.getSubscriptionInner().put(topic, subscriptionData)`：将订阅信息加入 rbl 的 map 中
    * `this.messageListenerInner = ...getMessageListener()`：将消息监听器保存到实例对象
    * `switch (this.defaultMQPushConsumer.getMessageModel())`：判断消费模式，广播模式下直接返回
    * `final String retryTopic`：创建当前**消费者组重试的主题名**，规则 `%RETRY%ConsumerGroup`
    * `SubscriptionData subscriptionData = FilterAPI.buildSubscriptionData()`：创建重试主题的订阅数据对象
    * `this.rebalanceImpl.getSubscriptionInner().put(retryTopic, subscriptionData)`：将创建的重试主题加入到 rbl 对象的 map 中，**消息重试时会加入到该主题，消费者订阅这个主题之后，就有机会再次拿到该消息进行消费处理**
  * `this.mQClientFactory = ...getOrCreateMQClientInstance()`：获取客户端实例对象
  * `this.rebalanceImpl.`：初始化负载均衡对象，设置**队列分配策略对象**到属性中
  * `this.pullAPIWrapper = new PullAPIWrapper()`：创建拉消息 API 对象，内部封装了查询推荐主机算法
  * `this.pullAPIWrapper.registerFilterMessageHook(filterMessageHookList)`：将过滤 Hook 列表注册到该对象内，消息拉取下来之后会执行该 Hook，**再进行一次自定义的消息过滤**
  * `this.offsetStore = new RemoteBrokerOffsetStore()`：默认集群模式下创建消息进度存储器
  * `this.consumeMessageService = ...`：根据消息监听器的类型创建消费服务
  * `this.consumeMessageService.start()`：启动消费服务
  * `boolean registerOK = mQClientFactory.registerConsumer()`：**将消费者注册到客户端实例中**，客户端提供的服务：
    * 心跳服务：把订阅数据同步到订阅主题的 Broker
    * 拉消息服务：内部 PullMessageService 启动线程，基于 PullRequestQueue 工作，消费者负载均衡分配到队列后会向该队列提交 PullRequest
    * 队列负载服务：每 20 秒调用一次 `consumer.doRebalance()` 接口
    * 消息进度持久化
    * 动态调整消费者、消费服务线程池
  * `mQClientFactory.start()`：启动客户端实例
  * ` this.updateTopic`：从 nameserver 获取主题路由数据，生成主题集合放入 rbl 对象的 table
  * `this.mQClientFactory.checkClientInBroker()`：检查服务器是否支持消息过滤模式，一般使用 tag 过滤，服务器默认支持
  * `this.mQClientFactory.sendHeartbeatToAllBrokerWithLock()`：向所有已知的 Broker 节点，**发送心跳数据**
  * `this.mQClientFactory.rebalanceImmediately()`：唤醒 rbl 线程，触发负载均衡执行



***



#### 负载均衡

##### 实现方式

MQClientInstance#start 中会启动负载均衡服务 RebalanceService：

```java
public void run() {
	// 检查停止标记
    while (!this.isStopped()) {
        // 休眠 20 秒，防止其他线程饥饿，所以【每 20 秒负载均衡一次】
        this.waitForRunning(waitInterval);
        // 调用客户端实例的负载均衡方法，底层【会遍历所有消费者，调用消费者的负载均衡】
        this.mqClientFactory.doRebalance();
    }	
}
```

RebalanceImpl 类成员变量：

* 分配给当前消费者的处理队列：处理消息队列集合，**ProcessQueue 是 MQ 队列在消费者端的快照**

  ```java
  protected final ConcurrentMap<MessageQueue, ProcessQueue> processQueueTable;
  ```

* 消费者订阅主题的队列信息：

  ```java
  protected final ConcurrentMap<String/* topic */, Set<MessageQueue>> topicSubscribeInfoTable;
  ```

* 订阅数据：

  ```java
  protected final ConcurrentMap<String/* topic */, SubscriptionData> subscriptionInner;
  ```

* 队列分配策略：

  ```java
  protected AllocateMessageQueueStrategy allocateMessageQueueStrategy;
  ```

成员方法：

* doRebalance()：负载均衡方法，以每个消费者实例为粒度进行负载均衡

  ```java
  public void doRebalance(final boolean isOrder) {
      // 获取当前消费者的订阅数据
      Map<String, SubscriptionData> subTable = this.getSubscriptionInner();
      if (subTable != null) {
          // 遍历所有的订阅主题
          for (final Entry<String, SubscriptionData> entry : subTable.entrySet()) {
              // 获取订阅的主题
              final String topic = entry.getKey();
              // 按照主题进行负载均衡
              this.rebalanceByTopic(topic, isOrder);
          }
      }
      // 将分配到当前消费者的队列进行过滤，不属于当前消费者订阅主题的直接移除
      this.truncateMessageQueueNotMyTopic();
  }
  ```

  集群模式下：

  * `Set<MessageQueue> mqSet = this.topicSubscribeInfoTable.get(topic)`：订阅的主题下的全部队列信息

  * `cidAll = this...findConsumerIdList(topic, consumerGroup)`：从服务器获取消费者组下的全部消费者 ID

  * `Collections.sort(mqAll)`：主题 MQ 队列和消费者 ID 都进行排序，**保证每个消费者的视图一致性**

  * `allocateResult = strategy.allocate()`： **调用队列分配策略**，给当前消费者进行分配 MessageQueue（下一节）

  * `boolean changed = this.updateProcessQueueTableInRebalance(...)`：**更新队列处理集合**，mqSet 是 rbl 算法分配到当前消费者的 MQ 集合

    * `while (it.hasNext())`：遍历当前消费者的所有处理队列

    * `if (mq.getTopic().equals(topic))`：该 MQ 是 本次 rbl 分配算法计算的主题

    * `if (!mqSet.contains(mq))`：该 MQ 经过 rbl 计算之后，**被分配到其它 Consumer 节点**

      `pq.setDropped(true)`：将删除状态设置为 true

      `if (this.removeUnnecessaryMessageQueue(mq, pq))`：删除不需要的 MQ 队列

      * `this...getOffsetStore().persist(mq)`：在 MQ 归属的 Broker 节点持久化消费进度

      * `this...getOffsetStore().removeOffset(mq)`：删除该 MQ 在本地的消费进度

      * `if (this.defaultMQPushConsumerImpl.isConsumeOrderly() &&)`：是否是**顺序消费**和集群模式

        `if (pq.getLockConsume().tryLock(1000, ..))`： 获取锁成功，说明顺序消费任务已经停止消费工作

        `return this.unlockDelay(mq, pq)`：**释放锁 Broker 端的队列锁，向服务器发起 oneway 的解锁请求**

        * `if (pq.hasTempMessage())`：队列中有消息，延迟 20 秒释放队列分布式锁，确保全局范围内只有一个消费任务 运行中
        * `else`：当前消费者本地该消费任务已经退出，直接释放锁
    
        `else`：顺序消费任务正在消费一批消息，不可打断，增加尝试获取锁的次数
    
      `it.remove()`：从 processQueueTable 移除该 MQ
    
    * `else if (pq.isPullExpired())`：说明当前 MQ 还是被当前 Consumer 消费，此时判断一下是否超过 2 分钟未到服务器 拉消息，如果条件成立进行上述相同的逻辑
    
    * `for (MessageQueue mq : mqSet)`：开始处理当前主题**新分配到当前节点的队列**
    
      `if (isOrder && !this.lock(mq))`：**顺序消息为了保证有序性，需要获取队列锁**
    
      `ProcessQueue pq = new ProcessQueue()`：为每个新分配的消息队列创建快照队列
    
      `long nextOffset = this.computePullFromWhere(mq)`：**从服务端获取新分配的 MQ 的消费进度**
    
      `ProcessQueue pre = this.processQueueTable.putIfAbsent(mq, pq)`：保存到处理队列集合
    
      `PullRequest pullRequest = new PullRequest()`：**创建拉取请求对象**
    
    * `this.dispatchPullRequest(pullRequestList)`：放入 PullMessageService 的**本地阻塞队列**内，用于拉取消息工作
  
* lockAll()：续约锁，对消费者的所有队列进行续约

  ```java
  public void lockAll()
  ```

  * `HashMap<String, Set<MessageQueue>> brokerMqs`：将分配给当前消费者的全部 MQ 按照 BrokerName 分组

  * `while (it.hasNext())`：遍历所有的分组

  * `final Set<MessageQueue> mqs`：获取该 Broker 上分配给当前消费者的 queue 集合

  * `FindBrokerResult findBrokerResult`：查询 Broker 主节点信息

  * `LockBatchRequestBody requestBody`：创建请求对象，填充属性

  * `Set<MessageQueue> lockOKMQSet`：**以组为单位向 Broker 发起批量续约锁的同步请求**，返回成功的队列集合

  * `for (MessageQueue mq : lockOKMQSet)`：遍历续约锁成功的 MQ

    `processQueue.setLocked(true)`：**分布式锁状态设置为 true，表示允许顺序消费**

    `processQueue.setLastLockTimestamp(System.currentTimeMillis())`：设置上次获取锁的时间为当前时间

  * `for (MessageQueue mq : mqs)`：遍历当前 Broker 上的所有队列集合

    `if (!lockOKMQSet.contains(mq))`：条件成立说明续约锁失败

    `processQueue.setLocked(false)`：**分布式锁状态设置为 false，表示不允许顺序消费**




***



##### 队列分配

AllocateMessageQueueStrategy 类是队列的分配策略

* 平均分配：AllocateMessageQueueAveragely 类

  ```java
  // 参数一：消费者组       								参数二：当前消费者id   
  // 参数三：主题的全部队列，包括所有 broker 上该主题的 mq  	参数四：全部消费者id集合
  public List<MessageQueue> allocate(String consumerGroup, String currentCID, List<MessageQueue> mqAll, List<String> cidAll) {
      // 获取当前消费者在全部消费者中的位置，【全部消费者是已经排序好的，排在前面的优先分配更多的队列】
      int index = cidAll.indexOf(currentCID);
      // 平均分配完以后，还剩余的待分配的 mq 的数量
      int mod = mqAll.size() % cidAll.size();
      // 首先判断整体的 mq 的数量是否小于消费者的数量，小于消费者的数量就说明不够分的，先分一个
      int averageSize = mqAll.size() <= cidAll.size() ? 1 :
      	// 成立需要多分配一个队列，因为更靠前
      	(mod > 0 && index < mod ? mqAll.size() / cidAll.size() + 1 : mqAll.size() / cidAll.size());
      // 获取起始的分配位置
      int startIndex = (mod > 0 && index < mod) ? index * averageSize : index * averageSize + mod;
      // 防止索引越界
      int range = Math.min(averageSize, mqAll.size() - startIndex);
      // 开始分配，【挨着分配，是直接就把当前的 消费者分配完成】
      for (int i = 0; i < range; i++) {
          result.add(mqAll.get((startIndex + i) % mqAll.size()));
      }
      return result;
  }
  ```

  队列排序后：Q1 → Q2 → Q3，消费者排序后 C1 → C2 → C3

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/RocketMQ-平均队列分配.png)

* 轮流分配：AllocateMessageQueueAveragelyByCircle

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/RocketMQ-平均队列轮流分配.png)

* 指定机房平均分配：AllocateMessageQueueByMachineRoom，前提是 Broker 的命名规则为 `机房名@BrokerName`

  



***



#### 拉取服务

##### 实现方式

MQClientInstance#start 中会启动消息拉取服务：PullMessageService

```java
public void run() {
    // 检查停止标记，【循环拉取】
    while (!this.isStopped()) {
        try {
            // 从阻塞队列中获取拉消息请求
            PullRequest pullRequest = this.pullRequestQueue.take();
            // 拉取消息，获取请求对应的使用当前消费者组中的哪个消费者，调用消费者的 pullMessage 方法
            this.pullMessage(pullRequest);
        } catch (Exception e) {
            log.error("Pull Message Service Run Method exception", e);
        }
    }
}
```

DefaultMQPushConsumerImpl#pullMessage：

* `ProcessQueue processQueue = pullRequest.getProcessQueue()`：获取请求对应的快照队列，并判断是否是删除状态

* `this.executePullRequestLater()`：如果当前消费者不是运行状态，则拉消息任务延迟 3 秒后执行，如果是暂停状态延迟 1 秒

* **流控的逻辑**：

  `long cachedMessageCount = processQueue.getMsgCount().get()`：获取消费者本地该 queue 快照内缓存的消息数量，如果大于 1000 条，进行流控，延迟 50 毫秒

  `long cachedMessageSizeInMiB`： 消费者本地该 queue 快照内缓存的消息容量 size，超过 100m 消息未被消费进行流控

  `if(processQueue.getMaxSpan() > 2000)`：消费者本地缓存消息第一条消息最后一条消息跨度超过 2000 进行流控

* `SubscriptionData subscriptionData`：本次拉消息请求订阅的主题数据，如果调用了 `unsubscribe(主题)` 将会获取为 null

* `PullCallback pullCallback = new PullCallback()`：**拉消息处理回调对象**

  * `pullResult = ...processPullResult()`：预处理 PullResult 结果，将服务器端指定 MQ 的拉消息**下一次的推荐节点**保存到 pullFromWhichNodeTable 中，**并进行消息过滤**

  * `case FOUND`：正常拉取到消息

    `pullRequest.setNextOffset(pullResult.getNextBeginOffset())`：更新 pullRequest 对象下一次拉取消息的位点

    `if (pullResult.getMsgFoundList() == null...)`：消息过滤导致消息全部被过滤掉，需要立马发起下一次拉消息

    `boolean .. = processQueue.putMessage()`：将服务器拉取的消息集合**加入到消费者本地**的 processQueue 内

    `DefaultMQPushConsumerImpl...submitConsumeRequest()`：**提交消费任务，分为顺序消费和并发消费**

    `Defaul..executePullRequestImmediately(pullRequest)`：将更新过 nextOffset 字段的 PullRequest 对象，再次放到 pullMessageService 的阻塞队列中，**形成闭环**

  * `case NO_NEW_MSG ||NO_MATCHED_MSG`：**表示本次 pull 没有新的可消费的信息**

    `pullRequest.setNextOffset()`：更新更新 pullRequest 对象下一次拉取消息的位点

    `Defaul..executePullRequestImmediately(pullRequest)`：再次拉取请求

  * `case OFFSET_ILLEGAL`：**本次 pull 时使用的 offset 是无效的**，即 offset > maxOffset || offset  < minOffset

    `pullRequest.setNextOffset()`：调整 pullRequest.nextOffset 为正确的 offset

    `pullRequest.getProcessQueue().setDropped(true)`：设置该 processQueue 为删除状态，如果有该 queue 的消费任务，消费任务会马上停止

    `DefaultMQPushConsumerImpl.this.executeTaskLater()`：提交异步任务，10 秒后去执行

    * `DefaultMQPushConsumerImpl...updateOffset()`：更新 offsetStore 该 MQ 的 offset 为正确值，内部直接替换

    * `DefaultMQPushConsumerImpl...persist()`：持久化该 messageQueue 的 offset 到 Broker 端

    * `DefaultMQPushConsumerImpl...removeProcessQueue()`： 删除该消费者该 messageQueue 对应的 processQueue

    * 这里没有再次提交 pullRequest 到 pullMessageService 的队列，那该队列不再拉消息了吗？

      负载均衡 rbl 程序会重建该队列的 processQueue，重建完之后会为该队列创建新的 PullRequest 对象

* `int sysFlag = PullSysFlag.buildSysFlag()`：**构建标志对象**，sysFlag 高 4 位未使用，低 4 位使用，从左到右 0000 0011

  * 第一位：表示是否提交消费者本地该队列的 offset，一般是 1
  * 第二位：表示是否允许服务器端进行长轮询，一般是 1
  * 第三位：表示是否提交消费者本地该主题的订阅数据，一般是 0
  * 第四位：表示是否为类过滤，一般是 0

* `this.pullAPIWrapper.pullKernelImpl()`：拉取消息的核心方法



***



##### 封装对象

PullAPIWrapper 类封装了拉取消息的 API

成员变量：

* 推荐拉消息使用的主机 ID：

  ```java
  private ConcurrentMap<MessageQueue, AtomicLong/* brokerId */> pullFromWhichNodeTable
  ```

成员方法：

* pullKernelImpl()：拉消息

  * `FindBrokerResult findBrokerResult`：**本地查询指定 BrokerName 的地址信息**，推荐节点或者主节点

  * `if (null == findBrokerResult)`：查询不到，就到 Namesrv 获取指定 topic 的路由数据

  * `if (findBrokerResult.isSlave())`：成立说明 findBrokerResult 表示的主机为 slave 节点，**slave 不存储 offset 信息**

    `sysFlagInner = PullSysFlag.clearCommitOffsetFlag(sysFlagInner)`：将 sysFlag 标记位中 CommitOffset 的位置为 0

  * `PullMessageRequestHeader requestHeader`：创建请求头对象，封装所有的参数

  * `PullResult pullResult = this.mQClientFactory.getMQClientAPIImpl().pullMessage()`：调用客户端实例的方法，核心逻辑就是**将业务数据转化为 RemotingCommand  通过 NettyRemotingClient 的 IO 进行通信**

    * `RemotingCommand request`：创建网络层传输对象 RemotingCommand 对象，**请求 ID 为 `PULL_MESSAGE = 11`**

    * `return this.pullMessageSync(...)`：此处是**异步调用，处理结果放入 ResponseFuture 中**，参考服务端小节的处理器类 `NettyServerHandler#processMessageReceived` 方法
* `RemotingCommand response = responseFuture.getResponseCommand()`：获取服务器端响应数据 response
  
  * `PullResult pullResult`：从 response 内提取出来拉消息结果对象，将响应头 PullMessageResponseHeader 对象中信息**填充到 PullResult 中**，列出两个重要的字段：
  * `private Long suggestWhichBrokerId`：服务端建议客户端下次 Pull 时选择的 BrokerID
  * `private Long nextBeginOffset`：客户端下次 Pull 时使用的 offset 信息
  
* `pullCallback.onSuccess(pullResult)`：将 PullResult 交给拉消息结果处理回调对象，调用 onSuccess 方法



***



#### 拉取处理

##### 处理器

BrokerStartup#createBrokerController 方法中创建了 BrokerController 并进行初始化，调用 `registerProcessor()` 方法将处理器 PullMessageProcessor 注册到 NettyRemotingServer 中，对应的请求 ID 为 `PULL_MESSAGE = 11`，NettyServerHandler 在处理请求时通过请求 ID 会获取处理器执行 processRequest 方法

```java
// 参数一：服务器与客户端 netty 通道； 参数二：客户端请求； 参数三：是否允许服务器端长轮询，默认 true
private RemotingCommand processRequest(final Channel channel, RemotingCommand request, boolean brokerAllowSuspend)
```

* `RemotingCommand response`：创建响应对象，设置为响应类型的请求，响应头是 PullMessageResponseHeader

* `final PullMessageResponseHeader responseHeader`：获取响应对象的 header

* `final PullMessageRequestHeader requestHeader`：解析出请求头 PullMessageRequestHeader

* `response.setOpaque(request.getOpaque())`：设置 opaque 属性，客户端**根据该字段获取 ResponseFuture** 进行处理

* 进行一些鉴权的逻辑：是否允许长轮询、提交 offset、topicConfig 是否是空、队列 ID 是否合理

* `ConsumerGroupInfo consumerGroupInfo`：获取消费者组信息，包含全部的消费者和订阅数据

* `subscriptionData = consumerGroupInfo.findSubscriptionData()`：**获取指定主题的订阅数据**

* `if (!ExpressionType.isTagType()`：表达式匹配

* `MessageFilter messageFilter`：创建消息过滤器，一般是通过 tagCode 进行过滤

* `DefaultMessageStore.getMessage()`：**查询消息的核心逻辑，在 Broker 端查询消息**（存储端笔记详解了该源码）

* `response.setRemark()`：设置此次响应的状态

* `responseHeader.set..`：设置响应头对象的一些字段

* `switch (this.brokerController.getMessageStoreConfig().getBrokerRole())`：如果当前主机节点角色为 slave 并且**从节点读**并未开启的话，直接给客户端 一个状态 `PULL_RETRY_IMMEDIATELY`，并设置为下次从主节点读

* `if (this.brokerController.getBrokerConfig().isSlaveReadEnable())`：消费太慢，**下次从另一台机器拉取**

* `switch (getMessageResult.getStatus())`：根据 getMessageResult 的状态设置 response 的 code

  ```java
  public enum GetMessageStatus {
      FOUND,					// 查询成功
      NO_MATCHED_MESSAGE,		// 未查询到到消息，服务端过滤 tagCode
      MESSAGE_WAS_REMOVING,	// 查询时赶上 CommitLog 清理过期文件，导致查询失败，立刻尝试
      OFFSET_FOUND_NULL,		// 查询时赶上 ConsumerQueue 清理过期文件，导致查询失败，【进行长轮询】
      OFFSET_OVERFLOW_BADLY,	// pullRequest.offset 越界 maxOffset
      OFFSET_OVERFLOW_ONE,	// pullRequest.offset == CQ.maxOffset，【进行长轮询】
      OFFSET_TOO_SMALL,		// pullRequest.offset 越界 minOffset
      NO_MATCHED_LOGIC_QUEUE,	// 没有匹配到逻辑队列
      NO_MESSAGE_IN_QUEUE,	// 空队列，创建队列也是因为查询导致，【进行长轮询】
  }
  ```

* `switch (response.getCode())`：根据 response 状态做对应的业务处理

  `case ResponseCode.SUCCESS`：查询成功

  * `final byte[] r = this.readGetMessageResult()`：本次 pull 出来的全部消息导入 byte 数组
  * `response.setBody(r)`：将消息的 byte 数组保存到 response body 字段

  `case ResponseCode.PULL_NOT_FOUND`：产生这种情况大部分原因是 `pullRequest.offset  ==  queue.maxOffset`，说明已经没有需要获取的消息，此时如果直接返回给客户端，客户端会立刻重新请求，还是继续返回该状态，频繁拉取服务器导致服务器压力大，所以此处**需要长轮询**

  * `if (brokerAllowSuspend && hasSuspendFlag)`：brokerAllowSuspend = true，当长轮询结束再次执行 processRequest 时该参数为 false，所以**每次 Pull 请求至多在服务器端长轮询控制一次**
  * `PullRequest pullRequest = new PullRequest()`：创建长轮询 PullRequest 对象
  * `this.brokerController...suspendPullRequest(topic, queueId, pullRequest)`：将长轮询请求对象交给长轮询服务
    * `String key = this.buildKey(topic, queueId)`：构建一个 `topic@queueId` 的 key
    * `ManyPullRequest mpr = this.pullRequestTable.get(key)`：从拉请求表中获取对象
    * `mpr.addPullRequest(pullRequest)`：**将 PullRequest 对象放入到长轮询的请求集合中**
  * `response = null`：响应设置为 null 内部的 callBack 就不会给客户端发送任何数据，**不进行通信**，否则就又开始重新请求

* `boolean storeOffsetEnable`：允许长轮询、sysFlag 表示提交消费者本地该队列的offset、当前 broker 节点角色为 master 节点三个条件成立，才**在 Broker 端存储消费者组内该主题的指定 queue 的消费进度**

* `return response`：返回 response，不为 null 时外层 processRequestCommand 的 callback 会将数据写给客户端



***



##### 长轮询

PullRequestHoldService 类负责长轮询，BrokerController#start 方法中调用了 `this.pullRequestHoldService.start()` 启动该服务

核心方法：

* run()：核心运行方法

  ```java
  public void run() {
  	// 循环运行
      while (!this.isStopped()) {
          if (this.brokerController.getBrokerConfig().isLongPollingEnable()) {
              // 服务器开启长轮询开关：每次循环休眠5秒
              this.waitForRunning(5 * 1000);
          } else {
              // 服务器关闭长轮询开关：每次循环休眠1秒
              this.waitForRunning(...);
          }
          // 检查持有的请求
          this.checkHoldRequest();
          // .....
      }
  }
  ```

* checkHoldRequest()：检查所有的请求

  * `for (String key : this.pullRequestTable.keySet())`：**处理所有的 topic@queueId 的逻辑**
  * `String[] kArray = key.split(TOPIC_QUEUEID_SEPARATOR)`：key 按照 @ 拆分，得到 topic 和 queueId
  * `long offset = this...getMaxOffsetInQueue(topic, queueId)`： 到存储模块查询该 ConsumeQueue 的**最大 offset**
  * `this.notifyMessageArriving(topic, queueId, offset)`：通知消息到达

* notifyMessageArriving()：**通知消息到达**的逻辑，ReputMessageService 消息分发服务也会调用该方法

  * `ManyPullRequest mpr = this.pullRequestTable.get(key)`：获取对应的的 manyPullRequest 对象
  * `List<PullRequest> requestList`：获取该队列下的所有 PullRequest，并进行遍历
  * `List<PullRequest> replayList`：当某个 pullRequest 不超时，并且对应的 `CQ.maxOffset <= pullRequest.offset`，就将该 PullRequest 再放入该列表
  * `long newestOffset`：该值为 CQ 的 maxOffset
  * `if (newestOffset > request.getPullFromThisOffset())`：**请求对应的队列内可以 pull 消息了，结束长轮询**
  * `boolean match`：进行过滤匹配
  * `this.brokerController...executeRequestWhenWakeup()`：将满足条件的 pullRequest 再次提交到线程池内执行
    * `final RemotingCommand response`：执行 processRequest 方法，并且**不会触发长轮询**
    * `channel.writeAndFlush(response).addListene()`：**将结果数据发送给客户端**
  * `if (System.currentTimeMillis() >= ...)`：判断该 pullRequest 是否超时，超时后的也是重新提交到线程池，并且不进行长轮询
  * `mpr.addPullRequest(replayList)`：将未满足条件的 PullRequest 对象再次添加到 ManyPullRequest 属性中



***



##### 结果类

GetMessageResult 类成员信息：

```java
public class GetMessageResult {
    // 查询消息时，最底层都是 mappedFile 支持的查询，查询时返回给外层一个 SelectMappedBufferResult，
    // mappedFile 每查询一次都会 refCount++ ，通过SelectMappedBufferResult持有mappedFile，完成资源释放的句柄
    private final List<SelectMappedBufferResult> messageMapedList =
        new ArrayList<SelectMappedBufferResult>(100);

    // 该List内存储消息，每一条消息都被转成 ByteBuffer 表示了
    private final List<ByteBuffer> messageBufferList = new ArrayList<ByteBuffer>(100);
    // 查询结果状态
    private GetMessageStatus status;
    // 客户端下次再向当前Queue拉消息时，使用的 offset
    private long nextBeginOffset;
    // 当前queue最小offset
    private long minOffset;
    // 当前queue最大offset
    private long maxOffset;
    // 消息总byte大小
    private int bufferTotalSize = 0;
    // 服务器建议客户端下次到该 queue 拉消息时是否使用 【从节点】
    private boolean suggestPullingFromSlave = false;
}
```



***



#### 队列快照

##### 成员属性

ProcessQueue 类是消费队列的快照

成员变量：

* 属性字段：

  ```java
  private final AtomicLong msgCount = new AtomicLong();	// 队列中消息数量
  private final AtomicLong msgSize = new AtomicLong();	// 消息总大小
  private volatile long queueOffsetMax = 0L;				// 快照中最大 offset
  private volatile boolean dropped = false;				// 快照是否移除
  private volatile long lastPullTimestamp = current;		// 上一次拉消息的时间
  private volatile long lastConsumeTimestamp = current;	// 上一次消费消息的时间
  private volatile long lastLockTimestamp = current;		// 上一次获取锁的时间
  ```

* **消息容器**：key 是消息偏移量，val 是消息

  ```java
  private final TreeMap<Long, MessageExt> msgTreeMap = new TreeMap<Long, MessageExt>();
  ```

* **顺序消费临时容器**：

  ```java
  private final TreeMap<Long, MessageExt> consumingMsgOrderlyTreeMap = new TreeMap<Long, MessageExt>();
  ```

* 锁：

  ```java
  private final ReadWriteLock lockTreeMap;		// 读写锁
  private final Lock lockConsume;					// 重入锁，【顺序消费使用】
  ```

* 顺序消费状态：

  ```java
  private volatile boolean locked = false;		// 是否是锁定状态
  private volatile boolean consuming = false;		// 是否是消费中
  ```

  

****



##### 成员方法

核心成员方法

* putMessage()：将 Broker 拉取下来的 msgs 存储到快照队列内，返回为 true 表示提交顺序消费任务，false 表示不提交

  ```java
  public boolean putMessage(final List<MessageExt> msgs)
  ```

  * `this.lockTreeMap.writeLock().lockInterruptibly()`：获取写锁

  * `for (MessageExt msg : msgs)`：遍历 msgs 全部加入 msgTreeMap，key 是消息的 queueOffset

  * `if (!msgTreeMap.isEmpty() && !this.consuming)`：**消息容器中存在未处理的消息，并且不是消费中的状态**

    `dispatchToConsume = true`：代表需要提交顺序消费任务

    `this.consuming = true`：设置为顺序消费执行中的状态

  * `this.lockTreeMap.writeLock().unlock()`：释放写锁

* removeMessage()：移除已经消费的消息，参数是已经消费的消息集合，并发消费使用

  ```java
  public long removeMessage(final List<MessageExt> msgs)
  ```

  * `long result = -1`：结果初始化为 -1 
  * `this.lockTreeMap.writeLock().lockInterruptibly()`：获取写锁
  * `this.lastConsumeTimestamp = now`：更新上一次消费消息的时间为现在
  * `if (!msgTreeMap.isEmpty())`：判断消息容器是否是空，**是空直接返回 -1**
  * `result = this.queueOffsetMax + 1`：设置结果，**删除完后消息容器为空时返回**
  * `for (MessageExt msg : msgs)`：将已经消费的消息全部从 msgTreeMap 移除
  * `if (!msgTreeMap.isEmpty())`：移除后容器内还有待消费的消息，**获取第一条消息 offset 返回**
  * `this.lockTreeMap.writeLock().unlock()`：释放写锁

* takeMessages()：获取一批消息，顺序消费使用

  ```java
  public List<MessageExt> takeMessages(final int batchSize)
  ```

  * `this.lockTreeMap.writeLock().lockInterruptibly()`：获取写锁
  * `this.lastConsumeTimestamp = now`：更新上一次消费消息的时间为现在
  * `for (int i = 0; i < batchSize; i++)`：从头节点开始获取消息
  * `result.add(entry.getValue())`：将消息放入结果集合
  * `consumingMsgOrderlyTreeMap.put()`：将消息加入顺序消费容器中
  * `if (result.isEmpty())`：条件成立说明顺序消费容器本地快照内的消息全部处理完了，**当前顺序消费任务需要停止**
  * `consuming = false`：消费状态置为 false
  * `this.lockTreeMap.writeLock().unlock()`：释放写锁

* commit()：处理完一批消息后调用，顺序消费使用

  ```java
  public long commit()
  ```

  * `this.lockTreeMap.writeLock().lockInterruptibly()`：获取写锁
  * `Long offset = this.consumingMsgOrderlyTreeMap.lastKey()`：获取顺序消费临时容器最后一条数据的 key
  * `msgCount, msgSize`：更新顺序消费相关的字段
  * `this.consumingMsgOrderlyTreeMap.clear()`：清空顺序消费容器的数据
  * `return offset + 1`：**消费者下一条消费的位点**
  * `this.lockTreeMap.writeLock().unlock()`：释放写锁

* cleanExpiredMsg()：清除过期消息

  ```java
  public void cleanExpiredMsg(DefaultMQPushConsumer pushConsumer)
  ```

  * `if (pushConsumer.getDefaultMQPushConsumerImpl().isConsumeOrderly()) `：顺序消费不执行过期清理逻辑
  * `int loop = msgTreeMap.size() < 16 ? msgTreeMap.size() : 16`：最多循环 16 次
  * `if (!msgTreeMap.isEmpty() &&)`：如果容器中第一条消息的消费开始时间与当前系统时间差值 > 15min，则取出该消息
  * `else`：直接跳出循环，因为**快照队列内的消息是有顺序的**，第一条消息不过期，其他消息都不过期
  * `pushConsumer.sendMessageBack(msg, 3)`：**消息回退**到服务器，设置该消息的延迟级别为 3
  * `if (!msgTreeMap.isEmpty() && msg.getQueueOffset() == msgTreeMap.firstKey())`：条件成立说明消息回退期间，该目标消息并没有被消费任务成功消费
  * `removeMessage(Collections.singletonList(msg))`：从 treeMap 将该回退成功的 msg 删除



****



#### 并发消费

##### 成员属性

ConsumeMessageConcurrentlyService 负责并发消费服务

成员变量：

* 消息监听器：封装处理消息的逻辑，该监听器由开发者实现，并注册到 defaultMQPushConsumer

  ```java
  private final MessageListenerConcurrently messageListener;
  ```

* 消费属性：

  ```java
  private final BlockingQueue<Runnable> consumeRequestQueue;	// 消费任务队列
  private final String consumerGroup;							// 消费者组
  ```

* 线程池：

  ```java
  private final ThreadPoolExecutor consumeExecutor;				// 消费任务线程池，默认 20
  private final ScheduledExecutorService scheduledExecutorService;// 调度线程池，延迟提交消费任务
  private final ScheduledExecutorService cleanExpireMsgExecutors;	// 清理过期消息任务线程池，15min 一次
  ```



***



##### 成员方法

ConsumeMessageConcurrentlyService 并发消费核心方法

* start()：启动消费服务，DefaultMQPushConsumerImpl 启动时会调用该方法

  ```java
  public void start() {
      // 提交“清理过期消息任务”任务，延迟15min之后执行，之后每15min执行一次
      this.cleanExpireMsgExecutors.scheduleAtFixedRate(() ->  cleanExpireMsg()}, 
                                                       15, 15, TimeUnit.MINUTES);
  }
  ```

* cleanExpireMsg()：清理过期消息任务

  ```java
  private void cleanExpireMsg()
  ```

  * `Iterator<Map.Entry<MessageQueue, ProcessQueue>> it `：获取分配给当前消费者的队列
  * `while (it.hasNext())`：遍历所有的队列
  * `pq.cleanExpiredMsg(this.defaultMQPushConsumer)`：调用队列快照 ProcessQueue 清理过期消息的方法

* submitConsumeRequest()：提交消费请求

  ```java
  // 参数一：从服务器 pull 下来的这批消息
  // 参数二：消息归属 mq 在消费者端的 processQueue，提交消费任务之前，msgs已经加入到该pq内了
  // 参数三：消息归属队列
  // 参数四：并发消息此参数无效
  public void submitConsumeRequest(List<MessageExt> msgs, ProcessQueue processQueue, MessageQueue messageQueue, boolean dispatchToConsume)
  ```

  * `final int consumeBatchSize`：**一个消费任务可消费的消息数量**，默认为 1

  * `if (msgs.size() <= consumeBatchSize)`：判断一个消费任务是否可以提交

    `ConsumeRequest consumeRequest`：封装为消费请求

    `this.consumeExecutor.submit(consumeRequest)`：提交消费任务，异步执行消息的处理

  * `else`：说明消息较多，需要多个消费任务

    `for (int total = 0; total < msgs.size(); )`：将消息拆分成多个消费任务

* processConsumeResult()：处理消费结果

  ```java
  // 参数一：消费结果状态；  参数二：消费上下文；  参数三：当前消费任务
  public void processConsumeResult(status, context, consumeRequest)
  ```

  * `switch (status)`：根据消费结果状态进行处理

  * `case CONSUME_SUCCESS`：消费成功

    `if (ackIndex >= consumeRequest.getMsgs().size())`：消费成功的话，ackIndex 设置成 `消费消息数 - 1` 的值，比如有 5 条消息，这里就设置为 4

    `ok, failed`：ok 设置为消息数量，failed 设置为 0

  * `case RECONSUME_LATER`：消费失败

    `ackIndex = -1`：设置为 -1

  * `switch (this.defaultMQPushConsumer.getMessageModel())`：判断消费模式，默认是**集群模式**

  * `for (int i = ackIndex + 1; i < msgs.size(); i++)`：当消费失败时 ackIndex 为 -1，i 的起始值为 0，该消费任务内的**全部消息**都会尝试回退给服务器

  * `MessageExt msg`：提取一条消息

  * `boolean result = this.sendMessageBack(msg, context)`：**发送消息回退，同步发送**

  * `if (!result)`：回退失败的消息，将**消息的重试属性加 1**，并加入到回退失败的集合
  
  * `if (!msgBackFailed.isEmpty())`：回退失败集合不为空
  
  `consumeRequest.getMsgs().removeAll(msgBackFailed)`：将回退失败的消息从当前消费任务的 msgs 集合内移除
  
  `this.submitConsumeRequestLater()`：**回退失败的消息会再次提交消费任务**，延迟 5 秒钟后再次尝试消费
  
* `long offset = ...removeMessage(msgs)`：从 pq 中删除已经消费成功的消息，返回 offset
  
* `this...getOffsetStore().updateOffset()`：更新消费者本地该 mq 的**消费进度**



***



##### 消费请求

ConsumeRequest 是 ConsumeMessageConcurrentlyService 的内部类，是一个 Runnable 任务对象

成员变量：

* 分配到该消费任务的消息：

  ```java
  private final List<MessageExt> msgs;
  ```

* 消息队列：

  ```java
  private final ProcessQueue processQueue;	// 消息处理队列
  private final MessageQueue messageQueue;	// 消息队列
  ```

核心方法：

* run()：执行任务

  ```java
  public void run()
  ```

  * `if (this.processQueue.isDropped())`：条件成立说明该 queue 经过 rbl 算法分配到其他的 consumer
  * `MessageListenerConcurrently listener`：获取消息监听器
  * `ConsumeConcurrentlyContext context`：创建消费上下文对象
  * `defaultMQPushConsumerImpl.resetRetryAndNamespace()`：重置重试标记
    * `final String groupTopic`：获取当前消费者组的重试主题 `%RETRY%GroupName`
    * `for (MessageExt msg : msgs)`：遍历所有的消息
    * `String retryTopic = msg.getProperty(...)`：原主题，一般消息没有该属性，只有被重复消费的消息才有
    * `if (retryTopic != null && groupTopic.equals(...))`：条件成立说明该消息是被重复消费的消息
    * `msg.setTopic(retryTopic)`：将被**重复消费的消息主题修改回原主题**
  * `if (ConsumeMessageConcurrentlyService...hasHook())`：前置处理
  * `boolean hasException = false`：消费过程中，是否向外抛出异常
  * `MessageAccessor.setConsumeStartTimeStamp()`：给每条消息设置消费开始时间
  * `status = listener.consumeMessage(Collections.unmodifiableList(msgs), context)`：**消费消息**
  * `if (ConsumeMessageConcurrentlyService...hasHook())`：后置处理
  * `...processConsumeResult(status, context, this)`：**处理消费结果**



****



#### 顺序消费

##### 成员属性

ConsumeMessageOrderlyService 负责顺序消费服务

成员变量：

* 消息监听器：封装处理消息的逻辑，该监听器由开发者实现，并注册到 defaultMQPushConsumer

  ```java
  private final MessageListenerOrderly messageListener;
  ```

* 消费属性：

  ```java
  private final BlockingQueue<Runnable> consumeRequestQueue;	// 消费任务队列
  private final String consumerGroup;							// 消费者组
  private volatile boolean stopped = false;					// 消费停止状态
  ```

* 线程池：

  ```java
  private final ThreadPoolExecutor consumeExecutor;				// 消费任务线程池
  private final ScheduledExecutorService scheduledExecutorService;// 调度线程池，延迟提交消费任务
  ```

* 队列锁：消费者本地 MQ 锁，**确保本地对于需要顺序消费的 MQ 同一时间只有一个任务在执行**

  ```java
  private final MessageQueueLock messageQueueLock = new MessageQueueLock();
  ```

  ```java
  public class MessageQueueLock {
      private ConcurrentMap<MessageQueue, Object> mqLockTable = new ConcurrentHashMap<MessageQueue, Object>();
      // 获取本地队列锁对象
      public Object fetchLockObject(final MessageQueue mq) {
          Object objLock = this.mqLockTable.get(mq);
          if (null == objLock) {
              objLock = new Object();
              Object prevLock = this.mqLockTable.putIfAbsent(mq, objLock);
              if (prevLock != null) {
                  objLock = prevLock;
              }
          }
          return objLock;
      }
  }
  ```

  已经获取了 Broker 端该 Queue 的独占锁，为什么还要获取本地队列锁对象？（这里我也没太懂，先记录下来，本地多线程？）

  * Broker queue 占用锁的角度是 Client 占用，Client 从 Broker 的某个占用了锁的 queue 拉取下来消息以后，将消息存储到消费者本地的 ProcessQueue 中，快照对象的 consuming 属性置为 true，表示本地的队列正在消费处理中
  * ProcessQueue  调用 takeMessages 方法时会获取下一批待处理的消息，获取不到会修改 `consuming = false`，本消费任务马上停止。
  * 如果此时 Pull 再次拉取一批当前 ProcessQueue  的 msg，会再次向顺序消费服务提交消费任务，此时需要本地队列锁对象同步本地线程



***



##### 成员方法

* start()：启动消费服务，DefaultMQPushConsumerImpl 启动时会调用该方法

  ```java
  public void start()
  ```

  * `this.scheduledExecutorService.scheduleAtFixedRate()`：提交锁续约任务，延迟 1 秒执行，周期为 20 秒钟
  * `ConsumeMessageOrderlyService.this.lockMQPeriodically()`：**锁续约任务**
    * `this.defaultMQPushConsumerImpl.getRebalanceImpl().lockAll()`：对消费者的所有队列进行续约

* submitConsumeRequest()：**提交消费任务请求**

  ```java
  // 参数：true 表示创建消费任务并提交，false不创建消费任务，说明消费者本地已经有消费任务在执行了
  public void submitConsumeRequest(...., final boolean dispathToConsume) {
      if (dispathToConsume) {
          // 当前进程内不存在 顺序消费任务，创建新的消费任务，【提交到消费任务线程池】
          ConsumeRequest consumeRequest = new ConsumeRequest(processQueue, messageQueue);
          this.consumeExecutor.submit(consumeRequest);
      }
  }
  ```

* processConsumeResult()：消费结果处理

  ```java
  // 参数1：msgs 本轮循环消费的消息集合    					参数2：status  消费状态
  // 参数3：context 消费上下文 							参数4：消费任务
  // 返回值：boolean 决定是否继续循环处理pq内的消息
  public boolean processConsumeResult(final List<MessageExt> msgs, final ConsumeOrderlyStatus status, final ConsumeOrderlyContext context, final ConsumeRequest consumeRequest)
  ```

  * `if (context.isAutoCommit()) `：默认自动提交

  * `switch (status)`：根据消费状态进行不同的处理

  * `case SUCCESS`：消费成功

    `commitOffset = ...commit()`：调用 pq 提交方法，会将本次循环处理的消息从顺序消费 map 删除，并且返回消息进度

  * `case SUSPEND_CURRENT_QUEUE_A_MOMENT`：挂起当前队列

    `consumeRequest.getProcessQueue().makeMessageToConsumeAgain(msgs)`：**回滚消息**

    * `for (MessageExt msg : msgs)`：遍历所有的消息
    * `this.consumingMsgOrderlyTreeMap.remove(msg.getQueueOffset())`：从顺序消费临时容器中移除
    * `this.msgTreeMap.put(msg.getQueueOffset(), msg)`：添加到消息容器

  * `this.submitConsumeRequestLater()`：再次提交消费任务，1 秒后执行

  * `continueConsume = false`：设置为 false，**外层会退出本次的消费任务**

  * `this.defaultMQPushConsumerImpl.getOffsetStore().updateOffset(...)`：更新本地消费进度



****



##### 消费请求

ConsumeRequest 是 ConsumeMessageOrderlyService 的内部类，是一个 Runnable 任务对象

核心方法：

* run()：执行任务

  ```java
  public void run()
  ```

  * `final Object objLock`：获取本地锁对象

  * `synchronized (objLock)`：本地队列锁，确保每个 MQ 的消费任务只有一个在执行，**确保顺序消费**

  * `if(.. || (this.processQueue.isLocked() && !this.processQueue.isLockExpired())))`：当前队列持有分布式锁，并且锁未过期，持锁时间超过 30 秒算过期

  * `final long beginTime`：消费开始时间

  * `for (boolean continueConsume = true; continueConsume; )`：根据是否继续消费的标记判断是否继续

  * `final int consumeBatchSize`：获取每次循环处理的消息数量，一般是 1

  * `List<MessageExt> msgs = this...takeMessages(consumeBatchSize)`：到**处理队列获取一批消息**

  * `if (!msgs.isEmpty())`：获取到了待消费的消息

    `final ConsumeOrderlyContext context`：创建消费上下文对象

    `this.processQueue.getLockConsume().lock()`：**获取 lockConsume 锁**，与 RBL 线程同步使用

    `status = messageListener.consumeMessage(...)`：监听器处理消息 

    `this.processQueue.getLockConsume().unlock()`：**释放 lockConsume 锁**

    `if (null == status)`：处理消息状态返回 null，设置状态为挂起当前队列

    `continueConsume = ...processConsumeResult()`：消费结果处理

  * `else`：获取到的消息是空

    `continueConsume = false`：结束任务循环

  * `else`：当前队列未持有分布式锁，或者锁过期

    `ConsumeMessageOrderlyService.this.tryLockLaterAndReconsume()`：重新提交任务，根据是否获取到队列锁，选择延迟 10 毫秒或者 300 毫秒



***

### 生产消费

生产流程：

* 首先获取当前消息主题的发布信息，获取不到去 Namesrv 获取（默认有 TBW102），并将获取的到的路由数据转化为发布数据，**创建 MQ 队列在多个 Broker 组**（一组代表一主多从的 Broker 架构），客户端实例同样更新订阅数据，创建 MQ 队列，放入负载均衡服务 topicSubscribeInfoTable 中
* 然后从发布数据中选择一个 MQ 队列发送消息
* Broker 端通过 SendMessageProcessor 对发送的消息进行持久化处理，存储到 CommitLog。将重试次数过多的消息加入**死信队列**，将延迟消息的主题和队列修改为调度主题和调度队列 ID
* Broker 启动 ScheduleMessageService 服务会为每个延迟级别创建一个延迟任务，让延迟消息得到有效的处理，将到达交付时间的消息修改为原始主题的原始 ID 存入 CommitLog，消费者就可以进行消费了

消费流程：

* 消息消费队列 ConsumerQueue 存储消息在 CommitLog 的索引，消费者通过该队列来读取消息实体内容，一个 MQ 就对应一个 CQ
* 首先通过负载均衡服务，将分配到当前消费者实例的 MQ 创建 PullRequest，并放入 PullMessageService 的本地阻塞队列内
* PullMessageService 循环从阻塞队列获取请求对象，发起拉消息请求，并创建 PullCallback 回调对象，将正常拉取的消息**提交到消费任务线程池**，并设置请求的下一次拉取位点，重新放入阻塞队列，形成闭环
* 消费任务服务对消费失败的消息进行回退，通过内部生产者实例发送回退消息，回退失败的消息会再次提交消费任务重新消费
* Broker 端对拉取消息的请求进行处理（processRequestCommand），查询成功将消息放入响应体，通过 Netty 写回客户端，当 `pullRequest.offset == queue.maxOffset` 说明该队列已经没有需要获取的消息，将请求放入长轮询集合等待有新消息
* PullRequestHoldService 负责长轮询，每 5 秒遍历一次长轮询集合，将满足条件的 PullRequest 再次提交到线程池内处理







***







# Zookeeper
