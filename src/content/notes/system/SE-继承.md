---
title: "继承"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 继承, system]
summary: "继承是 Java 中一般到特殊的关系，是一种子类到父类的关系"
private: false
---

### 继承

#### 基本介绍

继承是 Java 中一般到特殊的关系，是一种子类到父类的关系

* 被继承的类称为：父类/超类
* 继承父类的类称为：子类

继承的作用：

* **提高代码的复用**，相同代码可以定义在父类中
* 子类继承父类，可以直接使用父类这些代码（相同代码重复利用）
* 子类得到父类的属性（成员变量）和行为（方法），还可以定义自己的功能，子类更强大

继承的特点：

1. 子类的全部构造器默认先访问父类的无参数构造器，再执行自己的构造器
2. **单继承**：一个类只能继承一个直接父类
3. 多层继承：一个类可以间接继承多个父类（家谱）
4. 一个类可以有多个子类
5. 一个类要么默认继承了 Object 类，要么间接继承了 Object 类，**Object 类是 Java 中的祖宗类**

继承的格式：

```java
子类 extends 父类{

}
```

子类不能继承父类的东西：

* 子类不能继承父类的构造器，子类有自己的构造器
* 子类是不能可以继承父类的私有成员的，可以反射暴力去访问继承自父类的私有成员
* 子类是不能继承父类的静态成员，父类静态成员只有一份可以被子类共享访问，**共享并非继承**

```java
public class ExtendsDemo {
    public static void main(String[] args) {
        Cat c = new Cat();
        // c.run();
        Cat.test();
        System.out.println(Cat.schoolName);
    }
}

class Cat extends Animal{
}

class Animal{
    public static String schoolName ="seazean";
    public static void test(){}
    private void run(){}
}
```



***



#### 变量访问

继承后成员变量的访问特点：**就近原则**，子类有找子类，子类没有找父类，父类没有就报错

如果要申明访问父类的成员变量可以使用：super.父类成员变量，super指父类引用

```java
public class ExtendsDemo {
    public static void wmain(String[] args) {
        Wolf w = new Wolf();w
        w.showName();
    }
}

class Wolf extends Animal{
    private String name = "子类狼";
    public void showName(){
        String name = "局部名称";
        System.out.println(name); // 局部name
        System.out.println(this.name); // 子类对象的name
        System.out.println(super.name); // 父类的
        System.out.println(name1); // 父类的
        //System.out.println(name2); // 报错。子类父类都没有
    }
}

class Animal{
    public String name = "父类动物名称";
    public String name1 = "父类";
}
```



***



#### 方法访问

子类继承了父类就得到了父类的方法，**可以直接调用**，受权限修饰符的限制，也可以重写方法

方法重写：子类重写一个与父类申明一样的方法来**覆盖**父类的该方法

方法重写的校验注解：@Override

* 方法加了这个注解，那就必须是成功重写父类的方法，否则报错
* @Override 优势：可读性好，安全，优雅

**子类可以扩展父类的功能，但不能改变父类原有的功能**，重写有以下三个限制：

- 子类方法的访问权限必须大于等于父类方法
- 子类方法的返回类型必须是父类方法返回类型或为其子类型
- 子类方法抛出的异常类型必须是父类抛出异常类型或为其子类型

继承中的隐藏问题：

- 子类和父类方法都是静态的，那么子类中的方法会隐藏父类中的方法
- 在子类中可以定义和父类成员变量同名的成员变量，此时子类的成员变量隐藏了父类的成员变量，在创建对象为对象分配内存的过程中，**隐藏变量依然会被分配内存**

```java
public class ExtendsDemo {
    public static void main(String[] args) {
        Wolf w = new Wolf();
        w.run();
    }
}
class Wolf extends Animal{
    @Override
    public void run(){}//
}
class Animal{
    public void run(){}
}
```



***



#### 常见问题

* 为什么子类构造器会先调用父类构造器？
  
  1. 子类的构造器的第一行默认 super() 调用父类的无参数构造器，写不写都存在
  2. 子类继承父类，子类就得到了父类的属性和行为。调用子类构造器初始化子类对象数据时，必须先调用父类构造器初始化继承自父类的属性和行为
  3. 参考 JVM → 类加载 → 对象创建
  
  ```java
  class Animal {
      public Animal() {
          System.out.println("==父类Animal的无参数构造器==");
      }
  }
  
  class Tiger extends Animal {
      public Tiger() {
          super(); // 默认存在的，根据参数去匹配调用父类的构造器。
          System.out.println("==子类Tiger的无参数构造器==");
      }
      public Tiger(String name) {
          //super();  默认存在的，根据参数去匹配调用父类的构造器。
          System.out.println("==子类Tiger的有参数构造器==");
      }
  }
  ```
  
* **为什么 Java 是单继承的？**
  
  答：反证法，假如 Java 可以多继承，请看如下代码：
  
  ```java
  class A{
  	public void test(){
  		System.out.println("A");
  	}
  }
  class B{
  	public void test(){
  		System.out.println("B");
  	}
  }
  class C extends A , B {
  	public static void main(String[] args){
  		C c = new C();
          c.test(); 
          // 出现了类的二义性！所以Java不能多继承！！
  	}
  }
  ```
  
  



------
