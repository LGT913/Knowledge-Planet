---
title: "Lua 脚本"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Lua 脚本, system]
summary: "Redis 对 Lua 脚本支持，通过在服务器中嵌入 Lua 环境，客户端可以使用 Lua 脚本直接在服务器端原子地执行多个命令"
private: false
---

## Lua 脚本

### 环境创建

#### 基本介绍

Redis 对 Lua 脚本支持，通过在服务器中嵌入 Lua 环境，客户端可以使用 Lua 脚本直接在服务器端**原子地执行**多个命令

```sh
EVAL <script> <numkeys> [key ...] [arg ...]
EVALSHA <sha1> <numkeys> [key ...] [arg ...]
```

EVAL 命令可以直接对输入的脚本计算：

```sh
redis> EVAL "return 1 + 1" 0	# 0代表需要的参数
(integer) 2 
```

EVALSHA 命令根据脚本的 SHA1 校验和来对脚本计算：

```sh
redis> EVALSHA "2f3lba2bb6d6a0f42ccl59d2e2dad55440778de3" 0
(integer) 2 
```

应用场景：Redis 只保证单条命令的原子性，所以为了实现原子操作，将多条的对 Redis 的操作整合到一个脚本里，但是避免把不需要做并发控制的操作写入脚本中

Lua 语法特点：

* 声明变量的时候无需指定数据类型，而是用 local 来声明变量为局部变量
* 数组下标是从 1 开始



***



#### 创建过程

Redis 服务器创建并修改 Lua 环境的整个过程：

* 创建一个基础的 Lua 环境，调用 Lua 的 API 函数 lua_open

* 载入多个函数库到 Lua 环境里面，让 Lua 脚本可以使用这些函数库来进行数据操作，包括基础核心函数

* 创建全局变量 redis 表格，表格包含以下函数：

  * 执行 Redis 命令的 redis.call 和 redis.pcall 函数
  * 记录 Redis 日志的 redis.log 函数，以及相应的日志级别 (level) 常量 redis.LOG_DEBUG 等
  * 计算 SHAl 校验和的 redis.shalhex 函数
  * 返回错误信息的 redis.error_reply 函数和 redis.status_reply 函数

* 使用 Redis 自制的随机函数来替换 Lua 原有的带有副作用的随机函数，从而避免在脚本中引入副作用

  Redis 要求所有传入服务器的 Lua 脚本，以及 Lua 环境中的所有函数，都必须是无副作用（side effect）的纯函数（pure function），所以对有副作用的随机函数 `math.random` 和 `math.randornseed` 进行替换

* 创建排序辅助函数 ` _redis_compare_helper`，使用辅助函数来对一部分 Redis 命令的结果进行排序，从而消除命令的不确定性

  比如集合元素的排列是无序的， 所以即使两个集合的元素完全相同，输出结果也不一定相同，Redis 将 SMEMBERS 这类在相同数据集上产生不同输出的命令称为带有不确定性的命令

* 创建 redis.pcall 函数的错误报告辅助函数 `_redis_err_handler `，这个函数可以打印出错代码的来源和发生错误的行数

* 对 Lua 环境中的全局环境进行保护，确保传入服务器的脚本不会因忘记使用 local 关键字，而将额外的全局变量添加到 Lua 环境

* 将完成修改的 Lua 环境保存到服务器状态的 lua 属性中，等待执行服务器传来的 Lua 脚本

  ```c
  struct redisServer {
      Lua *lua;
  };
  ```

Redis 使用串行化的方式来执行 Redis 命令，所以在任何时间里最多都只会有一个脚本能够被放进 Lua 环境里面运行，因此整个 Redis 服务器只需要创建一个 Lua 环境即可





****



### 协作组件

#### 伪客户端

Redis 服务器为 Lua 环境创建了一个伪客户端负责处理 Lua 脚本中包含的所有 Redis 命令，工作流程：

*  Lua 环境将 redis.call 或者 redis.pcall 函数想要执行的命令传给伪客户端
* 伪客户端将命令传给命令执行器
* 命令执行器执行命令并将命令的执行结果返回给伪客户端
* 伪客户端接收命令执行器返回的命令结果，并将结果返回给 Lua 环境
* Lua 将命令结果返回给 redis.call 函数或者 redis.pcall 函数
* redis.call 函数或者 redis.pcall 函数会将命令结果作为返回值返回给脚本的调用者

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/Redis-Lua伪客户端执行.png)





***



#### 脚本字典

Redis 服务器为 Lua 环境创建 lua_scripts 字典，键为某个 Lua 脚本的 SHA1 校验和（checksum），值则是校验和对应的 Lua 脚本

```c
struct redisServer {
    dict *lua_scripts;
};
```

服务器会将所有被 EVAL 命令执行过的 Lua 脚本，以及所有被 SCRIPT LOAD 命令载入过的 Lua 脚本都保存到 lua_scripts 字典

```sh
redis> SCRIPT LOAD "return 'hi'"
"2f3lba2bb6d6a0f42ccl59d2e2dad55440778de3" # 字典的键，SHA1 校验和
```





***



### 命令实现

#### 脚本函数

EVAL 命令的执行的第一步是为传入的脚本定义一个相对应的 Lua 函数，Lua 函数的名字由 f_ 前缀加上脚本的 SHA1 校验和（四十个字符长）组成，而函数的体（body）则是脚本本身

```sh
EVAL "return 'hello world'" 0 
# 命令将会定义以下的函数
function f_533203lc6b470dc5a0dd9b4bf2030dea6d65de91() {
	return 'hello world'
}
```

