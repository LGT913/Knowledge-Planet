---
title: "相关API"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 相关API, system]
summary: "InputStream getResourceAsStreamString fileName：通过类加载器返回指定资源的字节流    参数 fileName 是放在 src 的核心配置文件名：MyBatisConfig.xml"
private: false
---

## 基本操作

### 相关API

Resources：加载资源的工具类

* `InputStream getResourceAsStream(String fileName)`：通过类加载器返回指定资源的字节流
  * 参数 fileName 是放在 src 的核心配置文件名：MyBatisConfig.xml

SqlSessionFactoryBuilder：构建器，用来获取 SqlSessionFactory 工厂对象

* `SqlSessionFactory build(InputStream is)`：通过指定资源的字节输入流获取 SqlSession 工厂对象

SqlSessionFactory：获取 SqlSession 构建者对象的工厂接口

* `SqlSession openSession()`：获取 SqlSession 构建者对象，并开启手动提交事务
* `SqlSession openSession(boolean)`：获取 SqlSession 构建者对象，参数为 true 开启自动提交事务

SqlSession：构建者对象接口，用于执行 SQL、管理事务、接口代理

* SqlSession **代表和数据库的一次会话**，用完必须关闭
* SqlSession 和 Connection 一样都是非线程安全，每次使用都应该去获取新的对象

注：**update 数据需要提交事务，或开启默认提交**

SqlSession 常用 API：

| 方法                                                  | 说明                           |
| ----------------------------------------------------- | ------------------------------ |
| List<E> selectList(String statement,Object parameter) | 执行查询语句，返回List集合     |
| T selectOne(String statement,Object parameter)        | 执行查询语句，返回一个结果对象 |
| int insert(String statement,Object parameter)         | 执行新增语句，返回影响行数     |
| int update(String statement,Object parameter)         | 执行删除语句，返回影响行数     |
| int delete(String statement,Object parameter)         | 执行修改语句，返回影响行数     |
| void commit()                                         | 提交事务                       |
| void rollback()                                       | 回滚事务                       |
| T getMapper(Class<T> cls)                             | 获取指定接口的代理实现类对象   |
| void close()                                          | 释放资源                       |



***
