---
title: "基本介绍"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 基本介绍, system]
summary: "消息队列是一种先进先出的数据结构，常见的应用场景："
private: false
---

## 基本介绍

### 消息队列

#### 应用场景

消息队列是一种先进先出的数据结构，常见的应用场景：

* 应用解耦：系统的耦合性越高，容错性就越低

  实例：用户创建订单后，耦合调用库存系统、物流系统、支付系统，任何一个子系统出了故障都会造成下单异常，影响用户使用体验。使用消息队列解耦合，比如物流系统发生故障，需要几分钟恢复，将物流系统要处理的数据缓存到消息队列中，用户的下单操作正常完成。等待物流系统正常后处理存在消息队列中的订单消息即可，终端系统感知不到物流系统发生过几分钟故障

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/RocketMQ-解耦.png)

* 流量削峰：应用系统如果遇到系统请求流量的瞬间猛增，有可能会将系统压垮，使用消息队列可以将大量请求缓存起来，分散到很长一段时间处理，这样可以提高系统的稳定性和用户体验

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/RocketMQ-流量削峰.png)

* 数据分发：让数据在多个系统更加之间进行流通，数据的产生方不需要关心谁来使用数据，只需要将数据发送到消息队列，数据使用方直接在消息队列中直接获取数据

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/RocketMQ-数据分发.png)





参考视频：https://www.bilibili.com/video/BV1L4411y7mn



***



#### 技术选型

RocketMQ 对比 Kafka 的优点

* 支持 Pull和 Push 两种消息模式

- 支持延时消息、死信队列、消息重试、消息回溯、消息跟踪、事务消息等高级特性
- 对消息可靠性做了改进，**保证消息不丢失并且至少消费一次**，与 Kafka 一样是先写 PageCache 再落盘，并且数据有多副本
- RocketMQ 存储模型是所有的 Topic 都写到同一个 Commitlog 里，是一个 append only 操作，在海量 Topic 下也能将磁盘的性能发挥到极致，并且保持稳定的写入时延。Kafka 的吞吐非常高（零拷贝、操作系统页缓存、磁盘顺序写），但是在多 Topic 下时延不够稳定（顺序写入特性会被破坏从而引入大量的随机 I/O），不适合实时在线业务场景
- 经过阿里巴巴多年双 11 验证过、可以支持亿级并发的开源消息队列

Kafka 比 RocketMQ 吞吐量高：

* Kafka 将 Producer 端将多个小消息合并，采用异步批量发送的机制，当发送一条消息时，消息并没有发送到 Broker 而是缓存起来，直接向业务返回成功，当缓存的消息达到一定数量时再批量发送

* 减少了网络 I/O，提高了消息发送的性能，但是如果消息发送者宕机，会导致消息丢失，降低了可靠性
* RocketMQ 缓存过多消息会导致频繁 GC，并且为了保证可靠性没有采用这种方式

Topic 的 partition 数量过多时，Kafka 的性能不如 RocketMQ：

* 两者都使用文件存储，但是 Kafka 是一个分区一个文件，Topic 过多时分区的总量也会增加，过多的文件导致对消息刷盘时出现文件竞争磁盘，造成性能的下降。**一个分区只能被一个消费组中的一个消费线程进行消费**，因此可以同时消费的消费端也比较少

* RocketMQ 所有队列都存储在一个文件中，每个队列存储的消息量也比较小，因此多 Topic 的对 RocketMQ 的性能的影响较小



****



### 安装测试

安装需要 Java 环境，下载解压后进入安装目录，进行启动：

* 启动 NameServer

  ```sh
  # 1.启动 NameServer
  nohup sh bin/mqnamesrv &
  # 2.查看启动日志
  tail -f ~/logs/rocketmqlogs/namesrv.log
  ```

  RocketMQ 默认的虚拟机内存较大，需要编辑如下两个配置文件，修改 JVM 内存大小

  ```shell
  # 编辑runbroker.sh和runserver.sh修改默认JVM大小
  vi runbroker.sh
  vi runserver.sh
  ```

  参考配置：JAVA_OPT="${JAVA_OPT} -server -Xms256m -Xmx256m -Xmn128m -XX:MetaspaceSize=128m  -XX:MaxMetaspaceSize=320m"

* 启动 Broker

  ```sh
  # 1.启动 Broker
  nohup sh bin/mqbroker -n localhost:9876 autoCreateTopicEnable=true &
  # 2.查看启动日志
  tail -f ~/logs/rocketmqlogs/broker.log 
  ```

