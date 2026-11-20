---
title: "DQL"
date: 2023-09-26
planet: system
tags: ["Java", "基础", DQL, system]
summary: "WHERE		<wherecondition"
private: false
---

### DQL

#### 查询语法

数据库查询遵循条件在前的原则

```mysql
SELECT DISTINCT
	<select list>
FROM
	<left_table> <join_type>
JOIN
	<right_table> ON <join_condition>	-- 连接查询在多表查询部分详解
WHERE
	<where_condition>
GROUP BY
	<group_by_list>
HAVING
	<having_condition>
ORDER BY
	<order_by_condition>
LIMIT
	<limit_params>
```

执行顺序：

```mysql
FROM	<left_table>

ON 		<join_condition>

<join_type>		JOIN	<right_table>

WHERE		<where_condition>

GROUP BY 	<group_by_list>

HAVING		<having_condition>

SELECT DISTINCT		<select list>

ORDER BY	<order_by_condition>

LIMIT		<limit_params>
```



***



#### 查询全部

* 查询全部的表数据

  ```mysql
  -- 标准语法
  SELECT * FROM 表名;
  
  -- 查询product表所有数据(常用)
  SELECT * FROM product;
  ```

* 查询指定字段的表数据

  ```mysql
  SELECT 列名1,列名2,... FROM 表名;
  ```

* **去除重复查询**：只有值全部重复的才可以去除，需要创建临时表辅助查询
  
  ```mysql
  SELECT DISTINCT 列名1,列名2,... FROM 表名;
  ```
  
* 计算列的值（四则运算）

  ```mysql
  SELECT 列名1 运算符(+ - * /) 列名2 FROM 表名;
  
  /*如果某一列值为null，可以进行替换
  	ifnull(表达式1,表达式2)
  	表达式1：想替换的列
  	表达式2：想替换的值*/
  ```

  例如：

  ```mysql
  -- 查询商品名称和库存，库存数量在原有基础上加10
  SELECT NAME,stock+10 FROM product;
  
  -- 查询商品名称和库存，库存数量在原有基础上加10。进行null值判断
  SELECT NAME,IFNULL(stock,0)+10 FROM product;
  ```

* **起别名**

  ```mysql
  SELECT 列名1,列名2,... AS 别名 FROM 表名;
  ```

  例如：

  ```mysql
  -- 查询商品名称和库存，库存数量在原有基础上加10。进行null值判断，起别名为getSum,AS可以省略。
  SELECT NAME,IFNULL(stock,0)+10 AS getsum FROM product;
  SELECT NAME,IFNULL(stock,0)+10 getsum FROM product;
  ```




***



#### 条件查询

* 条件查询语法

  ```mysql
  SELECT 列名 FROM 表名 WHERE 条件;
  ```

* 条件分类

  | 符号                | 功能                                                         |
  | ------------------- | ------------------------------------------------------------ |
  | >                   | 大于                                                         |
  | <                   | 小于                                                         |
  | >=                  | 大于等于                                                     |
  | <=                  | 小于等于                                                     |
  | =                   | 等于                                                         |
  | <> 或 !=            | 不等于                                                       |
  | BETWEEN ... AND ... | 在某个范围之内(都包含)                                       |
  | IN(...)             | 多选一                                                       |
  | LIKE                | **模糊查询**：_单个任意字符、%任意个字符、[] 匹配集合内的字符<br/>`LIKE '[^AB]%' `：不以 A 和 B 开头的任意文本 |
  | IS NULL             | 是NULL                                                       |
  | IS NOT NULL         | 不是NULL                                                     |
  | AND 或 &&           | 并且                                                         |
  | OR 或 \|\|          | 或者                                                         |
  | NOT 或 !            | 非，不是                                                     |
  | UNION               | 对两个结果集进行**并集操作并进行去重，同时进行默认规则的排序** |
  | UNION ALL           | 对两个结果集进行并集操作不进行去重，不进行排序               |

