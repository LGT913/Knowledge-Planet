---
title: "InnoDB"
date: 2023-09-26
planet: system
tags: ["Java", "基础", InnoDB, system]
summary: "InnoDB 与 MyISAM 的最大不同有两点：一是支持事务；二是采用了行级锁，InnoDB 同时支持表锁和行锁"
private: false
---

### InnoDB

#### 行级锁

##### 记录锁

InnoDB 与 MyISAM 的最大不同有两点：一是支持事务；二是采用了行级锁，**InnoDB 同时支持表锁和行锁**

行级锁，也称为记录锁（Record Lock），InnoDB  实现了以下两种类型的行锁：

- 共享锁 (S)：又称为读锁，简称 S 锁，多个事务对于同一数据可以共享一把锁，都能访问到数据，但是只能读不能修改
- 排他锁 (X)：又称为写锁，简称 X 锁，不能与其他锁并存，获取排他锁的事务是可以对数据读取和修改

RR 隔离界别下，对于 UPDATE、DELETE 和 INSERT 语句，InnoDB 会**自动给涉及数据集加排他锁**（行锁），在 commit 时自动释放；对于普通 SELECT 语句，不会加任何锁（只是针对 InnoDB 层来说的，因为在 Server 层会**加 MDL 读锁**），通过 MVCC 防止并发冲突

在事务中加的锁，并不是不需要了就释放，而是在事务中止或提交时自动释放，这个就是**两阶段锁协议**。所以一般将更新共享资源（并发高）的 SQL 放到事务的最后执行，可以让其他线程尽量的减少等待时间

锁的兼容性：

- 共享锁和共享锁     兼容
- 共享锁和排他锁     冲突
- 排他锁和排他锁     冲突
- 排他锁和共享锁     冲突

显式给数据集加共享锁或排他锁：**加锁读就是当前读，读取的是最新数据**

```mysql
SELECT * FROM table_name WHERE ... LOCK IN SHARE MODE	-- 共享锁
SELECT * FROM table_name WHERE ... FOR UPDATE			-- 排他锁
```

注意：**锁默认会锁聚簇索引（锁就是加在索引上）**，但是当使用覆盖索引时，加共享锁只锁二级索引，不锁聚簇索引



***



##### 锁操作

两个客户端操作 Client 1和 Client 2，简化为 C1、C2

* 环境准备

  ```mysql
  CREATE TABLE test_innodb_lock(
  	id INT(11),
  	name VARCHAR(16),
  	sex VARCHAR(1)
  )ENGINE = INNODB DEFAULT CHARSET=utf8;
  
  INSERT INTO test_innodb_lock VALUES(1,'100','1');
  -- ..........
  
  CREATE INDEX idx_test_innodb_lock_id ON test_innodb_lock(id);
  CREATE INDEX idx_test_innodb_lock_name ON test_innodb_lock(name);
  ```

* 关闭自动提交功能：

  ```mysql
  SET AUTOCOMMIT=0;	-- C1、C2
  ```

  正常查询数据：

  ```mysql
  SELECT * FROM test_innodb_lock;	-- C1、C2
  ```

* 查询 id 为 3 的数据，正常查询：

  ```mysql
  SELECT * FROM test_innodb_lock WHERE id=3;	-- C1、C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 锁操作1.png)

* C1 更新 id 为 3 的数据，但不提交：

  ```mysql
  UPDATE test_innodb_lock SET name='300' WHERE id=3;	-- C1
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 锁操作2.png)

  C2 查询不到 C1 修改的数据，因为隔离界别为 REPEATABLE READ，C1 提交事务，C2 查询：

  ```mysql
  COMMIT;	-- C1
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 锁操作3.png)

  提交后仍然查询不到 C1 修改的数据，因为隔离级别可以防止脏读、不可重复读，所以 C2 需要提交才可以查询到其他事务对数据的修改：

  ```mysql
  COMMIT;	-- C2
  SELECT * FROM test_innodb_lock WHERE id=3;	-- C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 锁操作4.png)

* C1 更新 id 为 3 的数据，但不提交，C2 也更新 id 为 3 的数据：

  ```mysql
  UPDATE test_innodb_lock SET name='3' WHERE id=3;	-- C1
  UPDATE test_innodb_lock SET name='30' WHERE id=3;	-- C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 锁操作5.png)

  当 C1 提交，C2 直接解除阻塞，直接更新

* 操作不同行的数据：

  ```mysql
  UPDATE test_innodb_lock SET name='10' WHERE id=1;	-- C1
  UPDATE test_innodb_lock SET name='30' WHERE id=3;	-- C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 锁操作6.png)

  由于 C1、C2 操作的不同行，获取不同的行锁，所以都可以正常获取行锁





****



#### 锁分类

##### 间隙锁

InnoDB 会对间隙（GAP）进行加锁，就是间隙锁 （RR 隔离级别下才有该锁）。间隙锁之间不存在冲突关系，**多个事务可以同时对一个间隙加锁**，但是间隙锁会阻止往这个间隙中插入一个记录的操作

