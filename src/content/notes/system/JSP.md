---
title: "JSP 页面开发"
date: 2023-09-26
planet: system
tags: ["Java", "基础", JSP, system]
summary: "JSPJava Server Page：是一种动态网页技术标准。（页面技术）"
private: false
---

## JSP

### JSP概述

JSP(Java Server Page)：是一种动态网页技术标准。（页面技术）

JSP是基于Java语言的，它的本质就是Servlet，一个特殊的Servlet。

JSP部署在服务器上，可以处理客户端发送的请求，并根据请求内容动态的生成HTML、XML或其他格式文档的Web网页，然后响应给客户端。

| 类别       | 适用场景                                                     |
| ---------- | ------------------------------------------------------------ |
| HTML       | 开发静态资源，不能包含java代码，无法添加动态数据。           |
| CSS        | 美化页面                                                     |
| JavaScript | 给网页添加动态效果                                           |
| Servlet    | 编写java代码，实现后台功能处理，但是很不方便，开发效率低。   |
| JSP        | 包括了显示页面技术，同时具备Servlet输出动态资源的能力。但是不适合作为控制器来用。 |



### 执行原理

* 新建JavaEE工程，编写index.jsp文件

  ```jsp
  <%@ page contentType="text/html;charset=UTF-8" language="java" %>
  <html>
    <head>
      <title>JSP的入门</title>
    </head>
    <body>
        这是第一个JSP页面
    </body>
  </html>
  ```

  

* 执行过程：

  客户端提交请求——Tomcat服务器解析请求地址——找到JSP页面——Tomcat将JSP页面翻译成Servlet的java文件——将翻译好的.java文件编译成.class文件——返回到客户浏览器上

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/JSP执行过程.png)

* 溯源，打开JSP翻译后的Java文件

  `public final class index_jsp extends org.apache.jasper.runtime.HttpJspBase`，`public abstract class HttpJspBase extends HttpServlet implements HttpJspPage`，HttpJspBase是个抽象类继承HttpServlet，所以JSP本质上继承HttpServlet

  在文件中找到了输出页面的代码，本质都是用out.write()输出的JSP语句

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Jsp的本质说明.png)



* 总结：
  JSP它是一个特殊的Servlet，主要是用于展示动态数据。它展示的方式是用流把数据输出出来，而我们在使用JSP时，涉及HTML的部分，都与HTML的用法一致，这部分称为jsp中的模板元素，决定了页面的外观。



***



###  JSP语法

* JSP注释：

  | 注释类型 | 方法             | 作用                                                         |
  | -------- | ---------------- | ------------------------------------------------------------ |
  | JSP注释  | <%--注释内容--%> | 被jsp注释的部分不会被翻译成.java文件，不会在浏览器上显示     |
  | HTML注释 | <!--HTML注释-->  | 在Jsp中可以使用html的注释，但是只能注释html元素<br />被html注释部分会参与翻译，并且会在浏览器上显示 |
  | Java注释 | //; /* */        |                                                              |

* Java代码块

  ```html
  <% 此处写java代码 %>
  <%--由tomcat负责翻译，翻译之后是service方法的成员变量--%>
  ```

* JSP表达式

  ```html
  <%=表达式%>
  <%--翻译成Service()方法里面的内容,相当于调用out.print()--%>
  ```

* JSP声明

  ```html
  <%! 声明的变量或方法 %>
  <%--翻译成Servlet类里面的内容--%>
  ```

  

* 语法示例：

  ```jsp
  <%@ page contentType="text/html;charset=UTF-8" language="java" %>
  <html>
  <head>
      <title>jsp语法</title>
  </head>
  <body>
      <%--1. 这是注释--%>
  
      <%--
          2.java代码块
          System.out.println("Hello JSP"); 普通输出语句，输出在控制台!!
          out.println("Hello JSP");out是JspWriter对象，输出在页面上
      --%>
      <%
          System.out.println("Hello JSP");
          out.println("Hello JSP<br>");
          String str = "hello<br>";
          out.println(str);
      %>
  
      <%--
          3.jsp表达式,相当于 out.println("Hello");
      --%>
      <%="Hello<br>"%>
  
      <%--
          4.jsp中的声明(变量或方法)
          如果加!  代表的是声明的是成员变量
          如果不加!  代表的是声明的是局部变量,页面显示abc
      --%>
      <%! String s = "abc";%>
      <% String s = "def";%>
      <%=s%>
      
      <%! public void getSum(){}%>
  </body>
  </html>
  ```

  ```jsp
  控制台输出：Hello JSP
  页面输出：
  	Hello JSP
  	hello
  	Hello
  	def
  ```

  

***



### JSP指令