* 发送消息：

  ```sh
  # 1.设置环境变量
  export NAMESRV_ADDR=localhost:9876
  # 2.使用安装包的 Demo 发送消息
  sh bin/tools.sh org.apache.rocketmq.example.quickstart.Producer
  ```

* 接受消息：

  ```sh
  # 1.设置环境变量
  export NAMESRV_ADDR=localhost:9876
  # 2.接收消息
  sh bin/tools.sh org.apache.rocketmq.example.quickstart.Consumer

* 关闭 RocketMQ：

  ```sh
  # 1.关闭 NameServer
  sh bin/mqshutdown namesrv
  # 2.关闭 Broker
  sh bin/mqshutdown broker



***



### 相关概念

RocketMQ 主要由 Producer、Broker、Consumer 三部分组成，其中 Producer 负责生产消息，Consumer 负责消费消息，Broker 负责存储消息，NameServer 负责管理 Broker

* 代理服务器（Broker Server）：消息中转角色，负责**存储消息、转发消息**。在 RocketMQ 系统中负责接收从生产者发送来的消息并存储、同时为消费者的拉取请求作准备，也存储消息相关的元数据，包括消费者组、消费进度偏移和主题和队列消息等
* 名字服务（Name Server）：充当**路由消息**的提供者。生产者或消费者能够通过名字服务查找各主题相应的 Broker IP 列表
* 消息生产者（Producer）：负责**生产消息**，把业务应用系统里产生的消息发送到 Broker 服务器。RocketMQ 提供多种发送方式，同步发送、异步发送、顺序发送、单向发送，同步和异步方式均需要 Broker 返回确认信息，单向发送不需要；可以通过 MQ 的负载均衡模块选择相应的 Broker 集群队列进行消息投递，投递的过程支持快速失败并且低延迟
* 消息消费者（Consumer）：负责**消费消息**，一般是后台系统负责异步消费，一个消息消费者会从 Broker 服务器拉取消息、并将其提供给应用程序。从用户应用的角度而提供了两种消费形式：
  * 拉取式消费（Pull Consumer）：应用通主动调用 Consumer 的拉消息方法从 Broker 服务器拉消息，主动权由应用控制，一旦获取了批量消息，应用就会启动消费过程
  * 推动式消费（Push Consumer）：该模式下 Broker 收到数据后会主动推送给消费端，实时性较高
* 生产者组（Producer Group）：同一类 Producer 的集合，发送同一类消息且发送逻辑一致。如果发送的是事务消息且原始生产者在发送之后崩溃，**则 Broker 服务器会联系同一生产者组的其他生产者实例以提交或回溯消费**
* 消费者组（Consumer Group）：同一类 Consumer 的集合，消费者实例必须订阅完全相同的 Topic，消费同一类消息且消费逻辑一致。消费者组使得在消息消费方面更容易的实现负载均衡和容错。RocketMQ 支持两种消息模式：
  *  集群消费（Clustering）：相同 Consumer Group 的每个 Consumer 实例平均分摊消息
  *  广播消费（Broadcasting）：相同 Consumer Group 的每个 Consumer 实例都接收全量的消息

每个 Broker 可以存储多个 Topic 的消息，每个 Topic 的消息也可以分片存储于不同的 Broker，Message Queue（消息队列）是用于存储消息的物理地址，每个 Topic 中的消息地址存储于多个 Message Queue 中

* 主题（Topic）：表示一类消息的集合，每个主题包含若干条消息，每条消息只属于一个主题，是 RocketMQ 消息订阅的基本单位

* 消息（Message）：消息系统所传输信息的物理载体，生产和消费数据的最小单位，每条消息必须属于一个主题。RocketMQ 中每个消息拥有唯一的 Message ID，且可以携带具有业务标识的 Key，系统提供了通过 Message ID 和 Key 查询消息的功能

* 标签（Tag）：为消息设置的标志，用于同一主题下区分不同类型的消息。标签能够有效地保持代码的清晰度和连贯性，并优化 RocketMQ 提供的查询系统，消费者可以根据 Tag 实现对不同子主题的不同消费逻辑，实现更好的扩展性

* 普通顺序消息（Normal Ordered Message）：消费者通过同一个消息队列（Topic 分区）收到的消息是有顺序的，不同消息队列收到的消息则可能是无顺序的

* 严格顺序消息（Strictly Ordered Message）：消费者收到的所有消息均是有顺序的



官方文档：https://github.com/apache/rocketmq/tree/master/docs/cn（基础知识部分的笔记参考官方文档编写）





****
