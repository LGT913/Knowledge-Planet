---
title: "基本介绍"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 基本介绍, system]
summary: "Servlet是SUN公司提供的一套规范，名称就叫Servlet规范，它也是JavaEE规范之一。通过API来使用Servlet。"
private: false
---

### 基本介绍

#### Servlet类

Servlet是SUN公司提供的一套规范，名称就叫Servlet规范，它也是JavaEE规范之一。通过API来使用Servlet。

1. Servlet是一个运行在web服务端的java小程序，用于接收和响应客户端的请求。一个服务器包含多个Servlet

2. 通过实现Servlet接口，继承GenericServlet或者HttpServlet，实现Servlet功能

3. 每次请求都会执行service方法，在service方法中还有参数ServletRequest和ServletResponse

4. 支持配置相关功能

   ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Servlet类关系总视图.png)



***



#### 执行流程

创建 Web 工程 → 编写普通类继承 Servlet 相关类 → 重写方法

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Servlet入门案例执行.png)



Servlet执行过程分析：

通过浏览器发送请求，请求首先到达Tomcat服务器，由服务器解析请求URL，然后在部署的应用列表中找到应用。然后找到web.xml配置文件，在web.xml中找到FirstServlet的配置（<url-pattern>/<url-pattern>），找到后执行service方法，最后由FirstServlet响应客户浏览器。整个过程如下图所示：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Servlet执行过程图.jpg)



***



#### 实现方式

实现 Servlet 功能时，可以选择以下三种方式：

* 第一种：实现 Servlet 接口，接口中的方法必须全部实现。
  使用此种方式，表示接口中的所有方法在需求方面都有重写的必要。此种方式支持最大程度的自定义。

* 第二种：继承 GenericServlet，service 方法必须重写，其他方可根据需求，选择性重写。
  使用此种方式，表示只在接收和响应客户端请求这方面有重写的需求，而其他方法可根据实际需求选择性重写，使我们的开发Servlet变得简单。但是，此种方式是和 HTTP 协议无关的。

* 第三种：继承 HttpServlet，它是 javax.servlet.http 包下的一个抽象类，是 GenericServlet 的子类。选择继承 HttpServlet 时，**需要重写 doGet 和 doPost 方法**，来接收 get 方式和 post 方式的请求，不要覆盖 service 方法。使用此种方式，表示我们的请求和响应需要和 HTTP 协议相关，我们是通过 HTTP 协议来访问。每次请求和响应都符合 HTTP 协议的规范。请求的方式就是 HTTP 协议所支持的方式（GET POST PUT DELETE TRACE OPTIONS HEAD )。





***
