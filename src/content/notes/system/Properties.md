---
title: "Properties"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Properties, system]
summary: "Properties：属性集对象。就是一个 Map 集合，一个键值对集合"
private: false
---

### Properties

Properties：属性集对象。就是一个 Map 集合，一个键值对集合

核心作用：Properties 代表的是一个属性文件，可以把键值对数据存入到一个属性文件

属性文件：后缀是 `.properties` 结尾的文件，里面的内容都是 key=value

Properties 方法：

| 方法名                                       | 说明                                          |
| -------------------------------------------- | --------------------------------------------- |
| Object setProperty(String key, String value) | 设置集合的键和值，底层调用 Hashtable 方法 put |
| String getProperty(String key)               | 使用此属性列表中指定的键搜索属性              |
| Set<String>   stringPropertyNames()          | 所有键的名称的集合                            |
| synchronized void load(Reader r)             | 从输入字符流读取属性列表（键和元素对）        |
| synchronized void load(InputStream in)       | 加载属性文件的数据到属性集对象中去            |
| void store(Writer w, String comments)        | 将此属性列表(键和元素对)写入 Properties 表    |
| void store(OutputStream os, String comments) | 保存数据到属性文件中去                        |

````java
public class PropertiesDemo01 {
    public static void main(String[] args) throws Exception {
        // a.创建一个属性集对象：Properties的对象。
        Properties properties = new Properties();//{}
        properties.setProperty("admin" , "123456");
        // b.把属性集对象的数据存入到属性文件中去（重点）
        OutputStream os = new FileOutputStream("Demo/src/users.properties");
        properties.store(os,"i am very happy!!我保存了用户数据!");
        //参数一：被保存数据的输出管道
        //参数二：保存心得。就是对象保存的数据进行解释说明！
    }
}
````

````java
public class PropertiesDemo02 {
    public static void main(String[] args) throws Exception {
        Properties properties = new Properties();//底层基于map集合
        properties.load(new FileInputStream("Demo/src/users.properties"));
        System.out.println(properties);
        System.out.println(properties.getProperty("admin"));
        
		Set<String> set = properties.stringPropertyNames();
        for (String s : set) {
            String value = properties.getProperty(s);
            System.out.println(s + value);
        }
    }
}
````



***

### RandomIO

RandomAccessFile 类：该类的实例支持读取和写入随机访问文件

构造器：

* `RandomAccessFile(File file, String mode)`：创建随机访问文件流，从 File 参数指定的文件读取，可选择写入
* `RandomAccessFile(String name, String mode)`：创建随机访问文件流，从指定名称文件读取，可选择写入文件

常用方法：

* `public void seek(long pos)`：设置文件指针偏移，从该文件开头测量，发生下一次读取或写入(插入+覆盖)
* `public void write(byte[] b)`：从指定的字节数组写入 b.length 个字节到该文件
* `public int read(byte[] b)`：从该文件读取最多 b.length 个字节的数据到字节数组

```java
public static void main(String[] args) throws Exception {
    RandomAccessFile rf = new RandomAccessFile(new File(),"rw");
    rf.write("hello world".getBytes());
    rf.seek(5);//helloxxxxld
    rf.write("xxxx".getBytes());
    rf.close();
}
```



***

### Commons

commons-io 是 apache 提供的一组有关 IO 操作的类库，可以提高 IO 功能开发的效率

commons-io 工具包提供了很多有关 IO 操作的类：

| 包                                  | 功能描述                                        |
| ----------------------------------- | :---------------------------------------------- |
| org.apache.commons.io               | 有关 Streams、Readers、Writers、Files 的工具类  |
| org.apache.commons.io.input         | 输入流相关的实现类，包含 Reader 和 InputStream  |
| org.apache.commons.io.output        | 输出流相关的实现类，包含 Writer 和 OutputStream |
| org.apache.commons.io.serialization | 序列化相关的类                                  |

IOUtils 和 FileUtils 可以方便的复制文件和文件夹

```java
public class CommonsIODemo01 {
    public static void main(String[] args) throws Exception {
        // 1.完成文件复制！
        IOUtils.copy(new FileInputStream("Demo/src/books.xml"), 
                     new FileOutputStream("Demo/new.xml"));
        // 2.完成文件复制到某个文件夹下！
        FileUtils.copyFileToDirectory(new File("Demo/src/books.xml"),
                                      new File("D:/it"));
        // 3.完成文件夹复制到某个文件夹下！
        FileUtils.copyDirectoryToDirectory(new File("D:\\it\\图片服务器") ,
                                           new File("D:\\"));

        //  Java从1.7开始提供了一些nio, 自己也有一行代码完成复制的技术。
        Files.copy(Paths.get("Demo/src/books.xml")
                , new FileOutputStream("Demo/new11.txt"));
    }
}
```





***
