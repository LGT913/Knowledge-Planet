---
title: "CSS入门"
date: 2023-09-26
planet: system
tags: ["Java", "基础", CSS入门, system]
summary: "CSS 层叠样式表——Cascading Style Sheets，缩写为 CSS），简单的说，它是用于设置和布局网页的计算机语言。会告知浏览器如何渲染页面元素。例如，调整内容的字体，颜色，大小等样式，设置边框的样式，调整模块的间距等。"
private: false
---

## CSS入门

### 概述

CSS (层叠样式表——Cascading Style Sheets，缩写为 **CSS**），简单的说，它是用于设置和布局网页的计算机语言。会告知浏览器如何渲染页面元素。例如，调整内容的字体，颜色，大小等样式，设置边框的样式，调整模块的间距等。

层叠：是指样式表允许以多种方式规定样式信息。可以规定在单个元素中，可以在页面头元素中，也可以在另一个CSS文件中，规定的方式会有次序的差别。

样式：是指丰富的样式外观。拿边框距离来说，允许任何设置边框，允许设置边框与框内元素的距离，允许设置边框与边框的距离等等。



***



### 组成

CSS是一门基于规则的语言—你能定义用于你的网页中**特定元素**的一组**样式规则**。这里面提到了两个概念，一是特定元素，二是样式规则。对应CSS的语法，也就是**选择器（*selects*）**和**声明（*eclarations*）**。

* 选择器：指定要添加样式的 HTML元素的方式。可以使用标签名，class值，id值等多种方式。
* 声明：形式为**属性(property):值(value)**，用于设置特定元素的属性信息。
  * 属性：指示文体特征，例如`font-size`，`width`，`background-color`。
  * 值：每个指定的属性都有一个值，该值指示您如何更改这些样式。

格式：

```css
选择器 {
    属性名:属性值;
    属性名:属性值;
    属性名:属性值;
}
```

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/CSS的组成.png)



***



### 实现

<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>页面标题</title>
	<style>
        h1{
            font-size:40px; /* 设置字体大小为100像素*/
        }
    </style>
  </head>
  <body>
      <h1>今天开始学CSS</h1>
  </body>
</html>





***

## CSS语法

### 注释方式

CSS中的注释以`/*`和开头`*/`。

```css
/* 设置h1的样式 */
h1 {
  color: blue;
  background-color: yellow;
  border: 1px solid black;
}
```



***
