---
title: "String"
date: 2023-09-26
planet: system
tags: ["Java", "基础", String, system]
summary: "String 被声明为 final，因此不可被继承 （Integer 等包装类也不能被继承）"
private: false
---

### String

#### 基本介绍

String 被声明为 final，因此不可被继承 **（Integer 等包装类也不能被继承）**

```java
public final class String implements java.io.Serializable, Comparable<String>, CharSequence {
 	/** The value is used for character storage. */
    private final char value[];
    /** Cache the hash code for the string */
    private int hash; // Default to 0
}
```

在 Java 9 之后，String 类的实现改用 byte 数组存储字符串，同时使用 `coder` 来标识使用了哪种编码

value 数组被声明为 final，这意味着 value 数组初始化之后就不能再引用其它数组，并且 String 内部没有改变 value 数组的方法，因此可以**保证 String 不可变，也保证线程安全**

注意：不能改变的意思是**每次更改字符串都会产生新的对象**，并不是对原始对象进行改变

```java
String s = "abc";
s = s + "cd"; //s = abccd 新对象
```



****



#### 常用方法

常用 API：

* `public boolean equals(String s)`：比较两个字符串内容是否相同、区分大小写

* `public boolean equalsIgnoreCase(String anotherString)`：比较字符串的内容，忽略大小写
* `public int length()`：返回此字符串的长度
* `public String trim()`：返回一个字符串，其值为此字符串，并删除任何前导和尾随空格
* `public String[] split(String regex)`：将字符串按给定的正则表达式分割成字符串数组
* `public char charAt(int index)`：取索引处的值
* `public char[] toCharArray()`：将字符串拆分为字符数组后返回
* `public boolean startsWith(String prefix)`：测试此字符串是否以指定的前缀开头
* `public int indexOf(String str)`：返回指定子字符串第一次出现的字符串内的索引，没有返回 -1
* `public int lastIndexOf(String str)`：返回字符串最后一次出现 str 的索引，没有返回 -1
* `public String substring(int beginIndex)`：返回子字符串，以原字符串指定索引处到结尾
* `public String substring(int i, int j)`：指定索引处扩展到 j - 1 的位置，字符串长度为 j - i
* `public String toLowerCase()`：将此 String 所有字符转换为小写，使用默认语言环境的规则
* `public String toUpperCase()`：使用默认语言环境的规则将此 String 所有字符转换为大写
* `public String replace(CharSequence target, CharSequence replacement)`：使用新值，将字符串中的旧值替换，得到新的字符串

```java
String s = 123-78;
s.replace("-","");//12378
```



***



#### 构造方式

构造方法：

* `public String()`：创建一个空白字符串对象，不含有任何内容
* `public String(char[] chs)`：根据字符数组的内容，来创建字符串对象
* `public String(String original)`：根据传入的字符串内容，来创建字符串对象

直接赋值：`String s = "abc"` 直接赋值的方式创建字符串对象，内容就是 abc

- 通过构造方法创建：通过 new 创建的字符串对象，每一次 new 都会申请一个内存空间，虽然内容相同，但是地址值不同，**返回堆内存中对象的引用**
- 直接赋值方式创建：以 `" "` 方式给出的字符串，只要字符序列相同（顺序和大小写），无论在程序代码中出现几次，JVM 都只会**在 String Pool 中创建一个字符串对象**，并在字符串池中维护

`String str = new String("abc")` 创建字符串对象：

* 创建一个对象：字符串池中已经存在 abc 对象，那么直接在创建一个对象放入堆中，返回堆内引用
* 创建两个对象：字符串池中未找到 abc 对象，那么分别在堆中和字符串池中创建一个对象，字符串池中的比较都是采用 equals() 
  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/String构造方法字节码.png" style="zoom: 67%;" />

`new String("a") + new String("b")` 创建字符串对象：

* 对象 1：new StringBuilder()

* 对象 2：new String("a")、对象 3：常量池中的 a