InnoDB 加锁的基本单位是 next-key lock，该锁是行锁和 gap lock 的组合（X or S 锁），但是加锁过程是分为间隙锁和行锁两段执行

* 可以**保护当前记录和前面的间隙**，遵循左开右闭原则，单纯的间隙锁是左开右开
* 假设有 10、11、13，那么可能的间隙锁包括：(负无穷,10]、(10,11]、(11,13]、(13,正无穷)

几种索引的加锁情况：

* 唯一索引加锁在值存在时是行锁，next-key lock 会退化为行锁，值不存在会变成间隙锁
* 普通索引加锁会继续向右遍历到不满足条件的值为止，next-key lock 退化为间隙锁
* 范围查询无论是否是唯一索引，都需要访问到不满足条件的第一个值为止
* 对于联合索引且是唯一索引，如果 where 条件只包括联合索引的一部分，那么会加间隙锁

间隙锁优点：RR 级别下间隙锁可以**解决事务的一部分的幻读问题**，通过对间隙加锁，可以防止读取过程中数据条目发生变化。一部分的意思是不会对全部间隙加锁，只能加锁一部分的间隙

间隙锁危害：

* 当锁定一个范围的键值后，即使某些不存在的键值也会被无辜的锁定，造成在锁定的时候无法插入锁定键值范围内的任何数据，在某些场景下这可能会对性能造成很大的危害，影响并发度
* 事务 A B 同时锁住一个间隙后，A 往当前间隙插入数据时会被 B 的间隙锁阻塞，B 也执行插入间隙数据的操作时就会**产生死锁**

现场演示：

* 关闭自动提交功能：

  ```mysql
  SET AUTOCOMMIT=0;	-- C1、C2
  ```

* 查询数据表：

  ```mysql
  SELECT * FROM test_innodb_lock;
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 间隙锁1.png)

* C1 根据 id 范围更新数据，C2 插入数据：

  ```mysql
  UPDATE test_innodb_lock SET name='8888' WHERE id < 4;	-- C1
  INSERT INTO test_innodb_lock VALUES(2,'200','2');		-- C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 间隙锁2.png)

  出现间隙锁，C2 被阻塞，等待 C1 提交事务后才能更新



****



##### 意向锁

InnoDB 为了支持多粒度的加锁，允许行锁和表锁同时存在，支持在不同粒度上的加锁操作，InnoDB 增加了意向锁（Intention Lock）

意向锁是将锁定的对象分为多个层次，意向锁意味着事务希望在更细粒度上进行加锁，意向锁分为两种：

* 意向共享锁（IS）：事务有意向对表加共享锁
* 意向排他锁（IX）：事务有意向对表加排他锁

**IX，IS 是表级锁**，不会和行级的 X，S 锁发生冲突，意向锁是在加表级锁之前添加，为了在加表级锁时可以快速判断表中是否有记录被上锁，比如向一个表添加表级 X 锁的时：

- 没有意向锁，则需要遍历整个表判断是否有锁定的记录
- 有了意向锁，首先判断是否存在意向锁，然后判断该意向锁与即将添加的表级锁是否兼容即可，因为意向锁的存在代表有表级锁的存在或者即将有表级锁的存在

兼容性如下所示：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-意向锁兼容性.png)

**插入意向锁** Insert Intention Lock 是在插入一行记录操作之前设置的一种间隙锁，是行级锁

插入意向锁释放了一种插入信号，即多个事务在相同的索引间隙插入时如果不是插入相同的间隙位置就不需要互相等待。假设某列有索引，只要两个事务插入位置不同，如事务 A 插入 3，事务 B 插入 4，那么就可以同时插入



***



##### 自增锁

系统会自动给 AUTO_INCREMENT 修饰的列进行递增赋值，实现方式：

* AUTO_INC 锁：表级锁，执行插入语句时会自动添加，在该语句执行完成后释放，并不是事务结束
* 轻量级锁：为插入语句生成 AUTO_INCREMENT 修饰的列时获取该锁，生成以后释放掉，不需要等到插入语句执行完后释放

系统变量 `innodb_autoinc_lock_mode` 控制采取哪种方式：

* 0：全部采用 AUTO_INC 锁
* 1：全部采用轻量级锁
* 2：混合使用，在插入记录的数量确定时采用轻量级锁，不确定时采用 AUTO_INC 锁



****



##### 隐式锁

一般情况下 INSERT 语句是不需要在内存中生成锁结构的，会进行隐式的加锁，保护的是插入后的安全

注意：如果插入的间隙被其他事务加了间隙锁，此次插入会被阻塞，并在该间隙插入一个插入意向锁

* 聚簇索引：索引记录有 trx_id 隐藏列，表示最后改动该记录的事务 id，插入数据后事务 id 就是当前事务。其他事务想获取该记录的锁时会判断当前记录的事务 id 是否是活跃的，如果不是就可以正常加锁；如果是就创建一个 X 的锁结构，该锁的 is_waiting 是 false，为自己的事务创建一个锁结构，is_waiting 是 true（类似 Java 中的锁升级）
* 二级索引：获取数据页 Page Header 中的 PAGE_MAX_TRX_ID 属性，代表修改当前页面的最大的事务 ID，如果小于当前活跃的最小事务 id，就证明插入该数据的事务已经提交，否则就需要获取到主键值进行回表操作

