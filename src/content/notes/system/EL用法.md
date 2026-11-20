---
title: "EL用法"
date: 2023-09-26
planet: system
tags: ["Java", "基础", EL用法, system]
summary: "EL表达式可以获取不同类型数据，前提是数据放入四大域对象。"
private: false
---

### EL用法

#### 多种类型

EL表达式可以获取不同类型数据，前提是数据放入四大域对象。

```jsp
<%@ page import="bean.Student" %>
<%@ page import="java.util.ArrayList" %>
<%@ page import="java.util.HashMap" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>EL表达式获取不同类型数据</title>
</head>
<body>
    <%--1.获取基本数据类型--%>
    <% pageContext.setAttribute("num",10); %>
    基本数据类型：${num} <br>

    <%--2.获取自定义对象类型--%>
    <%
        Student stu = new Student("张三",23);
        pageContext.setAttribute("stu",stu);
    %>
    自定义对象：${stu} <br>
    <%--stu.name 实现原理 getName()--%>
    学生姓名：${stu.name} <br>
    学生年龄：${stu.age} <br>

    <%--3.获取数组类型--%>
    <%
        String[] arr = {"hello","world"};
        pageContext.setAttribute("arr",arr);
    %>
    数组：${arr}  <br>
    0索引元素：${arr[0]} <br>
    1索引元素：${arr[1]} <br>

    <%--4.获取List集合--%>
    <%
        ArrayList<String> list = new ArrayList<>();
        list.add("aaa");
        list.add("bbb");
        pageContext.setAttribute("list",list);
    %>
    List集合：${list} <br>
    0索引元素：${list[0]} <br>

    <%--5.获取Map集合--%>
    <%
        HashMap<String,Student> map = new HashMap<>();
        map.put("hm01",new Student("张三",23));
        map.put("hm02",new Student("李四",24));
        pageContext.setAttribute("map",map);
    %>
    Map集合：${map}  <br>
    第一个学生对象：${map.hm01}  <br>
    第一个学生对象的姓名：${map.hm01.name}
</body>
</html>

<--页面输出效果
基本数据类型：10
自定义对象：bean.Student@5f8da92c   (地址)
学生姓名：[已隐藏]
学生年龄：23
数组：[Ljava.lang.String;@4b3bd520
0索引元素：hello
1索引元素：world
List集合：[aaa, bbb]
0索引元素：aaa
Map集合：{hm01=bean.Student@4768d250, hm02=bean.Student@67f237d9}
第一个学生对象：bean.Student@4768d250
第一个学生对象的姓名：[已隐藏]
-->
```



***



#### 异常问题

EL表达式的注意事项：

1. EL表达式没有空指针异常
2. EL表达式没有数组下标越界
3. EL表达式没有字符串拼接

```jsp
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
  <head>
    <title>EL表达式的注意事项</title>
  </head>
  <body>
    第一个：没有空指针异常<br/>
    <% String str = null;
        request.setAttribute("testNull",str);
    %>
    str：${testNull}
    <hr/>
    第二个：没有数组下标越界<br/>
    <% String[] strs = new String[]{"a","b","c"};
        request.setAttribute("strs",strs);
    %>
    取第一个元素：${strs[0]}<br/>
    取第六个元素：${strs[5]}<br/>
    <hr/>
    第三个：没有字符串拼接<br/>
    <%--${strs[0]+strs[1]}--%>
    拼接：${strs[0]}+${strs[1]} <%--注意拼接--%>
  </body>
</html>

<--页面输出效果
第一个：没有空指针异常
str：
第二个：没有数组下标越界
取第一个元素：a
取第六个元素：
第三个：没有字符串拼接
拼接：a+b
-->
```



***



#### 运算符

EL表达式中运算符：

* 关系运算符：![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/EL表达式关系运算符.png)

* 逻辑运算符：

  | 逻辑运算符 | 说明 |
  | ---------- | ---- |
  | && 或 and  | 交集 |
  | \|\| 或 or | 并集 |
  | ! 或 not   | 非   |

  ​	  

* 其他运算符

  | 运算符                   | 作用                                                         |
  | ------------------------ | ------------------------------------------------------------ |
  | empty                    | 1. 判断对象是否为null<br />2. 判断字符串是否为空字符串<br />3. 判断容器元素是否为0 |
  | 条件 ? 表达式1 : 表达式2 | 三元运算符，条件?真:假                                       |

```jsp
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>EL表达式运算符</title>
</head>
<body>
    <%--empty--%>
    <%
        String str1 = null;
        String str2 = "";
        int[] arr = {};
    %>
    ${empty str1} <br>
    ${empty str2} <br>
    ${empty arr} <br>

    <%--三元运算符。获取性别的数据，在对应的按钮上进行勾选--%>
    <% pageContext.setAttribute("gender","women"); %>
    <input type="radio" name="gender" value="men" ${gender=="men"?"checked":""}>男
    <input type="radio" name="gender" value="women" ${gender=="women"?"checked":""}>女
</body>
</html>

```

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/EL表达式运算符效果图.png)



****



#### 四大域数据

EL表达式只能从从四大域中获取数据，调用的就是`findAttribute(name,value);`方法，根据名称由小到大在域对象中查找，找到就返回，找不到就什么都不显示。

```jsp
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
<head>
    <title>EL表达式使用细节</title>
</head>
<body>
    <%--获取四大域对象中的数据--%>
    <%
        //pageContext.setAttribute("username","zhangsan");
        request.setAttribute("username","zhangsan");
        //session.setAttribute("username","zhangsan");
        //application.setAttribute("username","zhangsan");
    %>
    ${username} <br>

    <%--获取JSP中其他八个隐式对象  获取虚拟目录名称--%>
    <%= request.getContextPath()%>
    ${pageContext.request.contextPath}
</body>
</html>
```



***
