---
title: "RDB"
date: 2023-09-26
planet: system
tags: ["Java", "基础", RDB, system]
summary: "RDB 持久化功能所生成的 RDB 文件是一个经过压缩的紧凑二进制文件，通过该文件可以还原生成 RDB 文件时的数据库状态，有两个 Redis 命令可以生成 RDB 文件，一个是 SAVE，另一个是 BGSAVE"
private: false
---

### RDB

#### 文件创建

RDB 持久化功能所生成的 RDB 文件是一个经过压缩的紧凑二进制文件，通过该文件可以还原生成 RDB 文件时的数据库状态，有两个 Redis 命令可以生成 RDB 文件，一个是 SAVE，另一个是 BGSAVE



##### SAVE

SAVE 指令：手动执行一次保存操作，该指令的执行会阻塞当前 Redis 服务器，客户端发送的所有命令请求都会被拒绝，直到当前 RDB 过程完成为止，有可能会造成长时间阻塞，线上环境不建议使用

工作原理：Redis 是个**单线程的工作模式**，会创建一个任务队列，所有的命令都会进到这个队列排队执行。当某个指令在执行的时候，队列后面的指令都要等待，所以这种执行方式会非常耗时

配置 redis.conf：

```sh
dir path				#设置存储.rdb文件的路径，通常设置成存储空间较大的目录中，目录名称data
dbfilename "x.rdb"		#设置本地数据库文件名，默认值为dump.rdb，通常设置为dump-端口号.rdb
rdbcompression yes|no	#设置存储至本地数据库时是否压缩数据，默认yes，设置为no节省CPU运行时间
rdbchecksum yes|no		#设置读写文件过程是否进行RDB格式校验，默认yes
```



***



##### BGSAVE

BGSAVE：bg 是 background，代表后台执行，命令的完成需要两个进程，**进程之间不相互影响**，所以持久化期间 Redis 正常工作

工作原理：

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-bgsave工作原理.png" style="zoom:67%;" />

流程：客户端发出 BGSAVE 指令，Redis 服务器使用 fork 函数创建一个子进程，然后响应后台已经开始执行的信息给客户端。子进程会异步执行持久化的操作，持久化过程是先将数据写入到一个临时文件中，持久化操作结束再用这个临时文件**替换**上次持久化的文件

```python
# 创建子进程
pid = fork()
if pid == 0:
    # 子进程负责创建 RDB 文件
    rdbSave()
    # 完成之后向父进程发送信号
    signal_parent()
elif pid > 0:
    # 父进程继续处理命令请求，并通过轮询等待子进程的信号
    handle_request_and_wait_signal()
else:
    # 处理出错恃况
    handle_fork_error() 
```

配置 redis.conf

```sh
stop-writes-on-bgsave-error yes|no	#后台存储过程中如果出现错误，是否停止保存操作，默认yes
dbfilename filename  
dir path  
rdbcompression yes|no  
rdbchecksum yes|no
```

注意：BGSAVE 命令是针对 SAVE 阻塞问题做的优化，Redis 内部所有涉及到 RDB 操作都采用 BGSAVE 的方式，SAVE 命令放弃使用

在 BGSAVE 命令执行期间，服务器处理 SAVE、BGSAVE、BGREWRITEAOF 三个命令的方式会和平时有所不同

* SAVE 命令会被服务器拒绝，服务器禁止 SAVE 和 BGSAVE 命令同时执行是为了避免父进程（服务器进程）和子进程同时执行两个 rdbSave 调用，产生竞争条件
* BGSAVE 命令也会被服务器拒绝，也会产生竞争条件
* BGREWRITEAOF 和 BGSAVE 两个命令不能同时执行
  * 如果 BGSAVE 命令正在执行，那么 BGREWRITEAOF 命令会被**延迟**到 BGSAVE 命令执行完毕之后执行
  * 如果 BGREWRITEAOF 命令正在执行，那么 BGSAVE 命令会被服务器拒绝



***



##### 特殊指令

RDB 特殊启动形式的指令（客户端输入）

* 服务器运行过程中重启

  ```sh
  debug reload
  ```

* 关闭服务器时指定保存数据

  ```sh
  shutdown save
  ```

  默认情况下执行 shutdown 命令时，自动执行 bgsave（如果没有开启 AOF 持久化功能）

