---
title: "基本操作"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 基本操作, system]
summary: "拷贝 apache-zookeeper-3.5.7-bin.tar.gz 安装包到 Linux 系统下，并解压到指定目录"
private: false
---

## 基本操作

### 安装搭建

安装步骤：

* 安装 JDK

* 拷贝 apache-zookeeper-3.5.7-bin.tar.gz 安装包到 Linux 系统下，并解压到指定目录

* conf 目录下的配置文件重命名：

  ```
  mv zoo_sample.cfg zoo.cfg
  ```

* 修改配置文件：

  ```sh
  vim zoo.cfg
  # 修改内容
  dataDir=/home/seazean/SoftWare/zookeeper-3.5.7/zkData 
  ```

* 在对应目录创建 zkData 文件夹：

  ```sh
  mkdir zkData
  ```

Zookeeper 中的配置文件 zoo.cfg 中参数含义解读： 

* tickTime = 2000：通信心跳时间，**Zookeeper 服务器与客户端心跳**时间，单位毫秒
* initLimit = 10：Leader 与 Follower 初始通信时限，初始连接时能容忍的最多心跳次数
* syncLimit = 5：Leader 与 Follower 同步通信时限，LF 通信时间超过 `syncLimit * tickTime`，Leader 认为 Follwer 下线
* dataDir：保存 Zookeeper 中的数据目录，默认是 tmp目录，容易被 Linux 系统定期删除，所以建议修改
* clientPort = 2181：客户端连接端口，通常不做修改



***



### 操作命令

#### 服务端

Linux 命令：

* 启动 ZooKeeper 服务：`./zkServer.sh start`

* 查看 ZooKeeper 服务：`./zkServer.sh status`

* 停止 ZooKeeper 服务：`./zkServer.sh stop`

* 重启 ZooKeeper 服务：`./zkServer.sh restart `

* 查看进程是否启动：`jps`





***



#### 客户端

Linux 命令：

* 连接 ZooKeeper 服务端：

  ```sh
  ./zkCli.sh					# 直接启动
  ./zkCli.sh –server ip:port	# 指定 host 启动
  ```

客户端命令：

* 基础操作：

  ```sh
  quit						# 停止连接
  help						# 查看命令帮助
  ```

* 创建命令：**`/` 代表根目录**

  ```sh
  create /path value			# 创建节点，value 可选
  create -e /path value		# 创建临时节点
  create -s /path value		# 创建顺序节点
  create -es /path value  	# 创建临时顺序节点，比如node10000012 删除12后也会继续从13开始，只会增加
  ```

* 查询命令：

  ```sh
  ls /path					# 显示指定目录下子节点
  ls –s /path					# 查询节点详细信息
  ls –w /path					# 监听子节点数量的变化
  stat /path					# 查看节点状态
  get –s /path				# 查询节点详细信息
  get –w /path				# 监听节点数据的变化
  ```

  ```sh
  # 属性，分为当前节点的属性和子节点属性
  czxid: 节点被创建的事务ID, 是ZooKeeper中所有修改总的次序，每次修改都有唯一的 zxid，谁小谁先发生
  ctime: 被创建的时间戳
  mzxid: 最后一次被更新的事务ID 
  mtime: 最后修改的时间戳
  pzxid: 子节点列表最后一次被更新的事务ID
  cversion: 子节点的变化号，修改次数
  dataversion: 节点的数据变化号，数据的变化次数
  aclversion: 节点的访问控制列表变化号
  ephemeralOwner: 用于临时节点，代表节点拥有者的 session id，如果为持久节点则为0 
  dataLength: 节点存储的数据的长度 
  numChildren: 当前节点的子节点数量
  ```

* 删除命令：

  ```sh
  delete /path				# 删除节点
  deleteall /path				# 递归删除节点
  ```



***



### 数据结构

ZooKeeper 是一个树形目录服务，类似 Unix 的文件系统，每一个节点都被称为 ZNode，每个 ZNode 默认存储 1MB 的数据，节点上会保存数据和节点信息，每个 ZNode 都可以通过其路径唯一标识

节点可以分为四大类：

* PERSISTENT：持久化节点 
* EPHEMERAL：临时节点，客户端和服务器端**断开连接**后，创建的节点删除
* PERSISTENT_SEQUENTIAL：持久化顺序节点，创建 znode 时设置顺序标识，节点名称后会附加一个值，**顺序号是一个单调递增的计数器**，由父节点维护
* EPHEMERAL_SEQUENTIAL：临时顺序节点

注意：在分布式系统中，顺序号可以被用于为所有的事件进行全局排序，这样客户端可以通过顺序号推断事件的顺序

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Zookeeper-节点树形结构.png)



***



### 代码实现

添加 Maven 依赖：

```xml
<dependency>
    <groupId>org.apache.zookeeper</groupId>
    <artifactId>zookeeper</artifactId>
    <version>3.5.7</version>
</dependency>
```

实现代码：

```java
public static void main(String[] args) {
    // 参数一：连接地址
    // 参数二：会话超时时间
    // 参数三：监听器
    ZooKeeper zkClient = new ZooKeeper("192.168.3.128:2181", 20000, new Watcher() {
        @Override
        public void process(WatchedEvent event) {
            System.out.println("监听处理函数");
        }
    });
}
```







***