隐式锁起到了延迟生成锁的效果，如果其他事务与隐式锁没有冲突，就可以避免锁结构的生成，节省了内存资源

INSERT 在两种情况下会生成锁结构：

* 重复键：在插入主键或唯一二级索引时遇到重复的键值会报错，在报错前需要对对应的聚簇索引进行加锁
  * 隔离级别 <= Read Uncommitted，加 S 型 Record Lock
  * 隔离级别 >= Repeatable Read，加 S 型 next_key 锁

* 外键检查：如果待插入的记录在父表中可以找到，会对父表的记录加 S 型 Record Lock。如果待插入的记录在父表中找不到
  * 隔离级别 <= Read Committed，不加锁
  * 隔离级别 >= Repeatable Read，加间隙锁





***



#### 锁优化

##### 优化锁

InnoDB 存储引擎实现了行级锁定，虽然在锁定机制的实现方面带来了性能损耗可能比表锁会更高，但是在整体并发处理能力方面要远远优于 MyISAM 的表锁，当系统并发量较高的时候，InnoDB 的整体性能远远好于 MyISAM

但是使用不当可能会让 InnoDB 的整体性能表现不仅不能比 MyISAM 高，甚至可能会更差

优化建议：

- 尽可能让所有数据检索都能通过索引来完成，避免无索引行锁升级为表锁
- 合理设计索引，尽量缩小锁的范围
- 尽可能减少索引条件及索引范围，避免间隙锁
- 尽量控制事务大小，减少锁定资源量和时间长度
- 尽可使用低级别事务隔离（需要业务层面满足需求）



****



##### 锁升级

索引失效造成**行锁升级为表锁**，不通过索引检索数据，全局扫描的过程中 InnoDB 会将对表中的所有记录加锁，实际效果和**表锁**一样，实际开发过程应避免出现索引失效的状况

* 查看当前表的索引：

  ```mysql
  SHOW INDEX FROM test_innodb_lock;
  ```

* 关闭自动提交功能：

  ```mysql
  SET AUTOCOMMIT=0;	-- C1、C2
  ```

* 执行更新语句：

  ```mysql
  UPDATE test_innodb_lock SET sex='2' WHERE name=10;	-- C1
  UPDATE test_innodb_lock SET sex='2' WHERE id=3;		-- C2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 锁升级.png)

  索引失效：执行更新时 name 字段为 varchar 类型，造成索引失效，最终行锁变为表锁 



***



##### 死锁

不同事务由于互相持有对方需要的锁而导致事务都无法继续执行的情况称为死锁

死锁情况：线程 A 修改了 id = 1 的数据，请求修改 id = 2 的数据，线程 B 修改了 id = 2 的数据，请求修改 id = 1 的数据，产生死锁

解决策略：

* 直接进入等待直到超时，超时时间可以通过参数 innodb_lock_wait_timeout 来设置，默认 50 秒，但是时间的设置不好控制，超时可能不是因为死锁，而是因为事务处理比较慢，所以一般不采取该方式

* 主动死锁检测，发现死锁后**主动回滚死锁链条中较小的一个事务**，让其他事务得以继续执行，将参数 `innodb_deadlock_detect` 设置为 on，表示开启该功能（事务较小的意思就是事务执行过程中插入、删除、更新的记录条数）

  死锁检测并不是每个语句都要检测，只有在加锁访问的行上已经有锁时，当前事务被阻塞了才会检测，也是从当前事务开始进行检测

通过执行 `SHOW ENGINE INNODB STATUS` 可以查看最近发生的一次死循环，全局系统变量 `innodb_print_all_deadlocks` 设置为 on，就可以将每个死锁信息都记录在 MySQL 错误日志中

死锁一般是行级锁，当表锁发生死锁时，会在事务中访问其他表时**直接报错**，破坏了持有并等待的死锁条件



***



#### 锁状态

查看锁信息

```mysql
SHOW STATUS LIKE 'innodb_row_lock%';
```

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB 锁争用.png" style="zoom: 80%;" />

参数说明：

* Innodb_row_lock_current_waits：当前正在等待锁定的数量

* Innodb_row_lock_time：从系统启动到现在锁定总时间长度

* Innodb_row_lock_time_avg：每次等待所花平均时长

* Innodb_row_lock_time_max：从系统启动到现在等待最长的一次所花的时间

* Innodb_row_lock_waits：系统启动后到现在总共等待的次数

当等待的次数很高，而且每次等待的时长也不短的时候，就需要分析系统中为什么会有如此多的等待，然后根据分析结果制定优化计划

查看锁状态：

```mysql
SELECT * FROM information_schema.innodb_locks;	#锁的概况
SHOW ENGINE INNODB STATUS\G; #InnoDB整体状态，其中包括锁的情况
```

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-InnoDB查看锁状态.png)

lock_id 是锁 id；lock_trx_id 为事务 id；lock_mode 为 X 代表排它锁（写锁）；lock_type 为 RECORD 代表锁为行锁（记录锁）





***
