---
title: "Date"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Date, system]
summary: "public Date：创建当前系统的此刻日期时间对象。   public Datelong time：把时间毫秒值转换成日期对象"
private: false
---

### Date

构造器：

* `public Date()`：创建当前系统的此刻日期时间对象。
*  `public Date(long time)`：把时间毫秒值转换成日期对象

方法：

* `public long getTime()`：返回自 1970 年 1 月 1 日 00:00:00 GMT 以来总的毫秒数。

时间记录的两种方式：

1. Date 日期对象
2. 时间毫秒值：从 `1970-01-01 00:00:00` 开始走到此刻的总的毫秒值，1s = 1000ms

```java
public class DateDemo {
    public static void main(String[] args) {
        Date d = new Date();
        System.out.println(d);//Fri Oct 16 21:58:44 CST 2020
        long time = d.getTime() + 121*1000;//过121s是什么时间
        System.out.println(time);//1602856875485
        
        Date d1 = new Date(time);
        System.out.println(d1);//Fri Oct 16 22:01:15 CST 2020
    }
}
```

```java
public static void main(String[] args){
    Date d = new Date();
    long startTime = d.getTime();
    for(int i = 0; i < 10000; i++){输出i}
    long endTime = new Date().getTime();
    System.out.println( (endTime - startTime) / 1000.0 +"s");
    //运行一万次输出需要多长时间
}
```



***

### DateFormat

DateFormat 作用：

1. 可以把“日期对象”或者“时间毫秒值”格式化成我们喜欢的时间形式（格式化时间）
2. 可以把字符串的时间形式解析成日期对象（解析字符串时间）

DateFormat 是一个抽象类，不能直接使用，使用它的子类：SimpleDateFormat

SimpleDateFormat  简单日期格式化类：

* `public SimpleDateFormat(String pattern)`：指定时间的格式创建简单日期对象
* `public String format(Date date) `：把日期对象格式化成我们喜欢的时间形式，返回字符串
* `public String format(Object time)`：把时间毫秒值格式化成设定的时间形式，返回字符串!
* `public Date parse(String date)`：把字符串的时间解析成日期对象

>yyyy年MM月dd日 HH:mm:ss EEE a" 周几 上午下午

```java
public static void main(String[] args){
	Date date = new Date();
    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss);
    String time = sdf.format(date);
    System.out.println(time);//2020-10-18 19:58:34
    //过121s后是什么时间
    long time = date.getTime();
    time+=121;
    System.out.println(sdf.formate(time));
    String d = "2020-10-18 20:20:20";//格式一致
    Date newDate = sdf.parse(d);
    System.out.println(sdf.format(newDate)); //按照前面的方法输出
}
```




****

### Calendar

Calendar 代表了系统此刻日期对应的日历对象，是一个抽象类，不能直接创建对象

Calendar 日历类创建日历对象：`Calendar rightNow = Calendar.getInstance()`（**饿汉单例模式**）

Calendar 的方法：

* `public static Calendar getInstance()`：返回一个日历类的对象
* `public int get(int field)`：取日期中的某个字段信息
* `public void set(int field,int value)`：修改日历的某个字段信息
* `public void add(int field,int amount)`：为某个字段增加/减少指定的值
* `public final Date getTime()`：拿到此刻日期对象
* `public long getTimeInMillis()`：拿到此刻时间毫秒值

```java
public static void main(String[] args){
	Calendar rightNow = Calendar.getInsance(); 
	int year = rightNow.get(Calendar.YEAR);//获取年
    int month = rightNow.get(Calendar.MONTH) + 1;//月要+1
    int days = rightNow.get(Calendar.DAY_OF_YEAR);
    rightNow.set(Calendar.YEAR , 2099);//修改某个字段
    rightNow.add(Calendar.HOUR , 15);//加15小时  -15就是减去15小时
    Date date = rightNow.getTime();//日历对象
    long time = rightNow.getTimeInMillis();//时间毫秒值
    //700天后是什么日子
    rightNow.add(Calendar.DAY_OF_YEAR , 701);
    Date date d = rightNow.getTime();
    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    System.out.println(sdf.format(d));//输出700天后的日期
}
```



***
