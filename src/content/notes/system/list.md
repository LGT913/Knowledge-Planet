---
title: "list"
date: 2023-09-26
planet: system
tags: ["Java", "基础", list, system]
summary: "数据存储需求：存储多个数据，并对数据进入存储空间的顺序进行区分"
private: false
---

### list

#### 简介

数据存储需求：存储多个数据，并对数据进入存储空间的顺序进行区分

数据存储结构：一个存储空间保存多个数据，且通过数据可以体现进入顺序，允许重复元素

list 类型：保存多个数据，底层使用**双向链表**存储结构实现，类似于 LinkedList

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/list结构图.png" style="zoom:33%;" />

如果两端都能存取数据的话，这就是双端队列，如果只能从一端进一端出，这个模型叫栈



***



#### 操作

指令操作：

* 数据操作

  ```sh
  lpush key value1 [value2]...#从左边添加/修改数据(表头)
  rpush key value1 [value2]...#从右边添加/修改数据(表尾)
  lpop key					#从左边获取并移除第一个数据，类似于出栈/出队
  rpop key					#从右边获取并移除第一个数据
  lrem key count value		#删除指定数据，count=2删除2个，该value可能有多个(重复数据)
  ```

* 查询操作

  ```sh
  lrange key start stop		#从左边遍历数据并指定开始和结束索引，0是第一个索引，-1是终索引
  lindex key index			#获取指定索引数据，没有则为nil，没有索引越界
  llen key					#list中数据长度/个数
  ```

* 规定时间内获取并移除数据

  ```sh
  b							#代表阻塞
  blpop key1 [key2] timeout	#在指定时间内获取指定key(可以多个)的数据，超时则为(nil)
  							#可以从其他客户端写数据，当前客户端阻塞读取数据
  brpop key1 [key2] timeout	#从右边操作
  ```
  
* 复制操作

  ```sh
  brpoplpush source destination timeout	#从source获取数据放入destination，假如在指定时间内没有任何元素被弹出，则返回一个nil和等待时长。反之，返回一个含有两个元素的列表，第一个元素是被弹出元素的值，第二个元素是等待时长
  ```

注意事项

1. list 中保存的数据都是 string 类型的，数据总容量是有限的，最多 2^32 - 1 个元素（4294967295）
2. list 具有索引的概念，但操作数据时通常以队列的形式进行入队出队，或以栈的形式进行入栈出栈
3. 获取全部数据操作结束索引设置为 -1
4. list 可以对数据进行分页操作，通常第一页的信息来自于 list，第 2 页及更多的信息通过数据库的形式加载



****



#### 实现

在 Redis3.2 版本以前列表对象的内部编码有两种：ziplist（压缩列表）和 linkedlist（链表）

* 压缩列表实现的列表对象：PUSH 1、three、5 三个元素

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-列表对象ziplist.png)

* 链表实现的列表对象：为了简化字符串对象的表示，使用了 StringObject 的结构，底层其实是 sdshdr 结构

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-列表对象linkedlist.png)

列表中存储的数据量比较小的时候，列表就会使用一块连续的内存存储，采用压缩列表的方式实现的条件：

* 列表对象保存的所有字符串元素的长度都小于 64 字节
* 列表对象保存的元素数量小于 512 个

以上两个条件的上限值是可以通过配置文件修改的，当两个条件的任意一个不能被满足时，对象的编码转换操作就会被执行

在 Redis3.2 版本 以后对列表数据结构进行了改造，使用 **quicklist（快速列表）**代替了 linkedlist，quicklist 实际上是 ziplist 和 linkedlist 的混合体，将 linkedlist 按段切分，每一段使用 ziplist 来紧凑存储，多个 ziplist 之间使用双向指针串接起来，既满足了快速的插入删除性能，又不会出现太大的空间冗余

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-快速列表数据结构.png" style="zoom: 50%;" />



***



#### 应用

企业运营过程中，系统将产生出大量的运营数据，如何保障多台服务器操作日志的统一顺序输出？

* 依赖 list 的数据具有顺序的特征对信息进行管理，右进左查或者左近左查
* 使用队列模型解决多路信息汇总合并的问题
* 使用栈模型解决最新消息的问题

微信文章订阅公众号：

* 比如订阅了两个公众号，它们发布了两篇文章，文章 ID 分别为 666 和 888，可以通过执行 `LPUSH key 666 888` 命令推送给我





***
