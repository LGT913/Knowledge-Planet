---
title: "File"
date: 2023-09-26
planet: system
tags: ["Java", "基础", File, system]
summary: "File 类：代表操作系统的文件对象，是用来操作操作系统的文件对象的，删除文件，获取文件信息，创建文件（文件夹），广义来说操作系统认为文件包含（文件和文件夹）"
private: false
---

### File

#### 文件类

File 类：代表操作系统的文件对象，是用来操作操作系统的文件对象的，删除文件，获取文件信息，创建文件（文件夹），广义来说操作系统认为文件包含（文件和文件夹）

File 类构造器：

* `public File(String pathname)`：根据路径获取文件对象
* `public File(String parent , String child)`：根据父路径和文件名称获取文件对象

File 类创建文件对象的格式：

* `File f = new File("绝对路径/相对路径");`
  * 绝对路径：从磁盘的的盘符一路走到目的位置的路径
    * 绝对路径依赖具体的环境，一旦脱离环境，代码可能出错
    * 一般是定位某个操作系统中的某个文件对象
  * **相对路径**：不带盘符的（重点）
    * 默认是直接相对到工程目录下寻找文件的。
    * 相对路径只能用于寻找工程下的文件，可以跨平台

* `File f = new File("文件对象/文件夹对象")` 广义来说：文件是包含文件和文件夹的

```java
public class FileDemo{
    public static void main(String[] args) {
        // 1.创建文件对象：使用绝对路径
        // 文件路径分隔符：
        //      -- a.使用正斜杠： /
        //      -- b.使用反斜杠： \\
        //      -- c.使用分隔符API:File.separator
        //File f1 = new File("D:"+File.separator+"it"+File.separator
		//+"图片资源"+File.separator+"beautiful.jpg");
        File f1 = new File("D:\\seazean\\图片资源\\beautiful.jpg");
        System.out.println(f1.length()); // 获取文件的大小，字节大小

        // 2.创建文件对象：使用相对路径
        File f2 = new File("Day09Demo/src/dlei.txt");
        System.out.println(f2.length());

        // 3.创建文件对象：代表文件夹。
        File f3 = new File("D:\\it\\图片资源");
        System.out.println(f3.exists());// 判断路径是否存在！！
    }
}
```



***



#### 常用API

##### 常用方法

| 方法                           | 说明                                   |
| ------------------------------ | -------------------------------------- |
| String getAbsolutePath()       | 返回此 File 的绝对路径名字符串         |
| String getPath()               | 获取创建文件对象的时候用的路径         |
| String getName()               | 返回由此 File 表示的文件或目录的名称   |
| long length()                  | 返回由此 File 表示的文件的长度（大小） |
| long length(FileFilter filter) | 文件过滤器                             |

```java
public class FileDemo {
    public static void main(String[] args) {
        // 1.绝对路径创建一个文件对象
        File f1 = new File("E:/图片/test.jpg");
        // a.获取它的绝对路径。
        System.out.println(f1.getAbsolutePath());
        // b.获取文件定义的时候使用的路径。
        System.out.println(f1.getPath());
        // c.获取文件的名称：带后缀。
        System.out.println(f1.getName());
        // d.获取文件的大小：字节个数。
        System.out.println(f1.length());
        System.out.println("------------------------");

        // 2.相对路径
        File f2 = new File("Demo/src/test.txt");
        // a.获取它的绝对路径。
        System.out.println(f2.getAbsolutePath());
        // b.获取文件定义的时候使用的路径。
        System.out.println(f2.getPath());
        // c.获取文件的名称：带后缀。
        System.out.println(f2.getName());
        // d.获取文件的大小：字节个数。
        System.out.println(f2.length());
    }
}

```



***



##### 判断方法

方法列表：

* `boolean exists()`：此 File 表示的文件或目录是否实际存在
* `boolean isDirectory()`：此 File 表示的是否为目录
* `boolean isFile()`：此 File 表示的是否为文件

```java
File f = new File("Demo/src/test.txt");
// a.判断文件路径是否存在
System.out.println(f.exists()); // true
// b.判断文件对象是否是文件,是文件返回true ,反之
System.out.println(f.isFile()); // true
// c.判断文件对象是否是文件夹,是文件夹返回true ,反之
System.out.println(f.isDirectory()); // false
```



****



##### 创建删除

方法列表：

