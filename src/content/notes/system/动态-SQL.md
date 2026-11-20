---
title: "动态 SQL"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 动态 SQL, system]
summary: "动态 SQL 是 MyBatis 强大特性之一，逻辑复杂时，MyBatis 映射配置文件中，SQL 是动态变化的，所以引入动态 SQL 简化拼装 SQL 的操作"
private: false
---

## 构造语句

### 动态 SQL

#### 基本介绍

动态 SQL 是 MyBatis 强大特性之一，逻辑复杂时，MyBatis 映射配置文件中，SQL 是动态变化的，所以引入动态 SQL 简化拼装 SQL 的操作

DynamicSQL 包含的标签：

* if
* where
* set
* choose (when、otherwise)
* trim
* foreach

各个标签都可以进行灵活嵌套和组合

OGNL：Object Graphic Navigation Language（对象图导航语言），用于对数据进行访问



参考文章：https://www.cnblogs.com/ysocean/p/7289529.html



***



#### where

<where>：条件标签，有动态条件则使用该标签代替 WHERE 关键字，封装查询条件

作用：如果标签返回的内容是以 AND 或 OR 开头的，标签内会剔除掉

表结构：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/MyBatis-动态sql用户表.png)



****



#### if

基本格式：

```xml
<if test=“条件判断”>
	查询条件拼接
</if>
```

我们根据实体类的不同取值，使用不同的 SQL 语句来进行查询。比如在 id 如果不为空时可以根据 id 查询，如果username 不同空时还要加入用户名作为条件，这种情况在我们的多条件组合查询中经常会碰到。

* UserMapper.xml

  ```xml
  <?xml version="1.0" encoding="UTF-8" ?>
  <!DOCTYPE mapper
          PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
          "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
  
  <mapper namespace="mapper.UserMapper">
      <select id="selectCondition" resultType="user" parameterType="user">
          SELECT * FROM user
          <where>
              <if test="id != null ">
                  id = #{id}
              </if>
              <if test="username != null ">
                  AND username = #{username}
              </if>
              <if test="sex != null ">
                  AND sex = #{sex}
              </if>
          </where>
      </select>	
  
  </mapper>
  ```

* MyBatisConfig.xml，引入映射配置文件

  ```xml
  <mappers>
      <!--mapper引入指定的映射配置 resource属性执行的映射配置文件的名称-->
      <mapper resource="UserMapper.xml"/>
  </mappers>
  ```

* DAO 层 Mapper 接口

  ```java
  public interface UserMapper {
      //多条件查询
      public abstract List<User> selectCondition(Student stu);
  }
  ```

* 实现类

  ```java
  public class DynamicTest {
      @Test
      public void selectCondition() throws Exception{
          //1.加载核心配置文件
          InputStream is = Resources.getResourceAsStream("MyBatisConfig.xml");
  
          //2.获取SqlSession工厂对象
          SqlSessionFactory ssf = new SqlSessionFactoryBuilder().build(is);
  
          //3.通过工厂对象获取SqlSession对象
          SqlSession sqlSession = ssf.openSession(true);
  
          //4.获取StudentMapper接口的实现类对象
          UserMapper mapper = sqlSession.getMapper(UserMapper.class);
  
          User user = new User();
          user.setId(2);
          user.setUsername("李四");
          //user.setSex(男); AND 后会自动剔除
  
          //5.调用实现类的方法，接收结果
          List<Student> list = mapper.selectCondition(user);
  
          //6.处理结果
          for (User user : list) {
              System.out.println(user);
          }
          
          //7.释放资源
          sqlSession.close();
          is.close();
      }
  }
  ```

  

***



#### set

<set>：进行更新操作的时候，含有 set 关键词，使用该标签

```xml
<!-- 根据 id 更新 user 表的数据 -->
<update id="updateUserById" parameterType="com.ys.po.User">
    UPDATE user u
        <set>
            <if test="username != null and username != ''">
                u.username = #{username},
            </if>
            <if test="sex != null and sex != ''">
                u.sex = #{sex}
            </if>
        </set>
     WHERE id=#{id}
</update>
```

