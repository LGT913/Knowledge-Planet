---
title: "DOM"
date: 2023-09-26
planet: system
tags: ["Java", "基础", DOM, system]
summary: "DOMDocument Object Model：文档对象模型。"
private: false
---

## DOM

### DOM介绍

DOM(Document Object Model)：文档对象模型。

将 HTML 文档的各个组成部分，封装为对象。借助这些对象，可以对 HTML 文档进行增删改查的动态操作。

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/DOM介绍.png)





***



### 元素获取

Element元素的获取操作：document接口方法

| 方法                                | 说明                                  |
| ----------------------------------- | ------------------------------------- |
| getElementById(id属性值)            | 根据id属性值获取元素对象              |
| getElementsByTagName(标签名称)      | 根据标签名称获取元素对象，返回数组    |
| getElementsByClassName(class属性值) | 根据class属性值获取元素对象，返回数组 |
| getElementsByName(name属性值)       | 根据name属性值获取元素对象，返回数组  |
| 子元素对象.parentElement属性        | 获取当前元素的父元素                  |

```html
<body>
    <div id="div1">div1</div>
    <div id="div2">div2</div>
    <div class="cls">div3</div>
    <div class="cls">div4</div>
    <input type="text" name="username"/>
</body>
<script>
    let div1 = document.getElementById("div1");//根据id属性值获取元素对象
    //alert(div1);//[object HTMLDivElement]

    let body = div1.parentElement;//获取当前元素的父元素
    alert(body);
</script>
</html>
```



***



### 元素增删改

Element元素的增删改操作：

| 方法                         | 说明                       |
| ---------------------------- | -------------------------- |
| createElement(标签名)        | 创建一个新的标签元素       |
| appendChild(子元素)          | 将指定子元素添加到父元素中 |
| removeChild(子元素)          | 用父元素删除指定子元素     |
| replaceChild(新元素, 旧元素) | 用新元素替换子元素         |
| createTextNode(数据)         | 创建文本元素               |

```html
<body>
    <select id="s">
        <option>---请选择---</option>
        <option>北京</option>
    </select>
</body>
<script>
    let option = document.createElement("option");//创建新的元素
    option.innerText = "深圳";//为option添加文本内容
 
    let select = document.getElementById("s");
    select.appendChild(option);//将子元素添加到父元素中

    let option2 = document.createElement("option");
    option2.innerText = "杭州";
    select.replaceChild(option2,option);//用新元素替换老元素
</script>
```



***



### 属性操作

Attribute属性的操作：

| 方法                         | 说明                     |
| ---------------------------- | ------------------------ |
| setAttribute(属性名, 属性值) | 设置属性                 |
| getAttribute(属性名)         | 根据属性名获取属性值     |
| removeAttribute(属性名)      | 根据属性名移除指定的属性 |
| 元素名.style属性             | 为元素添加样式           |
| 元素名.className属性         | 为元素添加指定样式       |

```css
.aColor{
    color: blue;
}/*获取写在<style>标签*/
```

```html
<body>
    <a>点我呀</a>
</body>
<script>
    let a = document.getElementsByTagName("a")[0];//因为是数组
    a.setAttribute("href","https://www.baidu.com");//添加属性

    let value = a.getAttribute("href");//获取属性

    //a.style.color = "red";//添加样式
    a.className = "aColor";//添加指定CSS样式
</script>
```



***



### 文本操作

* Text文本的操作： 

  | 属性名    | 说明                       |
  | --------- | -------------------------- |
  | innerText | 元素的文本内容，不解析标签 |
  | innerHTML | 元素的文本内容，解析标签   |

  类似于赋值操作，同时支持取用该值

  ```html
  <body>
      <div id="div"></div>
  </body>
  <script>
      //1. innerText   添加文本内容，不解析标签
      let div = document.getElementById("div");
      div.innerText = "我是div";
  
      //2. innerHTML   添加文本内容，解析标签
      div.innerHTML = "<b>我是div</b>";
  </script>
  ```

* 输入框文本：input元素.value;







***
