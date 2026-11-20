---
title: "Servlet 核心"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Servlet, system]
summary: "SpringMVC 提供访问原始 Servlet 接口的功能"
private: false
---

### Servlet

SpringMVC 提供访问原始 Servlet 接口的功能

* SpringMVC 提供访问原始 Servlet 接口 API 的功能，通过形参声明即可 

  ```java
  @RequestMapping("/servletApi")
  public String servletApi(HttpServletRequest request,
                           HttpServletResponse response, HttpSession session){
      System.out.println(request);
      System.out.println(response);
      System.out.println(session);
      request.setAttribute("name","seazean");
      System.out.println(request.getAttribute("name"));
      return "page.jsp";
  }
  ```

* Head 数据获取快捷操作方式
  名称：@RequestHeader
  类型：形参注解
  位置：处理器类中的方法形参前方
  作用：绑定请求头数据与对应处理方法形参间的关系
  范例：

  ```java
  快捷操作方式@RequestMapping("/headApi")
  public String headApi(@RequestHeader("Accept-Language") String headMsg){
      System.out.println(headMsg);
      return "page";
  }  
  ```

* Cookie 数据获取快捷操作方式
  名称：@CookieValue
  类型：形参注解
  位置：处理器类中的方法形参前方
  作用：绑定请求 Cookie 数据与对应处理方法形参间的关系
  范例：

  ```java
  @RequestMapping("/cookieApi")
  public String cookieApi(@CookieValue("JSESSIONID") String jsessionid){
      System.out.println(jsessionid);
      return "page";
  }  
  ```

* Session 数据获取
  名称：@SessionAttribute
  类型：形参注解
  位置：处理器类中的方法形参前方
  作用：绑定请求Session数据与对应处理方法形参间的关系
  范例：

  ```java
  @RequestMapping("/sessionApi")
  public String sessionApi(@SessionAttribute("name") String name){
      System.out.println(name);
      return "page.jsp";
  }
  //用于在session中放入数据
  @RequestMapping("/setSessionData")
  public String setSessionData(HttpSession session){
      session.setAttribute("name","seazean");
      return "page";
  }
  ```

* Session 数据设置
  名称：@SessionAttributes
  类型：类注解
  位置：处理器类上方
  作用：声明放入session范围的变量名称，适用于Model类型数据传参
  范例：

  ```java
  @Controller
  //设定当前类中名称为age和gender的变量放入session范围，不常用
  @SessionAttributes(names = {"age","gender"})
  public class ServletController {
  	//将数据放入session存储范围，Model对象实现数据set，@SessionAttributes注解实现范围设定
      @RequestMapping("/setSessionData2")
      public String setSessionDate2(Model model) {
          model.addAttribute("age",39);
          model.addAttribute("gender","男");
          return "page";
      }
      
      @RequestMapping("/sessionApi")
      public String sessionApi(@SessionAttribute("age") int age,
                               @SessionAttribute("gender") String gender){
          System.out.println(name);
          System.out.println(age);
          return "page";
      }
  }  
  ```

* spring-mvc.xml 配置

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <beans xmlns="http://www.springframework.org/schema/beans"
         xmlns:context="http://www.springframework.org/schema/context"
         xmlns:mvc="http://www.springframework.org/schema/mvc"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
          http://www.springframework.org/schema/mvc http://www.springframework.org/schema/mvc/spring-mvc.xsd
          http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd">
  
      <context:component-scan base-package="com.seazean"/>
      <bean class="org.springframework.web.servlet.view.InternalResourceViewResolver">
          <property name="prefix" value="/WEB-INF/page/"/>
          <property name="suffix" value=".jsp"/>
      </bean>
      <mvc:annotation-driven/>
  </beans>
  ```

  




***