使用函数来保存客户端传入的脚本有以下优点：

* 通过函数的局部性来让 Lua 环境保持清洁，减少了垃圾回收的工作最， 并且避免了使用全局变量
* 如果某个脚本在 Lua 环境中被定义过至少一次，那么只需要 SHA1 校验和，服务器就可以在不知道脚本本身的情况下，直接通过调用 Lua 函数来执行脚本

EVAL 命令第二步是将客户端传入的脚本保存到服务器的 lua_scripts 字典里，在字典中新添加一个键值对



***



#### 执行函数

EVAL 命令第三步是执行脚本函数

* 将 EVAL 命令中传入的**键名参数和脚本参数**分别保存到 KEYS 数组和 ARGV 数组，将这两个数组作为**全局变量**传入到 Lua 环境
* 为 Lua 环境装载超时处理钩子（hook），这个钩子可以在脚本出现超时运行情况时，让客户端通过 `SCRIPT KILL` 命令停止脚本，或者通过 SHUTDOWN 命令直接关闭服务器

  因为 Redis 是单线程的执行命令，当 Lua 脚本阻塞时需要兜底策略，可以中断执行
* 执行脚本函数
* 移除之前装载的超时钩子
* 将执行脚本函数的结果保存到客户端状态的输出缓冲区里，等待服务器将结果返回给客户端





***



#### EVALSHA

EVALSHA 命令的实现原理就是根据脚本的 SHA1 校验和来调用**脚本对应的函数**，如果函数在 Lua 环境中不存在，找不到 f_ 开头的函数，就会返回 `SCRIPT NOT FOUND`





***



### 管理命令

Redis 中与 Lua 脚本有关的管理命令有四个：

* SCRIPT FLUSH：用于清除服务器中所有和 Lua 脚本有关的信息，会释放并重建 lua_scripts 字典，关闭现有的 Lua 环境并重新创建一个新的 Lua 环境

* SCRIPT EXISTS：根据输入的 SHA1 校验和（允许一次传入多个校验和），检查校验和对应的脚本是否存在于服务器中，通过检查 lua_scripts 字典实现

* SCRIPT LOAD：在 Lua 环境中为脚本创建相对应的函数，然后将脚本保存到 lua_scripts字典里

  ```sh
  redis> SCRIPT LOAD "return 'hi'"
  "2f3lba2bb6d6a0f42ccl59d2e2dad55440778de3"
  ```

* SCRIPT KILL：停止脚本

如果服务器配置了 lua-time-li­mit 选项，那么在每次执行 Lua 脚本之前，都会设置一个超时处理的钩子。钩子会在脚本运行期间会定期检查运行时间是否超过配置时间，如果超时钩子将定期在脚本运行的间隙中，查看是否有 SCRIPT KILL 或者 SHUTDOWN 到达：

* 如果超时运行的脚本没有执行过写入操作，客户端可以通过 SCRIPT KILL 来停止这个脚本
* 如果执行过写入操作，客户端只能用 SHUTDOWN nosave 命令来停止服务器，防止不合法的数据被写入数据库中





***



### 脚本复制

#### 命令复制

当服务器运行在复制模式时，具有写性质的脚本命令也会被复制到从服务器，包括 EVAL、EVALSHA、SCRIPT FLUSH，以及 SCRIPT LOAD 命令

Redis 复制 EVAL、SCRIPT FLUSH、SCRIPT LOAD 三个命令的方法和复制普通 Redis 命令的方法一样，当主服务器执行完以上三个命令的其中一个时，会直接将被执行的命令传播（propagate）给所有从服务器，在从服务器中产生相同的效果



***



#### EVALSHA

EVALSHA 命令的复制操作相对复杂，因为多个从服务器之间载入 Lua 脚本的清况各有不同，一个在主服务器被成功执行的 EVALSHA 命令，在从服务器执行时可能会出现脚本未找到（not found）错误

Redis 要求主服务器在传播 EVALSHA 命令时，必须确保 EVALSHA 命令要执行的脚本已经被所有从服务器载入过，如果不能确保主服务器会**将 EVALSHA 命令转换成一个等价的 EVAL 命令**，然后通过传播 EVAL 命令来代替 EVALSHA 命令

主服务器使用服务器状态的 repl_scriptcache_dict 字典记录已经将哪些脚本传播给了**所有从服务器**，当一个校验和出现在字典时，说明校验和对应的 Lua 脚本已经传播给了所有从服务器，主服务器可以直接传播 EVALSHA 命令

```c
struct redisServer {
    // 键是一个个 Lua 脚本的 SHA1 校验和，值则全部都是 NULL
    dict *repl_scriptcache_dict;
}
```

注意：每当主服务器添加一个新的从服务器时，都会清空 repl_scriptcache_dict 字典，因为字典里面记录的脚本已经不再被所有从服务器载入过，所以服务器以清空字典的方式，强制重新向所有从服务器传播脚本

通过使用 EVALSHA 命令指定的 SHA1 校验和，以及 lua_scripts 字典保存的 Lua 脚本，可以将一个 EVALSHA 命令转化为 EVAL 命令

```sh
EVALSHA "533203lc6b470dc5a0dd9b4bf2030dea6d65de91" 0 
# -> 转换
EVAL "return'hello world'" 0 
```

脚本内容 `"return'hello world'"` 来源于 lua_scripts 字典 533203lc6b470dc5a0dd9b4bf2030dea6d65de91 键的值





***