* **page指令：** 

  ```xml
  <%@ page  属性名=属性值 属性名=属性值... %>
  ```

  | 属性名       | 作用                                                         |
  | ------------ | ------------------------------------------------------------ |
  | contentType  | 设置响应正文支持的MIME类型和编码格式：contentType="text/html;charset=UTF-8" |
  | language     | 告知引擎，脚本使用的语言，默认为Java                         |
  | errorPage    | 当前页面出现异常后跳转的页面                                 |
  | isErrorPage  | 是否抓住异常。值为true页面中就能使用exception对象，打印异常信息。默认值false |
  | import       | 导入哪些包（类）<%@ page import="java.util.ArrayList" %>     |
  | session      | 是否创建HttpSession对象，默认是true                          |
  | buffer       | 设定JspWriter用s输出jsp内容的缓存大小。默认8kb               |
  | pageEncoding | 翻译jsp时所用的编码格式，pageEncoding="UTF-8"相当于用UTF-8读取JSP |
  | isELIgnored  | 是否忽略EL表达式，默认值是false                              |

  Note：当使用全局错误页面，就无须配置errorPage实现跳转错误页面，而是由服务器负责跳转到错误页面

  * 配置全局错误页面：web.xml

    ```xml
    <error-page>    
        <exception-type>java.lang.Exception</exception-type>    			
        <location>/error.jsp</location>
    </error-page>
    <error-page>
        <error-code>404</error-code>
        <location>/404.html</location>
    </error-page> 
    ```

    

* **include指令：**包含其他页面

  ```xml
  <%@include file="被包含的页面" %>
  ```

  属性：file，以/开头，就代表当前应用



* **taglib指令：**引入外部标签库

  ```xml
  <%taglib uri="标签库的地址" prefix="前缀名称"%>
  ```

  html标签和jsp标签不用引入

  

***



### 隐式对象

#### 九大隐式对象

隐式对象：在jsp中可以不声明就直接使用的对象。它只存在于jsp中，因为java类中的变量必须要先声明再使用。
jsp中的隐式对象也并不是未声明，它是在翻译成.java文件时声明的，所以我们在jsp中可以直接使用。

| 隐式对象名称 | 类型                                   | 备注                          |
| ------------ | -------------------------------------- | ----------------------------- |
| request      | javax.servlet.http.HttpServletRequest  |                               |
| response     | javax.servlet.http.HttpServletResponse |                               |
| session      | javax.servlet.http.HttpSession         | Page指令可以控制开关          |
| application  | javax.servlet.ServletContext           |                               |
| page         | Java.lang.Object                       | 当前jsp对应的servlet引用实例  |
| config       | javax.servlet.ServletConfig            |                               |
| exception    | java.lang.Throwable                    | page指令有开关                |
| out          | javax.servlet.jsp.JspWriter            | 字符输出流，相当于printwriter |
| pageContext  | javax.servlet.jsp.PageContext          | 很重要，页面域                |



#### PageContext

* PageContext对象特点：

  * PageContextd对象是JSP独有的对象，Servlet中没有
  * PageContextd对象是一个**页面域（作用范围）对象**，还可以操作其他三个域对象中的属性
  * PageContextd对象**可以获取其他八个隐式对象**
  * PageContextd对象是一个局部变量，它的生命周期随着JSP的创建而诞生，随着JSP的结束而消失。每个JSP页面都有一个独立的PageContext

* PageContext方法如下，页面域操作的方法定义在了PageContext的父类JspContext中

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/PageContext方法详解.png)

  

***





### 四大域对象

| 域对象名称     | 范围     | 级别                     | 备注                                     |
| -------------- | -------- | ------------------------ | ---------------------------------------- |
| PageContext    | 页面范围 | 最小，只能在当前页面用   | 因范围太小，开发中用的很少               |
| ServletRequest | 请求范围 | 一次请求或当期请求转发用 | 当请求转发之后，再次转发时请求域丢失     |
| HttpSession    | 会话范围 | 多次请求数据共享时使用   | 多次请求共享数据，但不同的客户端不能共享 |
| ServletContext | 应用范围 | 最大，整个应用都可以使用 | 尽量少用，如果对数据有修改需要做同步处理 |



***



### MVC模型

M : model， 通常用于封装数据，封装的是数据模型
V :  view，通常用于展示数据。动态展示用jsp页面，静态数据展示用html
C :  controller，通常用于处理请求和响应，一般指的是Servlet

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/MVC模型.png)



***

## EL

### EL概述

EL表达式：Expression Language，意为表达式语言。它是Servlet规范中的一部分，是JSP2.0规范加入的内容。

EL表达式作用：在JSP页面中获取数据，让JSP脱离java代码块和JSP表达式

EL表达式格式： `${表达式内容}`

EL表达式特点：

* 有明确的**返回值**
* 把内容输出到**页面**上
* **只能在四大域对象中获取数据**，不在四大域对象中的数据取不到。



***