* 例如：

  ```mysql
  -- 查询库存大于20的商品信息
  SELECT * FROM product WHERE stock > 20;
  
  -- 查询品牌为华为的商品信息
  SELECT * FROM product WHERE brand='华为';
  
  -- 查询金额在4000 ~ 6000之间的商品信息
  SELECT * FROM product WHERE price >= 4000 AND price <= 6000;
  SELECT * FROM product WHERE price BETWEEN 4000 AND 6000;
  
  -- 查询库存为14、30、23的商品信息
  SELECT * FROM product WHERE stock=14 OR stock=30 OR stock=23;
  SELECT * FROM product WHERE stock IN(14,30,23);
  
  -- 查询库存为null的商品信息
  SELECT * FROM product WHERE stock IS NULL;
  -- 查询库存不为null的商品信息
  SELECT * FROM product WHERE stock IS NOT NULL;
  
  -- 查询名称以'小米'为开头的商品信息
  SELECT * FROM product WHERE NAME LIKE '小米%';
  
  -- 查询名称第二个字是'为'的商品信息
  SELECT * FROM product WHERE NAME LIKE '_为%';
  
  -- 查询名称为四个字符的商品信息 4个下划线
  SELECT * FROM product WHERE NAME LIKE '____';
  
  -- 查询名称中包含电脑的商品信息
  SELECT * FROM product WHERE NAME LIKE '%电脑%';
  ```

  <img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-DQL数据准备.png" style="zoom: 80%;" />



***



#### 函数查询

##### 聚合函数

聚合函数：将一列数据作为一个整体，进行纵向的计算

* 聚合函数语法

  ```mysql
  SELECT 函数名(列名) FROM 表名 [WHERE 条件]
  ```

* 聚合函数分类

  | 函数名      | 功能                               |
  | ----------- | ---------------------------------- |
  | COUNT(列名) | 统计数量（一般选用不为 null 的列） |
  | MAX(列名)   | 最大值                             |
  | MIN(列名)   | 最小值                             |
  | SUM(列名)   | 求和                               |
  | AVG(列名)   | 平均值（会忽略 null 行）           |

* 例如

  ```mysql
  -- 计算product表中总记录条数 7
  SELECT COUNT(*) FROM product;
  
  -- 获取最高价格
  SELECT MAX(price) FROM product;
  -- 获取最高价格的商品名称
  SELECT NAME,price FROM product WHERE price = (SELECT MAX(price) FROM product);
  
  -- 获取最低库存
  SELECT MIN(stock) FROM product;
  -- 获取最低库存的商品名称
  SELECT NAME,stock FROM product WHERE stock = (SELECT MIN(stock) FROM product);
  
  -- 获取总库存数量
  SELECT SUM(stock) FROM product;
  -- 获取品牌为小米的平均商品价格
  SELECT AVG(price) FROM product WHERE brand='小米';
  ```



***



##### 文本函数

CONCAT()：用于连接两个字段

```sql
SELECT CONCAT(TRIM(col1), '(', TRIM(col2), ')') AS concat_col FROM mytable
-- 许多数据库会使用空格把一个值填充为列宽，连接的结果出现一些不必要的空格，使用TRIM()可以去除首尾空格
```

| 函数名称  | 作 用                                                        |
| --------- | ------------------------------------------------------------ |
| LENGTH    | 计算字符串长度函数，返回字符串的字节长度                     |
| CONCAT    | 合并字符串函数，返回结果为连接参数产生的字符串，参数可以使一个或多个 |
| INSERT    | 替换字符串函数                                               |
| LOWER     | 将字符串中的字母转换为小写                                   |
| UPPER     | 将字符串中的字母转换为大写                                   |
| LEFT      | 从左侧字截取符串，返回字符串左边的若干个字符                 |
| RIGHT     | 从右侧字截取符串，返回字符串右边的若干个字符                 |
| TRIM      | 删除字符串左右两侧的空格                                     |
| REPLACE   | 字符串替换函数，返回替换后的新字符串                         |
| SUBSTRING | 截取字符串，返回从指定位置开始的指定长度的字符换             |
| REVERSE   | 字符串反转（逆序）函数，返回与原始字符串顺序相反的字符串     |



