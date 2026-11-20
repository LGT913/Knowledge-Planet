---
title: "set"
date: 2023-09-26
planet: system
tags: ["Java", "基础", set, system]
summary: "数据存储需求：存储大量的数据，在查询方面提供更高的效率"
private: false
---

### set

#### 简介

数据存储需求：存储大量的数据，在查询方面提供更高的效率

数据存储结构：能够保存大量的数据，高效的内部存储机制，便于查询

set 类型：与 hash 存储结构哈希表完全相同，只是仅存储键不存储值（nil），所以添加，删除，查找的复杂度都是 O(1)，并且**值是不允许重复且无序的**

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/set结构图.png" style="zoom: 33%;" />



***



#### 操作

指令操作：

* 数据操作

  ```sh
  sadd key member1 [member2]	#添加数据
  srem key member1 [member2]	#删除数据
  ```
  
* 查询操作

  ```sh
  smembers key				#获取全部数据
  scard key					#获取集合数据总量
  sismember key member		#判断集合中是否包含指定数据
  ```

* 随机操作

  ```sh
  spop key [count]			#随机获取集中的某个数据并将该数据移除集合
  srandmember key [count]		#随机获取集合中指定(数量)的数据

* 集合的交、并、差

  ```sh
  sinter key1 [key2...]  					#两个集合的交集，不存在为(empty list or set)
  sunion key1 [key2...]  					#两个集合的并集
  sdiff key1 [key2...]					#两个集合的差集
  
  sinterstore destination key1 [key2...]	#两个集合的交集并存储到指定集合中
  sunionstore destination key1 [key2...]	#两个集合的并集并存储到指定集合中
  sdiffstore destination key1 [key2...]	#两个集合的差集并存储到指定集合中
  ```

* 复制

  ```sh
  smove source destination member			#将指定数据从原始集合中移动到目标集合中
  ```


注意事项

1. set 类型不允许数据重复，如果添加的数据在 set 中已经存在，将只保留一份
2. set 虽然与 hash 的存储结构相同，但是无法启用 hash 中存储值的空间



***



#### 实现

集合对象的内部编码有两种：intset（整数集合）、hashtable（哈希表、字典）

* 整数集合实现的集合对象：

  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-集合对象intset.png" style="zoom:67%;" />

* 字典实现的集合对象：键值对的值为 NULL

  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-集合对象dict.png" style="zoom:80%;" />

当集合对象可以同时满足以下两个条件时，对象使用 intset 编码：

* 集合中的元素都是整数值
* 集合中的元素数量小于 set-maxintset-entries配置（默认 512 个）

以上两个条件的上限值是可以通过配置文件修改的



****



#### 应用

应用场景：

1. 黑名单：资讯类信息类网站追求高访问量，但是由于其信息的价值，往往容易被不法分子利用，通过爬虫技术，快速获取信息，个别特种行业网站信息通过爬虫获取分析后，可以转换成商业机密。

   注意：爬虫不一定做摧毁性的工作，有些小型网站需要爬虫为其带来一些流量。

2. 白名单：对于安全性更高的应用访问，仅仅靠黑名单是不能解决安全问题的，此时需要设定可访问的用户群体， 依赖白名单做更为苛刻的访问验证

3. 随机操作可以实现抽奖功能

4. 集合的交并补可以实现微博共同关注的查看，可以根据共同关注或者共同喜欢推荐相关内容





***
```
