---
title: "Math"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Math, system]
summary: "Math 类中的方法全部是静态方法，直接用类名调用即可："
private: false
---

### Math

Math 用于做数学运算

Math 类中的方法全部是静态方法，直接用类名调用即可：

| 方法                                         | 说明                              |
| -------------------------------------------- | --------------------------------- |
| public static int abs(int a)                 | 获取参数a的绝对值                 |
| public static double ceil(double a)          | 向上取整                          |
| public static double floor(double a)         | 向下取整                          |
| public static double pow(double a, double b) | 获取 a 的 b 次幂                  |
| public static long round(double a)           | 四舍五入取整                      |
| public static int max(int a,int b)           | 返回较大值                        |
| public static int min(int a,int b)           | 返回较小值                        |
| public static double random()                | 返回值为 double 的正值，[0.0,1.0) |

```java
public class MathDemo {
    public static void main(String[] args) {
        // 1.取绝对值:返回正数。
        System.out.println(Math.abs(10));
        System.out.println(Math.abs(-10.3));
        // 2.向上取整: 5
        System.out.println(Math.ceil(4.00000001)); // 5.0
        System.out.println(Math.ceil(-4.00000001));//4.0
        // 3.向下取整：4
        System.out.println(Math.floor(4.99999999)); // 4.0
        System.out.println(Math.floor(-4.99999999)); // 5.0
        // 4.求指数次方
        System.out.println(Math.pow(2 , 3)); // 2^3 = 8.0
        // 5.四舍五入 10
        System.out.println(Math.round(4.49999)); // 4
        System.out.println(Math.round(4.500001)); // 5
        System.out.println(Math.round(5.5));//6
    }
}
```



****

### DecimalFormat

使任何形式的数字解析和格式化

```java
public static void main(String[]args){
    double pi = 3.1415927;　//圆周率
    //取一位整数
    System.out.println(new DecimalFormat("0").format(pi));　　　//3
    //取一位整数和两位小数
    System.out.println(new DecimalFormat("0.00").format(pi));　//3.14
    //取两位整数和三位小数，整数不足部分以0填补。
    System.out.println(new DecimalFormat("00.000").format(pi));// 03.142
    //取所有整数部分
    System.out.println(new DecimalFormat("#").format(pi));　　　//3
    //以百分比方式计数，并取两位小数
    System.out.println(new DecimalFormat("#.##%").format(pi));　//314.16%

    long c =299792458;　　//光速
    //显示为科学计数法，并取五位小数
    System.out.println(new DecimalFormat("#.#####E0").format(c));//2.99792E8
    //显示为两位整数的科学计数法，并取四位小数
    System.out.println(new DecimalFormat("00.####E0").format(c));//29.9792E7
    //每三位以逗号进行分隔。
    System.out.println(new DecimalFormat(",###").format(c));//299,792,458
    //将格式嵌入文本
    System.out.println(new DecimalFormat("光速大小为每秒,###米。").format(c));

}
```





***