* 如果第一个条件 username 为空，那么 sql 语句为：update user u set u.sex=? where id=?
* 如果第一个条件不为空，那么 sql 语句为：update user u set u.username = ? ,u.sex = ? where id=?





****



#### choose

假如不想用到所有的查询条件，只要查询条件有一个满足即可，使用 choose 标签可以解决此类问题，类似于 Java 的 switch 语句

标签：<when>，<otherwise>

```xml
<select id="selectUserByChoose" resultType="user" parameterType="user">
    SELECT * FROM user
    <where>
        <choose>
            <when test="id !='' and id != null">
                id=#{id}
            </when>
            <when test="username !='' and username != null">
                AND username=#{username}
            </when>
            <otherwise>
                AND sex=#{sex}
            </otherwise>
        </choose>
    </where>
</select>
```

有三个条件，id、username、sex，只能选择一个作为查询条件

* 如果 id 不为空，那么查询语句为：select * from user where  id=?

* 如果 id 为空，那么看 username 是否为空
  * 如果不为空，那么语句为：select * from user where username=?
  * 如果 username 为空，那么查询语句为 select * from user where sex=?



***



#### trim

trim 标记是一个格式化的标记，可以完成 set 或者是 where 标记的功能，自定义字符串截取

* prefix：给拼串后的整个字符串加一个前缀，trim 标签体中是整个字符串拼串后的结果
* prefixOverrides：去掉整个字符串前面多余的字符
* suffix：给拼串后的整个字符串加一个后缀
* suffixOverrides：去掉整个字符串后面多余的字符

改写 if + where 语句：

```xml
<select id="selectUserByUsernameAndSex" resultType="user" parameterType="com.ys.po.User">
    SELECT * FROM user
    <trim prefix="where" prefixOverrides="and | or">
        <if test="username != null">
            AND username=#{username}
        </if>
        <if test="sex != null">
            AND sex=#{sex}
        </if>
    </trim>
</select>
```

改写 if + set 语句：

```xml
<!-- 根据 id 更新 user 表的数据 -->
<update id="updateUserById" parameterType="com.ys.po.User">
    UPDATE user u
    <trim prefix="set" suffixOverrides=",">
        <if test="username != null and username != ''">
            u.username = #{username},
        </if>
        <if test="sex != null and sex != ''">
            u.sex = #{sex},
        </if>
    </trim>
    WHERE id=#{id}
</update>
```



****



#### foreach

基本格式：

```xml
<foreach>：循环遍历标签。适用于多个参数或者的关系。
    <foreach collection=“”open=“”close=“”item=“”separator=“”>
		获取参数
</foreach>
```

属性：

* collection：参数容器类型， (list-集合， array-数组)
* open：开始的 SQL 语句
* close：结束的 SQL 语句
* item：参数变量名
* separator：分隔符

需求：循环执行 sql 的拼接操作，`SELECT * FROM user WHERE id IN (1,2,5)`

* UserMapper.xml片段

  ```xml
  <select id="selectByIds" resultType="user" parameterType="list">
      SELECT * FROM student
      <where>
          <foreach collection="list" open="id IN(" close=")" item="id" separator=",">
              #{id}
          </foreach>
      </where>
  </select>
  ```

* 测试代码片段

  ```java
  //4.获取StudentMapper接口的实现类对象
  UserMapper mapper = sqlSession.getMapper(UserMapper.class);
  
  List<Integer> ids = new ArrayList<>();
  Collections.addAll(list, 1, 2);
  //5.调用实现类的方法，接收结果
  List<User> list = mapper.selectByIds(ids);
  
  for (User user : list) {
      System.out.println(user);
  }
  ```

  

***



#### SQL片段

将一些重复性的 SQL 语句进行抽取，以达到复用的效果

格式：

```xml
<sql id=“片段唯一标识”>抽取的SQL语句</sql>		<!--抽取标签-->
<include refid=“片段唯一标识”/>				<!--引入标签-->
```

使用：

```xml
<sql id="select">SELECT * FROM user</sql>

<select id="selectByIds" resultType="user" parameterType="list">
    <include refid="select"/>
    <where>
        <foreach collection="list" open="id IN(" close=")" item="id" separator=",">
            #{id}
        </foreach>
    </where>
 </select>
```





****
