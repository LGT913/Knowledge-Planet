---
title: "BigDecimal"
date: 2023-09-26
planet: system
tags: ["Java", "基础", BigDecimal, system]
summary: "Java 在 java.math 包中提供的 API 类，用来对超过16位有效位的数进行精确的运算"
private: false
---

### BigDecimal

Java 在 java.math 包中提供的 API 类，用来对超过16位有效位的数进行精确的运算

构造方法：

* `public static BigDecimal valueOf(double val)`：包装浮点数成为大数据对象。
* `public BigDecimal(double val)`
* `public BigDecimal(String val)`

常用API：

* `public BigDecimal add(BigDecimal value)`：加法运算
* `public BigDecimal subtract(BigDecimal value)`：减法运算 
* `public BigDecimal multiply(BigDecimal value)`：乘法运算 
* `public BigDecimal divide(BigDecimal value)`：除法运算
* `public double doubleValue()`：把 BigDecimal 转换成 double 类型
* `public int intValue()`：转为 int 其他类型相同
* `public BigDecimal divide (BigDecimal value，精确几位，舍入模式)`：除法

```java
public class BigDecimalDemo {
    public static void main(String[] args) {
        // 浮点型运算的时候直接+ - * / 可能会出现数据失真（精度问题）。
        System.out.println(0.1 + 0.2);
        System.out.println(1.301 / 100);
        
        double a = 0.1 ;
        double b = 0.2 ;
        double c = a + b ;
        System.out.println(c);//0.30000000000000004
        
        // 1.把浮点数转换成大数据对象运算
        BigDecimal a1 = BigDecimal.valueOf(a);
        BigDecimal b1 = BigDecimal.valueOf(b);
        BigDecimal c1 = a1.add(b1);//a1.divide(b1);也可以
		System.out.println(c1);

        // BigDecimal只是解决精度问题的手段，double数据才是我们的目的！！
        double d = c1.doubleValue();
    }
}
```

总结：

1. BigDecimal 是用来进行精确计算的
2. 创建 BigDecimal 的对象，构造方法使用参数类型为字符串的
3. 四则运算中的除法，如果除不尽请使用 divide 的三个参数的方法

```java
BigDecimal divide = bd1.divide(参与运算的对象,小数点后精确到多少位,舍入模式);
//参数1：表示参与运算的BigDecimal 对象。
//参数2：表示小数点后面精确到多少位
//参数3：舍入模式  
// BigDecimal.ROUND_UP  进一法
// BigDecimal.ROUND_FLOOR 去尾法
// BigDecimal.ROUND_HALF_UP 四舍五入
```



***
