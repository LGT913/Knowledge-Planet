---
title: "事务机制"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 事务机制, system]
summary: "事务：数据库中多个操作合并在一起形成的操作序列，事务特征（ACID）"
private: false
---

## 事务

### 事务机制

#### 事务介绍

事务：数据库中多个操作合并在一起形成的操作序列，事务特征（ACID）

作用：

* 当数据库操作序列中个别操作失败时，提供一种方式使数据库状态恢复到正常状态（**A**），保障数据库即使在异常状态下仍能保持数据一致性（**C**）（要么操作前状态，要么操作后状态）
* 当出现并发访问数据库时，在多个访问间进行相互隔离，防止并发访问操作结果互相干扰（**I**）

Spring 事务一般加到业务层，对应着业务的操作，Spring 事务的本质其实就是数据库对事务的支持，没有数据库的事务支持，Spring 是无法提供事务功能的，Spring 只提供统一事务管理接口

Spring 在事务开始时，根据当前环境中设置的隔离级别，调整数据库隔离级别，由此保持一致。程序是否支持事务首先取决于数据库 ，比如 MySQL ，如果是 **Innodb 引擎**，是支持事务的；如果 MySQL 使用 MyISAM 引擎，那从根上就是不支持事务的

**保证原子性**：

* 要保证事务的原子性，就需要在异常发生时，对已经执行的操作进行**回滚**
* 在 MySQL 中，恢复机制是通过**回滚日志（undo log）** 实现，所有事务进行的修改都会先先记录到这个回滚日志中，然后再执行相关的操作。如果执行过程中遇到异常的话，直接利用回滚日志中的信息将数据回滚到修改之前的样子即可
* 回滚日志会先于数据持久化到磁盘上，这样保证了即使遇到数据库突然宕机等情况，当用户再次启动数据库的时候，数据库还能够通过查询回滚日志来回滚将之前未完成的事务



***



#### 隔离级别

TransactionDefinition 接口中定义了五个表示隔离级别的常量：

- TransactionDefinition.ISOLATION_DEFAULT：使用后端数据库默认的隔离级别，MySQL 默认采用的 REPEATABLE_READ 隔离级别，Oracle 默认采用的 READ_COMMITTED隔离级别.
- TransactionDefinition.ISOLATION_READ_UNCOMMITTED：最低的隔离级别，允许读取尚未提交的数据变更，可能会导致脏读、幻读或不可重复读
- TransactionDefinition.ISOLATION_READ_COMMITTED：允许读取并发事务已经提交的数据，可以阻止脏读，但是幻读或不可重复读仍有可能发生
- TransactionDefinition.ISOLATION_REPEATABLE_READ：对同一字段的多次读取结果都是一致的，除非数据是被本身事务自己所修改，可以阻止脏读和不可重复读，但幻读仍有可能发生。
- TransactionDefinition.ISOLATION_SERIALIZABLE：最高的隔离级别，完全服从 ACID 的隔离级别。所有的事务依次逐个执行，这样事务之间就完全不可能产生干扰，也就是说，该级别可以防止脏读、不可重复读以及幻读。但是这将严重影响程序的性能。通常情况下也不会用到该级别

MySQL InnoDB 存储引擎的默认支持的隔离级别是 **REPEATABLE-READ（可重读）**

**分布式事务**：允许多个独立的事务资源（transactional resources）参与到一个全局的事务中。事务资源通常是关系型数据库系统，但也可以是其他类型的资源，全局事务要求在其中的所有参与的事务要么都提交，要么都回滚，这对于事务原有的 ACID 要求又有了提高

在使用分布式事务时，InnoDB 存储引擎的事务隔离级别必须设置为 SERIALIZABLE



****



#### 传播行为

事务传播行为是为了解决业务层方法之间互相调用的事务问题，也就是方法嵌套：

* 当事务方法被另一个事务方法调用时，必须指定事务应该如何传播。

* 例如：方法可能继续在现有事务中运行，也可能开启一个新事务，并在自己的事务中运行

  ```java
  //外层事务 Service A 的 aMethod 调用内层 Service B 的 bMethod
  class A {
      @Transactional(propagation=propagation.xxx)
      public void aMethod {
          B b = new B();
          b.bMethod();
      }
  }
  class B {
      @Transactional(propagation=propagation.xxx)
      public void bMethod {}
  }
  ```

