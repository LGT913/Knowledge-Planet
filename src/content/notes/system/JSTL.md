---
title: "JSTL"
date: 2023-09-26
planet: system
tags: ["Java", "基础", JSTL, system]
summary: "JSTL：Java Server Pages Standarded Tag Library，JSP中标准标签库。"
private: false
---

### JSTL

JSTL：Java Server Pages Standarded Tag Library，JSP中标准标签库。

作用：提供给开发人员一个标准的标签库，开发人员可以利用这些标签取代JSP页面上的Java代码，从而提高程序的可读性，降低程序的维护难度。

| 组成      | 作用       | 说明                           |
| --------- | ---------- | ------------------------------ |
| Core      | 核心标签库 | 通用逻辑处理                   |
| Fmt       | 国际化有关 | 需要不同地域显示不同语言时使用 |
| Functions | EL函数     | EL表达式可以使用的方法         |
| SQL       | 操作数据库 |                                |
| XML       | 操作XML    |                                |

使用：添加jar包，通过taglib导入，prefix属性表示程序调用标签使用的引用名

| 标签名称                             | 功能分类 | 分类       | 作用             |
| ------------------------------------ | -------- | ---------- | ---------------- |
| `<c:if test="${A==B || C==D}">`      | 流程控制 | 核心标签库 | 用于判断         |
| `<c:choose> ,<c:when>,<c:otherwise>` | 流程控制 | 核心标签库 | 用于多个条件判断 |
| `<c:foreache>`                       | 迭代操作 | 核心标签库 | 用于循环遍历     |

* 流程控制

  ```jsp
  <%@ page contentType="text/html;charset=UTF-8" language="java" %>
  <%@taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
  <html>
  <head>
      <title>流程控制</title>
  </head>
  <body>
      <%--向域对象中添加成绩数据--%>
      ${pageContext.setAttribute("score","T")}
  
      <%--对成绩进行判断--%>
      <c:if test="${score eq 'A'}">
          优秀
      </c:if>
  
      <%--对成绩进行多条件判断--%>
      <c:choose>
          <c:when test="${score eq 'A'}">优秀</c:when>
          <c:when test="${score eq 'B'}">良好</c:when>
          <c:when test="${score eq 'C'}">及格</c:when>
          <c:when test="${score eq 'D'}">较差</c:when>
          <c:otherwise>成绩非法</c:otherwise>
      </c:choose>
  </body>
  </html>
  ```

* 迭代操作
  c:forEach：用来遍历集合，属性：

  | 属性      | 作用                                                         |
  | --------- | ------------------------------------------------------------ |
  | items     | 指定要遍历的集合，它可以是用EL表达式取出来的元素             |
  | var       | 把当前遍历的元素放入指定的page域中。var的值是key，遍历的元素是value<br />注意：var不支持EL表达式，只能是字符串常量 |
  | begin     | 开始遍历的索引                                               |
  | end       | 结束遍历的索引                                               |
  | step      | 步长，i+=step                                                |
  | varStatus | 它是一个计数器对象，有两个属性，一个是用于记录索引，一个是用于计数。索引是从0开始，计数是从1开始 |

  ```jsp
  <%@ page import="java.util.ArrayList" %>
  <%@ page contentType="text/html;charset=UTF-8" language="java" %>
  <%@taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
  <html>
  <head>
      <title>循环</title>
  </head>
  <body>
      <%--向域对象中添加集合--%>
      <%
          ArrayList<String> list = new ArrayList<>();
          list.add("aa");
          list.add("bb");
          list.add("cc");
          list.add("dd");
          pageContext.setAttribute("list",list);
      %>
      <%--遍历集合--%>
      <c:forEach items="${list}" var="str">
          ${str} <br>
      </c:forEach>
  </body>
  </html>
  ```

  

****

## Filter

### 过滤器

Filter：过滤器，是 JavaWeb 三大组件之一，另外两个是 Servlet 和 Listener

工作流程：在程序访问服务器资源时，当一个请求到来，服务器首先判断是否有过滤器与去请求资源相关联，如果有过滤器可以将请求拦截下来，完成一些特定的功能，再由过滤器决定是否交给请求资源，如果没有就直接请求资源，响应同理

作用：过滤器一般用于完成通用的操作，例如：登录验证、统一编码处理、敏感字符过滤等



***
