---
title: "服务器"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 服务器, system]
summary: "Redis 服务器与多个客户端建立网络连接，处理客户端发送的命令请求，在数据库中保存客户端执行命令所产生的数据，并通过资源管理来维持服务器自身的运转，所以一个命令请求从发送到获得回复的过程中，客户端和服务器需要完成一系列操作"
private: false
---

### 服务器

#### 执行流程

Redis 服务器与多个客户端建立网络连接，处理客户端发送的命令请求，在数据库中保存客户端执行命令所产生的数据，并通过资源管理来维持服务器自身的运转，所以一个命令请求从发送到获得回复的过程中，客户端和服务器需要完成一系列操作



##### 命令请求

Redis 服务器的命令请求来自 Redis 客户端，当用户在客户端中键入一个命令请求时，客户端会将这个命令请求转换成协议格式，通过连接到服务器的套接字，将协议格式的命令请求发送给服务器

```sh
SET KEY VALUE ->	# 命令
*3\r\nS3\r\nSET\r\n$3\r\nKEY\r\n$5\r\nVALUE\r\n	# 协议格式
```

当客户端与服务器之间的连接套接字因为客户端的写入而变得可读，服务器调用**命令请求处理器**来执行以下操作：

* 读取套接字中协议格式的命令请求，并将其保存到客户端状态的输入缓冲区里面
* 对输入缓冲区中的命令请求进行分析，提取出命令请求中包含的命令参数以及命令参数的个数，然后分别将参数和参数个数保存到客户端状态的 argv 属性和 argc 属性里
* 调用命令执行器，执行客户端指定的命令

最后客户端接收到协议格式的命令回复之后，会将这些回复转换成用户可读的格式打印给用户观看，至此整体流程结束



****



##### 命令执行

命令执行器开始对命令操作：

* 查找命令：首先根据客户端状态的 argv[0] 参数，在**命令表 (command table)** 中查找参数所指定的命令，并将找到的命令保存到客户端状态的 cmd 属性里面，是一个 redisCommand 结构

  命令查找算法与字母的大小写无关，所以命令名字的大小写不影响命令表的查找结果

* 执行预备操作：

  * 检查客户端状态的 cmd 指针是否指向 NULL，根据 redisCommand 检查请求参数的数量是否正确
  * 检查客户端是否通过身份验证
  * 如果服务器打开了 maxmemory 功能，执行命令之前要先检查服务器的内存占用，在有需要时进行内存回收（**逐出算法**）
  * 如果服务器上一次执行 BGSAVE 命令出错，并且服务器打开了 stop-writes-on-bgsave-error 功能，那么如果本次执行的是写命令，服务会拒绝执行，并返回错误
  * 如果客户端当前正在用 SUBSCRIBE 或 PSUBSCRIBE 命令订阅频道，那么服务器会拒绝除了 SUBSCRIBE、SUBSCRIBE、 UNSUBSCRIBE、PUNSUBSCRIBE 之外的其他命令
  * 如果服务器正在进行载入数据，只有 sflags 带有 1 标识（比如 INFO、SHUTDOWN、PUBLISH等）的命令才会被执行
  * 如果服务器执行 Lua 脚本而超时并进入阻塞状态，那么只会执行客户端发来的 SHUTDOWN nosave 和 SCRIPT KILL 命令
  * 如果客户端正在执行事务，那么服务器只会执行客户端发来的 EXEC、DISCARD、MULTI、WATCH 四个命令，其他命令都会被**放进事务队列**中
  * 如果服务器打开了监视器功能，那么会将要执行的命令和参数等信息发送给监视器

* 调用命令的实现函数：被调用的函数会执行指定的操作并产生相应的命令回复，回复会被保存在客户端状态的输出缓冲区里面（buf 和 reply 属性），然后实现函数还会**为客户端的套接字关联命令回复处理器**，这个处理器负责将命令回复返回给客户端

* 执行后续工作：

  * 如果服务器开启了慢查询日志功能，那么慢查询日志模块会检查是否需要为刚刚执行完的命令请求添加一条新的慢查询日志
  * 根据执行命令所耗费的时长，更新命令的 redisCommand 结构的 milliseconds 属性，并将命令 calls 计数器的值增一
  * 如果服务器开启了 AOF 持久化功能，那么 AOF 持久化模块会将执行的命令请求写入到 AOF 缓冲区里面
  * 如果有其他从服务器正在复制当前这个服务器，那么服务器会将执行的命令传播给所有从服务器

