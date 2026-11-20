---
title: "MyISAM"
date: 2023-09-26
planet: system
tags: ["Java", "基础", MyISAM, system]
summary: "MyISAM 存储引擎只支持表锁，这也是 MySQL 开始几个版本中唯一支持的锁类型"
private: false
---

### MyISAM

#### 表级锁

MyISAM 存储引擎只支持表锁，这也是 MySQL 开始几个版本中唯一支持的锁类型

MyISAM 引擎在执行查询语句之前，会**自动**给涉及到的所有表加读锁，在执行增删改之前，会**自动**给涉及的表加写锁，这个过程并不需要用户干预，所以用户一般不需要直接用 LOCK TABLE 命令给 MyISAM 表显式加锁

* 加锁命令：（对 InnoDB 存储引擎也适用）

  读锁：所有连接只能读取数据，不能修改

  写锁：其他连接不能查询和修改数据

  ```mysql
  -- 读锁
  LOCK TABLE table_name READ;
  
  -- 写锁
  LOCK TABLE table_name WRITE;
  ```

* 解锁命令：

  ```mysql
  -- 将当前会话所有的表进行解锁
  UNLOCK TABLES;
  ```

锁的兼容性：

* 对 MyISAM 表的读操作，不会阻塞其他用户对同一表的读请求，但会阻塞对同一表的写请求
* 对 MyISAM 表的写操作，则会阻塞其他用户对同一表的读和写操作

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-MyISAM 锁的兼容性.png)

锁调度：**MyISAM 的读写锁调度是写优先**，因为写锁后其他线程不能做任何操作，大量的更新会使查询很难得到锁，从而造成永远阻塞，所以 MyISAM 不适合做写为主的表的存储引擎



***



#### 锁操作

##### 读锁

两个客户端操作 Client 1和 Client 2，简化为 C1、C2

* 数据准备：

  ```mysql
  CREATE TABLE `tb_book` (
    `id` INT(11) AUTO_INCREMENT,
    `name` VARCHAR(50) DEFAULT NULL,
    `publish_time` DATE DEFAULT NULL,
    `status` CHAR(1) DEFAULT NULL,
    PRIMARY KEY (`id`)
  ) ENGINE=MYISAM DEFAULT CHARSET=utf8 ;
  
  INSERT INTO tb_book (id, NAME, publish_time, STATUS) VALUES(NULL,'java编程思想','2088-08-01','1');
  INSERT INTO tb_book (id, NAME, publish_time, STATUS) VALUES(NULL,'mysql编程思想','2088-08-08','0');
  ```

* C1、C2 加读锁，同时查询可以正常查询出数据

  ```mysql
  LOCK TABLE tb_book READ;	-- C1、C2
  SELECT * FROM tb_book;		-- C1、C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-MyISAM 读锁1.png)

* C1 加读锁，C1、C2 查询未锁定的表，C1 报错，C2 正常查询

  ```mysql
  LOCK TABLE tb_book READ;	-- C1
  SELECT * FROM tb_user;		-- C1、C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-MyISAM 读锁2.png)

  C1、C2 执行插入操作，C1 报错，C2 等待获取

  ```mysql
  INSERT INTO tb_book VALUES(NULL,'Spring高级','2088-01-01','1');	-- C1、C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-MyISAM 读锁3.png)

  当在 C1 中释放锁指令 UNLOCK TABLES，C2 中的 INSERT 语句立即执行



***



##### 写锁

两个客户端操作 Client 1和 Client 2，简化为 C1、C2

* C1 加写锁，C1、C2查询表，C1 正常查询，C2 需要等待

  ```mysql
  LOCK TABLE tb_book WRITE;	-- C1
  SELECT * FROM tb_book;		-- C1、C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-MyISAM 写锁1.png)

  当在 C1 中释放锁指令 UNLOCK TABLES，C2 中的 SELECT 语句立即执行

* C1、C2 同时加写锁

  ```mysql
  LOCK TABLE tb_book WRITE;
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-MyISAM 写锁2.png)

* C1 加写锁，C1、C2查询未锁定的表，C1 报错，C2 正常查询



***



#### 锁状态

* 查看锁竞争：

  ```mysql
  SHOW OPEN TABLES;
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-锁争用情况查看1.png)

  In_user：表当前被查询使用的次数，如果该数为零，则表是打开的，但是当前没有被使用

  Name_locked：表名称是否被锁定，名称锁定用于取消表或对表进行重命名等操作

  ```mysql
  LOCK TABLE tb_book READ;	-- 执行命令
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-锁争用情况查看2.png)

* 查看锁状态：

  ```mysql
  SHOW STATUS LIKE 'Table_locks%';
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-MyISAM 锁状态.png)

  Table_locks_immediate：指的是能立即获得表级锁的次数，每立即获取锁，值加 1

  Table_locks_waited：指的是不能立即获取表级锁而需要等待的次数，每等待一次，该值加 1，此值高说明存在着较为严重的表级锁争用情况



***
