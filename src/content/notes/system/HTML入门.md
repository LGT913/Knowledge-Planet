---
title: "HTML入门"
date: 2023-09-26
planet: system
tags: ["Java", "基础", HTML入门, system]
summary: "HTML（超文本标记语言—HyperText Markup Language）是构成 Web 世界的基础，是一种用来告知浏览器如何组织页面的标记语言"
private: false
---

## HTML入门

### 概述

HTML（超文本标记语言—HyperText Markup Language）是构成 Web 世界的基础，是一种用来告知浏览器如何组织页面的标记语言

* 超文本 Hypertext，是指连接单个或者多个网站间的网页的链接。通过链接，就能访问互联网中的内容

* 标记 Markup ，是用来注明文本，图片等内容，以便于在浏览器中显示，例如 `<head>`，`<body>` 等

**网页的构成**

* [HTML](https://developer.mozilla.org/zh-CN/docs/Web/HTML)：通常用来定义网页内容的含义和基本结构
* [CSS](https://developer.mozilla.org/zh-CN/docs/Web/CSS)：通常用来描述网页的表现与展示效果
* [JavaScript](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)：通常用来执行网页的功能与行为



参考视频：https://www.bilibili.com/video/BV1Qf4y1T7Hx



***



### 组成

#### 标签

HTML 页面由一系列的**元素（elements）** 组成，而元素是使用**标签**创建的

一对标签（tags）可以设置一段文字样式，添加一张图片或者添加超链接等等

在 HTML 中，`<h1>` 标签表示**标题**，我们可以使用**开始标签**和**结束标签**包围文本内容，这样其中的内容就以标题的形式显示

```html
<h1>开始学习JavaWeb</h1>
<h2>二级标题</h2>
```



#### 属性

HTML 标签可以拥有属性

* 属性是属于标签的，修饰标签，让标签有更多的效果
* 属性一般定义在起始标签里面
* 属性一般以**属性=属性值**的形式出现
* 属性值一般用 `''` 或者 `""` 括起来。 不加引号也是可以的(不建议使用)。比如：name='value'

```html
<h1 align="center">开始学习JavaWeb</h1>
```

在 HTML 标签中，`align`  属性表示**水平对齐方式**，我们可以赋值为 `center`  表示 **居中** 。



***



### 结构

![HTML结构](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/HTML结构.png)

文档结构介绍：

* 文档声明：用于声明当前 HTML 的版本，这里的`<!DOCTYPE html>`是 HTML5 的声明
* html 根标签：除文档声明以外，其它内容全部要放在根标签 html 内部
* 文档头部配置：head 标签，是当前页面的配置信息，外部引入文件, 例如网页标签、字符集等
  * `<meta charset="utf-8">`：这个标签是页面的元数据信息，设置文档使用 utf-8 字符集编码
  * `<title>`：这个标签定义文档标题，位置出现在浏览器标签。在收藏页面时，它可用来描述页面
* 文档显示内容：body 标签，里边的内容会显示到浏览器页面上





***

## HTML语法

### 注释方式

将一段 HTML 中的内容置为注释，你需要将其用特殊的记号 <!----> 包括起来

```html
<p>我在注释外！</p>

<!-- <p>我在注释内！</p> -->
```



***
