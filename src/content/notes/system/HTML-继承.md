---
title: "继承"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 继承, system]
summary: "- 继承：让类与类产生子父类的关系，子类可以使用父类有权限的成员。"
private: false
---

### 继承

- 继承：让类与类产生子父类的关系，子类可以使用父类有权限的成员。

- 继承关键字：extends

- 顶级父类：Object

```js
<script>
    //定义Person类
    class Person{
        //构造方法
        constructor(name,age){
            this.name = name;
            this.age = age;
        }
        //eat方法
        eat(){
            document.write("吃饭...");
        }
    }
    //定义Worker类继承Person
    class Worker extends Person{
        constructor(name,age,salary){
            super(name,age);
            this.salary = salary;
        }

        show(){
            document.write(this.name + "," + this.age + "," + this.salary + "<br>");
        }
    }
    //使用Worker
    let w = new Worker("张三",23,10000);
    w.show();
    w.eat();
</script>
```



****

### 内置对象

内置对象是 JavaScript 提供的带有属性和方法的特殊数据类型，常见的有普通类型、JSON和正则表达式



***
