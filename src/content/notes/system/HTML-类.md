---
title: "类"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 类, system]
summary: "eat : function {               document.write'吃饭...';           }       };"
private: false
---

## 对象

### 类

* 定义格式：

  ```js
  class 类名{
      constructor(变量列表){
          变量赋值;
      }
      方法名(参数列表) {
          方法体;
          return 返回值;
      }
  }
  ```

* 使用格式

  ```js
  let 对象名 = new 类名(实际变量值);
  对象名.方法名();
  ```



* 字面量类

  ```js
  <script>
      //定义person
      let person = {
          name : "张三",
          age : 23,
          hobby : ["听课","学习"],
  
          eat : function() {
              document.write("吃饭...");
          }
      };
  
      //使用person
      document.write(person.name + "," + person.age + "," + person.hobby[0]+"<br>");
      person.eat();
  </script>
  ```




***
