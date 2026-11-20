---
title: "Sleuth 链路追踪"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Sleuth, system]
summary: "Spring Cloud Sleuth 提供了一套完整的分布式请求链路跟踪的解决方案，并且兼容支持了 zipkin"
private: false
---

### Sleuth

#### 基本介绍

Spring Cloud Sleuth 提供了一套完整的分布式请求链路跟踪的解决方案，并且兼容支持了 zipkin

在微服务框架中，一个客户端发起的请求在后端系统中会经过多次不同的服务节点调用来协同产生最后的请求结果，形成一条复杂的分布式服务调用链路，链路中的任何一环出现高延时或错误都会引起整个请求最后的失败，所以需要链路追踪



Sleuth 官网：https://github.com/spring-cloud/spring-cloud-sleuth

zipkin 下载地址：https://repo1.maven.org/maven2/io/zipkin/java/zipkin-server/



***



#### 链路监控

Sleuth 负责跟踪整理，zipkin 负责可视化展示

```bash
java -jar zipkin-server-2.12.9-exec.jar # 启动 zipkin 
```

访问 http://localhost:9411/zipkin/ 展示交互界面

一条请求链路通过 Trace ID 唯一标识，Span 标识发起的请求信息

* Trace：类似于树结构的 Span 集合，表示一条调用链路，存在唯一 ID 标识

* Span：表示调用链路来源，通俗的理解 Span 就是一次请求信息，各个 Span 通过 ParentID 关联起来

服务生产者模块：

* 引入 pom 依赖：

  ```xml
  <!--包含了sleuth+zipkin-->
  <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-zipkin</artifactId>
  </dependency>
  ```

* application.yml：

  ```yaml
  server:
    port: 8001
  
  spring:
    application:
      name: cloud-payment-service
    zipkin:
      base-url: http://localhost:9411
    sleuth:
      sampler:
        #采样率值介于 0 到 1 之间，1 则表示全部采集
        probability: 1
  ```

* 业务类：

  ```java
  @GetMapping("/payment/zipkin")
  public String paymentZipkin() {
      return "hi ,i'am paymentzipkin server fall back，welcome to seazean";
  }
  ```

服务消费者模块：

* application.yml：

  ```yaml
  server:
    port: 80
  
  # 微服务名称
  spring:
    application:
      name: cloud-order-service
    zipkin:
      base-url: http://localhost:9411
    sleuth:
      sampler:
        probability: 1
  ```

* 业务类：

  ```java
  @GetMapping("/comsumer/payment/zipkin")
  public String paymentZipKin() {
      String result = restTemplate.getForObject("http://localhost:8001" + "/payment/zipkin/", String.class);
      return result;
  }
  ```






****