* 将命令回复发送给客户端：客户端**套接字变为可写状态**时，服务器就会执行命令回复处理器，将客户端输出缓冲区中的命令回复发送给客户端，发送完毕之后回复处理器会清空客户端状态的输出缓冲区，为处理下一个命令请求做好准备



****



##### Command

每个 redisCommand 结构记录了一个Redis 命令的实现信息，主要属性

```c
struct redisCommand {
    // 命令的名字，比如"set"
    char *name;
    
    // 函数指针，指向命令的实现函数，比如setCommand
    // redisCommandProc 类型的定义为 typedef void redisCommandProc(redisClient *c)
    redisCommandProc *proc;
    
    // 命令参数的个数，用于检查命令请求的格式是否正确。如果这个值为负数-N, 那么表示参数的数量大于等于N。
    // 注意命令的名字本身也是一个参数，比如 SET msg "hello"，命令的参数是"SET"、"msg"、"hello" 三个
	int arity;
    
    // 字符串形式的标识值，这个值记录了命令的属性，，
    // 比如这个命令是写命令还是读命令，这个命令是否允许在载入数据时使用，是否允许在Lua脚本中使用等等
    char *sflags;
    
    // 对sflags标识进行分析得出的二进制标识，由程序自动生成。服务器对命令标识进行检查时使用的都是 flags 属性
    // 而不是sflags属性，因为对二进制标识的检查可以方便地通过& ^ ~ 等操作来完成
    int flags;
    
    // 服务器总共执行了多少次这个命令
    long long calls;
    
    // 服务器执行这个命令所耗费的总时长
    long long milliseconds;
};
```





****



#### serverCron

##### 基本介绍

Redis 服务器以周期性事件的方式来运行 serverCron 函数，服务器初始化时读取配置 server.hz 的值，默认为 10，代表每秒钟执行 10 次，即**每隔 100 毫秒执行一次**，执行指令 info server 可以查看

serverCron 函数负责定期对自身的资源和状态进行检查和调整，从而确保服务器可以长期、稳定地运行

* 更新服务器的各类统计信息，比如时间、内存占用、 数据库占用情况等
* 清理数据库中的过期键值对
* 关闭和清理连接失效的客户端
* 进行 AOF 或 RDB 持久化操作
* 如果服务器是主服务器，那么对从服务器进行定期同步
* 如果处于集群模式，对集群进行定期同步和连接测试



****



##### 时间缓存

Redis 服务器中有很多功能需要获取系统的当前时间，而每次获取系统的当前时间都需要执行一次系统调用，为了减少系统调用的执行次数，服务器状态中的 unixtime 属性和 mstime 属性被用作当前时间的缓存

```c
struct redisServer {
    // 保存了秒级精度的系统当前UNIX时间戳
    time_t unixtime;
	// 保存了毫秒级精度的系统当前UNIX时间戳 
    long long mstime;
    
};
```

serverCron 函数默认以每 100 毫秒一次的频率更新两个属性，所以属性记录的时间的精确度并不高

* 服务器只会在打印日志、更新服务器的 LRU 时钟、决定是否执行持久化任务、计算服务器上线时间（uptime）这类对时间精确度要求不高的功能上
* 对于为键设置过期时间、添加慢查询日志这种需要高精确度时间的功能来说，服务器还是会再次执行系统调用，从而获得最准确的系统当前时间



***



##### LRU 时钟

服务器状态中的 lruclock 属性保存了服务器的 LRU 时钟

```c
struct redisServer {
    // 默认每10秒更新一次的时钟缓存，用于计算键的空转(idle)时长。 
    unsigned lruclock:22; 
};
```

每个 Redis 对象都会有一个 lru 属性， 这个 lru 属性保存了对象最后一次被命令访问的时间

```c
typedef struct redisObiect {
	unsigned lru:22; 
} robj;
```

当服务器要计算一个数据库键的空转时间（即数据库键对应的值对象的空转时间），程序会用服务器的 lruclock 属性记录的时间减去对象的 lru 属性记录的时间

serverCron 函数默认以每 100 毫秒一次的频率更新这个属性，所以得出的空转时间也是模糊的



***



##### 命令次数

serverCron 中的 trackOperationsPerSecond 函数以每 100 毫秒一次的频率执行，函数功能是以**抽样计算**的方式，估算并记录服务器在最近一秒钟处理的命令请求数量，这个值可以通过 INFO status 命令的 instantaneous_ops_per_sec 域查看：

```sh
redis> INFO stats
# Stats 
instantaneous_ops_per_sec:6
```

根据上一次抽样时间 ops_sec_last_sample_time 和当前系统时间，以及上一次已执行的命令数 ops_sec_last_sample_ops 和服务器当前已经执行的命令数，计算出两次函数调用期间，服务器平均每毫秒处理了多少个命令请求，该值乘以 1000 得到每秒内的执行命令的估计值，放入 ops_sec_samples 环形数组里

