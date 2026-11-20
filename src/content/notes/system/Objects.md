---
title: "Objects"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Objects, system]
summary: "Objects 类与 Object 是继承关系"
private: false
---

### Objects

Objects 类与 Object 是继承关系

Objects 的方法：

* `public static boolean equals(Object a, Object b)`：比较两个对象是否相同
  
    ```java
  public static boolean equals(Object a, Object b) {
      // 进行非空判断，从而可以避免空指针异常
      return a == b || a != null && a.equals(b);
  }
  ```

* `public static boolean isNull(Object obj)`：判断变量是否为 null ，为 null 返回 true

* `public static String toString(对象)`：返回参数中对象的字符串表示形式

* `public static String toString(对象, 默认字符串)`：返回对象的字符串表示形式

```java
public class ObjectsDemo {
    public static void main(String[] args) {
        Student s1 = null;
        Student s2 = new Student();
        System.out.println(Objects.equals(s1 , s2));//推荐使用
        // System.out.println(s1.equals(s2)); // 空指针异常
 
        System.out.println(Objects.isNull(s1));
        System.out.println(s1 == null);//直接判断比较好
    }
}

public class Student {
}
```



***
