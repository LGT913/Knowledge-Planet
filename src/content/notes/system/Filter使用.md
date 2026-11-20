---
title: "Filter使用"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Filter使用, system]
summary: "过滤器放行之后执行完目标资源，仍会回到过滤器中"
private: false
---

### Filter使用

#### 设置页面编码

请求先被过滤器拦截进行相关操作

过滤器放行之后执行完目标资源，仍会回到过滤器中

* Filter 代码：

  ```java
  @WebFilter("/*")
  public class FilterDemo01 implements Filter{
      @Override
      public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
          System.out.println("filterDemo01拦截到请求...");
          //处理乱码
          servletResponse.setContentType("text/html;charset=UTF-8");
          //过滤器放行
          filterChain.doFilter(servletRequest,servletResponse);
          System.out.println("filterDemo1放行之后，又回到了doFilter方法");
      }
  }
  ```

* Servlet 代码：

  ```java
  @WebServlet("/servletDemo01")
  public class ServletDemo01 extends HttpServlet {
      @Override
      protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          System.out.println("servletDemo01执行了...");
          resp.getWriter().write("servletDemo01执行了...");
      }
      @Override
      protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          doGet(req,resp);
      }
  }
  ```

* 控制台输出：

  ```
  filterDemo01拦截到请求...
  servletDemo01执行了...
  filterDemo1放行之后，又回到了doFilter方法  
  ```




***



#### 多过滤器顺序

多个过滤器使用的顺序，取决于过滤器映射的顺序。

* 两个 Filter 代码：

  ```java
  public class FilterDemo01 implements Filter{
      @Override
      public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
          System.out.println("filterDemo01执行了...");
          filterChain.doFilter(servletRequest,servletResponse);
      }
  }
  public class FilterDemo02 implements Filter{
      @Override
      public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
          System.out.println("filterDemo02执行了...");
          filterChain.doFilter(servletRequest,servletResponse);
      }
  }
  ```

* Servlet代码：`System.out.println("servletDemo02执行了...");`

* web.xml配置：

  ```xml
  <filter>
      <filter-name>filterDemo01</filter-name>
      <filter-class>filter.FilterDemo01</filter-class>
  </filter>
  <filter-mapping>
      <filter-name>filterDemo01</filter-name>
      <url-pattern>/*</url-pattern>
  </filter-mapping>
  <filter>
      <filter-name>filterDemo02</filter-name>
      <filter-class>filter.FilterDemo02</filter-class>
  </filter>
  <filter-mapping>
      <filter-name>filterDemo02</filter-name>
      <url-pattern>/*</url-pattern>
  </filter-mapping>
  ```

* 控制台输出：

  ```
  filterDemo01执行了
  filterDemo02执行了
  servletDemo02执行了...
  ```



在过滤器的配置中，有过滤器的声明和过滤器的映射两部分，到底是声明决定顺序，还是映射决定顺序呢？

答案是：`<filter-mapping>`的配置前后顺序决定过滤器的调用顺序，也就是由映射配置顺序决定。



***



#### Filter生命周期

**创建：**当应用加载时实例化对象并执行init()初始化方法

**服务：**对象提供服务的过程，执行doFilter()方法

**销毁**：当应用卸载时或服务器停止时对象销毁，执行destroy()方法

* Filter代码：

  ```java
  @WebFilter("/*")
  public class FilterDemo03 implements Filter{
      /*
          初始化方法
       */
      @Override
      public void init(FilterConfig filterConfig) {
          System.out.println("对象初始化成功了...");
      }
      /*
          提供服务方法
       */
      @Override
      public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
          System.out.println("filterDemo03执行了...");
          //过滤器放行
          filterChain.doFilter(servletRequest,servletResponse);
      }
      /*
          对象销毁方法，关闭Tomcat服务器
       */
      @Override
      public void destroy() {
          System.out.println("对象销毁了...");
      }
  }
  
  ```

* Servlet 代码：`System.out.println("servletDemo03执行了...");`

* 控制台输出：

  ```
  对象初始化成功了...
  filterDemo03执行了...
  servletDemo03执行了...
  对象销毁了
  ```




***



#### FilterConfig使用

Filter初始化函数init的参数是FilterConfig 对象

* Filter代码：

  ```java
  public class FilterDemo04 implements Filter{
  
  	//初始化方法
      @Override
      public void init(FilterConfig filterConfig) {
          System.out.println("对象初始化成功了...");
  
          //获取过滤器名称
          String filterName = filterConfig.getFilterName();
          System.out.println(filterName);
  
          //根据name获取value
          String username = filterConfig.getInitParameter("username");
          System.out.println(username);
      }
      @Override
      public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
          System.out.println("filterDemo04执行了...");
          filterChain.doFilter(servletRequest,servletResponse);
      }
      @Override
      public void destroy() {}
  }
  ```

* web.xml配置

  ```xml
  <filter>
      <filter-name>filterDemo04</filter-name>
      <filter-class>filter.FilterDemo04</filter-class>
      <init-param>
          <param-name>username</param-name>
          <param-value>zhangsan</param-value>
      </init-param>
  </filter>
  <filter-mapping>
      <filter-name>filterDemo04</filter-name>
      <url-pattern>/*</url-pattern>
  </filter-mapping>
  ```

* 控制台输出：

  ```
  对象初始化成功了...
  filterDemo04
  zhangsan
  ```




***
