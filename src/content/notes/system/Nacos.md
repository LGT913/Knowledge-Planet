---
title: "Nacos 注册与配置"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Nacos, system]
summary: "Spring Cloud Alibaba 致力于提供微服务开发的一站式解决方案，此项目包含开发分布式应用微服务的必需组件，方便开发者通过 Spring Cloud 编程模型轻松使用这些组件来开发分布式应用服务"
private: false
---

## Alibaba

Spring Cloud Alibaba 致力于提供微服务开发的一站式解决方案，此项目包含开发分布式应用微服务的必需组件，方便开发者通过 Spring Cloud 编程模型轻松使用这些组件来开发分布式应用服务

- 服务限流降级：默认支持 WebServlet、WebFlux、OpenFeign、RestTemplate、Spring Cloud Gateway、Zuul、Dubbo 和 RocketMQ 限流降级功能的接入，可以在运行时通过控制台实时修改限流降级规则，还支持查看限流降级 Metrics 监控。
- 服务注册与发现：适配 Spring Cloud 服务注册与发现标准，默认集成了 Ribbon 的支持
- 分布式配置管理：支持分布式系统中的外部化配置，配置更改时自动刷新
- 消息驱动能力：基于 Spring Cloud Stream 为微服务应用构建消息驱动能力
- 分布式事务：使用 @GlobalTransactional 注解， 高效并且对业务零侵入地解决分布式事务问题
- 阿里云对象存储：阿里云提供的海量、安全、低成本、高可靠的云存储服务
- 分布式任务调度：提供秒级、精准、高可靠、高可用的定时（基于 Cron 表达式）任务调度服务。同时提供分布式的任务执行模型，如网格任务。网格任务支持海量子任务均匀分配到所有 Worker（schedulerx-client）上执行

官方文档：https://github.com/alibaba/spring-cloud-alibaba/blob/master/README-zh.md

官方手册：https://spring-cloud-alibaba-group.github.io/github-pages/greenwich/spring-cloud-alibaba.html

### Nacos

#### 基本介绍

Nacos 全称 Dynamic Naming and Configuration Service，一个更易于构建云原生应用的动态服务发现、配置管理和服务的管理平台，Nacos = Eureka + Config + Bus

下载地址：https://github.com/alibaba/nacos/releases

启动命令：命令运行成功后直接访问 http://localhost:8848/nacos，默认账号密码都是 nacos

```bash
startup.cmd -m standalone # standalone 代表着单机模式运行，非集群模式
```

关闭命令：

```bash
shutdown.cmd
```

注册中心对比：C 一致性，A 可用性，P 分区容错性

| 注册中心  | CAP 模型 | 控制台管理 |
| :-------: | :------: | :--------: |
|  Eureka   |    AP    |    支持    |
| Zookeeper |    CP    |   不支持   |
|  Consul   |    CP    |    支持    |
|   Nacos   |    AP    |    支持    |

切换模式：`curl -X PUT '$NACOS_SERVER:8848/nacos/v1/ns/operator/switches?entry=serverMode&value=CP`



官网：https://nacos.io



****



#### 注册中心

Nacos 作为服务注册中心

服务提供者：

* 引入 pom 依赖：

  ```xml
  <dependency>
      <groupId>com.alibaba.cloud</groupId>
      <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
  </dependency>
  ```

* application.yml：

  ```yaml
  server:
    port: 9001
  
  spring:
    application:
      name: nacos-payment-provider
    cloud:
      nacos:
        discovery:
          server-addr: localhost:8848 #配置Nacos地址，注册到Nacos
  # 做监控需要把这个全部暴露出来
  management:
    endpoints:
      web:
        exposure:
          include: '*'
  ```

* 主启动类：注解是 EnableDiscoveryClient

  ```java
  @EnableDiscoveryClient
  @SpringBootApplication
  public class PaymentMain9001 {
      public static void main(String[] args) {
          SpringApplication.run(PaymentMain9001.class, args);
      }
  }
  ```

* Controller：

  ```java
  @RestController
  public class PaymentController {
      @Value("${server.port}")
      private String serverPort;
  
      @GetMapping(value = "/payment/nacos/{id}")
      public String getPayment(@PathVariable("id") Integer id) {
          return "nacos registry, serverPort: " + serverPort + "\t id" + id;
      }
  }
  ```

* 管理后台服务：

  ![Cloud-Nacos服务列表](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Cloud-Nacos服务列表.png)

* 新建一个模块端口是 9002，其他与 9001 服务一样，nacos-payment-provider 的实例数就变为 2

服务消费者：

* application.yml：

  ```yaml
  server:
    port: 83
  
  spring:
    application:
      name: nacos-order-consumer
    cloud:
      nacos:
        discovery:
          server-addr: localhost:8848
  
  # 消费者将要去访问的微服务名称(注册成功进nacos的微服务提供者)
  service-url:
    nacos-user-service: http://nacos-payment-provider
  ```

* 主启动类：

  ```java
  @SpringBootApplication
  @EnableDiscoveryClient
  public class OrderNacosMain83 {
      public static void main(String[] args) {
          SpringApplication.run(OrderNacosMain83.class, args);
      }
  }
  ```

