---
title: "super"
date: 2023-09-26
planet: system
tags: ["Java", "基础", super, system]
summary: "继承后 super 调用父类构造器，父类构造器初始化继承自父类的数据。"
private: false
---

### super

继承后 super 调用父类构造器，父类构造器初始化继承自父类的数据。


总结与拓展：

* this 代表了当前对象的引用（继承中指代子类对象）：this.子类成员变量、this.子类成员方法、**this(...)** 可以根据参数匹配访问本类其他构造器
* super 代表了父类对象的引用（继承中指代了父类对象空间）：super.父类成员变量、super.父类的成员方法、super(...) 可以根据参数匹配访问父类的构造器

注意：

* this(...) 借用本类其他构造器，super(...) 调用父类的构造器
* this(...) 或 super(...) 必须放在构造器的第一行，否则报错
* this(...) 和 super(...) **不能同时出现**在构造器中，因为构造函数必须出现在第一行上，只能选择一个

```java
public class ThisDemo {
    public static void main(String[] args) {
        // 需求：希望如果不写学校默认就是”张三“！
        Student s1 = new Student("天蓬元帅", 1000 );
        Student s2 = new Student("齐天大圣", 2000, "清华大学" );
    }
}
class Study extends Student {
   public Study(String name, int age, String schoolName) {
        super(name , age , schoolName) ; 
       // 根据参数匹配调用父类构造器
   }
}

class Student{
    private String name ;
    private int age ;
    private String schoolName ;

    public Student() {
    }
    public Student(String name , int age){
        // 借用兄弟构造器的功能！
        this(name , age , "张三");
    }
	public Student(String name, int age, String schoolName) {
        this.name = name;
        this.age = age;
        this.schoolName = schoolName;
    }
	// .......get + set
}
```



***
