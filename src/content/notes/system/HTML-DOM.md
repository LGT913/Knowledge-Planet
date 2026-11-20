---
title: "DOM"
date: 2023-09-26
planet: system
tags: ["Java", "基础", DOM, system]
summary: "// 2.cssname,value   设置CSS样式 $'btn2'.clickfunction{     $'div'.css'background','blue'; };"
private: false
---

### DOM

#### 文本操作

| 方法        | 作用                         |
| ----------- | ---------------------------- |
| html()      | 获取标签的文本               |
| html(value) | 设置标签的文本内容，解析标签 |

```js
//获取div标签的文本内容
let value = $("#div").html();
//设置div标签的文本内容
$("#div").html("<b>我是div</b>");
```



***



#### 对象操作

| 方法               | 作用                                                       |
| ------------------ | ---------------------------------------------------------- |
| $("元素")          | 创建指定元素                                               |
| append(element)    | 添加成最后一个子元素，由添加者对象调用                     |
| appendTo(element)  | 添加成最后一个子元素，由被添加者对象调用                   |
| prepend(element)   | 添加成第一个子元素，由添加者对象调用                       |
| prependTo(element) | 添加成第一个子元素，由被添加者对象调用                     |
| before(element)    | 添加到当前元素的前面，两者之间是兄弟关系，由添加者对象调用 |
| after(element)     | 添加到当前元素的后面，两者之间是兄弟关系，由添加者对象调用 |
| remove()           | 删除指定元素（自己移除自己）                               |
| empty()            | 清空指定元素的所有子元素（自己还在）                       |

<div id="div"></div>
<ul id="city">
    <li id="bj">北京</li>
    <li id="sh">上海</li>
</ul>
<ul id="desc">
    <li id="jy">加油</li>
</ul> 

```js
// 按钮一：添加一个span到div
$("#btn1").click(function(){
    let span = $("<span>span</span>");
    $("#div").append(span);
});
//按钮二：将加油添加到城市列表最下方
$("#btn2").click(function(){
    $("#city").append($("#jy"));
});
//按钮三：将加油添加到城市列表最上方
$("#btn3").click(function(){
    $("#jy").prependTo($("#city"));
});
//按钮四：将加油添加到北京下方
$("#btn4").click(function(){
    $("#bj").after($("#jy"));
});
```



***



#### 样式操作

| 方法               | 作用                                   |
| ------------------ | -------------------------------------- |
| css(name)          | 根据样式名称获取css样式                |
| css(name,value)    | 设置css样式                            |
| addClass(value)    | 给指定的对象添加样式类名               |
| removeClass(value) | 给指定的对象删除样式类名               |
| toggleClass(value) | 没有样式类名就添加，有就删除，循环如此 |

```css
.cls{
    background: pink;
}
```

```html
<div style="border: 1px solid red;" id="div">我是div</div>
```

```js
// 1.css(name)   获取css样式
$("#btn1").click(function(){
    alert($("#div").css("border"));  //1px solid rgb(255, 0, 0)
});

// 2.css(name,value)   设置CSS样式
$("#btn2").click(function(){
    $("#div").css("background","blue");
});

// 3.addClass(value)   给指定的对象添加样式类名
$("#btn3").click(function(){
    $("#div").addClass("cls");  //cls是一个css样式
});

// 4.toggleClass(value)  如果没有样式类名，则添加。如果有，则删除
$("#btn5").click(function(){
    $("#div").toggleClass("cls");
});
```



***



#### 属性操作

| 方法               | 作用                                   |
| ------------------ | -------------------------------------- |
| attr(name,[value]) | 获得/设置属性的值                      |
| prop(name,[value]) | 获得/设置属性的值（checked, selected） |

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>操作属性</title>
</head>
<body>
    <input type="text" id="username"> <br>
    <input type="button" id="btn1" value="获取输入框的id属性">  &nbsp;&nbsp;
    <input type="button" id="btn2" value="给输入框设置value属性"><br/>
    <input type="radio" id="gender1" name="gender">男
	<input type="radio" id="gender2" name="gender">女<br/>
	<input type="button" id="btn3" value="选中女"><br/><br/>
    <select>
    <option>---请选择---</option>
    <option id="bk">本科</option>
    <option id="zk">专科</option>
	</select><br/>
    <input type="button" id="btn4" value="选中本科">
</body>
</html>

```html
<script src="js/jquery-3.3.1.min.js"></script>
<script>
    //按钮一：获取输入框的id属性  attr(name,[value])
    $("#btn1").click(function(){
        alert($("#username").attr("id"));
    });
    
    //按钮二：给输入框设置value属性  attr(name,[value])
    $("#btn2").click(function(){
        $("#username").attr("value","hello...");
    });
    
    //按钮三：选中女   prop(name,[value]) 
    $("#btn3").click(function(){
        $("#gender2").prop("checked",true);
    });

    //按钮四：选中本科  prop(name,[value]) 
    $("#btn4").click(function(){
        $("#bk").prop("selected",true);
    });
</script>
```





***





# AJAX

## 概述

- AJAX(Asynchronous JavaScript And XML)：异步的 JavaScript 和 XML。 

- 不是一种新技术，而是多个技术综合，用于快速创建动态网页的技术。

- 一般的网页如果需要更新内容，必需重新加载个页面。而 AJAX 通过浏览器与服务器进行少量数据交换，就可以使网页实现异步更新。也就是在不重新加载整个页 面的情况下，对网页的部分内容进行**局部更新**。

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/AJAX网页局部更新.png)



***