* 全量复制：主从复制部分详解





***



#### 文件载入

RDB 文件的载入工作是在服务器启动时自动执行，期间 Redis 会一直处于阻塞状态，直到载入完成

Redis 并没有专门用于载入 RDB 文件的命令，只要服务器在启动时检测到 RDB 文件存在，就会自动载入 RDB 文件

```sh
[7379] 30 Aug 21:07:01.289 * DB loaded from disk: 0.018 seconds  # 服务器在成功载入 RDB 文件之后打印
```

AOF 文件的更新频率通常比 RDB 文件的更新频率高：

* 如果服务器开启了 AOF 持久化功能，那么会优先使用 AOF 文件来还原数据库状态
* 只有在 AOF 持久化功能处于关闭状态时，服务器才会使用 RDB 文件来还原数据库状态





****



#### 自动保存

##### 配置文件

Redis 支持通过配置服务器的 save 选项，让服务器每隔一段时间自动执行一次 BGSAVE 命令

配置 redis.conf：

```sh
save second changes #设置自动持久化条件，满足限定时间范围内key的变化数量就进行持久化(bgsave)
```

* second：监控时间范围
* changes：监控 key 的变化量

默认三个条件：

```sh
save 900 1		# 900s内1个key发生变化就进行持久化
save 300 10
save 60 10000
```

判定 key 变化的依据：

* 对数据产生了影响，不包括查询
* 不进行数据比对，比如 name 键存在，重新 set name seazean 也算一次变化

save 配置要根据实际业务情况进行设置，频度过高或过低都会出现性能问题，结果可能是灾难性的



***



##### 自动原理

服务器状态相关的属性：

```c
struct redisServer {
    // 记录了保存条件的数组
    struct saveparam *saveparams;
    
    // 修改计数器
    long long dirty;
    
    // 上一次执行保存的时间 
    time_t lastsave;
};
```

* Redis 服务器启动时，可以通过指定配置文件或者传入启动参数的方式设置 save 选项， 如果没有自定义就设置为三个默认值（上节提及），设置服务器状态 redisServe.saveparams 属性，该数组每一项为一个 saveparam 结构，代表 save 的选项设置

  ```c
  struct saveparam {
      // 秒数
      time_t seconds
      // 修改数
      int changes;
  };
  ```
  
* dirty 计数器记录距离上一次成功执行 SAVE 或者 BGSAVE 命令之后，服务器中的所有数据库进行了多少次修改（包括写入、删除、更新等操作），当服务器成功执行一个修改指令，该命令修改了多少次数据库， dirty 的值就增加多少

* lastsave 属性是一个 UNIX 时间戳，记录了服务器上一次成功执行 SAVE 或者 BGSAVE 命令的时间

Redis 的服务器周期性操作函数 serverCron 默认每隔 100 毫秒就会执行一次，该函数用于对正在运行的服务器进行维护

serverCron 函数的其中一项工作是检查 save 选项所设置的保存条件是否满足，会遍历 saveparams 数组中的**所有保存条件**，只要有任意一个条件被满足服务器就会执行 BGSAVE 命令

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-BGSAVE执行原理.png)





***



#### 文件结构

RDB 的存储结构：图示全大写单词标示常量，用全小写单词标示变量和数据

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-RDB文件结构.png)

* REDIS：长度为 5 字节，保存着 `REDIS` 五个字符，是 RDB 文件的开头，在载入文件时可以快速检查所载入的文件是否 RDB 文件
* db_version：长度为 4 字节，是一个用字符串表示的整数，记录 RDB 的版本号
* database：包含着零个或任意多个数据库，以及各个数据库中的键值对数据
* EOF：长度为 1 字节的常量，标志着 RDB 文件正文内容的结束，当读入遇到这个值时，代表所有数据库的键值对都已经载入完毕
* check_sum：长度为 8 字节的无符号整数，保存着一个校验和，该值是通过 REDIS、db_version、databases、EOF 四个部分的内容进行计算得出。服务器在载入 RDB 文件时，会将载入数据所计算出的校验和与 check_sum 所记录的校验和进行对比，来检查 RDB 文件是否有出错或者损坏

Redis 本身带有 RDB 文件检查工具 redis-check-dump





***