***



##### 数字函数

| 函数名称        | 作 用                                                      |
| --------------- | ---------------------------------------------------------- |
| ABS             | 求绝对值                                                   |
| SQRT            | 求二次方根                                                 |
| MOD             | 求余数                                                     |
| CEIL 和 CEILING | 两个函数功能相同，都是返回不小于参数的最小整数，即向上取整 |
| FLOOR           | 向下取整，返回值转化为一个BIGINT                           |
| RAND            | 生成一个0~1之间的随机数，传入整数参数是，用来产生重复序列  |
| ROUND           | 对所传参数进行四舍五入                                     |
| SIGN            | 返回参数的符号                                             |
| POW 和 POWER    | 两个函数的功能相同，都是所传参数的次方的结果值             |
| SIN             | 求正弦值                                                   |
| ASIN            | 求反正弦值，与函数 SIN 互为反函数                          |
| COS             | 求余弦值                                                   |
| ACOS            | 求反余弦值，与函数 COS 互为反函数                          |
| TAN             | 求正切值                                                   |
| ATAN            | 求反正切值，与函数 TAN 互为反函数                          |
| COT             | 求余切值                                                   |



***



##### 日期函数

| 函数名称                | 作 用                                                        |
| ----------------------- | ------------------------------------------------------------ |
| CURDATE 和 CURRENT_DATE | 两个函数作用相同，返回当前系统的日期值                       |
| CURTIME 和 CURRENT_TIME | 两个函数作用相同，返回当前系统的时间值                       |
| NOW 和  SYSDATE         | 两个函数作用相同，返回当前系统的日期和时间值                 |
| MONTH                   | 获取指定日期中的月份                                         |
| MONTHNAME               | 获取指定日期中的月份英文名称                                 |
| DAYNAME                 | 获取指定曰期对应的星期几的英文名称                           |
| DAYOFWEEK               | 获取指定日期对应的一周的索引位置值                           |
| WEEK                    | 获取指定日期是一年中的第几周，返回值的范围是否为 0〜52 或 1〜53 |
| DAYOFYEAR               | 获取指定曰期是一年中的第几天，返回值范围是1~366              |
| DAYOFMONTH              | 获取指定日期是一个月中是第几天，返回值范围是1~31             |
| YEAR                    | 获取年份，返回值范围是 1970〜2069                            |
| TIME_TO_SEC             | 将时间参数转换为秒数                                         |
| SEC_TO_TIME             | 将秒数转换为时间，与TIME_TO_SEC 互为反函数                   |
| DATE_ADD 和 ADDDATE     | 两个函数功能相同，都是向日期添加指定的时间间隔               |
| DATE_SUB 和 SUBDATE     | 两个函数功能相同，都是向日期减去指定的时间间隔               |
| ADDTIME                 | 时间加法运算，在原始时间上添加指定的时间                     |
| SUBTIME                 | 时间减法运算，在原始时间上减去指定的时间                     |
| DATEDIFF                | 获取两个日期之间间隔，返回参数 1 减去参数 2 的值             |
| DATE_FORMAT             | 格式化指定的日期，根据参数返回指定格式的值                   |
| WEEKDAY                 | 获取指定日期在一周内的对应的工作日索引                       |



****



#### 正则查询

正则表达式（Regular Expression）是指一个用来描述或者匹配一系列符合某个句法规则的字符串的单个字符串

```mysql
SELECT * FROM emp WHERE name REGEXP '^T';	-- 匹配以T开头的name值
SELECT * FROM emp WHERE name REGEXP '2$';	-- 匹配以2结尾的name值
SELECT * FROM emp WHERE name REGEXP '[uvw]';-- 匹配包含 uvw 的name值
```