* 对象 4：new String("b")、对象 5：常量池中的 b
  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/String拼接方法字节码.png" style="zoom:67%;" />

*  StringBuilder 的 toString()：

  ```java
  @Override
  public String toString() {
      return new String(value, 0, count);
  }
  ```

  * 对象 6：new String("ab")
  * StringBuilder 的 toString() 调用，**在字符串常量池中没有生成 ab**，new String("ab") 会创建两个对象因为传参数的时候使用字面量创建了对象 ab，当使用数组构造 String 对象时，没有加入常量池的操作



***



#### String Pool

##### 基本介绍

字符串常量池（String Pool / StringTable / 串池）保存着所有字符串字面量（literal strings），这些字面量在编译时期就确定，常量池类似于 Java 系统级别提供的**缓存**，存放对象和引用

* StringTable，类似 HashTable 结构，通过 `-XX:StringTableSize` 设置大小，JDK 1.8 中默认 60013
* 常量池中的字符串仅是符号，第一次使用时才变为对象，可以避免重复创建字符串对象
* 字符串**变量**的拼接的原理是 StringBuilder#append，append 方法比字符串拼接效率高（JDK 1.8）
* 字符串**常量**拼接的原理是编译期优化，拼接结果放入常量池
* 可以使用 String 的 intern() 方法在运行过程将字符串添加到 String Pool 中



***



##### intern()

JDK 1.8：当一个字符串调用 intern() 方法时，如果 String Pool 中：
* 存在一个字符串和该字符串值相等，就会返回 String Pool 中字符串的引用（需要变量接收）
* 不存在，会把对象的**引用地址**复制一份放入串池，并返回串池中的引用地址，前提是堆内存有该对象，因为 Pool 在堆中，为了节省内存不再创建新对象

JDK 1.6：将这个字符串对象尝试放入串池，如果有就不放入，返回已有的串池中的对象的引用；如果没有会把此对象复制一份，放入串池，把串池中的对象返回

```java
public class Demo {
    // 常量池中的信息都加载到运行时常量池，这时a b ab是常量池中的符号，还不是java字符串对象，是懒惰的
    // ldc #2 会把 a 符号变为 "a" 字符串对象     ldc:反编译后的指令
    // ldc #3 会把 b 符号变为 "b" 字符串对象
    // ldc #4 会把 ab 符号变为 "ab" 字符串对象
    public static void main(String[] args) {
        String s1 = "a"; 	// 懒惰的
        String s2 = "b";
        String s3 = "ab";	// 串池
        
        String s4 = s1 + s2;	// 返回的是堆内地址
        // 原理：new StringBuilder().append("a").append("b").toString()  new String("ab")
        
        String s5 = "a" + "b";  // javac 在编译期间的优化，结果已经在编译期确定为ab

        System.out.println(s3 == s4); // false
        System.out.println(s3 == s5); // true

        String x2 = new String("c") + new String("d"); // new String("cd")
        // 虽然 new，但是在字符串常量池没有 cd 对象，因为 toString() 方法
        x2.intern();
        String x1 = "cd";

        System.out.println(x1 == x2); //true
    }
}
```

- == 比较基本数据类型：比较的是具体的值
- == 比较引用数据类型：比较的是对象地址值

结论：

```java
String s1 = "ab";								// 仅放入串池
String s2 = new String("a") + new String("b");	// 仅放入堆
// 上面两条指令的结果和下面的 效果 相同
String s = new String("ab");
```



****



##### 常见问题

问题一：

```java
public static void main(String[] args) {
    String s = new String("a") + new String("b");//new String("ab")
    //在上一行代码执行完以后，字符串常量池中并没有"ab"

    String s2 = s.intern();
    //jdk6：串池中创建一个字符串"ab"
    //jdk8：串池中没有创建字符串"ab",而是创建一个引用指向 new String("ab")，将此引用返回

    System.out.println(s2 == "ab");//jdk6:true  jdk8:true
    System.out.println(s == "ab");//jdk6:false  jdk8:true
}
```

