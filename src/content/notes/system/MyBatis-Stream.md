---
title: "Stream"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Stream, system]
summary: "Spring Cloud Stream 是一个构建消息驱动微服务的框架，通过定义绑定器 Binder 作为中间层，实现了应用程序与消息中间件细节之间的隔离，屏蔽底层消息中间件的差异，降低切换成本，统一消息的编程模型"
private: false
---

### Stream

#### 基本介绍

Spring Cloud Stream 是一个构建消息驱动微服务的框架，通过定义绑定器 Binder 作为中间层，实现了应用程序与消息中间件细节之间的隔离，屏蔽底层消息中间件的差异，降低切换成本，统一消息的编程模型

Stream 中的消息通信方式遵循了发布订阅模式，Binder 可以生成 Binding 用来绑定消息容器的生产者和消费者，Binding 有两种类型 Input 和 Output，Input 对应于消费者（消费者从 Stream 接收消息），Output 对应于生产者（生产者从 Stream 发布消息）

![Cloud-Stream工作流程](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Cloud-Stream工作流程.png)

- Binder：连接中间件
- Channel：通道，是队列 Queue 的一种抽象，在消息通讯系统中实现存储和转发的媒介，通过 Channel 对队列进行配置
- Source、Sink：生产者和消费者



中文手册：https://m.wang1314.com/doc/webapp/topic/20971999.html



****



#### 基本使用

Binder 是应用与消息中间件之间的封装，目前实现了 Kafka 和 RabbitMQ 的 Binder，可以动态的改变消息类型（Kafka 的 Topic 和 RabbitMQ 的 Exchange），可以通过配置文件实现，常用注解如下：

* @Input：标识输入通道，接收的消息通过该通道进入应用程序
* @Output：标识输出通道，发布的消息通过该通道离开应用程序
* @StreamListener：监听队列，用于消费者队列的消息接收
* @EnableBinding：信道 Channel 和 Exchange 绑定

生产者发消息模块：

* 引入 pom 依赖：RabbitMQ

  ```xml
  <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-stream-rabbit</artifactId>
  </dependency>
  ```

* application.yml：

  ```yaml
  server:
    port: 8801
  
  spring:
    application:
      name: cloud-stream-provider
    cloud:
      stream:
        binders: # 在此处配置要绑定的rabbitmq的服务信息；
          defaultRabbit: # 表示定义的名称，用于于binding整合
            type: rabbit # 消息组件类型
            environment: # 设置rabbitmq的相关的环境配置
              spring:
                rabbitmq:
                  host: localhost
                  port: 5672
                  username: guest
                  password: guest
        bindings: # 服务的整合处理
          output: # 这个名字是一个通道的名称
            destination: studyExchange 		# 表示要使用的Exchange名称定义
            content-type: application/json	# 设置消息类型，本次为json，文本则设置“text/plain”
            binder: defaultRabbit 			# 设置要绑定的消息服务的具体设置
  
  eureka:
    client: # 客户端进行Eureka注册的配置
      service-url:
        defaultZone: http://localhost:7001/eureka,http://localhost:7002/eureka
    instance:
      lease-renewal-interval-in-seconds: 2 # 设置心跳的时间间隔（默认是30秒）
      lease-expiration-duration-in-seconds: 5 # 如果现在超过了5秒的间隔（默认是90秒）
      instance-id: send-8801.com  # 在信息列表时显示主机名称
      prefer-ip-address: true     # 访问的路径变为IP地址
  ```

* 主启动类：

  ```java
  @SpringBootApplication
  @EnableEurekaClient
  public class StreamMQMain8801 {
      public static void main(String[] args) {
          SpringApplication.run(StreamMQMain8801.class, args);
      }
  }
  ```

* 业务类：MessageChannel 的实例名必须是 output，否则无法启动

  ```java
  // 可以理解为定义消息的发送管道Source对应output(生产者)，Sink对应input(消费者)
  @EnableBinding(Source.class)
  // @Service：这里不需要，不是传统的controller调用service。这个service是和rabbitMQ打交道的
  // IMessageProvider 只有一个 send 方法的接口
  public class MessageProviderImpl implements IMessageProvider {
      @Resource
      private MessageChannel output; // 消息的发送管道
  
      @Override
      public String send() {
          String serial = UUID.randomUUID().toString();
  
          //创建消息，通过output这个管道向消息中间件发消息
          this.output.send(MessageBuilder.withPayload(serial).build());
          System.out.println("***serial: " + serial);
          return serial;
      }
  }
  ```

* Controller：

  ```java
  @RestController
  public class SendMessageController {
      @Resource
      private IMessageProvider messageProvider;
  
      @GetMapping(value = "/sendMessage")
      public String sendMessage() {
          return messageProvider.send();
      }
  }
  ```

消费者模块：8802 和 8803 两个消费者

* application.yml：只标注出与生产者不同的地方

  ```yaml
  server:
    port: 8802
  
  spring:
    application:
      name: cloud-stream-consumer
    cloud:
      stream:
        # ...
        bindings: # 服务的整合处理
          input: # 这个名字是一个通道的名称
            # ...
            binder: { defaultRabbit } # 设置要绑定的消息服务的具体设置
  
  eureka:
    # ...
    instance:
      # ...
      instance-id: receive-8802.com  # 在信息列表时显示主机名称
  ```

* Controller：

  ```java
  @Component
  @EnableBinding(Sink.class) // 理解为定义一个消息消费者的接收管道
  public class ReceiveMessageListener {
      @Value("${server.port}")
      private String serverPort;
  
      @StreamListener(Sink.INPUT) //输入源：作为一个消息监听者
      public void input(Message<String> message) {
          // 获取到消息
          String messageStr = message.getPayload();
          System.out.println("消费者1号，------->接收到的消息：" + messageStr + "\t port: " + serverPort);
      }
  }
  ```



****



#### 高级特性

重复消费问题：生产者 8801 发送一条消息后，8802 和 8803 会同时收到 8801 的消息

解决方法：微服务应用放置于同一个 group 中，能够保证消息只会被其中一个应用消费一次。不同的组是可以全面消费的（重复消费），同一个组内的多个消费者会发生竞争关系，只有其中一个可以消费

```yaml
bindings:
  input:
    destination: studyExchange
    content-type: application/json
    binder: { defaultRabbit }
    group: seazean	# 设置分组
```

消息持久化问题：

* 停止 8802/8803 并去除掉 8802 的分组 group: seazean，8801 先发送 4 条消息到 MQ
* 先启动 8802，无分组属性配置，后台没有打出来消息，消息丢失
* 再启动 8803，有分组属性配置，后台打印出来了 MQ 上的消息





*****
