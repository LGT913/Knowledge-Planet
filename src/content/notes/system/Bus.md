---
title: "Bus"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Bus, system]
summary: "Spring Cloud Bus 能管理和传播分布式系统间的消息，就像分布式执行器，可用于广播状态更改、事件推送、微服务间的通信通道等"
private: false
---

## 服务消息

### Bus

#### 基本介绍

Spring Cloud Bus 能管理和传播分布式系统间的消息，就像分布式执行器，可用于广播状态更改、事件推送、微服务间的通信通道等

消息总线：在微服务架构的系统中，通常会使用轻量级的消息代理来构建一个共用的消息主题，并让系统中所有微服务实例都连接上来。由于该主题中产生的消息会被所有实例监听和消费，所以称为消息总线

基本原理：ConfigClient 实例都监听 MQ 中同一个 Topic（默认 springCloudBus)，当一个服务刷新数据时，会把信息放入 Topic 中，这样其它监听同一 Topic 的服务就能得到通知，然后去更新自身的配置



****



#### 全局广播

利用消息总线接触一个服务端 ConfigServer 的 `/bus/refresh` 断点，从而刷新所有客户端的配置

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Cloud-Bus全局广播架构.png" alt="Cloud-Bus全局广播架构" style="zoom:67%;" />

改造 ConfigClient：

* 引入 MQ 的依赖：

  ```xml
  <!--添加消息总线RabbitMQ支持-->
  <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-bus-amqp</artifactId>
  </dependency>
  ```

* yml 文件添加 MQ 信息：

  ```yaml
  server:
    port: 3344
  
  spring:
    application:
      name:  config-client #注册进Eureka服务器的微服务名
    cloud:
    # rabbitmq相关配置
    rabbitmq:
      host: localhost
      port: 5672
      username: guest
      password: guest
  
  # rabbitmq相关配置,暴露bus刷新配置的端点
  management:
    endpoints: # 暴露bus刷新配置的端点
      web:
        exposure:
          include: 'bus-refresh'
  ```

* 只需要调用一次 `curl -X POST "http://localhost:3344/actuator/bus-refresh`，可以实现全局广播



***



#### 定点通知

动态刷新情况下，只通知指定的微服务，比如只通知 3355 服务，不通知 3366，指定具体某一个实例生效，而不是全部

公式：`http://localhost:port/actuator/bus-refresh/{destination}`

/bus/refresh 请求不再发送到具体的服务实例上，而是发给 Config Server 并通过 destination 参数类指定需要更新配置的服务或实例

![Cloud-Bus工作流程](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Cloud-Bus工作流程.png)





****
