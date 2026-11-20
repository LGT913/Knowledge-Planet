---
title: "Element"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Element, system]
summary: "Element：网站快速成型工具，是饿了么公司前端开发团队提供的一套基于Vue的网站组件库，使用Element前提必须要有Vue"
private: false
---

## Element

Element：网站快速成型工具，是饿了么公司前端开发团队提供的一套基于Vue的网站组件库，使用Element前提必须要有Vue

组件：组成网页的部件，例如超链接、按钮、图片、表格等等

- Element官网：https://element.eleme.cn/#/zh-CN

* 开发步骤：

  1. 下载 Element 核心库
  2. 引入 Element 样式文件
  3. 引入 Vue 核心 js 文件
  4. 引入 Element 核心 js 文件
  5. 编写按钮标签
  6. 通过 Vue 核心对象加载元素

* 代码实现

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>快速入门</title>
      <link rel="stylesheet" href="element-ui/lib/theme-chalk/index.css">
      <script src="js/vue.js"></script>
      <script src="element-ui/lib/index.js"></script>
  </head>
  <body>
      <button>我是按钮</button>
      <br>
      <div id="div">
          <el-row>
              <el-button>默认按钮</el-button>
              <el-button type="primary">主要按钮</el-button>
              <el-button type="success">成功按钮</el-button>
              <el-button type="info">信息按钮</el-button>
              <el-button type="warning">警告按钮</el-button>
              <el-button type="danger">危险按钮</el-button>
            </el-row>
            <br>
            <el-row>
              <el-button plain>朴素按钮</el-button>
              <el-button type="primary" plain>主要按钮</el-button>
              <el-button type="success" plain>成功按钮</el-button>
              <el-button type="info" plain>信息按钮</el-button>
              <el-button type="warning" plain>警告按钮</el-button>
              <el-button type="danger" plain>危险按钮</el-button>
            </el-row>
            <br>
            <el-row>
              <el-button round>圆角按钮</el-button>
              <el-button type="primary" round>主要按钮</el-button>
              <el-button type="success" round>成功按钮</el-button>
              <el-button type="info" round>信息按钮</el-button>
              <el-button type="warning" round>警告按钮</el-button>
              <el-button type="danger" round>危险按钮</el-button>
            </el-row>
            <br>
            <el-row>
              <el-button icon="el-icon-search" circle></el-button>
              <el-button type="primary" icon="el-icon-edit" circle></el-button>
              <el-button type="success" icon="el-icon-check" circle></el-button>
              <el-button type="info" icon="el-icon-message" circle></el-button>
              <el-button type="warning" icon="el-icon-star-off" circle></el-button>
              <el-button type="danger" icon="el-icon-delete" circle></el-button>
            </el-row>
      </div>
  </body>
  <script>
      new Vue({
          el:"#div"
      });
  </script>
  </html>
  ```

  

*****