```c
struct redisServer {
    // 上一次进行抽样的时间
	long long ops_sec_last_sample_time;
    // 上一次抽样时，服务器已执行命令的数量 
    long long ops_sec_last_sample_ops;
    // REDIS_OPS_SEC_SAMPLES 大小（默认值为16)的环形数组，数组的每一项记录一次的抽样结果
    long long ops_sec_samples[REDIS_OPS_SEC_SAMPLES];
    // ops_sec_samples数组的索引值，每次抽样后将值自增一，值为16时重置为0，让数组成为一个环形数组
    int ops_sec_idx;
};
```





***



##### 内存峰值

服务器状态里的 stat_peak_memory 属性记录了服务器内存峰值大小，循环函数每次执行时都会查看服务器当前使用的内存数量，并与 stat_peak_memory 保存的数值进行比较，设置为较大的值

```c
struct redisServer {
    // 已使用内存峰值
    size_t stat_peak_memory;
};
```

INFO memory 命令的 used_memory_peak 和 used_memory_peak_human 两个域分别以两种格式记录了服务器的内存峰值：

```sh
redis> INFO memory 
# Memory 
...
used_memory_peak:501824 
used_memory_peak_human:490.06K
```



***



##### SIGTERM

服务器启动时，Redis 会为服务器进程的 SIGTERM 信号关联处理器 sigtermHandler 函数，该信号处理器负责在服务器接到 SIGTERM 信号时，打开服务器状态的 shutdown_asap 标识

```c
struct redisServer {
    // 关闭服务器的标识：值为1时关闭服务器，值为0时不做操作
    int shutdown_asap;
};
```

每次 serverCron 函数运行时，程序都会对服务器状态的 shutdown_asap 属性进行检查，并根据属性的值决定是否关闭服务器

服务器在接到 SIGTERM 信号之后，关闭服务器并打印相关日志的过程：

```sh
[6794 | signal handler] (1384435690) Received SIGTERM, scheduling shutdown ... 
[6794] 14 Nov 21:28:10.108 # User requested shutdown ... 
[6794] 14 Nov 21:28:10.108 * Saving the final RDB snapshot before exiting. 
[6794) 14 Nov 21:28:10.161 * DB saved on disk 
[6794) 14 Nov 21:28:10.161 # Redisis now ready to exit, bye bye ... 
```



***



##### 管理资源

serverCron 函数每次执行都会调用 clientsCron 和 databasesCron 函数，进行管理客户端资源和数据库资源

clientsCron 函数对一定数量的客户端进行以下两个检查：

* 如果客户端与服务器之间的连接巳经超时（很长一段时间客户端和服务器都没有互动），那么程序释放这个客户端
* 如果客户端在上一次执行命令请求之后，输入缓冲区的大小超过了一定的长度，那么程序会释放客户端当前的输入缓冲区，并重新创建一个默认大小的输入缓冲区，从而防止客户端的输入缓冲区耗费了过多的内存

databasesCron 函数会对服务器中的一部分数据库进行检查，删除其中的过期键，并在有需要时对字典进行收缩操作



***



##### 持久状态

服务器状态中记录执行 BGSAVE 命令和 BGREWRITEAOF 命令的子进程的 ID

```c
struct redisServer {
    // 记录执行BGSAVE命令的子进程的ID，如果服务器没有在执行BGSAVE，那么这个属性的值为-1
    pid_t rdb_child_pid;
    // 记录执行BGREWRITEAOF命令的子进程的ID，如果服务器没有在执行那么这个属性的值为-1
    pid_t aof_child_pid
};
```

serverCron 函数执行时，会检查两个属性的值，只要其中一个属性的值不为 -1，程序就会执行一次 wait3 函数，检查子进程是否有信号发来服务器进程：

* 如果有信号到达，那么表示新的 RDB 文件已经生成或者 AOF 重写完毕，服务器需要进行相应命令的后续操作，比如用新的 RDB 文件替换现有的 RDB 文件，用重写后的 AOF 文件替换现有的 AOF 文件
* 如果没有信号到达，那么表示持久化操作未完成，程序不做动作

如果两个属性的值都为 -1，表示服务器没有进行持久化操作

* 查看是否有 BGREWRITEAOF 被延迟，然后执行 AOF 后台重写

* 查看服务器的自动保存条件是否已经被满足，并且服务器没有在进行持久化，就开始一次新的 BGSAVE 操作

  因为条件 1 可能会引发一次 AOF，所以在这个检查中会再次确认服务器是否已经在执行持久化操作

