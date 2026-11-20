---
title: "LocalDateTime"
date: 2023-09-26
planet: system
tags: ["Java", "基础", LocalDateTime, system]
summary: "+ LocalDate       表示日期（年月日）   + LocalTime       表示时间（时分秒） + LocalDateTime    表示时间+ 日期 （年月日时分秒）"
private: false
---

### LocalDateTime

JDK1.8 新增，线程安全

+ LocalDate       表示日期（年月日）  
+ LocalTime       表示时间（时分秒）
+ LocalDateTime    表示时间+ 日期 （年月日时分秒）

构造方法：

* public static LocalDateTime now()：获取当前系统时间 
* public static LocalDateTime of(年, 月 , 日, 时, 分, 秒)：使用指定年月日和时分秒初始化一个对象

常用API：

| 方法名                                                    | 说明                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| public int getYear()                                      | 获取年                                                       |
| public int getMonthValue()                                | 获取月份（1-12）                                             |
| public int getDayOfMonth()                                | 获取月份中的第几天（1-31）                                   |
| public int getDayOfYear()                                 | 获取一年中的第几天（1-366）                                  |
| public DayOfWeek getDayOfWeek()                           | 获取星期                                                     |
| public int getMinute()                                    | 获取分钟                                                     |
| public int getHour()                                      | 获取小时                                                     |
| public LocalDate  toLocalDate()                           | 转换成为一个 LocalDate 对象（年月日）                        |
| public LocalTime toLocalTime()                            | 转换成为一个 LocalTime 对象（时分秒）                        |
| public String format(指定格式)                            | 把一个 LocalDateTime 格式化成为一个字符串                    |
| public LocalDateTime parse(准备解析的字符串, 解析格式)    | 把一个日期字符串解析成为一个 LocalDateTime 对象              |
| public static DateTimeFormatter ofPattern(String pattern) | 使用指定的日期模板获取一个日期格式化器 DateTimeFormatter 对象 |

```java
public class JDK8DateDemo2 {
    public static void main(String[] args) {
        LocalDateTime now = LocalDateTime.now();
        System.out.println(now);

        LocalDateTime localDateTime = LocalDateTime.of(2020, 11, 11, 11, 11, 11);
        System.out.println(localDateTime);
        DateTimeFormatter pattern = DateTimeFormatter.ofPattern("yyyy年MM月dd日 HH:mm:ss");
        String s = localDateTime.format(pattern);
		LocalDateTime parse = LocalDateTime.parse(s, pattern);
    }
}
```

| 方法名                                      | 说明           |
| ------------------------------------------- | -------------- |
| public LocalDateTime plusYears (long years) | 添加或者减去年 |
| public LocalDateTime withYear(int year)     | 直接修改年     |



**时间间隔** Duration 类API：

| 方法名                                           | 说明                 |
| ------------------------------------------------ | -------------------- |
| public static Period between(开始时间,结束时间)  | 计算两个“时间"的间隔 |
| public int getYears()                            | 获得这段时间的年数   |
| public int getMonths()                           | 获得此期间的总月数   |
| public int getDays()                             | 获得此期间的天数     |
| public long toTotalMonths()                      | 获取此期间的总月数   |
| public static Durationbetween(开始时间,结束时间) | 计算两个“时间"的间隔 |
| public long toSeconds()                          | 获得此时间间隔的秒   |
| public long toMillis()                           | 获得此时间间隔的毫秒 |
| public long toNanos()                            | 获得此时间间隔的纳秒 |

```java
public class JDK8DateDemo9 {
    public static void main(String[] args) {
        LocalDate localDate1 = LocalDate.of(2020, 1, 1);
        LocalDate localDate2 = LocalDate.of(2048, 12, 12);
        Period period = Period.between(localDate1, localDate2);
        System.out.println(period);//P28Y11M11D
		Duration duration = Duration.between(localDateTime1, localDateTime2);
        System.out.println(duration);//PT21H57M58S
    }
}
```



***
