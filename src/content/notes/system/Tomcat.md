---
title: "Tomcat 容器"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Tomcat, system]
summary: "服务器的概念非常的广泛，它可以指代一台特殊的计算机（相比普通计算机运行更快、负载更高、价格更贵），也可以指代用于部署网站的应用。我们这里说的服务器，其实是web服务器，或者应用服务器。它本质就是一个软件，一个应用。作用就是发布我们的应用（工"
private: false
---

## Tomcat

### 服务器

服务器的概念非常的广泛，它可以指代一台特殊的计算机（相比普通计算机运行更快、负载更高、价格更贵），也可以指代用于部署网站的应用。我们这里说的服务器，其实是web服务器，或者应用服务器。它本质就是一个软件，一个应用。作用就是发布我们的应用（工程），让用户可以通过浏览器访问我们的应用。

常见的应用服务器，请看下表：

| 服务器名称  | 说明                                                  |
| ----------- | ----------------------------------------------------- |
| weblogic    | 实现了 JavaEE 规范，重量级服务器，又称为 JavaEE 容器  |
| websphereAS | 实现了 JavaEE 规范，重量级服务器。                    |
| JBOSSAS     | 实现了 JavaEE 规范，重量级服务器，免费                |
| Tomcat      | 实现了 jsp/servlet 规范，是一个轻量级服务器，开源免费 |



***



### 基本介绍

#### Windows安装

下载地址：http://tomcat.apache.org/

目录结构详解：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Tomcat目录结构详解.png)



***



#### Linux安装

解压apache-tomcat-8.5.32.tar.gz。

防火墙设置

* 方式1：service iptables stop  关闭防火墙(不建议); 用到哪一个端口号就放行哪一个(80,8080,3306...)

* 方式2：放行8080 端口
  * 修改配置文件`cd /etc/sysconfig`-->`vi iptables`
    `-A INPUT -m state --state NEW -m tcp -p tcp --dport 8080 -j ACCEPT`
  * 重启加载防火墙或者重启防火墙
    `service iptables reload` 或者`service iptables restart`



***



#### 启动停止

Tomcat服务器的启动文件在二进制文件目录bin中：startup.bat，startup.sh

Tomcat服务器的停止文件也在二进制文件目录bin中：shutdown.bat，shutdown.sh  （推荐直接关闭控制台）

其中`.bat`文件是针对windows系统的运行程序，`.sh`文件是针对linux系统的运行程序。



***



#### 常见问题

* 启动一闪而过

  没有配置环境变量，配置上 JAVA_HOME 环境变量。

* Tomcat 启动后控制台输出乱码

  打开 `/conf/logging.properties`，设置 gbk `java.util.logging.ConsoleHandler.encoding = gbk`

* Address already in use : JVM_Bind：端口被占用，找到占用该端口的应用

  * 进程不重要：使用cmd命令：netstat -a -o 查看 pid  在任务管理器中结束占用端口的进程

  * 进程很重要：修改自己的端口号。修改的是 Tomcat 目录下`\conf\server.xml`中的配置。

    ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Tomcat-server.xml端口配置.png)
    
    

***



#### IDEA集成

Run -> Edit Configurations -> Templates -> Tomcat Server -> Local

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Tomcat-IDEA配置Tomcat.png)



***



### 发布应用

#### 虚拟目录

在 `server.xml` 的 `<Host>` 元素中加一个 `<Context path="" docBase=""/>` 元素

* `path`：访问资源URI，URI名称可以随便起，但是必须在前面加上一个/
* `docBase`：资源所在的磁盘物理地址



***



#### 虚拟主机

在`<Engine>`元素中添加一个`<Host name="" appBase="" unparkWARs="" autoDeploy="" />`，其中：

* `name`：指定主机的名称
* `appBase`：当前主机的应用发布目录
* `unparkWARs`：启动时是否自动解压war包
* `autoDeploy`：是否自动发布

```xml
<Host name="www.itcast.cn" appBase="D:\itcastapps" unpackWARs="true" autoDeploy="true"/>

<Host name="www.itheima.com" appBase="D:\itheimaapps" unpackWARs="true" autoDeploy="true"/>
```



****



#### IDEA部署

* 新建工程
  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Tomcat-IEDA新建工程.png" style="zoom:67%;" />

* 发布工程
  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Tomcat-IDEA发布工程.png)

* Run 

  

***



#### IDEA发布

把资源移动到 Tomcat 工程下 web 目录中，两种访问方式

* 直接访问：http://localhost:8080/Tomcat/login/login.html

* 在 web.xml 中配置默认主页

  ```xml
  <welcome-file-list>
      <welcome-file>/默认主页</welcome-file>
  </welcome-file-list>
  ```





****



### 执行原理

#### 整体架构

Tomcat 核心组件架构图如下所示：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Tomcat-核心组件架构图.png)

组件介绍：