* 检查服务器设置的 AOF 重写条件是否满足，条件满足并且服务器没有进行持久化，就进行一次 AOF 重写

如果服务器开启了 AOF 持久化功能，并且 AOF 缓冲区里还有待写入的数据， 那么 serverCron 函数会调用相应的程序，将 AOF 缓冲区中的内容写入到 AOF 文件里



***



##### 延迟执行

在服务器执行 BGSAVE 命令的期间，如果客户端发送 BGREWRITEAOF 命令，那么服务器会将 BGREWRITEAOF 命令的执行时间延迟到 BGSAVE 命令执行完毕之后，用服务器状态的 aof_rewrite_scheduled 属性标识延迟与否

```c
struct redisServer {
    // 如果值为1，那么表示有 BGREWRITEAOF命令被延迟了
    int aof_rewrite_scheduled;
};
```

serverCron 函数会检查 BGSAVE 或者 BGREWRITEAOF 命令是否正在执行，如果这两个命令都没在执行，并且 aof_rewrite_scheduled 属性的值为 1，那么服务器就会执行之前被推延的 BGREWRITEAOF 命令



****



##### 执行次数

服务器状态的 cronloops 属性记录了 serverCron 函数执行的次数

```c
struct redisServer {
    // serverCron 函数每执行一次，这个属性的值就增 1
    int cronloops;
};
```



****



##### 缓冲限制

服务器会关闭那些输入或者输出**缓冲区大小超出限制**的客户端





****



#### 初始化

##### 初始结构

一个 Redis 服务器从启动到能够接受客户端的命令请求，需要经过一系列的初始化和设置过程

第一步：创建一个 redisServer 类型的实例变量 server 作为服务器的状态，并为结构中的各个属性设置默认值，由 initServerConfig 函数进行初始化一般属性：

* 设置服务器的运行 ID、默认运行频率、默认配置文件路径、默认端口号、默认 RDB 持久化条件和 AOF 持久化条件
* 初始化服务器的 LRU 时钟，创建命令表

第二步：载入配置选项，用户可以通过给定配置参数或者指定配置文件，对 server 变量相关属性的默认值进行修改

第三步：初始化服务器数据结构（除了命令表之外），因为服务器**必须先载入用户指定的配置选项才能正确地对数据结构进行初始化**，所以载入配置完成后才进性数据结构的初始化，服务器将调用 initServer 函数：

* server.clients 链表，记录了的客户端的状态结构；server.db 数组，包含了服务器的所有数据库
* 用于保存频道订阅信息的 server.pubsub_channels 字典， 以及保存模式订阅信息的 server.pubsub_patterns 链表
* 用于执行 Lua 脚本的 Lua 环境 server.lua 
* 保存慢查询日志的 server.slowlog 属性

initServer 还进行了非常重要的设置操作：

* 为服务器设置进程信号处理器
* 创建共享对象，包含 OK、ERR、**整数 1 到 10000 的字符串对象**等
* **打开服务器的监听端口**
* **为 serverCron 函数创建时间事件**， 等待服务器正式运行时执行 serverCron 函数
* 如果 AOF 持久化功能已经打开，那么打开现有的 AOF 文件，如果 AOF 文件不存在，那么创建并打开一个新的 AOF 文件 ，为 AOF 写入做好准备
* **初始化服务器的后台 I/O 模块**（BIO）, 为将来的 I/O 操作做好准备

当 initServer 函数执行完毕之后， 服务器将用 ASCII 字符在日志中打印出 Redis 的图标， 以及 Redis 的版本号信息



***



##### 还原状态

在完成了对服务器状态的初始化之后，服务器需要载入RDB文件或者AOF 文件， 并根据文件记录的内容来还原服务器的数据库状态：

* 如果服务器启用了 AOF 持久化功能，那么服务器使用 AOF 文件来还原数据库状态
* 如果服务器没有启用 AOF 持久化功能，那么服务器使用 RDB 文件来还原数据库状态

当服务器完成数据库状态还原工作之后，服务器将在日志中打印出载入文件并还原数据库状态所耗费的时长

```sh
[7171] 22 Nov 22:43:49.084 * DB loaded from disk: 0.071 seconds 
```



***



##### 驱动循环

在初始化的最后一步，服务器将打印出以下日志，并开始**执行服务器的事件循环**（loop）

```c
[7171] 22 Nov 22:43:49.084 * The server is now ready to accept connections on pert 6379
```

服务器现在开始可以接受客户端的连接请求，并处理客户端发来的命令请求了





*****
