---
title: "DDL"
date: 2023-09-26
planet: system
tags: ["Java", "基础", DDL, system]
summary: "SHOW CREATE DATABASE mysql;     -- 查看mysql数据库的创建格式"
private: false
---

### DDL

#### 数据库

* R(Retrieve)：查询

  * 查询所有数据库：

    ```mysql
    SHOW DATABASES;
    ```

  * 查询某个数据库的创建语句

    ```sql
    SHOW CREATE DATABASE 数据库名称;  -- 标准语法
    
    SHOW CREATE DATABASE mysql;     -- 查看mysql数据库的创建格式
    ```

    

* C(Create)：创建

  * 创建数据库

    ```mysql
    CREATE DATABASE 数据库名称;-- 标准语法
    
    CREATE DATABASE db1;     -- 创建db1数据库
    ```

  * 创建数据库（判断，如果不存在则创建）

    ```mysql
    CREATE DATABASE IF NOT EXISTS 数据库名称;
    ```

  * 创建数据库，并指定字符集

    ```mysql
    CREATE DATABASE 数据库名称 CHARACTER SET 字符集名称;
    ```

  * 例如：创建db4数据库、如果不存在则创建，指定字符集为gbk

    ```mysql
    -- 创建db4数据库、如果不存在则创建，指定字符集为gbk
    CREATE DATABASE IF NOT EXISTS db4 CHARACTER SET gbk;
    
    -- 查看db4数据库的字符集
    SHOW CREATE DATABASE db4;
    ```

    

* U(Update)：修改

  * 修改数据库的字符集

    ```mysql
    ALTER DATABASE 数据库名称 CHARACTER SET 字符集名称;
    ```

  * 常用字符集：

    ```mysql
    --查询所有支持的字符集
    SHOW CHARSET;
    --查看所有支持的校对规则
    SHOW COLLATION;
    
    -- 字符集: utf8,latinI,GBK,,GBK是utf8的子集
    -- 校对规则: ci 大小定不敏感，cs或bin大小写敏感
    ```

    

* D(Delete)：删除

  * 删除数据库：

    ```mysql
    DROP DATABASE 数据库名称;
    ```

  * 删除数据库(判断，如果存在则删除)：

    ```mysql
    DROP DATABASE IF EXISTS 数据库名称;
    ```
    
    

* 使用数据库：

  * 查询当前正在使用的数据库名称

    ```mysql
    SELECT DATABASE();
    ```

  * 使用数据库

    ```mysql
    USE 数据库名称； -- 标准语法
    USE db4;	   -- 使用db4数据库
    ```




***



#### 数据表

- R(Retrieve)：查询

  - 查询数据库中所有的数据表

    ```mysql
    USE mysql;-- 使用mysql数据库
    
    SHOW TABLES;-- 查询库中所有的表
    ```
  
  - 查询表结构

    ```mysql
  DESC 表名;
    ```
  
  - 查询表字符集
  
    ```mysql
    SHOW TABLE STATUS FROM 库名 LIKE '表名';
    ```

    

- C(Create)：创建

  - 创建数据表

    ```mysql
    CREATE TABLE 表名(
        列名1 数据类型1,
        列名2 数据类型2,
        ....
        列名n 数据类型n
    );
    -- 注意：最后一列，不需要加逗号
    ```

  - 复制表

    ```mysql
    CREATE TABLE 表名 LIKE 被复制的表名;  -- 标准语法
    
    CREATE TABLE product2 LIKE product; -- 复制product表到product2表
    ```

  - 数据类型

    | 数据类型  | 说明                                                         |
    | --------- | ------------------------------------------------------------ |
    | INT       | 整数类型                                                     |
    | DOUBLE    | 小数类型                                                     |
    | DATE      | 日期，只包含年月日：yyyy-MM-dd                               |
    | DATETIME  | 日期，包含年月日时分秒：yyyy-MM-dd HH:mm:ss                  |
    | TIMESTAMP | 时间戳类型，包含年月日时分秒：yyyy-MM-dd HH:mm:ss<br />如果不给这个字段赋值或赋值为 NULL，则默认使用当前的系统时间 |
    | CHAR      | 字符串，定长类型                                             |
    | VARCHAR   | 字符串，**变长类型**<br />name varchar(20) 代表姓名最大 20 个字符：zhangsan 8 个字符，张三 2 个字符 |
  
    `INT(n)`：n 代表位数
  
    * 3：int（9）显示结果为 000000010
    * 3：int（3）显示结果为 010
  
    `varchar(n)`：n 表示的是字符数
  
  - 例如：
  
    ```mysql
    -- 使用db3数据库
    USE db3;
    
    -- 创建一个product商品表
    CREATE TABLE product(
    	id INT,				-- 商品编号
    	NAME VARCHAR(30),	-- 商品名称
    	price DOUBLE,		-- 商品价格
    	stock INT,			-- 商品库存
    	insert_time DATE    -- 上架时间
    );
    ```

​    

- U(Update)：修改

  - 修改表名

    ```mysql
    ALTER TABLE 表名 RENAME TO 新的表名;
    ```
  
  - 修改表的字符集
  
    ```mysql
  ALTER TABLE 表名 CHARACTER SET 字符集名称;
    ```

  - 添加一列
  
    ```mysql
    ALTER TABLE 表名 ADD 列名 数据类型;
    ```
  
  - 修改列数据类型
  
    ```mysql
    ALTER TABLE 表名 MODIFY 列名 新数据类型;
    ```

  - 修改列名称和数据类型

    ```mysql
    ALTER TABLE 表名 CHANGE 列名 新列名 新数据类型;
    ```
  
  - 删除列
  
    ```mysql
    ALTER TABLE 表名 DROP 列名;
    ```

    
  
- D(Delete)：删除

  - 删除数据表

    ```mysql
    DROP TABLE 表名;
    ```
  
  - 删除数据表(判断，如果存在则删除)
  
    ```mysql
    DROP TABLE IF EXISTS 表名;
    ```
  
    

***
