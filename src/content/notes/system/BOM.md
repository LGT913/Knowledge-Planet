---
title: "BOM"
date: 2023-09-26
planet: system
tags: ["Java", "基础", BOM, system]
summary: "BOMBrowser Object Model：浏览器对象模型。"
private: false
---

## BOM

### BOM介绍

BOM(Browser Object Model)：浏览器对象模型。

将浏览器的各个组成部分封装成不同的对象，方便我们进行操作。

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/BOM介绍.png)





***



### Window

Windows窗口对象：

- **定时器**
  - 唯一标识 setTimeout(功能，毫秒值)：设置一次性定时器。
  - clearTimeout(标识)：取消一次性定时器。
  - 唯一标识 setInterval(功能，毫秒值)：设置循环定时器。
  - clearInterval(标识)：取消循环定时器。
- 加载事件
  - window.onload：在页面加载完毕后触发此事件的功能

```js
<script>
    //一、定时器
    function fun(){
        alert("该起床了！");
    }

	//设置一次性定时器
    let d1 = setTimeout("fun()",3000);
    //取消一次性定时器
    clearTimeout(d1);

    //设置循环定时器，3秒弹出一次
    let d2 = setInterval("fun()",3000);
    //取消循环定时器
    clearInterval(d2);

    //加载事件
    let div = document.getElementById("div");
    alert(div);
</script>
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>window窗口对象</title>
    <script>
        function fun(){
            alert("该起床了！");
        }
        //加载事件
        window.onload = function(){
            let div = document.getElementById("div");
            alert(div);
        }
    </script>
</head>
<body>
    <div id="div">dddd</div>
</body>
</html>
```



***



### Location

Location地址栏对象：

* href 属性：浏览器的地址栏。我们可以通过为该属性设置新的URL，使浏览器读取并显示新URL的内容

实现效果：秒数会自动变小，倒计时，5，4，3，2，1

```html
<body>
    <p>
        注册成功！<span id="time">5</span>秒之后自动跳转到首页...
    </p>
</body>
<script>
    //1.定义方法。改变秒数，跳转页面
    let num = 5;
    function showTime() {
        num--;

        if(num <= 0) {
            //跳转首页
            location.href = "index.html";
        }
        let span = document.getElementById("time");
        span.innerText = num;
    }
    //2.设置循环定时器，每1秒钟执行showTime方法
    setInterval("showTime()",1000);
</script>
```





***
