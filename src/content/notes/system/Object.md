---
title: "Object"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Object, system]
summary: "Object 类是 Java 中的祖宗类，一个类或者默认继承 Object 类，或者间接继承 Object 类，Object 类的方法是一切子类都可以直接使用"
private: false
---

## API

### Object

#### 基本介绍

Object 类是 Java 中的祖宗类，一个类或者默认继承 Object 类，或者间接继承 Object 类，Object 类的方法是一切子类都可以直接使用

Object 类常用方法：

* `public String toString()`：默认是返回当前对象在堆内存中的地址信息：类的全限名@内存地址，例：Student@735b478；
  * 直接输出对象名称，默认会调用 toString() 方法，所以省略 toString() 不写；
  * 如果输出对象的内容，需要重写 toString() 方法，toString 方法存在的意义是为了被子类重写
* `public boolean equals(Object o)`：默认是比较两个对象的引用是否相同
* `protected Object clone()`：创建并返回此对象的副本 

只要两个对象的内容一样，就认为是相等的：

```java
public boolean equals(Object o) {
	// 1.判断是否自己和自己比较，如果是同一个对象比较直接返回true
	if (this == o) return true;
	// 2.判断被比较者是否为null ,以及是否是学生类型。
	if (o == null || this.getClass() != o.getClass()) return false;
	// 3.o一定是学生类型，强制转换成学生，开始比较内容！
	Student student = (Student) o;
	return age == student.age &&
           sex == student.sex &&
           Objects.equals(name, student.name);
}
```

**面试题**：== 和 equals 的区别

* == 比较的是变量（栈）内存中存放的对象的（堆）内存地址，用来判断两个对象的**地址**是否相同，即是否是指相同一个对象，比较的是真正意义上的指针操作
* Object 类中的方法，**默认比较两个对象的引用**，重写 equals 方法比较的是两个对象的**内容**是否相等，所有的类都是继承自 java.lang.Object 类，所以适用于所有对象

hashCode 的作用：

* hashCode 的存在主要是用于查找的快捷性，如 Hashtable，HashMap 等，可以在散列存储结构中确定对象的存储地址
* 如果两个对象相同，就是适用于 equals(java.lang.Object) 方法，那么这两个对象的 hashCode 一定要相同
* 哈希值相同的数据不一定内容相同，内容相同的数据哈希值一定相同



***



#### 深浅克隆

Object 的 clone() 是 protected 方法，一个类不显式去重写 clone()，就不能直接去调用该类实例的 clone() 方法

深浅拷贝（克隆）的概念：

* 浅拷贝 (shallowCopy)：**对基本数据类型进行值传递，对引用数据类型只是复制了引用**，被复制对象属性的所有的引用仍然指向原来的对象，简而言之就是增加了一个指针指向原来对象的内存地址

  **Java 中的复制方法基本都是浅拷贝**：Object.clone()、System.arraycopy()、Arrays.copyOf()

* 深拷贝 (deepCopy)：对基本数据类型进行值传递，对引用数据类型是一个整个独立的对象拷贝，会拷贝所有的属性并指向的动态分配的内存，简而言之就是把所有属性复制到一个新的内存，增加一个指针指向新内存。所以使用深拷贝的情况下，释放内存的时候不会出现使用浅拷贝时释放同一块内存的错误

Cloneable 接口是一个标识性接口，即该接口不包含任何方法（包括 clone），但是如果一个类想合法的进行克隆，那么就必须实现这个接口，在使用 clone() 方法时，若该类未实现 Cloneable 接口，则抛出异常

* Clone & Copy：`Student s = new Student`

  `Student s1 = s`：只是 copy 了一下 reference，s 和 s1 指向内存中同一个 Object，对对象的修改会影响对方

  `Student s2 = s.clone()`：会生成一个新的 Student 对象，并且和 s 具有相同的属性值和方法

* Shallow Clone & Deep Clone：
  
  浅克隆：Object 中的 clone() 方法在对某个对象克隆时对其仅仅是简单地执行域对域的 copy
  
  * 对基本数据类型和包装类的克隆是没有问题的。String、Integer 等包装类型在内存中是**不可以被改变的对象**，所以在使用克隆时可以视为基本类型，只需浅克隆引用即可
  * 如果对一个引用类型进行克隆时只是克隆了它的引用，和原始对象共享对象成员变量

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/Object浅克隆.jpg)

  深克隆：在对整个对象浅克隆后，对其引用变量进行克隆，并将其更新到浅克隆对象中去

  ```java
  public class Student  implements Cloneable{
      private String name;
      private Integer age;
      private Date date;
  
      @Override
      protected Object clone() throws CloneNotSupportedException {
          Student s = (Student) super.clone();
          s.date = (Date) date.clone();
          return s;
      }
      //.....
  }
  ```

SDP → 创建型 → 原型模式



***