- GlobalNamingResources：实现 JNDI，指定一些资源的配置信息
- Server：Tomcat 是一个 Servlet 容器，一个 Tomcat 对应一个 Server，一个 Server 可以包含多个 Service
- Service：核心服务是 Catalina，用来对请求进行处理，一个 Service 包含多个 Connector 和一个 Container
- Connector：连接器，负责处理客户端请求，解析不同协议及 I/O 方式
- Executor：线程池
- Container：容易包含 Engine，Host，Context，Wrapper 等组件
- Engine：服务交给引擎处理请求，Container 容器中顶层的容器对象，一个 Engine 可以包含多个 Host 主机
- Host：Engine 容器的子容器，一个 Host 对应一个网络域名，一个 Host 包含多个 Context
- Context：Host 容器的子容器，表示一个 Web 应用
- Wrapper：Tomcat 中的最小容器单元，表示 Web 应用中的 Servlet

核心类库：

* Coyote：Tomcat 连接器的名称，封装了底层的网络通信，为 Catalina 容器提供了统一的接口，使容器与具体的协议以及 I/O 解耦
* EndPoint：Coyote 通信端点，即通信监听的接口，是 Socket 接收和发送处理器，是对传输层的抽象，用来实现 TCP/IP 协议
* Processor ： Coyote 协议处理接口，用来实现 HTTP 协议，Processor 接收来自 EndPoint 的 Socket，读取字节流解析成 Tomcat 的 Request 和 Response 对象，并通过 Adapter 将其提交到容器处理，Processor 是对应用层协议的抽象
* CoyoteAdapter：适配器，连接器调用 CoyoteAdapter 的 sevice 方法，传入的是 TomcatRequest 对象，CoyoteAdapter 负责将TomcatRequest 转成 ServletRequest，再调用容器的 service 方法



参考文章：https://www.jianshu.com/p/7c9401b85704

参考文章：https://www.yuque.com/yinhuidong/yu877c/ktq82e



***



#### 启动过程

Tomcat 的启动入口是 Bootstrap#main 函数，首先通过调用 `bootstrap.init()` 初始化相关组件：

* `initClassLoaders()`：初始化三个类加载器，commonLoader 的父类加载器是启动类加载器
* `Thread.currentThread().setContextClassLoader(catalinaLoader)`：自定义类加载器加载 Catalina 类，**打破双亲委派**
* `Object startupInstance = startupClass.getConstructor().newInstance()`：反射创建 Catalina 对象
* `method.invoke(startupInstance, paramValues)`：反射调用方法，设置父类加载器是 sharedLoader
* `catalinaDaemon = startupInstance`：引用 Catalina 对象

`daemon.load(args)` 方法反射调用 Catalina 对象的 load 方法，对**服务器的组件进行初始化**，并绑定了 ServerSocket 的端口：

* `parseServerXml(true)`：解析 XML 配置文件

* `getServer().init()`：服务器执行初始化，采用责任链的执行方式

  * `LifecycleBase.init()`：生命周期接口的初始化方法，开始链式调用

  * `StandardServer.initInternal()`：Server 的初始化，遍历所有的 Service 进行初始化

  * `StandardService.initInternal()`：Service 的初始化，对 Engine、Executor、listener、Connector 进行初始化

  * `StandardEngine.initInternal()`：Engine 的初始化

    * `getRealm()`：创建一个 Realm 对象
    * `ContainerBase.initInternal()`：容器的初始化，设置处理容器内组件的启动和停止事件的线程池

  * `Connector.initInternal()`：Connector 的初始化

    ```java
    public Connector() {
        this("HTTP/1.1"); //默认无参构造方法，会创建出 Http11NioProtocol 的协议处理器
    }
    ```

    * `adapter = new CoyoteAdapter(this)`：实例化 CoyoteAdapter 对象

    * `protocolHandler.setAdapter(adapter)`：设置到 ProtocolHandler 协议处理器中

    * `ProtocolHandler.init()`：协议处理器的初始化，底层调用 `AbstractProtocol#init` 方法

      `endpoint.init()`：端口的初始化，底层调用 `AbstractEndpoint#init` 方法

      `NioEndpoint.bind()`：绑定方法

      * `initServerSocket()`：**初始化 ServerSocket**，以 NIO 的方式监听端口
        * `serverSock = ServerSocketChannel.open()`：**NIO 的方式打开通道**
        * `serverSock.bind(addr, getAcceptCount())`：通道绑定连接端口
        * `serverSock.configureBlocking(true)`：切换为阻塞模式（没懂，为什么阻塞）
      * `initialiseSsl()`：初始化 SSL 连接
      * `selectorPool.open(getName())`：打开选择器，类似 NIO 的多路复用器

初始化完所有的组件，调用 `daemon.start()` 进行**组件的启动**，底层反射调用 Catalina 对象的 start 方法：

