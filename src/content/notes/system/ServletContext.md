---
title: "ServletContext"
date: 2023-09-26
planet: system
tags: ["Java", "基础", ServletContext, system]
summary: "ServletContext 对象是应用上下文对象。服务器为每一个应用都创建了一个 ServletContext 对象，ServletContext 属于整个应用，不局限于某个 Servlet，可以实现让应用中所有 Servlet 间的数据"
private: false
---

### ServletContext

ServletContext 对象是应用上下文对象。服务器为每一个应用都创建了一个 ServletContext 对象，ServletContext 属于整个应用，不局限于某个 Servlet，可以实现让应用中所有 Servlet 间的数据共享。 

上下文代表了程序当下所运行的环境，联系整个应用的生命周期与资源调用，是程序可以访问到的所有资源的总和，资源可以是一个变量，也可以是一个对象的引用

生命周期：

* 出生：应用一加载，该对象就被创建出来。一个应用只有一个实例对象（Servlet 和 ServletContext 都是单例的）
* 活着：只要应用一直提供服务，该对象就一直存在。
* 死亡：应用被卸载（或者服务器停止），该对象消亡。

域对象：指的是对象有作用域，即有作用范围，可以**实现数据共享**，不同作用范围的域对象，共享数据的能力不一样。

Servlet 规范中，共有4个域对象，ServletContext 是其中一个，web 应用中最大的作用域，叫 application 域，可以实现整个应用间的数据共享功能。

数据共享：

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/ServletContext共享数据.png" style="zoom:50%;" />

获取ServletContext：

* Java 项目继承 HttpServlet，HttpServlet 继承 GenericServlet，GenericServlet 中有一个方法可以直接使用

  ```java
  public ServletContext getServletContext() {
          return this.getServletConfig().getServletContext();
  }
  ```


* ServletRequest 类方法：

  ```java
  ServletContext getServletContext()//获取ServletContext对象
  ```


常用API：

* `String getInitParameter(String name)` : 根据名称获取全局配置的参数
* `String getContextPath` : 获取当前应用访问的虚拟目录
* `String getRealPath(String path)` : 根据虚拟目录获取应用部署的磁盘绝对路径
* `void setAttribute(String name, Object object)` : 向应用域对象中存储数据
* `Object getAttribute(String name)` : 根据名称获取域对象中的数据，没有则返回null
* `void removeAttribute(String name)` : 根据名称移除应用域对象中的数据

代码实现：

* web.xml配置：
  配置的方式，需要在`<web-app>`标签中使用`<context-param>`来配置初始化参数，它的配置是针对整个应用的配置，被称为应用的初始化参数配置。

  ```xml
  <!--配置应用初始化参数-->
  <context-param>
      <!--用于获取初始化参数的key-->
      <param-name>servletContextInfo</param-name>
      <!--初始化参数的值-->
      <param-value>This is application scope</param-value>
  </context-param>
  <!--每个应用初始化参数都需要用到context-param标签-->
  <context-param>
      <param-name>globalEncoding</param-name>
      <param-value>UTF-8</param-value>
  </context-param>
  ```

* 代码：

  ```java
  public class ServletContextDemo extends HttpServlet {
      @Override
      protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          //获取ServletContext对象
          ServletContext context = getServletContext();
  
          //获取全局配置的globalEncoding
          String value = context.getInitParameter("globalEncoding");
          System.out.println(value);//UTF-8
  
          //获取应用的访问虚拟目录
          String contextPath = context.getContextPath();
          System.out.println(contextPath);//servlet
  
          //根据虚拟目录获取应用部署的磁盘绝对路径
          //获取b.txt文件的绝对路径 web目录下
          String b = context.getRealPath("/b.txt");
          System.out.println(b);
  
          //获取c.txt文件的绝对路径  /WEB-INF目录下
          String c = context.getRealPath("/WEB-INF/c.txt");
          System.out.println(c);
  
          //获取a.txt文件的绝对路径 //src目录下
          String a = context.getRealPath("/WEB-INF/classes/a.txt");
          System.out.println(a);
  
          //向域对象中存储数据
          context.setAttribute("username","zhangsan");
  
          //移除域对象中username的数据
          //context.removeAttribute("username");
      }
  
      @Override
      protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          doGet(req,resp);
      }
  }
  
  //E:\Database\Java\Project\JavaEE\out\artifacts\Servlet_war_exploded\b.txt
  //E:\Database\Java\Project\JavaEE\out\artifacts\Servlet_war_exploded\WEB-INF\c.txt
  //E:\Database\Java\Project\JavaEE\out\artifacts\Servlet_war_exploded\WEB-INF\classes\a.txt
  ```



***
