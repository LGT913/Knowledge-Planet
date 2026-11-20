---
title: "SQL"
date: 2023-09-26
planet: system
tags: ["Java", "基础", SQL, system]
summary: "- Structured Query Language：结构化查询语言   - 定义了操作所有关系型数据库的规则，每种数据库操作的方式可能会存在不一样的地方，称为“方言”"
private: false
---

## 单表操作

### SQL

- SQL

  - Structured Query Language：结构化查询语言
  - 定义了操作所有关系型数据库的规则，每种数据库操作的方式可能会存在不一样的地方，称为“方言”

- SQL 通用语法

  - SQL 语句可以单行或多行书写，以**分号结尾**。
  - 可使用空格和缩进来增强语句的可读性。
  - MySQL 数据库的 SQL 语句不区分大小写，**关键字建议使用大写**。
  - 数据库的注释：
    - 单行注释：-- 注释内容       #注释内容（MySQL 特有）
    - 多行注释：/* 注释内容 */

- SQL 分类

  - DDL（Data Definition Language）数据定义语言

    - 用来定义数据库对象：数据库，表，列等。关键字：create、drop,、alter 等

  - DML（Data Manipulation Language）数据操作语言

    - 用来对数据库中表的数据进行增删改。关键字：insert、delete、update 等

  - DQL（Data Query Language）数据查询语言

    - 用来查询数据库中表的记录(数据)。关键字：select、where 等

  - DCL（Data Control Language）数据控制语言

    - 用来定义数据库的访问权限和安全级别，及创建用户。关键字：grant， revoke等

    ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-SQL分类.png)



***