* `getServer().start()`：启动组件，也是责任链的模式

  * `LifecycleBase.start()`：生命周期接口的初始化方法，开始链式调用

  * `StandardServer.startInternal()`：Server 服务的启动

    * `globalNamingResources.start()`：启动 JNDI 服务
    * `for (Service service : services)`：遍历所有的 Service 进行启动

  * `StandardService.startInternal()`：Service 的启动，对所有 Executor、listener、Connector 进行启

  * `StandardEngine.startInternal()`：启动引擎，部署项目

    * `ContainerBase.startInternal()`：容器的启动
      * 启动集群、Realm 组件，并且创建子容器，提交给线程池
      * `((Lifecycle) pipeline).start()`：遍历所有的管道进行启动
        * `Valve current = first`：获取第一个阀门
        * `((Lifecycle) current).start()`：启动阀门，底层 `ValveBase#startInternal` 中设置启动的状态
        * `current = current.getNext()`：获取下一个阀门

  * `Connector.startInternal()`：Connector 的初始化

    * `protocolHandler.start()`：协议处理器的启动

      `endpoint.start()`：端点启动

      `NioEndpoint.startInternal()`：启动 NIO 的端点

      * `createExecutor()`：创建 Worker 线程组，10 个线程，用来进行任务处理
      * `initializeConnectionLatch()`：用来进行连接限流，**最大 8*1024 条连接**
      * `poller = new Poller()`：**创建 Poller 对象**，开启了一个多路复用器 Selector
      * `Thread pollerThread = new Thread(poller, getName() + "-ClientPoller")`：创建并启动 Poller 线程，Poller 实现了 Runnable 接口，是一个任务对象，**线程 start 后进入 Poller#run 方法**
      * `pollerThread.setDaemon(true)`：设置为守护线程
      * `startAcceptorThread()`：启动接收者线程
        * `acceptor = new Acceptor<>(this)`：**创建 Acceptor 对象**
        * `Thread t = new Thread(acceptor, threadName)`：创建并启动 Acceptor 接受者线程



***



#### 处理过程

1) Acceptor 监听客户端套接字，每 50ms 调用一次 **`serverSocket.accept`**，获取 Socket 后把封装成 NioSocketWrapper（是 SocketWrapperBase 的子类），并设置为非阻塞模式，把 NioSocketWrapper 封装成 PollerEvent 放入同步队列中
2) Poller 循环判断同步队列中是否有就绪的事件，如果有则通过 `selector.selectedKeys()` 获取就绪事件，获取 SocketChannel 中携带的 attachment（NioSocketWrapper），在 processKey 方法中根据事件类型进行 processSocket，将 Wrapper 对象封装成 SocketProcessor 对象，该对象是一个任务对象，提交到 Worker 线程池进行执行
3) `SocketProcessorBase.run()` 加锁调用 `SocketProcessor#doRun`，保证线程安全，从协议处理器 ProtocolHandler 中获取 AbstractProtocol，然后**创建 Http11Processor 对象处理请求**
4) `Http11Processor#service` 中调用 `CoyoteAdapter#service` ，把生成的 Tomcat 下的 Request 和 Response 对象通过方法 postParseRequest 匹配到对应的 Servlet 的请求响应，将请求传递到对应的 Engine 容器中调用 Pipeline，管道中包含若干个 Valve，执行完所有的 Valve 最后执行 StandardEngineValve，继续调用 Host 容器的 Pipeline，执行 Host 的 Valve，再传递给 Context 的 Pipeline，最后传递到 Wrapper 容器
5) `StandardWrapperValve#invoke` 中创建了 Servlet 对象并执行初始化，并为当前请求准备一个 FilterChain 过滤器链执行 doFilter 方法，`ApplicationFilterChain#doFilter` 是一个**责任链的驱动方法**，通过调用 internalDoFilter 来获取过滤器链的下一个过滤器执行 doFilter，执行完所有的过滤器后执行 `servlet.service` 的方法
6) 最后调用 HttpServlet#service()，根据请求的方法来调用 doGet、doPost 等，执行到自定义的业务方法





***

## Servlet

### Socket

Socket 是使用 TCP/IP 或者 UDP 协议在服务器与客户端之间进行传输的技术，是网络编程的基础

- **Servlet 是使用 HTTP 协议在服务器与客户端之间通信的技术，是 Socket 的一种应用**
- **HTTP 协议：是在 TCP/IP 协议之上进一步封装的一层协议，关注数据传输的格式是否规范，底层的数据传输还是运用了 Socket 和 TCP/IP**

Tomcat 和 Servlet 的关系：Servlet 的运行环境叫做 Web 容器或 Servlet 服务器，**Tomcat 是 Web 应用服务器，是一个 Servlet/JSP 容器**。Tomcat 作为 Servlet 容器，负责处理客户请求，把请求传送给 Servlet，并将 Servlet 的响应传送回给客户。而 Servlet 是一种运行在支持 Java 语言的服务器上的组件，Servlet 用来扩展 Java Web 服务器功能，提供非常安全的、可移植的、易于使用的 CGI 替代品
![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Tomcat与Servlet的关系.png)



***
