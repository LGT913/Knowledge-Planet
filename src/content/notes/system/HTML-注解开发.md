---
title: "注解开发"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 注解开发, system]
summary: "Servlet3.0 版本！不需要配置 web.xml"
private: false
---

### 注解开发

Servlet3.0 版本！不需要配置 web.xml

* 注解案例

  ```java
  @WebServlet("/servletDemo1")
  public class ServletDemo1 extends HttpServlet {
      @Override
      protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          doPost(req,resp);
      }
  
      @Override
      protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          System.out.println("Servlet Demo1 Annotation");
      }
  }
  ```

* WebServlet注解（@since Servlet 3.0 (Section 8.1.1)）

  ```java
  @Target(ElementType.TYPE)
  @Retention(RetentionPolicy.RUNTIME)
  @Documented
  public @interface WebServlet {
      //指定Servlet的名称。相当于xml配置中<servlet>标签下的<servlet-name>
      String name() default "";
  
      //用于映射Servlet访问的url映射，相当于xml配置时的<url-pattern>
      String[] value() default {};
  
      //相当于xml配置时的<url-pattern>
      String[] urlPatterns() default {};
  
  	//用于配置Servlet的启动时机，相当于xml配置的<load-on-startup>
      int loadOnStartup() default -1;
  
      //用于配置Servlet的初始化参数，相当于xml配置的<init-param>
      WebInitParam[] initParams() default {};
  
      //用于配置Servlet是否支持异步，相当于xml配置的<async-supported>
      boolean asyncSupported() default false;
  
      //用于指定Servlet的小图标
      String smallIcon() default "";
  
      //用于指定Servlet的大图标
      String largeIcon() default "";
  
      //用于指定Servlet的描述信息
      String description() default "";
  
      //用于指定Servlet的显示名称
      String displayName() default "";
  }
  ```

* 手动创建容器：（了解）



***

## Request

### 请求响应

Web服务器收到客户端的http请求，会针对每一次请求，分别创建一个用于代表请求的request对象、和代表响应的response对象。

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Servlet请求响应图.png)



***

### 请求对象

请求：客户机希望从服务器端索取一些资源，向服务器发出询问

请求对象：在 JavaEE 工程中，用于发送请求的对象，常用的对象是 ServletRequest 和 HttpServletRequest ，它们的区是是否与 HTTP 协议有关

Request 作用：

* 操作请求三部分(行,头,体)
* 请求转发
* 作为域对象存数据  

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Request请求对象的类视图.png)



***

### 请求路径

| 方法                            | 作用                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| String  getLocalAddr()          | 获取本机（服务器）地址                                       |
| String getLocalName()           | 获取本机（服务器）名称                                       |
| int getLocalPort()              | 获取本机（服务器）端口                                       |
| String getRemoteAddr()          | 获取访问者IP                                                 |
| String getRemoteHost            | 获取访问者主机                                               |
| int getRemotePort()             | 获取访问者端口                                               |
| String getMethod();             | 获得请求方式                                                 |
| String getRequestURI()          | 获取统一资源标识符（/request/servletDemo01）                 |
| String getRequestURL()          | 获取统一资源定位符（http://localhost:8080/request/servletDemo01） |
| String getQueryString()         | 获取请求消息的数据<br />（GET方式 URL中带参字符串：username=aaa&password=123） |
| String getContextPath()         | 获取虚拟目录名称（/request）                                 |
| String getServletPath           | 获取Servlet映射路径<br />（<url-pattern>或@WebServlet值: /servletDemo01） |
| String getRealPath(String path) | 根据虚拟目录获取应用部署的磁盘绝对路径                       |

URL = URI + HOST

URL = HOST + ContextPath + ServletPath



***

### 获取请求头

| 方法                                        | 作用                                                         |
| ------------------------------------------- | ------------------------------------------------------------ |
| String  getHeader(String name)              | 获得指定请求头的值。<br />如果没有该请求头返回null，有多个值返回第一个 |
| Enumeration<String> getHeaders(String name) | 获取指定请求头的多个值                                       |
| Enumeration<String> getHeaderNames()        | 获取所有请求头名称的枚举                                     |

```java
@WebServlet("/servletDemo02")
public class ServletDemo02 extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        //1.根据请求头名称获取一个值
        String connection = req.getHeader("connection");
        System.out.println(connection);//keep-alive

        //2.根据请求头名称获取多个值
        Enumeration<String> values = req.getHeaders("accept-encoding");
        while(values.hasMoreElements()) {
            String value = values.nextElement();
            System.out.println(value);//gzip, deflate, br
        }
    }
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        doGet(req,resp);
    }
}
```



***
