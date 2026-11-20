---
title: "自定义"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 自定义, system]
summary: "new Vue{           el:'div'       };   </script"
private: false
---

## 自定义

对组件的封装

* 定义格式

  ```vue
  Vue.component(组件名称, {
       props:组件的属性,
       data: 组件的数据函数,
       template: 组件解析的标签模板
  })
  ```

* 代码实现

  ```html
  <body>
      <div id="div">
          <my-button>我的按钮</my-button>
      </div>
  </body>
  <script>
      Vue.component("my-button",{
          // 属性
          props:["style"],
          // 数据函数
          data: function(){
              return{
                  msg:"我的按钮"
              }
          },
          //解析标签模板
          template:"<button style='color:red'>{{msg}}</button>"
      });
  
      new Vue({
          el:"#div"
      });
  </script>
  ```

* 效果

  <div id="div"><button style="color: red;">我的按钮</button></div>



***

## 生命周期

* 生命周期

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Vue生命周期.png)

* 生命周期八个阶段

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Vue生命周期的八个阶段.png)



***
