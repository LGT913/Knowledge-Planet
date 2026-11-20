---
title: "Bitmaps"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Bitmaps, system]
summary: "Bitmaps 是二进制位数组（bit array），底层使用 SDS 字符串表示，因为 SDS 是二进制安全的"
private: false
---

### Bitmaps

#### 基本操作

Bitmaps 是二进制位数组（bit array），底层使用 SDS 字符串表示，因为 SDS 是二进制安全的

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-位数组结构.png)

buf 数组的每个字节用一行表示，buf[1] 是 `'\0'`，保存位数组的顺序和书写位数组的顺序是完全相反的，图示的位数组 0100 1101

数据结构的详解查看 Java → Algorithm → 位图





***



#### 命令实现

##### GETBIT

GETBIT 命令获取位数组 bitarray 在 offset 偏移量上的二进制位的值

```sh
GETBIT <bitarray> <offset>
```

执行过程：

* 计算 `byte = offset/8`（向下取整）, byte 值记录数据保存在位数组中的索引
* 计算 `bit = (offset mod 8) + 1`，bit 值记录数据在位数组中的第几个二进制位
* 根据 byte 和 bit 值，在位数组 bitarray 中定位 offset 偏移量指定的二进制位，并返回这个位的值

GETBIT 命令执行的所有操作都可以在常数时间内完成，所以时间复杂度为 O(1)



***



##### SETBIT

SETBIT 将位数组 bitarray 在 offset 偏移量上的二进制位的值设置为 value，并向客户端返回二进制位的旧值

```sh
SETBIT <bitarray> <offset> <value> 
```

执行过程：

* 计算 `len = offset/8 + 1`，len 值记录了保存该数据至少需要多少个字节
* 检查 bitarray 键保存的位数组的长度是否小于 len，成立就会将 SDS 扩展为 len 字节（注意空间预分配机制），所有新扩展空间的二进制位的值置为 0
* 计算 `byte = offset/8`（向下取整）, byte 值记录数据保存在位数组中的索引
* 计算 `bit = (offset mod 8) + 1`，bit 值记录数据在位数组中的第几个二进制位
* 根据 byte 和 bit 值，在位数组 bitarray 中定位 offset 偏移量指定的二进制位，首先将指定位现存的值保存在 oldvalue 变量，然后将新值 value 设置为这个二进制位的值
* 向客户端返回 oldvalue 变量的值



***



##### BITCOUNT

BITCOUNT 命令用于统计给定位数组中，值为 1 的二进制位的数量

```sh
BITCOUNT <bitarray> [start end]
```

二进制位统计算法：

* 遍历法：遍历位数组中的每个二进制位
* 查表算法：读取每个字节（8 位）的数据，查表获取数值对应的二进制中有几个 1 
* variable-precision SWAR算法：计算汉明距离
* Redis 实现：
  * 如果二进制位的数量大于等于 128 位， 那么使用 variable-precision SWAR 算法来计算二进制位的汉明重量
  * 如果二进制位的数量小于 128 位，那么使用查表算法来计算二进制位的汉明重量



****



##### BITOP

BITOP 命令对指定 key 按位进行交、并、非、异或操作，并将结果保存到指定的键中

```sh
BITOP OPTION destKey key1 [key2...]
```

OPTION 有 AND（与）、OR（或）、 XOR（异或）和 NOT（非）四个选项

AND、OR、XOR 三个命令可以接受多个位数组作为输入，需要遍历输入的每个位数组的每个字节来进行计算，所以命令的复杂度为 O(n^2)；与此相反，NOT 命令只接受一个位数组输入，所以时间复杂度为 O(n)



***



#### 应用场景

- **解决 Redis 缓存穿透**，判断给定数据是否存在， 防止缓存穿透

  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-Bitmaps应用之缓存穿透.png" style="zoom: 67%;" />

- 垃圾邮件过滤，对每一个发送邮件的地址进行判断是否在布隆的黑名单中，如果在就判断为垃圾邮件

- 爬虫去重，爬给定网址的时候对已经爬取过的 URL 去重

- 信息状态统计





***
