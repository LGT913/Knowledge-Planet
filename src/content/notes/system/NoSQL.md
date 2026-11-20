---
title: "NoSQL"
date: 2023-09-26
planet: system
tags: ["Java", "基础", NoSQL, system]
summary: "NoSQL（Not-Only SQL）：泛指非关系型的数据库，作为关系型数据库的补充"
private: false
---

## NoSQL

### 概述

NoSQL（Not-Only SQL）：泛指非关系型的数据库，作为关系型数据库的补充

MySQL 支持 ACID 特性，保证可靠性和持久性，读取性能不高，因此需要缓存的来减缓数据库的访问压力

作用：应对基于海量用户和海量数据前提下的数据处理问题

特征：

* 可扩容，可伸缩，SQL 数据关系过于复杂，Nosql 不存关系，只存数据
* 大数据量下高性能，数据不存取在磁盘 IO，存取在内存
* 灵活的数据模型，设计了一些数据存储格式，能保证效率上的提高
* 高可用，集群

常见的 NoSQL：Redis、memcache、HBase、MongoDB



参考书籍：https://book.douban.com/subject/25900156/

参考视频：https://www.bilibili.com/video/BV1CJ411m7Gc



***



### Redis

Redis (REmote DIctionary Server) ：用 C 语言开发的一个开源的高性能键值对（key-value）数据库

特征：

* 数据间没有必然的关联关系，**不存关系，只存数据**
* 数据**存储在内存**，存取速度快，解决了磁盘 IO 速度慢的问题
* 内部采用**单线程**机制进行工作
* 高性能，官方测试数据，50 个并发执行 100000 个请求，读的速度是 110000 次/s，写的速度是 81000 次/s
* 多数据类型支持
  * 字符串类型：string（String）
  * 列表类型：list（LinkedList）
  * 散列类型：hash（HashMap）
  * 集合类型：set（HashSet）
  * 有序集合类型：zset/sorted_set（TreeSet）
* 支持持久化，可以进行数据灾难恢复



***



### 安装启动

安装：

* Redis 5.0 被包含在默认的 Ubuntu 20.04 软件源中

  ```sh
  sudo apt update
  sudo apt install redis-server
  ```

* 检查 Redis 状态

  ```sh
  sudo systemctl status redis-server
  ```

启动：

* 启动服务器——参数启动

  ```sh
  redis-server [--port port]
  #redis-server --port 6379
  ```

* 启动服务器——配置文件启动

  ```sh
  redis-server config_file_name
  #redis-server /etc/redis/conf/redis-6397.conf
  ```

* 启动客户端：

  ```sh
  redis-cli [-h host] [-p port]
  #redis-cli -h 192.168.2.185 -p 6397
  ```

  注意：服务器启动指定端口使用的是--port，客户端启动指定端口使用的是-p



***



### 基本配置

#### 系统目录

1. 创建文件结构

   创建配置文件存储目录

   ```sh
   mkdir conf
   ```

   创建服务器文件存储目录（包含日志、数据、临时配置文件等）

   ```sh
   mkdir data
   ```

2. 创建配置文件副本放入 conf 目录，Ubuntu 系统配置文件 redis.conf 在目录 `/etc/redis` 中

   ```sh
   cat redis.conf | grep -v "#" | grep -v "^$" -> /conf/redis-6379.conf
   ```
   
   去除配置文件的注释和空格，输出到新的文件，命令方式采用 redis-port.conf



***



#### 服务器

* 设置服务器以守护进程的方式运行，关闭后服务器控制台中将打印服务器运行信息（同日志内容相同）：

  ```sh
  daemonize yes|no
  ```

* 绑定主机地址，绑定本地IP地址，否则SSH无法访问：

  ```sh
  bind ip
  ```

* 设置服务器端口：

  ```sh
  port port
  ```

* 设置服务器文件保存地址：

  ```sh
  dir path
  ```

* 设置数据库的数量：

  ```sh
  databases 16
  ```

* 多服务器快捷配置：

  导入并加载指定配置文件信息，用于快速创建 redis 公共配置较多的 redis 实例配置文件，便于维护

  ```sh
  include /path/conf_name.conf
  ```

  

***



#### 客户端

* 服务器允许客户端连接最大数量，默认 0，表示无限制，当客户端连接到达上限后，Redis 会拒绝新的连接：

  ```sh
  maxclients count
  ```

* 客户端闲置等待最大时长，达到最大值后关闭对应连接，如需关闭该功能，设置为 0：

  ```sh
  timeout seconds
  ```



***



#### 日志配置

设置日志记录

* 设置服务器以指定日志记录级别

  ```sh
  loglevel debug|verbose|notice|warning
  ```

* 日志记录文件名

  ```sh
  logfile filename
  ```

注意：日志级别开发期设置为 verbose 即可，生产环境中配置为 notice，简化日志输出量，降低写日志 IO 的频度



**配置文件：**

```sh
bind 192.168.2.185
port 6379
#timeout 0
daemonize no
logfile /etc/redis/data/redis-6379.log
dir /etc/redis/data
dbfilename "dump-6379.rdb"
```



***



#### 基本指令

帮助信息：

* 获取命令帮助文档

  ```sh
  help [command]
  #help set
  ```

* 获取组中所有命令信息名称

  ```sh
  help [@group-name]
  #help @string
  ```

退出服务

* 退出客户端：

  ```sh
  quit
  exit
  ```

* 退出客户端服务器快捷键：

  ```sh
  Ctrl+C
  ```








***