| 符号   | 含义                          |
| ------ | ----------------------------- |
| ^      | 在字符串开始处进行匹配        |
| $      | 在字符串末尾处进行匹配        |
| .      | 匹配任意单个字符, 包括换行符  |
| [...]  | 匹配出括号内的任意字符        |
| [^...] | 匹配不出括号内的任意字符      |
| a*     | 匹配零个或者多个a(包括空串)   |
| a+     | 匹配一个或者多个a(不包括空串) |
| a?     | 匹配零个或者一个a             |
| a1\|a2 | 匹配a1或a2                    |
| a(m)   | 匹配m个a                      |
| a(m,)  | 至少匹配m个a                  |
| a(m,n) | 匹配m个a 到 n个a              |
| a(,n)  | 匹配0到n个a                   |
| (...)  | 将模式元素组成单一元素        |





***



#### 排序查询

* 排序查询语法

  ```mysql
  SELECT 列名 FROM 表名 [WHERE 条件] ORDER BY 列名1 排序方式1,列名2 排序方式2;
  ```

* 排序方式

  ```mysql
  ASC:升序
  DESC:降序
  ```

  注意：多个排序条件，当前边的条件值一样时，才会判断第二条件

* 例如

  ```mysql
  -- 按照库存升序排序
  SELECT * FROM product ORDER BY stock ASC;
  
  -- 查询名称中包含手机的商品信息。按照金额降序排序
  SELECT * FROM product WHERE NAME LIKE '%手机%' ORDER BY price DESC;
  
  -- 按照金额升序排序，如果金额相同，按照库存降序排列
  SELECT * FROM product ORDER BY price ASC,stock DESC;
  ```

  

***



#### 分组查询

分组查询会进行去重

* 分组查询语法

  ````mysql
  SELECT 列名 FROM 表名 [WHERE 条件] GROUP BY 分组列名 [HAVING 分组后条件过滤] [ORDER BY 排序列名 排序方式];
  ````

  WHERE 过滤行，HAVING 过滤分组，行过滤应当先于分组过滤

  分组规定：

  * GROUP BY 子句出现在 WHERE 子句之后，ORDER BY 子句之前
  * NULL 的行会单独分为一组
  * 大多数 SQL 实现不支持 GROUP BY 列具有可变长度的数据类型

* 例如

  ```mysql
  -- 按照品牌分组，获取每组商品的总金额
  SELECT brand,SUM(price) FROM product GROUP BY brand;
  
  -- 对金额大于4000元的商品，按照品牌分组,获取每组商品的总金额
  SELECT brand,SUM(price) FROM product WHERE price > 4000 GROUP BY brand;
  
  -- 对金额大于4000元的商品，按照品牌分组，获取每组商品的总金额，只显示总金额大于7000元的
  SELECT brand,SUM(price) AS getSum FROM product WHERE price > 4000 GROUP BY brand HAVING getSum > 7000;
  
  -- 对金额大于4000元的商品，按照品牌分组，获取每组商品的总金额，只显示总金额大于7000元的、并按照总金额的降序排列
  SELECT brand,SUM(price) AS getSum FROM product WHERE price > 4000 GROUP BY brand HAVING getSum > 7000 ORDER BY getSum DESC;
  ```




***



#### 分页查询

* 分页查询语法

  ```mysql
  SELECT 列名 FROM 表名 [WHERE 条件] GROUP BY 分组列名 [HAVING 分组后条件过滤] [ORDER BY 排序列名 排序方式] LIMIT 开始索引,查询条数;
  ```

* 公式：开始索引 = (当前页码-1) * 每页显示的条数

* 例如

  ```mysql
  SELECT * FROM product LIMIT 0,2;  -- 第一页 开始索引=(1-1) * 2
  SELECT * FROM product LIMIT 2,2;  -- 第二页 开始索引=(2-1) * 2
  SELECT * FROM product LIMIT 4,2;  -- 第三页 开始索引=(3-1) * 2
  SELECT * FROM product LIMIT 6,2;  -- 第四页 开始索引=(4-1) * 2
  ```

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/DB/MySQL-DQL分页查询图解.png)






***
