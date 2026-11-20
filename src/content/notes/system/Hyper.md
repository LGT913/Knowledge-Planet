---
title: "Hyper"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Hyper, system]
summary: "基数是数据集去重后元素个数，HyperLogLog 是用来做基数统计的，运用了 LogLog 的算法"
private: false
---

### Hyper

基数是数据集去重后元素个数，HyperLogLog 是用来做基数统计的，运用了 LogLog 的算法

```java
{1, 3, 5, 7, 5, 7, 8} 	基数集： {1, 3, 5 ,7, 8} 	基数：5
{1, 1, 1, 1, 1, 7, 1} 	基数集： {1,7} 				基数：2
```

相关指令：

* 添加数据

  ```sh
  pfadd key element [element ...]
  ```

* 统计数据

  ```sh
  pfcount key [key ...]
  ```

* 合并数据

  ```sh
  pfmerge destkey sourcekey [sourcekey...]
  ```

应用场景：

* 用于进行基数统计，不是集合不保存数据，只记录数量而不是具体数据，比如网站的访问量
* 核心是基数估算算法，最终数值存在一定误差
* 误差范围：基数估计的结果是一个带有 0.81% 标准错误的近似值
* 耗空间极小，每个 hyperloglog key 占用了12K的内存用于标记基数
* pfadd 命令不是一次性分配12K内存使用，会随着基数的增加内存逐渐增大
* Pfmerge 命令合并后占用的存储空间为12K，无论合并之前数据量多少



***

### GEO

GeoHash 是一种地址编码方法，把二维的空间经纬度数据编码成一个字符串

* 添加坐标点

  ```sh
  geoadd key longitude latitude member [longitude latitude member ...]
  georadius key longitude latitude radius m|km|ft|mi [withcoord] [withdist] [withhash] [count count]
  ```

* 获取坐标点

  ```sh
  geopos key member [member ...]
  georadiusbymember key member radius m|km|ft|mi [withcoord] [withdist] [withhash] [count count]
  ```

* 计算距离

  ```sh
  geodist key member1 member2 [unit]	#计算坐标点距离
  geohash key member [member ...]		#计算经纬度
  ```

Redis 应用于地理位置计算





****

## 持久机制

### 概述

持久化：利用永久性存储介质将数据进行保存，在特定的时间将保存的数据进行恢复的工作机制称为持久化 

作用：持久化用于防止数据的意外丢失，确保数据安全性，因为 Redis 是内存级，所以需要持久化到磁盘

计算机中的数据全部都是二进制，保存一组数据有两种方式
<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-持久化的两种方式.png" style="zoom: 33%;" />

RDB：将当前数据状态进行保存，快照形式，存储数据结果，存储格式简单

AOF：将数据的操作过程进行保存，日志形式，存储操作过程，存储格式复杂



***