**支持当前事务**的情况：

* TransactionDefinition.PROPAGATION_REQUIRED： 如果当前存在事务则**加入该事务**；如果当前没有事务则创建一个新的事务
  * 内外层是相同的事务，在 aMethod 或者在 bMethod 内的任何地方出现异常，事务都会被回滚
  * 工作流程：
    * 线程执行到 serviceA.aMethod() 时，其实是执行的代理 serviceA 对象的 aMethod
    * 首先执行事务增强器逻辑（环绕增强），提取事务标签属性，检查当前线程是否绑定 connection 数据库连接资源，没有就调用 datasource.getConnection()，设置事务提交为手动提交 autocommit(false)
    * 执行其他增强器的逻辑，然后调用 target 的目标方法 aMethod() 方法，进入 serviceB 的逻辑
    * serviceB 也是先执行事务增强器的逻辑，提取事务标签属性，但此时会检查到线程绑定了 connection，检查注解的传播属性，所以调用 DataSourceUtils.getConnection(datasource) 共享该连接资源，执行完相关的增强和 SQL 后，发现事务并不是当前方法开启的，可以直接返回上层
    * serviceA.aMethod() 继续执行，执行完增强后进行提交事务或回滚事务
* TransactionDefinition.PROPAGATION_SUPPORTS： 如果当前存在事务，则**加入该事务**；如果当前没有事务，则以非事务的方式继续运行
* TransactionDefinition.PROPAGATION_MANDATORY： 如果当前存在事务，则**加入该事务**；如果当前没有事务，则抛出异常

**不支持当前事务**的情况：

- TransactionDefinition.PROPAGATION_REQUIRES_NEW： 创建一个新的事务，如果当前存在事务，则把当前事务挂起
  - 内外层是不同的事务，如果 bMethod 已经提交，如果 aMethod 失败回滚 ，bMethod 不会回滚
  - 如果 bMethod 失败回滚，ServiceB 抛出的异常被 ServiceA 捕获，如果 B 抛出的异常是 A 会回滚的异常，aMethod 事务需要回滚，否则仍然可以提交
- TransactionDefinition.PROPAGATION_NOT_SUPPORTED： **以非事务方式运行**，如果当前存在事务，则把当前事务挂起
- TransactionDefinition.PROPAGATION_NEVER： **以非事务方式运行**，如果当前存在事务，则抛出异常

其他情况：

* TransactionDefinition.PROPAGATION_NESTED： 如果当前存在事务，则创建一个事务作为当前事务的嵌套事务（两个事务没有关系）来运行
  * 如果 ServiceB 异常回滚，可以通过 try-catch 机制执行 ServiceC
  * 如果 ServiceB 提交， ServiceA 可以根据具体的配置决定是 commit 还是 rollback
  * **应用场景**：在查询数据的时候要向数据库中存储一些日志，系统不希望存日志的行为影响到主逻辑，可以使用该传播

requied：必须的、supports：支持的、mandatory：强制的、nested：嵌套的



****



#### 超时属性

事务超时，指一个事务所允许执行的最长时间，如果超过该时间限制事务还没有完成，则自动回滚事务。在 TransactionDefinition 中以 int 的值来表示超时时间，其单位是秒，默认值为 -1



***



#### 只读属性

对于只有读取数据查询的事务，可以指定事务类型为 readonly，即只读事务；只读事务不涉及数据的修改，数据库会提供一些优化手段，适合用在有多条数据库查询操作的方法中

读操作为什么需要启用事务支持：

* MySQL  默认对每一个新建立的连接都启用了 `autocommit` 模式，在该模式下，每一个发送到 MySQL 服务器的 SQL 语句都会在一个**单独**的事务中进行处理，执行结束后会自动提交事务，并开启一个新的事务
* 执行多条查询语句，如果方法加上了 `@Transactional` 注解，这个方法执行的所有 SQL 会被放在一个事务中，如果声明了只读事务的话，数据库就会去优化它的执行，并不会带来其他的收益。如果不加 `@Transactional`，每条 SQL 会开启一个单独的事务，中间被其它事务修改了数据，比如在前条 SQL 查询之后，后条 SQL 查询之前，数据被其他用户改变，则这次整体的统计查询将会出**现读数据不一致的状态**



***
