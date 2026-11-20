---
title: "final"
date: 2023-09-26
planet: system
tags: ["Java", "基础", final, system]
summary: "final 修饰类，类不能被继承了，类中的方法和变量可以使用  final 可以修饰方法，方法就不能被重写  final 修饰变量总规则：变量有且仅能被赋值一次"
private: false
---

### final

#### 基本介绍

final 用于修饰：类，方法，变量

* final 修饰类，类不能被继承了，类中的方法和变量可以使用
* final 可以修饰方法，方法就不能被重写
* final 修饰变量总规则：变量有且仅能被赋值一次

final 和 abstract 的关系是**互斥关系**，不能同时修饰类或者同时修饰方法



***



#### 修饰变量

##### 静态变量

final 修饰静态成员变量，变量变成了常量

常量：有 public static final 修饰，名称字母全部大写，多个单词用下划线连接

final 修饰静态成员变量可以在哪些地方赋值：

1. 定义的时候赋值一次

2. 可以在静态代码块中赋值一次

```java
public class FinalDemo {
	//常量：public static final修饰，名称字母全部大写，下划线连接。
    public static final String SCHOOL_NAME = "张三" ;
    public static final String SCHOOL_NAME1;

    static{
        //SCHOOL_NAME = "java";//报错
        SCHOOL_NAME1 = "张三1";
    }
}
```



***



##### 实例变量

final 修饰变量的总规则：有且仅能被赋值一次

final 修饰实例成员变量可以在哪些地方赋值 1 次：

1. 定义的时候赋值一次
2. 可以在实例代码块中赋值一次
3. 可以在每个构造器中赋值一次

```java
public class FinalDemo {
    private final String name = "张三" ;
    private final String name1;
    private final String name2;
    {
        // 可以在实例代码块中赋值一次。
        name1 = "张三1";
    }
	//构造器赋值一次
    public FinalDemo(){
        name2 = "张三2";
    }
    public FinalDemo(String a){
        name2 = "张三2";
    }

    public static void main(String[] args) {
        FinalDemo f1 = new FinalDemo();
        //f1.name = "张三1"; // 第二次赋值 报错！
    }
}
```



***
