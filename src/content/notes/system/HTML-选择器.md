---
title: "选择器"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 选择器, system]
summary: "为了样式化某些元素，我们会通过选择器来选中HTML文档中的这些元素，每个CSS规则都以一个选择器或一组选择器为开始，去告诉浏览器这些规则应该应用到哪些元素上。"
private: false
---

### 选择器

#### 介绍选择器

为了样式化某些元素，我们会通过选择器来选中HTML文档中的这些元素，每个CSS规则都以一个选择器或一组选择器为开始，去告诉浏览器这些规则应该应用到哪些元素上。

选择器的分类：

| 分类       | 名称       | 符号   | 作用                                                         | 示例         |
| ---------- | ---------- | ------ | ------------------------------------------------------------ | ------------ |
| 基本选择器 | 元素选择器 | 标签名 | 基于标签名匹配元素                                           | div{ }       |
|            | 类选择器   | `.`    | 基于class属性值匹配元素                                      | .center{ }   |
|            | ID选择器   | `#`    | 基于id属性值匹配元素                                         | #username{ } |
|            | 通用选择器 | `*`    | 匹配文档中的所有内容                                         | *{ }         |
| 属性选择器 | 属性选择器 | `[]`   | 基于某属性匹配元素                                           | [type]{ }    |
| 伪类选择器 | 伪类选择器 | `:`    | 用于向某些选择器添加特殊的效果                               | a:hover{ }   |
| 组合选择器 | 分组选择器 | ,      | 使用 , 号结合两个选择器，匹配两个选择器的元素                | span,p{}     |
|            | 后代选择器 | 空格   | 使用空格符号结合两个选择器，基于<br />第一个选择器，匹配第二个选择器的所有后代元素 | .top li{ }   |



#### 基本选择器

* 页面元素：

  ```html
  <body>
      <div>div1</div>
  
      <div class="cls">div2</div>
      <div class="cls">div3</div>
  
      <div id="d1">div4</div>
      <div id="d2">div5</div>
  </body>
  ```

  

* 元素选择器

  ```css
  /*选择所有div标签,字体为蓝色*/
  div{
  	 color: red;
  }
  ```

* 类选择器

  ```css
  /*选择class为cls的,字体为蓝色*/
  .cls{
  	color: blue;
  }
  ```

* ID选择器

  ```css
  /*id选择器*/
  #d1{
      color: green;/*id为d1的字体变成绿色*/
  }
  
  #d2{
      color: pink;/*id为d2的字体变成粉色*/
  }/
  ```

* 通用选择器

  ```css
  /*所有标签 */
  *{
      background-color: aqua;
  }
  ```

  

***



#### 属性选择器

* 页面：

  ```html
  <body>
      用户名：<input type="text"/> <br/>
      密码：<input type="password"/> <br>
      邮箱：<input type="email"/> <br>
  </body>
  ```

* 选择器：

  ```css
  /*输入框中输入的字符是红色*/
  [type] {
      color: red;
  }
  /*输入框中输入的字符是蓝色*/
  [type=password] {
      color: blue;
  }
  ```




***



#### 伪类选择器

* 页面元素

  ```html
  <body>
      <a href="https://www.baidu.com" target="_blank">百度一下</a>
  </body>
  ```

* 伪类选择器

  ```css
  /*未访问的状态*/
  a:link{
  	color: black;
  }
  
  /*已访问的状态*/
  a:visited{
  	color: blue;
  }
  
  /*鼠标悬浮的状态*/
  a:hover{
  	color: red;
  }
  
  /*已选中的状态*/
  a:active{
  	color: yellow;
  }
  ```

* 注意：伪类顺序 link ，visited，hover，active，否则有可能失效。



***



#### 组合选择器

* 页面：

  ```html
  <body>
      <span>span</span> <br/>
      <p>段落</p>
      
      <div class="top">
          <ol>
              <li>aa</li>
              <li>bb</li>
          </ol>
      </div>
      <div class="center">
          <ol>
              <li>cc</li>
              <li>dd</li>
          </ol>
      </div>
  </body>
  ```

* 分组选择器

  ```css
  /*span p两个标签下的字体为蓝色*/
  span,p{
  	color: blue;
  }
  ```

* 后代选择器

  ```css
  /*class为top下的所有li标签字体颜色为红色*/
  .top li{
  	color: red;
  }
  ```




***



#### 优先级

选择器优先级

* ID选择器 > 类选择器 > 标签选择器 > 通用选择器
* 如果优先级相同，那么就满足就近原则



***