* 业务类：

  ```java
  @Configuration
  public class ApplicationContextBean {
      @Bean
      @LoadBalanced // 生产者集群状态下，必须添加，防止找不到实例
      public RestTemplate getRestTemplate() {
          return new RestTemplate();
      }
  }
  ```

  ```java
  @RestController
  @Slf4j
  public class OrderNacosController {
      @Resource
      private RestTemplate restTemplate;
  	// 从配置文件中读取 URL
      @Value("${service-url.nacos-user-service}")
      private String serverURL;
  
      @GetMapping("/consumer/payment/nacos/{id}")
      public String paymentInfo(@PathVariable("id") Long id) {
          String result = restTemplate.getForObject(serverURL + "/payment/nacos/" + id, String.class);
          return result;
      }
  }
  ```

  

***



#### 配置中心

##### 基础配置

把配置文件写进 Nacos，然后再用 Nacos 做 config 这样的功能，直接从 Nacos 上抓取服务的配置信息

在 Nacos 中，dataId 的完整格式如下 `${prefix}-${spring.profiles.active}.${file-extension}`

* `prefix`：默认为 `spring.application.name` 的值，也可以通过配置项 `spring.cloud.nacos.config.prefix` 来配置
* `spring.profiles.active`：当前环境对应的 profile，当该值为空时，dataId 的拼接格式变成 `${prefix}.${file-extension}`
* `file-exetension`：配置内容的数据格式，可以通过配置项 `spring.cloud.nacos.config.file-extension` 来配置，目前只支持 properties 和 yaml 类型（不是 yml）

构建流程：

* 引入 pom 依赖：

  ```xml
  <dependency>
      <groupId>com.alibaba.cloud</groupId>
      <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
  </dependency>
  ```

* 配置两个 yml 文件：配置文件的加载是存在优先级顺序的，bootstrap 优先级高于 application

  bootstrap.yml：全局配置

  ```yaml
  # nacos配置
  server:
    port: 3377
  
  spring:
    application:
      name: nacos-config-client
    cloud:
      nacos:
        discovery:
          server-addr: localhost:8848 #Nacos服务注册中心地址
        config:
          server-addr: localhost:8848 #Nacos作为配置中心地址
          file-extension: yaml #指定yaml格式的配置
  
  # ${spring.application.name}-${spring.profile.active}.${spring.cloud.nacos.config.file-extension}
  ```

  application.yml：服务独立配置，表示服务要去配置中心找名为 nacos-config-client-dev.yaml 的文件

  ```yaml
  spring:
    profiles:
      active: dev # 表示开发环境
  ```

* 主启动类：

  ```java
  @SpringBootApplication
  @EnableDiscoveryClient
  public class NacosConfigClientMain3377 {
      public static void main(String[] args) {
          SpringApplication.run(NacosConfigClientMain3377.class, args);
      }
  }
  ```

* 业务类：@RefreshScope 注解使当前类下的配置支持 Nacos 的动态刷新功能

  ```java
  @RestController
  @RefreshScope
  public class ConfigClientController {
      @Value("${config.info}")
      private String configInfo;
  
      @GetMapping("/config/info")
      public String getConfigInfo() {
          return configInfo;
      }
  }
  ```

* 新增配置，然后访问 http://localhost:3377/config/info

  ![Cloud-Nacos新增配置](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Cloud-Nacos新增配置.png)



***



##### 分类配置

分布式开发中的多环境多项目管理问题，Namespace 用于区分部署环境，Group 和 DataID 逻辑上区分两个目标对象

![Cloud-Nacos配置说明](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Cloud-Nacos配置说明.png)

Namespace 默认 public，主要用来实现隔离，图示三个开发环境

Group 默认是 DEFAULT_GROUP，Group 可以把不同的微服务划分到同一个分组里面去



***



##### 加载配置

DataID 方案：指定 `spring.profile.active` 和配置文件的 DataID 来使不同环境下读取不同的配置

Group 方案：通过 Group 实现环境分区，在 config 下增加一条 Group 的配置即可

Namespace 方案：

```yaml
server:
  port: 3377

spring:
  application:
    name: nacos-config-client
  cloud:
    nacos:
      discovery:
        server-addr: localhost:8848 #Nacos服务注册中心地址
      config:
        server-addr: localhost:8848 #Nacos作为配置中心地址
        file-extension: yaml #指定yaml格式的配置
        group: DEV_GROUP
        namespace: 95d44530-a4a6-4ead-98c6-23d192cee298
```

![Cloud-Nacos命名空间](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Cloud-Nacos命名空间.png)



****



#### 集群架构

集群部署参考官方文档，Nacos 支持的三种部署模式：

- 单机模式：用于测试和单机使用
- 集群模式：用于生产环境，确保高可用
- 多集群模式：用于多数据中心场景

集群部署文档：https://nacos.io/zh-cn/docs/v2/guide/admin/cluster-mode-quick-start.html

默认 Nacos 使用嵌入式数据库 derby 实现数据的存储，重启 Nacos 后配置文件不会消失，但是多个 Nacos 节点数据存储存在一致性问题，每个 Nacos 都有独立的嵌入式数据库，所以 Nacos 采用了集中式存储的方式来支持集群化部署，目前只支持 MySQL 的存储

Windows 下 Nacos 切换 MySQL 存储：

* 在 Nacos 安装目录的 conf 目录下找到一个名为 `nacos-mysql.sql` 的脚本并执行

* 在 conf 目录下找到 `application.properties`，增加如下数据

  ```properties
  spring.datasource.platform=mysql
   
  db.num=1
  db.url.0=jdbc:mysql://127.0.0.1:3306/nacos_config?characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true
  db.user=username
  db.password：[已隐藏]
  ```

* 重新启动 Nacos，可以看到是个全新的空记录界面

Linux 参考：https://www.yuque.com/mrlinxi/pxvr4g/rnahsn#dPvMy





****