* `boolean createNewFile()`：当且仅当具有该名称的文件尚不存在时， 创建一个新的空文件
* `boolean delete()`：删除由此 File 表示的文件或目录（只能删除空目录）
* `boolean mkdir()`：创建由此 File 表示的目录（只能创建一级目录）
* `boolean mkdirs()`：可以创建多级目录（建议使用）

```java
public class FileDemo {
    public static void main(String[] args) throws IOException {
        File f = new File("Demo/src/test.txt");
        // a.创建新文件，创建成功返回true ,反之
        System.out.println(f.createNewFile());

        // b.删除文件或者空文件夹
        System.out.println(f.delete());
        // 不能删除非空文件夹，只能删除空文件夹
        File f1 = new File("E:/it/aaaaa");
        System.out.println(f1.delete());

        // c.创建一级目录
        File f2 = new File("E:/bbbb");
        System.out.println(f2.mkdir());

        // d.创建多级目录
        File f3 = new File("D:/it/e/a/d/ds/fas/fas/fas/fas/fas/fas");
        System.out.println(f3.mkdirs());
    }
}
```



***



#### 遍历目录

- `public String[] list()`：获取当前目录下所有的一级文件名称到一个字符串数组中去返回
- `public File[] listFiles()`：获取当前目录下所有的一级文件对象到一个**文件对象数组**中去返回（**重点**）
- `public long lastModified`：返回此抽象路径名表示的文件上次修改的时间

```java
public class FileDemo {
    public static void main(String[] args) {
        File dir = new File("D:\\seazean");
        // a.获取当前目录对象下的全部一级文件名称到一个字符串数组返回。
        String[] names = dir.list();
        for (String name : names) {
            System.out.println(name);
        }
        // b.获取当前目录对象下的全部一级文件对象到一个File类型的数组返回。
        File[] files = dir.listFiles();
        for (File file : files) {
            System.out.println(file.getAbsolutePath());
        }

        // c
        File f1 = new File("D:\\图片资源\\beautiful.jpg");
        long time = f1.lastModified(); // 最后修改时间！
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        System.out.println(sdf.format(time));
    }
}
```



***



#### 文件搜索

递归实现文件搜索（非规律递归）

* 定义一个方法用于做搜索
* 进入方法中进行业务搜索分析

```java
/**
 * 去某个目录下搜索某个文件
 * @param dir 搜索文件的目录。
 * @param fileName 搜索文件的名称。
 */
public static void searchFiles(File dir , String fileName){
    // 1.判断是否存在该路径，是否是文件夹
    if(dir.exists() && dir.isDirectory()){
        // 2.提取当前目录下的全部一级文件对象
        File files = dir.listFiles();// 可能是null/也可能是空集合[]
        // 3.判断是否存在一级文件对象,判断是否不为空目录
        if(files != null && files.length > 0){
            // 4.判断一级文件对象
            for(File file : files){
                // 5.判断file是文件还是文件夹
                if(file.isFile()){
                    // 6.判断该文件是否为我要找的文件对象
                    if(f.getName().contains(fileName)){//模糊查找
                        sout(f.getAbsolutePath());
                        try {
                            // 启动它（拓展）
                            Runtime r = Runtime.getRuntime();
                            r.exec(f.getAbsolutePath());
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }
                } else {
                    // 7.该文件是文件夹，文件夹要递归进入继续寻找
                    searchFiles(file,fileName)
                }
            }
        }
    }
}
```



***

### Character

字符集：为字符编制的一套编号规则

计算机的底层是不能直接存储字符的，只能存储二进制 010101

ASCII 编码：8 个开关一组就可以编码字符，1 个字节 2^8 = 256， 一个字节存储一个字符完全够用，英文和数字在底层存储都是采用 1 个字节存储的

```
a  97
b  98

A  65
B  66

0  48
1  49
```

中国人：中国人有 9 万左右字符，2 个字节编码一个中文字符，1 个字节编码一个英文字符，这套编码叫：GBK 编码，兼容 ASCII 编码表

美国人：收集全球所有的字符，统一编号，这套编码叫 Unicode 编码（万国码），一个英文等于两个字节，一个中文（含繁体）等于两个字节，中文标点占两个字节，英文标点占两个字节

* UTF-8 是变种形式，也必须兼容 ASCII 编码表
* UTF-8 一个中文一般占 3 个字节，中文标点占 3 个，英文字母和数字 1 个字节

编码前与编码后的编码集必须一致才不会乱码



***
