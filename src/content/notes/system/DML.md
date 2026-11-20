---
title: "DML"
date: 2023-09-26
planet: system
tags: ["Java", "基础", DML, system]
summary: "-- 默认给所有列批量添加数据      INSERT INTO 表名 VALUES 值1,值2,值3,...,值1,值2,值3,......;"
private: false
---

### DML

#### INSERT

* 新增表数据

  * 新增格式 1：给指定列添加数据

    ```mysql
    INSERT INTO 表名(列名1,列名2...) VALUES (值1,值2...);
    ```

  * 新增格式 2：默认给全部列添加数据

    ```mysql
    INSERT INTO 表名 VALUES (值1,值2,值3,...);
    ```

  * 新增格式 3：批量添加数据

    ```mysql
    -- 给指定列批量添加数据
    INSERT INTO 表名(列名1,列名2,...) VALUES (值1,值2,...),(值1,值2,...)...;
    
    -- 默认给所有列批量添加数据 
    INSERT INTO 表名 VALUES (值1,值2,值3,...),(值1,值2,值3,...)...;
    ```

* 字符串拼接

  ```mysql
  CONCAT(string1,string2,'',...)
  ```
  
  
  
* 注意事项

  - 列名和值的数量以及数据类型要对应
  - 除了数字类型，其他数据类型的数据都需要加引号(单引双引都可以，推荐单引)



***



#### UPDATE

* 修改表数据语法

  * 标准语法

    ```mysql
    UPDATE 表名 SET 列名1 = 值1,列名2 = 值2,... [where 条件];
    ```

  * 修改电视的价格为1800、库存为36

    ```mysql
    UPDATE product SET price=1800,stock=36 WHERE NAME='电视';
    SELECT * FROM product;-- 查看所有商品信息
    ```

* 注意事项

  - 修改语句中必须加条件
  - 如果不加条件，则将所有数据都修改



***



#### DELETE

* 删除表数据语法

  ```mysql
  DELETE FROM 表名 [WHERE 条件];
  ```

* 注意事项
  * 删除语句中必须加条件
  * 如果不加条件，则将所有数据删除



​    

***
