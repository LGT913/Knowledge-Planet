---
title: "构建 SQL"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 构建 SQL, system]
summary: "MyBatis 提供了 org.apache.ibatis.jdbc.SQL 功能类，专门用于构建 SQL 语句"
private: false
---

### 构建 SQL

#### 基础语法

MyBatis 提供了 org.apache.ibatis.jdbc.SQL 功能类，专门用于构建 SQL 语句    

| 方法                          | 说明                 |
| ----------------------------- | -------------------- |
| SELECT(String... columns)     | 根据字段拼接查询语句 |
| FROM(String... tables)        | 根据表名拼接语句     |
| WHERE(String... conditions)   | 根据条件拼接语句     |
| INSERT_INTO(String tableName) | 根据表名拼接新增语句 |
| INTO_VALUES(String... values) | 根据值拼接新增语句   |
| UPDATE(String table)          | 根据表名拼接修改语句 |
| DELETE_FROM(String table)     | 根据表名拼接删除语句 |

增删改查注解：

* @SelectProvider：生成查询用的 SQL 语句
* @InsertProvider：生成新增用的 SQL 语句
* @UpdateProvider：生成修改用的 SQL 语句注解
* @DeleteProvider：生成删除用的 SQL 语句注解。
  * type 属性：生成 SQL 语句功能类对象 
  * method 属性：指定调用方法



***



#### 基本操作

* MyBatisConfig.xml 配置

  ```xml
   <!-- mappers引入映射配置文件 -->
  <mappers>
      <package name="mapper"/>
  </mappers>
  ```

* Mapper 类

  ```java
  public interface StudentMapper {
      //查询全部
      @SelectProvider(type = ReturnSql.class, method = "getSelectAll")
      public abstract List<Student> selectAll();
  
      //新增数据
      @InsertProvider(type = ReturnSql.class, method = "getInsert")
      public abstract Integer insert(Student student);
  
      //修改操作
      @UpdateProvider(type = ReturnSql.class, method = "getUpdate")
      public abstract Integer update(Student student);
  
      //删除操作
      @DeleteProvider(type = ReturnSql.class, method = "getDelete")
      public abstract Integer delete(Integer id);
  
  }
  ```

* ReturnSQL 类

  ```java
  public class ReturnSql {
      //定义方法，返回查询的sql语句
      public String getSelectAll() {
          return new SQL() {
              {
                  SELECT("*");
                  FROM("student");
              }
          }.toString();
      }
  
      //定义方法，返回新增的sql语句
      public String getInsert(Student stu) {
          return new SQL() {
              {
                  INSERT_INTO("student");
                  INTO_VALUES("#{id},#{name},#{age}");
              }
          }.toString();
      }
  
      //定义方法，返回修改的sql语句
      public String getUpdate(Student stu) {
          return new SQL() {
              {
                  UPDATE("student");
                  SET("name=#{name}","age=#{age}");
                  WHERE("id=#{id}");
              }
          }.toString();
      }
  
      //定义方法，返回删除的sql语句
      public String getDelete(Integer id) {
          return new SQL() {
              {
                  DELETE_FROM("student");
                  WHERE("id=#{id}");
              }
          }.toString();
      }
  }
  ```

* 功能实现类

  ```java
  public class SqlTest {	
  	@Test  //查询全部
      public void selectAll() throws Exception{
          //1.加载核心配置文件
          InputStream is = Resources.getResourceAsStream("MyBatisConfig.xml");
  
          //2.获取SqlSession工厂对象
          SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(is);
  
          //3.通过工厂对象获取SqlSession对象
          SqlSession sqlSession = sqlSessionFactory.openSession(true);
  
          //4.获取StudentMapper接口的实现类对象
          StudentMapper mapper = sqlSession.getMapper(StudentMapper.class);
  
          //5.调用实现类对象中的方法，接收结果
          List<Student> list = mapper.selectAll();
  
          //6.处理结果
          for (Student student : list) {
              System.out.println(student);
          }
  
          //7.释放资源
          sqlSession.close();
          is.close();
      }
      
      @Test  //新增
      public void insert() throws Exception{
          //1 2 3 4获取StudentMapper接口的实现类对象
          StudentMapper mapper = sqlSession.getMapper(StudentMapper.class);
  
          //5.调用实现类对象中的方法，接收结果 ->6 7
          Student stu = new Student(4,"赵六",26);
          Integer result = mapper.insert(stu);
      }
      
      @Test //修改
      public void update() throws Exception{
          //1 2 3 4 5调用实现类对象中的方法，接收结果 ->6 7 
  		Student stu = new Student(4,"赵六wq",36);
          Integer result = mapper.update(stu);
      }
      @Test //删除
      public void delete() throws Exception{
          //1 2 3 4 5 6 7
          Integer result = mapper.delete(4);
      }
  }
  ```





***
