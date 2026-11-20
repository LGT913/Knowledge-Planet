---
title: "StringBuilder"
date: 2023-09-26
planet: system
tags: ["Java", "基础", StringBuilder, system]
summary: "String StringBuffer 和 StringBuilder 区别："
private: false
---

### StringBuilder

String StringBuffer 和 StringBuilder 区别：

* String : **不可变**的字符序列，线程安全
* StringBuffer : **可变**的字符序列，线程安全，底层方法加 synchronized，效率低
* StringBuilder : **可变**的字符序列，JDK5.0 新增；线程不安全，效率高

相同点：底层使用 char[] 存储

构造方法：

* `public StringBuilder()`：创建一个空白可变字符串对象，不含有任何内容
* `public StringBuilder(String str)`：根据字符串的内容，来创建可变字符串对象

常用API : 

* `public StringBuilder append(任意类型)`：添加数据，并返回对象本身
* `public StringBuilder reverse()`：返回相反的字符序列
* `public String toString()`：通过 toString() 就可以实现把 StringBuilder 转换为 String

存储原理：

```java
String str = "abc";
char data[] = {'a', 'b', 'c'};
StringBuffer sb1 = new StringBuffer();//new byte[16] 
sb1.append('a'); //value[0] = 'a';
```

append 源码：扩容为二倍

```java
public AbstractStringBuilder append(String str) {
    if (str == null) return appendNull();
    int len = str.length();
    ensureCapacityInternal(count + len);
    str.getChars(0, len, value, count);
    count += len;
    return this;
}
private void ensureCapacityInternal(int minimumCapacity) {
    // 创建超过数组长度就新的char数组，把数据拷贝过去
    if (minimumCapacity - value.length > 0) {
        //int newCapacity = (value.length << 1) + 2;每次扩容2倍+2
        value = Arrays.copyOf(value, newCapacity(minimumCapacity));
    }
}
public void getChars(int srcBegin, int srcEnd, char dst[], int dstBegin) {
    // 将字符串中的字符复制到目标字符数组中
	// 字符串调用该方法，此时value是字符串的值，dst是目标字符数组
    System.arraycopy(value, srcBegin, dst, dstBegin, srcEnd - srcBegin);
}
```





****

### Arrays

Array 的工具类 Arrays

常用API：

* `public static String toString(int[] a)`：返回指定数组的内容的字符串表示形式
* `public static void sort(int[] a)`：按照数字顺序排列指定的数组
* `public static int binarySearch(int[] a, int key)`：利用二分查找返回指定元素的索引
* `public static <T> List<T> asList(T... a)`：返回由指定数组支持的列表

```java
public class MyArraysDemo {
      public static void main(String[] args) {
		//按照数字顺序排列指定的数组
        int [] arr = {3,2,4,6,7};
        Arrays.sort(arr);
        System.out.println(Arrays.toString(arr));
		
        int [] arr = {1,2,3,4,5,6,7,8,9,10};
        int index = Arrays.binarySearch(arr, 0);
        System.out.println(index);
        //1,数组必须有序
        //2.如果要查找的元素存在,那么返回的是这个元素实际的索引
        //3.如果要查找的元素不存在,那么返回的是 (-插入点-1)
            //插入点:如果这个元素在数组中,他应该在哪个索引上.
      }
  }
```





***

### Random

用于生成伪随机数。

使用步骤：
1. 导入包：`import java.util.Random`
2. 创建对象：`Random r = new Random()`
3. 随机整数：`int num = r.nextInt(10)`
   * 解释：10 代表的是一个范围，如果括号写 10，产生的随机数就是 0 - 9，括号写 20 的随机数则是 0 - 19
   * 获取 0 - 10：`int num = r.nextInt(10 + 1)`

4. 随机小数：`public double nextDouble()` 从范围 `0.0d` 至 `1.0d` （左闭右开），伪随机地生成并返回



***

### System

System 代表当前系统

静态方法：

* `public static void exit(int status)`：终止 JVM 虚拟机，**非 0 是异常终止**

* `public static long currentTimeMillis()`：获取当前系统此刻时间毫秒值

* `static void arraycopy(Object var0, int var1, Object var2, int var3, int var4)`：数组拷贝
  * 参数一：原数组
  * 参数二：从原数组的哪个位置开始赋值
  * 参数三：目标数组
  * 参数四：从目标数组的哪个位置开始赋值
  * 参数五：赋值几个

```java
public class SystemDemo {
    public static void main(String[] args) {
        //System.exit(0); // 0代表正常终止!!
        long startTime = System.currentTimeMillis();//定义sdf 按照格式输出
        for(int i = 0; i < 10000; i++){输出i}
		long endTime = new Date().getTime();
		System.out.println( (endTime - startTime)/1000.0 +"s");//程序用时

        int[] arr1 = new int[]{10 ,20 ,30 ,40 ,50 ,60 ,70};
        int[] arr2 = new int[6]; // [ 0 , 0 , 0 , 0 , 0 , 0]
        // 变成arrs2 = [0 , 30 , 40 , 50 , 0 , 0 ]
        System.arraycopy(arr1, 2, arr2, 1, 3);
    }
}
```





***
