---
title: "redisObj"
date: 2023-09-26
planet: system
tags: ["Java", "基础", redisObj, system]
summary: "Redis 使用对象来表示数据库中的键和值，当在 Redis 数据库中新创建一个键值对时至少会创建两个对象，一个对象用作键值对的键（键对象），另一个对象用作键值对的值（值对象）"
private: false
---

## 数据类型

### redisObj

#### 对象系统

Redis 使用对象来表示数据库中的键和值，当在 Redis 数据库中新创建一个键值对时至少会创建两个对象，一个对象用作键值对的键（**键对象**），另一个对象用作键值对的值（**值对象**）

Redis 中对象由一个 redisObject 结构表示，该结构中和保存数据有关的三个属性分别是 type、 encoding、ptr：

```c
typedef struct redisObiect {
	// 类型
	unsigned type:4;
	// 编码
	unsigned encoding:4;
	// 指向底层数据结构的指针
	void *ptr;
    
    // ....
} robj;
```

Redis 并没有直接使用数据结构来实现键值对数据库，而是基于这些数据结构创建了一个对象系统，包含字符串对象、列表对象、哈希对象、集合对象和有序集合对象这五种类型的对象，而每种对象又通过不同的编码映射到不同的底层数据结构

Redis 是一个 Map 类型，其中所有的数据都是采用 key : value 的形式存储，**键对象都是字符串对象**，而值对象有五种基本类型和三种高级类型对象

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-对象编码.png)

* 对一个数据库键执行 TYPE 命令，返回的结果为数据库键对应的值对象的类型，而不是键对象的类型
* 对一个数据库键执行 OBJECT ENCODING 命令，查看数据库键对应的值对象的编码



****



#### 命令多态

Redis 中用于操作键的命令分为两种类型：

* 一种命令可以对任何类型的键执行，比如说 DEL 、EXPIRE、RENAME、 TYPE 等（基于类型的多态）
* 只能对特定类型的键执行，比如 SET 只能对字符串键执行、HSET 对哈希键执行、SADD 对集合键执行，如果类型步匹配会报类型错误： `(error) WRONGTYPE Operation against a key holding the wrong kind of value`

Redis 为了确保只有指定类型的键可以执行某些特定的命令，在执行类型特定的命令之前，先通过值对象 redisObject 结构 type 属性检查操作类型是否正确，然后再决定是否执行指定的命令

对于多态命令，比如列表对象有 ziplist 和 linkedlist 两种实现方式，通过 redisObject 结构 encoding 属性确定具体的编码类型，底层调用对应的 API 实现具体的操作（基于编码的多态）



***



#### 内存回收

对象的整个生命周期可以划分为创建对象、 操作对象、 释放对象三个阶段

C 语言没有自动回收内存的功能，所以 Redis 在对象系统中构建了引用计数（reference counting）技术实现的内存回收机制，程序可以跟踪对象的引用计数信息，在适当的时候自动释放对象并进行内存回收

```c
typedef struct redisObiect {
	// 引用计数
	int refcount;
} robj;
```

对象的引用计数信息会随着对象的使用状态而不断变化，创建时引用计数 refcount 初始化为 1，每次被一个新程序使用时引用计数加 1，当对象不再被一个程序使用时引用计数值会被减 1，当对象的引用计数值变为 0 时，对象所占用的内存会被释放



***



#### 对象共享

对象的引用计数属性带有对象共享的作用，共享对象机制更节约内存，数据库中保存的相同值对象越多，节约的内存就越多

让多个键共享一个对象的步骤：

* 将数据库键的值指针指向一个现有的值对象

* 将被共享的值对象的引用计数增一

  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-对象共享.png" style="zoom:67%;" />

Redis 在初始化服务器时创建一万个（配置文件可以修改）字符串对象，包含了**从 0 到 9999 的所有整数值**，当服务器需要用到值为 0 到 9999 的字符串对象时，服务器就会使用这些共享对象，而不是新创建对象

比如创建一个值为 100 的键 A，并使用 OBJECT REFCOUNT 命令查看键 A 的值对象的引用计数，会发现值对象的引用计数为 2，引用这个值对象的两个程序分别是持有这个值对象的服务器程序，以及共享这个值对象的键 A

共享对象在嵌套了字符串对象的对象（linkedlist 编码的列表、hashtable 编码的哈希、zset 编码的有序集合）中也能使用

Redis 不共享包含字符串对象的原因：验证共享对象和目标对象是否相同的复杂度越高，消耗的 CPU 时间也会越多

* 整数值的字符串对象， 验证操作的复杂度为 O(1)
* 字符串值的字符串对象， 验证操作的复杂度为 O(N)
* 如果共享对象是包含了多个值（或者对象的）对象，比如列表对象或者哈希对象，验证操作的复杂度为 O(N^2)



****



#### 空转时长

redisObject 结构包含一个 lru 属性，该属性记录了对象最后一次被命令程序访问的时间

```c
typedef struct redisObiect {
	unsigned lru:22; 
} robj;
```

OBJECT IDLETIME 命令可以打印出给定键的空转时长，该值就是通过将当前时间减去键的值对象的 lru 时间计算得出的，这个命令在访问键的值对象时，不会修改值对象的 lru 属性

```sh
redis> OBJECT IDLETIME msg
(integer) 10
# 等待一分钟
redis> OBJECT IDLETIME msg
(integer) 70
# 访问 msg
redis> GET msg
"hello world"
# 键处于活跃状态，空转时长为 0
redis> OBJECT IDLETIME msg
(integer) 0
```

空转时长的作用：如果服务器开启 maxmemory 选项，并且回收内存的算法为 volatile-lru 或者 allkeys-lru，那么当服务器占用的内存数超过了 maxmemory 所设置的上限值时，空转时长较高的那部分键会优先被服务器释放，从而回收内存（LRU 算法）





***