问题二：

```java
public static void main(String[] args) {
    String str1 = new StringBuilder("58").append("tongcheng").toString();
    System.out.println(str1 == str1.intern());//true，字符串池中不存在，把堆中的引用复制一份放入串池

    String str2 = new StringBuilder("ja").append("va").toString();
    System.out.println(str2 == str2.intern());//false，字符串池中存在，直接返回已经存在的引用
}
```

原因：

* System 类当调用 Version 的静态方法，导致 Version 初始化：

  ```java
  private static void initializeSystemClass() {
      sun.misc.Version.init();
  }
  ```

* Version 类初始化时需要对静态常量字段初始化，被 launcher_name 静态常量字段所引用的 `"java"` 字符串字面量就被放入的字符串常量池：

  ```java
  package sun.misc;
  
  public class Version {
      private static final String launcher_name = "java";
      private static final String java_version = "1.8.0_221";
      private static final String java_runtime_name = "Java(TM) SE Runtime Environment";
      private static final String java_profile_name = "";
      private static final String java_runtime_version = "1.8.0_221-b11";
      //...
  }
  ```



***



##### 内存位置

Java 7 之前，String Pool 被放在运行时常量池中，属于永久代；Java 7 以后，String Pool 被移到堆中，这是因为永久代的空间有限，在大量使用字符串的场景下会导致 OutOfMemoryError 错误

演示 StringTable 位置：

* `-Xmx10m` 设置堆内存 10m

* 在 JDK8 下设置： `-Xmx10m -XX:-UseGCOverheadLimit`（运行参数在 Run Configurations VM options）

* 在 JDK6 下设置： `-XX:MaxPermSize=10m`

  ```java
  public static void main(String[] args) throws InterruptedException {
      List<String> list = new ArrayList<String>();
      int i = 0;
      try {
          for (int j = 0; j < 260000; j++) {
              list.add(String.valueOf(j).intern());
              i++;
          }
      } catch (Throwable e) {
          e.printStackTrace();
      } finally {
          System.out.println(i);
      }
  }
  ```

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Java/JVM-内存图对比.png)



***



#### 优化常量池

两种方式：

* 调整 -XX:StringTableSize=桶个数，数量越少，性能越差

* intern 将字符串对象放入常量池，通过复用字符串的引用，减少内存占用

```java
/**
 * 演示 intern 减少内存占用
 * -XX:StringTableSize=200000 -XX:+PrintStringTableStatistics
 * -Xsx500m -Xmx500m -XX:+PrintStringTableStatistics -XX:StringTableSize=200000
 */
public class Demo1_25 {
    public static void main(String[] args) throws IOException {
        List<String> address = new ArrayList<>();
        System.in.read();
        for (int i = 0; i < 10; i++) {
            //很多数据
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream("linux.words"), "utf-8"))) {
                String line = null;
                long start = System.nanoTime();
                while (true) {
                    line = reader.readLine();
                    if(line == null) {
                        break;
                    }
                    address.add(line.intern());
                }
                System.out.println("cost:" +(System.nanoTime()-start)/1000000);
            }
        }
        System.in.read();
    }
}
```



***



#### 不可变好处

* 可以缓存 hash 值，例如 String 用做 HashMap 的 key，不可变的特性可以使得 hash 值也不可变，只要进行一次计算
* String Pool 的需要，如果一个 String 对象已经被创建过了，就会从 String Pool 中取得引用，只有 String 是不可变的，才可能使用 String Pool
* 安全性，String 经常作为参数，String 不可变性可以保证参数不可变。例如在作为网络连接参数的情况下如果 String 是可变的，那么在网络连接过程中，String 被改变，改变 String 的那一方以为现在连接的是其它主机，而实际情况却不一定是
* String 不可变性天生具备线程安全，可以在多个线程中安全地使用
* 防止子类继承，破坏 String 的 API 的使用





***
