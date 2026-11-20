---
title: "Stream"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Stream, system]
summary: "Stream 流其实就是一根传送带，元素在上面可以被 Stream 流操作"
private: false
---

## I/O

### Stream

#### 概述

Stream 流其实就是一根传送带，元素在上面可以被 Stream 流操作

* 可以解决已有集合类库或者数组 API 的弊端
* Stream 流简化集合和数组的操作
* 链式编程

```java
list.stream().filter(new Predicate<String>() {
            @Override
            public boolean test(String s) {
                return s.startsWith("张");
            }
        });

list.stream().filter(s -> s.startsWith("张"));
```



***



#### 获取流

集合获取 Stream 流用：`default Stream<E> stream()`

数组：Arrays.stream(数组)   /  Stream.of(数组);

```java
// Collection集合获取Stream流。
Collection<String> c = new ArrayList<>();
Stream<String> listStream = c.stream();

// Map集合获取流
// 先获取键的Stream流。
Stream<String> keysStream = map.keySet().stream();
// 在获取值的Stream流
Stream<Integer> valuesStream = map.values().stream();
// 获取键值对的Stream流（key=value： Map.Entry<String,Integer>）
Stream<Map.Entry<String,Integer>> keyAndValues = map.entrySet().stream();

//数组获取流
String[] arr = new String[]{"Java", "JavaEE" ,"Spring Boot"};
Stream<String> arrStream1 = Arrays.stream(arr);
Stream<String> arrStream2 = Stream.of(arr);
```



****



#### 常用API

| 方法名                                                    | 说明                                                     |
| --------------------------------------------------------- | -------------------------------------------------------- |
| void forEach(Consumer<? super T> action)                  | 逐一处理（遍历）                                         |
| long count                                                | 返回流中的元素数                                         |
| Stream<T> filter(Predicate<? super T> predicate)          | 用于对流中的数据进行过滤                                 |
| Stream<T> limit(long maxSize)                             | 返回此流中的元素组成的流，截取前指定参数个数的数据       |
| Stream<T> skip(long n)                                    | 跳过指定参数个数的数据，返回由该流的剩余元素组成的流     |
| <R> Stream<R> map(Function<? super T,? extends R> mapper) | 加工方法，将当前流中的 T 类型数据转换为另一种 R 类型的流 |
| static <T> Stream<T> concat(Stream a, Stream b)           | 合并 a 和 b 两个流为一个，调用 `Stream.concat(s1,s2)`    |
| Stream<T> distinct()                                      | 返回由该流的不同元素组成的流                             |

```java
public class StreamDemo {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();
        list.add("张无忌"); list.add("周芷若"); list.add("赵敏");
        list.add("张三"); list.add("张三丰"); list.add("张");
        //取以张开头并且名字是三位数的
        list.stream().filter(s -> s.startsWith("张")
                .filter(s -> s.length == 3).forEach(System.out::println);
        //统计数量
		long count = list.stream().filter(s -> s.startsWith("张")
                .filter(s -> s.length == 3).count();
		//取前两个
		list.stream().filter(s -> s.length == 3).limit(2).forEach(...);
		//跳过前两个
		list.stream().filter(s -> s.length == 3).skip(2).forEach(...);

		// 需求：把名称都加上“张三的:+xxx”
		list.stream().map(s -> "张三的" + s).forEach(System.out::println);
		// 需求：把名称都加工厂学生对象放上去!!
		// list.stream().map(name -> new Student(name));
		list.stream.map(Student::new).forEach(System.out::println);
                                          	
		//数组流
		Stream<Integer> s1 = Stream.of(10,20,30,40,50);
		//集合流
		Stream<String> s2 = list.stream();
		//合并流
		Stream<Object> s3 = Stream.concat(s1,s2);
		s3.forEach(System.out::println);
    }
}
class Student{
    private String name;
    //......
}                                          
```



***



#### 终结方法

终结方法：Stream 调用了终结方法，流的操作就全部终结，不能继续使用，如 foreach，count 方法等

非终结方法：每次调用完成以后返回一个新的流对象，可以继续使用，支持**链式编程**

```java
// foreach终结方法
list.stream().filter(s -> s.startsWith("张"))
    .filter(s -> s.length() == 3).forEach(System.out::println);
```



***



#### 收集流

收集 Stream：把 Stream 流的数据转回到集合中去

* Stream 流：工具
* 集合：目的

Stream 收集方法：`R collect(Collector collector)` 把结果收集到集合中

Collectors 方法：

* `public static <T> Collector toList()`：把元素收集到 List 集合中
* `public static <T> Collector toSet()`：把元素收集到 Set 集合中
* `public static  Collector toMap(Function keyMapper,Function valueMapper)`：把元素收集到 Map 集合中
* `Object[] toArray()`：把元素收集数组中
* `public static Collector groupingBy(Function<? super T, ? extends K> classifier)`：分组

```java
public static void main(String[] args) {
	List<String> list = new ArrayList<>();
	Stream<String> stream = list.stream().filter(s -> s.startsWith("张"));    
    //把stream流转换成Set集合。
    Set<String> set = stream.collect(Collectors.toSet());
    
    //把stream流转换成List集合。
    //重新定义，因为资源已经被关闭了
    Stream<String> stream1 = list.stream().filter(s -> s.startsWith("张"));
    List<String> list = stream.collect(Collectors.toList());
    
    //把stream流转换成数组。
    Stream<String> stream2 = list.stream().filter(s -> s.startsWith("张"));
    Object[] arr = stream2.toArray();
    // 可以借用构造器引用申明转换成的数组类型！！！
    String[] arr1 = stream2.toArray(String[]::new);
}
```



***
