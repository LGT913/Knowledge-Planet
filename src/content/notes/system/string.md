---
title: "string"
date: 2023-09-26
planet: system
tags: ["Java", "基础", string, system]
summary: "存储的数据：单个数据，最简单的数据存储类型，也是最常用的数据存储类型，实质上是存一个字符串，string 类型是二进制安全的，可以包含任何数据，比如图片或者序列化的对象"
private: false
---

### string

#### 简介

存储的数据：单个数据，最简单的数据存储类型，也是最常用的数据存储类型，实质上是存一个字符串，string 类型是二进制安全的，可以包含任何数据，比如图片或者序列化的对象

存储数据的格式：一个存储空间保存一个数据，每一个空间中只能保存一个字符串信息

存储内容：通常使用字符串，如果字符串以整数的形式展示，可以作为数字操作使用

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-string结构图.png" style="zoom:50%;" />

Redis 所有操作都是**原子性**的，采用**单线程**机制，命令是单个顺序执行，无需考虑并发带来影响，原子性就是有一个失败则都失败

字符串对象可以是 int、raw、embstr 三种实现方式



***



#### 操作

指令操作：

* 数据操作：

  ```sh
  set key value			#添加/修改数据添加/修改数据
  del key					#删除数据
  setnx key value			#判定性添加数据，键值为空则设添加
  mset k1 v1 k2 v2...		#添加/修改多个数据，m：Multiple
  append key value		#追加信息到原始信息后部（如果原始信息存在就追加，否则新建）
  ```

* 查询操作

  ```sh
  get key					#获取数据，如果不存在，返回空（nil）
  mget key1 key2...		#获取多个数据
  strlen key				#获取数据字符个数（字符串长度）
  ```

* 设置数值数据增加/减少指定范围的值

  ```sh
  incr key					#key++
  incrby key increment		#key+increment
  incrbyfloat key increment	#对小数操作
  decr key					#key--
  decrby key increment		#key-increment
  ```

* 设置数据具有指定的生命周期

  ```sh
  setex key seconds value  		#设置key-value存活时间，seconds单位是秒
  psetex key milliseconds value	#毫秒级
  ```

注意事项：

1. 数据操作不成功的反馈与数据正常操作之间的差异

   * 表示运行结果是否成功
     
     * (integer) 0  → false ，失败
     
     * (integer) 1  → true，成功
     
   * 表示运行结果值
     
     * (integer) 3  → 3 个
     
     * (integer) 1  → 1 个

2. 数据未获取到时，对应的数据为（nil），等同于null

3. **数据最大存储量**：512MB

4. string 在 Redis 内部存储默认就是一个字符串，当遇到增减类操作 incr，decr 时**会转成数值型**进行计算

5. 按数值进行操作的数据，如果原始数据不能转成数值，或超越了Redis 数值上限范围，将报错
   9223372036854775807（java 中 Long 型数据最大值，Long.MAX_VALUE）

6. Redis 可用于控制数据库表主键 ID，为数据库表主键提供生成策略，保障数据库表的主键唯一性


单数据和多数据的选择：

* 单数据执行 3 条指令的过程：3 次发送 + 3 次处理 + 3 次返回
* 多数据执行 1 条指令的过程：1 次发送 + 3 次处理 + 1 次返回（发送和返回的事件略高于单数据）

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/string单数据与多数据操作.png" style="zoom: 33%;" />





***



#### 实现

字符串对象的编码可以是 int、raw、embstr 三种

* int：字符串对象保存的是**整数值**，并且整数值可以用 long 类型来表示，那么对象会将整数值保存在字符串对象结构的 ptr 属性面（将 void * 转换成 long)，并将字符串对象的编码设置为 int（浮点数用另外两种方式）

  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-字符串对象int编码.png" style="zoom:67%;" />

* raw：字符串对象保存的是一个字符串值，并且值的长度大于 39 字节，那么对象将使用简单动态字符串（SDS）来保存该值，并将对象的编码设置为 raw

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-字符串对象raw编码.png)

* embstr：字符串对象保存的是一个字符串值，并且值的长度小于等于 39 字节，那么对象将使用 embstr 编码的方式来保存这个字符串值，并将对象的编码设置为 embstr

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-字符串对象embstr编码.png)

  上图所示，embstr 与 raw 都使用了 redisObject 和 sdshdr 来表示字符串对象，但是 raw 需要调用两次内存分配函数分别创建两种结构，embstr 只需要一次内存分配来分配一块**连续的空间**

embstr 是用于保存短字符串的一种编码方式，对比 raw 的优点：

* 内存分配次数从两次降低为一次，同样释放内存的次数也从两次变为一次
* embstr 编码的字符串对象的数据都保存在同一块连续内存，所以比 raw 编码能够更好地利用缓存优势（局部性原理）

int 和 embstr 编码的字符串对象在条件满足的情况下，会被转换为 raw 编码的字符串对象：

* int 编码的整数值，执行 APPEND 命令追加一个字符串值，先将整数值转为字符串然后追加，最后得到一个 raw 编码的对象
* Redis 没有为 embstr 编码的字符串对象编写任何相应的修改程序，所以 embstr 对象实际上**是只读的**，执行修改命令会将对象的编码从 embstr 转换成 raw，操作完成后得到一个 raw 编码的对象

某些情况下，程序会将字符串对象里面的字符串值转换回浮点数值，执行某些操作后再将浮点数值转换回字符串值：

```sh
redis> SET pi 3.14 
OK 
redis> OBJECT ENCODING pi
"embstr" 
redis> INCRBYFLOAT pi 2.0 # 转为浮点数执行增加的操作
"5. 14" 
redis> OBJECT ENCODING pi 
"embstr" 
```







****



#### 应用

主页高频访问信息显示控制，例如新浪微博大 V 主页显示粉丝数与微博数量

* 在 Redis 中为大 V 用户设定用户信息，以用户主键和属性值作为 key，后台设定定时刷新策略

  ```sh
  set user:id:3506728370:fans 12210947
  set user:id:3506728370:blogs 6164
  set user:id:3506728370:focuses 83
  ```

* 使用 JSON 格式保存数据

  ```sh
  user:id:3506728370 → {"fans":12210947,"blogs":6164,"focuses":83}
  ```

* key的设置约定：表名 : 主键名 : 主键值 : 字段名

  | 表名  | 主键名 | 主键值    | 字段名 |
  | ----- | ------ | --------- | ------ |
  | order | id     | 29437595  | name   |
  | equip | id     | 390472345 | type   |
  | news  | id     | 202004150 | title  |





***
