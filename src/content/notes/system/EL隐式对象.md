---
title: "EL隐式对象"
date: 2023-09-26
planet: system
tags: ["Java", "基础", EL隐式对象, system]
summary: "EL表达式也为我们提供隐式对象，可以让我们不声明直接来使用，需要注意的是，它和JSP的隐式对象不是同一种事物。"
private: false
---

### EL隐式对象

#### EL表达式隐式对象

EL表达式也为我们提供隐式对象，可以让我们不声明直接来使用，需要注意的是，它和JSP的隐式对象不是同一种事物。

| EL中的隐式对象   | 类型                          | 对应JSP隐式对象 | 备注                                    |
| ---------------- | ----------------------------- | --------------- | --------------------------------------- |
| PageContext      | Javax.serlvet.jsp.PageContext | PageContext     | 完全一样                                |
| ApplicationScope | Java.util.Map                 | 没有            | 应用层范围                              |
| SessionScope     | Java.util.Map                 | 没有            | 会话范围                                |
| RequestScope     | Java.util.Map                 | 没有            | 请求范围                                |
| PageScope        | Java.util.Map                 | 没有            | 页面层范围                              |
| Header           | Java.util.Map                 | 没有            | 请求消息头key，值是value（一个）        |
| HeaderValues     | Java.util.Map                 | 没有            | 请求消息头key，值是数组（一个头多个值） |
| Param            | Java.util.Map                 | 没有            | 请求参数key，值是value（一个）          |
| ParamValues      | Java.util.Map                 | 没有            | 请求参数key，值是数组（一个名称多个值） |
| InitParam        | Java.util.Map                 | 没有            | 全局参数，key是参数名称，value是参数值  |
| Cookie           | Java.util.Map                 | 没有            | Key是cookie的名称，value是cookie对象    |

```jsp
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>EL表达式11个隐式对象</title>
</head>
<body>
    <%--pageContext对象 可以获取其他三个域对象和JSP中八个隐式对象--%>
    ${pageContext.request.contextPath} <br>

    <%--applicationScope sessionScope requestScope pageScope 操作四大域对象中的数据--%>
    <% request.setAttribute("username","zhangsan"); %>
    ${username} <br>
    ${requestScope.username} <br>

    <%--header headerValues  获取请求头数据--%>
    ${header["connection"]} <br>
    ${headerValues["connection"][0]} <br>

    <%--param paramValues 获取请求参数数据--%>
    ${param.username} <br>
    ${paramValues.hobby[0]} <br>
    ${paramValues.hobby[1]} <br>

    <%--initParam 获取全局配置参数--%>
    ${initParam["pname"]}  <br>

    <%--cookie 获取cookie信息--%>
    ${cookie}  <br> <%--获取Map集合--%>
    ${cookie.JSESSIONID}  <br> <%--获取map集合中第二个元素--%>
    ${cookie.JSESSIONID.name}  <br> <%--获取cookie对象的名称--%>
    ${cookie.JSESSIONID.value} <%--获取cookie对象的值--%>
</body>
</html>
<--页面显示
/el
zhangsan
zhangsan
keep-alive
keep-alive

bbb
{JSESSIONID=javax.servlet.http.Cookie@435c8431, Idea-5a5d203e=javax.servlet.http.Cookie@46be0b58, Idea-be3279e7=javax.servlet.http.Cookie@4ef6e8e8}
javax.servlet.http.Cookie@435c8431
JSESSIONID
E481B2A845A448AD88A71FD43611FF02    
-->
```

在web.xml配置全局参数

```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app ******>
    <!--配置全局参数-->
    <context-param>
        <param-name>pname</param-name>
        <param-value>bbb</param-value>
    </context-param>
</web-app>
```



***



#### 获取JSP隐式对象

通过获取页面域对象，获取其他JSP八个隐式对象

```jsp
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>EL表达式使用细节</title>
</head>
<body>
    <%--获取虚拟目录名称--%>
    <%= request.getContextPath()%>
    ${pageContext.request.contextPath}
</body>
</html>
<--页面显示
/el /el
-->
```





***
