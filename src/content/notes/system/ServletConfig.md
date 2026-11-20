---
title: "ServletConfig"
date: 2023-09-26
planet: system
tags: ["Java", "基础", ServletConfig, system]
summary: "ServletConfig 是 Servlet 的配置参数对象。在 Servlet 规范中，允许为每个 Servlet 都提供一些初始化配置，每个 Servlet 都有自己的ServletConfig，作用是在 Servlet 初始化期间，"
private: false
---

### ServletConfig

ServletConfig 是 Servlet 的配置参数对象。在 Servlet 规范中，允许为每个 Servlet 都提供一些初始化配置，每个 Servlet 都有自己的ServletConfig，作用是**在 Servlet 初始化期间，把一些配置信息传递给 Servlet**

生命周期：在初始化阶段读取了 web.xml 中为 Servlet 准备的初始化配置，并把配置信息传递给 Servlet，所以生命周期与 Servlet 相同。如果 Servlet 配置了 `<load-on-startup>1</load-on-startup>`，ServletConfig 也会在应用加载时创建。

获取 ServletConfig：在 init 方法中为 ServletConfig 赋值

常用API：

* `String getInitParameter(String name)`：根据初始化参数的名称获取参数的值，根据<param-name>，获取<param-value>
* `Enumeration<String> getInitParameterNames()` : 获取所有初始化参数名称的枚举(遍历方式看例子)
* `ServletContext getServletContext()` : 获取**ServletContext**对象
* `String getServletName()` : 获取Servlet名称

代码实现：

* web.xml 配置：
  初始化参数使用 `<servlet>` 标签中的 `<init-param> `标签来配置，并且每个 Servlet 都支持有多个初始化参数，并且初始化参数都是以键值对的形式存在的

  ```xml
  <!--配置ServletDemo8-->
  <servlet>
      <servlet-name>servletDemo8</servlet-name>
      <servlet-class>com.itheima.web.servlet.ServletDemo8</servlet-class>
      <!--配置初始化参数-->
      <init-param>
          <!--用于获取初始化参数的key-->
          <param-name>encoding</param-name>
          <!--初始化参数的值-->
          <param-value>UTF-8</param-value>
      </init-param>
      <!--每个初始化参数都需要用到init-param标签-->
      <init-param>
          <param-name>servletInfo</param-name>
          <param-value>This is Demo8</param-value>
      </init-param>
  </servlet>
  <servlet-mapping>
      <servlet-name>servletDemo8</servlet-name>
      <url-pattern>/servletDemo8</url-pattern>
  </servlet-mapping>
  ```

* 代码：

  ```java
  //演示Servlet的初始化参数对象
  public class ServletDemo8 extends HttpServlet {
  	//定义Servlet配置对象ServletConfig
      private ServletConfig servletConfig;
  
      //在初始化时为ServletConfig赋值
      @Override
      public void init(ServletConfig config) throws ServletException {
          this.servletConfig = config;
      }
      /**
         * doGet方法输出一句话
         */
      @Override
      protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          //1.输出ServletConfig
          System.out.println(servletConfig);
          //2.获取Servlet的名称
          String servletName= servletConfig.getServletName();
          System.out.println(servletName);
          //3.获取字符集编码
          String encoding = servletConfig.getInitParameter("encoding");
          System.out.println(encoding);
          //4.获取所有初始化参数名称的枚举
          Enumeration<String> names = servletConfig.getInitParameterNames();
          //遍历names
          while(names.hasMoreElements()){
              //取出每个name
              String name = names.nextElement();
              //根据key获取value
              String value = servletConfig.getInitParameter(name);
              System.out.println("name:"+name+",value:"+value);
          }
          //5.获取ServletContext对象
          ServletContext servletContext = servletConfig.getServletContext();
          System.out.println(servletContext);
      }
  
      //调用doGet方法
      @Override
      protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          doGet(req,resp);
      }
  }
  ```

* 效果：

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/ServletConfig演示.png)





***
