---
title: "XML开发"
date: 2023-09-26
planet: system
tags: ["Java", "基础", XML开发, system]
summary: "标签：<bean 标签，<beans 的子标签"
private: false
---

### XML开发

#### bean

##### 基本属性

标签：<bean> 标签，<beans> 的子标签

作用：定义 Spring 中的资源，受此标签定义的资源将受到 Spring 控制

格式：

```xml
<beans>
	<bean />
</beans>
```

基本属性

* id：bean 的名称，通过 id 值获取 bean (首字母小写)
* class：bean 的类型，使用完全限定类名
* name：bean 的名称，可以通过 name 值获取 bean，用于多人配合时给 bean 起别名

```xml
<bean id="beanId" name="beanName1,beanName2" class="ClassName"></bean>
```

```java
ctx.getBean("beanId") == ctx.getBean("beanName1") == ctx.getBean("beanName2")
```



***



##### 作用范围

作用：定义 bean 的作用范围

格式：

```xml
<bean scope="singleton"></bean>
```

取值：

- singleton：设定创建出的对象保存在 Spring 容器中，是一个单例的对象
- prototype：设定创建出的对象保存在 Spring 容器中，是一个非单例（原型）的对象
- request、session、application、 websocket ：设定创建出的对象放置在 web 容器对应的位置

Spring 容器中 Bean 的**线程安全**问题：

* 原型 Bean，每次创建一个新对象，线程之间并不存在 Bean 共享，所以不会有线程安全的问题

* 单例 Bean，所有线程共享一个单例实例 Bean，因此是存在资源的竞争，如果单例 Bean是一个**无状态 Bean**，也就是线程中的操作不会对 Bean 的成员执行查询以外的操作，那么这个单例 Bean 是线程安全的

  解决方法：开发人员来进行线程安全的保证，最简单的办法就是把 Bean 的作用域 singleton 改为 protopyte





***



##### 生命周期

作用：定义 bean 对象在初始化或销毁时完成的工作

格式：

```xml
<bean init-method="init" destroy-method="destroy></bean>
```

取值：bean 对应的类中对应的具体方法名

实现接口的方式实现初始化，无需配置文件配置 init-method：

* 实现 InitializingBean，定义初始化逻辑
* 实现 DisposableBean，定义销毁逻辑

注意事项：

- 当 scope=“singleton” 时，Spring 容器中有且仅有一个对象，init 方法在创建容器时仅执行一次
- 当 scope=“prototype” 时，Spring 容器要创建同一类型的多个对象，init 方法在每个对象创建时均执行一次
- 当 scope=“singleton” 时，关闭容器（`.close()`）会导致 bean 实例的销毁，调用 destroy 方法一次
- 当 scope=“prototype” 时，对象的销毁由垃圾回收机制 GC 控制，destroy 方法将不会被执行

bean 配置：

```xml
<!--init-method和destroy-method用于控制bean的生命周期-->
<bean id="userService3" scope="prototype" init-method="init" destroy-method="destroy" class="service.impl.UserServiceImpl"/>
```

业务层实现类：

```java
public class UserServiceImpl implements UserService{
    public UserServiceImpl(){
        System.out.println(" constructor is running...");
    }

    public void init(){
        System.out.println("init....");
    }

    public void destroy(){
        System.out.println("destroy....");
    }

    public void save() {
        System.out.println("user service running...");
    }
}
```

测试类：

```java
UserService userService = (UserService)ctx.getBean("userService3");
```





***



##### 创建方式

* 静态工厂

  作用：定义 bean 对象创建方式，使用静态工厂的形式创建 bean，兼容早期遗留系统的升级工作

  格式：

  ```xml
  <bean class="FactoryClassName" factory-method="factoryMethodName"></bean>
  ```

  取值：工厂 bean 中用于获取对象的静态方法名

  注意事项：class 属性必须配置成静态工厂的类名

  bean 配置：

  ```xml
  <!--静态工厂创建 bean-->
  <bean id="userService4" class="service.UserServiceFactory" factory-method="getService"/>
  ```

  工厂类：

  ```java
  public class UserServiceFactory {
      public static UserService getService(){
          System.out.println("factory create object...");
          return new UserServiceImpl();
      }
  }
  ```

  测试类：

  ```java
  UserService userService = (UserService)ctx.getBean("userService4");
  ```



* 实例工厂

  作用：定义 bean 对象创建方式，使用实例工厂的形式创建 bean，兼容早期遗留系统的升级工作

  格式：

  ```xml
  <bean factory-bean="factoryBeanId" factory-method="factoryMethodName"></bean>
  ```

  注意事项：

  - 使用实例工厂创建 bean 首先需要将实例工厂配置 bean，交由 Spring 进行管理

  - factory-bean 是实例工厂的 Id

  bean 配置：

  ```xml
  <!--实例工厂创建 bean，依赖工厂对象对应的 bean-->
  <bean id="factoryBean" class="service.UserServiceFactory2"/>
  <bean id="userService5" factory-bean="factoryBean" factory-method="getService"/>
  ```
  
  工厂类：

  ```java
  public class UserServiceFactory2 {
      public UserService getService(){
          System.out.println(" instance factory create object...");
          return new UserServiceImpl();
      }
  }
  ```




***



##### 获取Bean

ApplicationContext 子类相关API：

| 方法                                              | 说明                                             |
| ------------------------------------------------- | ------------------------------------------------ |
| String[] getBeanDefinitionNames()                 | 获取 Spring 容器中定义的所有 JavaBean 的名称     |
| BeanDefinition getBeanDefinition(String beanName) | 返回给定 bean 名称的 BeanDefinition              |
| String[] getBeanNamesForType(Class<?> type)       | 获取 Spring 容器中指定类型的所有 JavaBean 的名称 |
| Environment getEnvironment()                      | 获取与此组件关联的环境                           |





***



#### DI

##### 依赖注入

- IoC（Inversion Of Control）控制翻转，Spring 反向控制应用程序所需要使用的外部资源

- DI（Dependency Injection）依赖注入，应用程序运行依赖的资源由 Spring 为其提供，资源进入应用程序的方式称为注入，简单说就是利用反射机制为类的属性赋值的操作

  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Spring-DI介绍.png)

IoC 和 DI 的关系：IoC 与 DI 是同一件事站在不同角度看待问题



***



##### set 注入

标签：<property> 标签，<bean> 的子标签

作用：使用 set 方法的形式为 bean 提供资源

格式：

```xml
<bean>
	<property />
    <property />
    .....
</bean>
```

基本属性：

* name：对应 bean 中的属性名，要注入的变量名，要求该属性必须提供可访问的 set 方法（严格规范此名称是 set 方法对应名称，首字母必须小写）
* value：设定非引用类型属性对应的值，**不能与 ref 同时使用**
* ref：设定引用类型属性对应 bean 的 id ，不能与 value 同时使用

```xml
<property name="propertyName" value="propertyValue" ref="beanId"/>
```

代码实现：

* DAO 层：要注入的资源

  ```java
  public interface UserDao {
      public void save();
  }
  ```

  ```java
  public class UserDaoImpl implements UserDao{
      public void save(){
          System.out.println("user dao running...");
      }
  }
  ```

* Service 业务层

  ```java
  public interface UserService {
      public void save();
  }
  ```

  ```java
  public class UserServiceImpl implements UserService {
  	private UserDao userDao;
      private int num;
      
      //1.对需要进行注入的变量添加set方法
      public void setUserDao(UserDao userDao) {
          this.userDao = userDao;
      }
      
  	public void setNum(int num) {
          this.num = num;
      }
      
      public void save() {
          System.out.println("user service running..." + num);
          userDao.save();
          bookDao.save();
      }
  }
  ```

* 配置 applicationContext.xml

  ```xml
  <!--2.将要注入的资源声明为bean-->
  <bean id="userDao" class="dao.impl.UserDaoImpl"/>
  
  <bean id="userService" class="service.impl.UserServiceImpl">
  	<!--3.将要注入的引用类型的变量通过property属性进行注入，-->
      <property name="userDao" ref="userDao"/>
      <property name="num" value="666"/>
  </bean>
  ```

* 测试类

  ```java
  public class UserApp {
      public static void main(String[] args) {
          ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml");
          UserService userService = (UserService) ctx.getBean("userService");
          userService.save();
      }
  }
  ```



***



##### 构造注入

标签：<constructor-arg> 标签，<bean> 的子标签

作用：使用构造方法的形式为 bean 提供资源，兼容早期遗留系统的升级工作

格式：

```xml
<bean>
	<constructor-arg />
    .....<!--一个bean可以有多个constructor-arg标签-->
</bean>
```

属性：

* name：对应bean中的构造方法所携带的参数名
* value：设定非引用类型构造方法参数对应的值，不能与 ref 同时使用
* ref：设定引用类型构造方法参数对应 bean 的 id ，不能与 value 同时使用
* type：设定构造方法参数的类型，用于按类型匹配参数或进行类型校验
* index：设定构造方法参数的位置，用于按位置匹配参数，参数 index 值从 0 开始计数

```xml
<constructor-arg name="argsName" value="argsValue" />
<constructor-arg index="arg-index" type="arg-type" ref="beanId"/>
```

代码实现：

* DAO 层：要注入的资源

  ```java
  public class UserDaoImpl implements UserDao{
      private String username;
      private String pwd;
      private String driver;
  
      public UserDaoImpl(String driver,String username, String pwd) {
          this.driver = driver;
          this.username = username;
          this.pwd = pwd;
      }
      public void save(){
          System.out.println("user dao running..."+username+" "+pwd+" "+driver);
      }
  }
  ```

* Service 业务层：参考 set 注入

* 配置 applicationContext.xml

  ```xml
  <bean id="userDao" class="dao.impl.UserDaoImpl">
      <!--使用构造方法进行注入，需要保障注入的属性与bean中定义的属性一致-->
  	<!--一致指顺序一致或类型一致或使用index解决该问题-->
      <constructor-arg index="2" value="123"/>
      <constructor-arg index="1" value="root"/>
      <constructor-arg index="0" value="com.mysql.jdbc.Driver"/>
  </bean>
  
  <bean id="userService" class="service.impl.UserServiceImpl">
      <property name="userDao" ref="userDao"/>
      <property name="num" value="666"/>
  </bean>
  ```

  方式二：使用 UserServiceImpl 的构造方法注入

  ```xml
  <bean id="userService" class="service.impl.UserServiceImpl">
  	<constructor-arg name="userDao" ref="userDao"/>
  	<constructor-arg name="num" value="666666"/>
  </bean>
  ```

* 测试类：参考 set 注入



***



##### 集合注入

标签：<array> <list> <set> <map> <props>，<property> 或 <constructor-arg> 标签的子标签

作用：注入集合数据类型属性

格式：

```xml
<property>
	<list></list>
</property>
```

代码实现：

* DAO 层：要注入的资源

  ```java
  public interface BookDao {
      public void save();
  }
  ```

  ```java
  public class BookDaoImpl implements BookDao {
      private ArrayList al;
      private Properties properties;
      private int[] arr;
      private HashSet hs;
      private HashMap hm ;
  
      public void setAl(ArrayList al) {
          this.al = al;
      }
  
      public void setProperties(Properties properties) {
          this.properties = properties;
      }
  
      public void setArr(int[] arr) {
          this.arr = arr;
      }
  
      public void setHs(HashSet hs) {
          this.hs = hs;
      }
  
      public void setHm(HashMap hm) {
          this.hm = hm;
      }
  
      public void save() {
          System.out.println("book dao running...");
          System.out.println("ArrayList:" + al);
          System.out.println("Properties:" + properties);
          for (int i = 0; i < arr.length; i++) {
              System.out.println(arr[i]);
          }
          System.out.println("HashSet:" + hs);
          System.out.println("HashMap:" + hm);
      }
  }
  ```

* Service 业务层

  ```java
  public class UserServiceImpl implements UserService {
      private BookDao bookDao;
      
      public UserServiceImpl() {}
      
  	public void setBookDao(BookDao bookDao) {
          this.bookDao = bookDao;
      }
  
      public void save() {
          System.out.println("user service running..." + num);
          bookDao.save();
      }
  }
  ```

* 配置 applicationContext.xml

  ```xml
  <bean id="userService" class="service.impl.UserServiceImpl">
      <property name="bookDao" ref="bookDao"/>
  </bean>
  
  <bean id="bookDao" class="dao.impl.BookDaoImpl">
      <property name="al">
          <list>
              <value>seazean</value>
              <value>66666</value>
          </list>
      </property>
      <property name="properties">
          <props>
              <prop key="name">seazean666</prop>
              <prop key="value">666666</prop>
          </props>
      </property>
      <property name="arr">
          <array>
              <value>123456</value>
              <value>66666</value>
          </array>
      </property>
      <property name="hs">
          <set>
              <value>seazean</value>
              <value>66666</value>
          </set>
      </property>
      <property name="hm">
          <map>
              <entry key="name" value="seazean66666"/>
              <entry key="value" value="6666666666"/>
          </map>
      </property>
  </bean>
  ```

  

****



#### P

标签：<p:propertyName>，<p:propertyName-ref>

作用：为 bean 注入属性值

格式：

```xml
<bean p:propertyName="propertyValue" p:propertyName-ref="beanId"/>
```

开启 p 命令空间：开启 Spring 对 p 命令空间的的支持，在 beans 标签中添加对应空间支持

```xml
<beans xmlns="http://www.springframework.org/schema/beans"   		
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"    
       xmlns:p="http://www.springframework.org/schema/p"       
       xsi:schemaLocation="
		http://www.springframework.org/schema/beans     
		https://www.springframework.org/schema/beans/spring-beans.xsd">
</beans>
```

实例：

```xml
<bean 
      id="userService"
      class="service.impl.UserServiceImpl"
      p:userDao-ref="userDao"
      p:bookDao-ref="bookDao"
      p:num="10"
	/>
```



****



#### SpEL

Spring 提供了对 EL 表达式的支持，统一属性注入格式

作用：为 bean 注入属性值

格式：

```xml
<property value="EL">
```

注意：所有属性值不区分是否引用类型，统一使用value赋值

所有格式统一使用  value=“#{}”

- 常量  #{10}  #{3.14}  #{2e5}  #{‘it’}

- 引用 bean  #{beanId}    

- 引用 bean 属性  #{beanId.propertyName}

- 引用 bean 方法  beanId.methodName().method2()

- 引用静态方法  T(java.lang.Math).PI

- 运算符支持  #{3 lt 4 == 4 ge 3}

- 正则表达式支持  #{user.name matches‘[a-z]{6,}’}

- 集合支持  #{likes[3]}

实例：

```xml
<bean id="userService" class="service.impl.UserServiceImpl">
        <property name="userDao" value="#{userDao}"/>
        <property name="bookDao" value="#{bookDao}"/>
        <property name="num" value="#{666666666}"/>
    </bean>
```



***



#### prop

Spring 提供了读取外部 properties 文件的机制，使用读取到的数据为 bean 的属性赋值

操作步骤：

1. 准备外部 properties 文件

2. 开启 context 命名空间支持

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <beans xmlns="http://www.springframework.org/schema/beans"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns:context="http://www.springframework.org/schema/context"
          xsi:schemaLocation="
           http://www.springframework.org/schema/beans
           https://www.springframework.org/schema/beans/spring-beans.xsd
           http://www.springframework.org/schema/context
           https://www.springframework.org/schema/context/spring-context.xsd
           ">
   ```

3. 加载指定的 properties 文件

   ```xml
   <context:property-placeholder location="classpath:data.properties" />
   ```

4. 使用加载的数据

   ```xml
   <property name="propertyName" value="${propertiesName}"/>
   ```

- 注意：如果需要加载所有的 properties 文件，可以使用 `*.properties` 表示加载所有的 properties 文件

- 注意：读取数据使用 **${propertiesName}** 格式进行，其中 propertiesName 指 properties 文件中的属性名

代码实现：

* data.properties

  ```properties
  username=root
  pwd：[已隐藏]
  ```

* DAO 层：注入的资源

  ```java
  public interface UserDao {
      public void save();
  }
  ```

  ```java
  public class UserDaoImpl implements UserDao{
      private String userName;
      private String password;
  
      public void setUserName(String userName) {
          this.userName = userName;
      }
      public void setPassword(String password) {
          this.password：[已隐藏]
      }
  
      public void save(){
          System.out.println("user dao running..."+userName+" "+password);
      }
  }
  ```

* Service 业务层

  ```java
  public class UserServiceImpl implements UserService {
      private UserDao userDao;
      public void setUserDao(UserDao userDao) {
          this.userDao = userDao;
      }
      public void save() {
          System.out.println("user service running...");
          userDao.save();
      }
  }
  ```

* applicationContext.xml

  ```xml
  <context:property-placeholder location="classpath:*.properties"/>
  
  <bean id="userDao" class="dao.impl.UserDaoImpl">
      <property name="userName" value="${username}"/>
      <property name="password" value="${pwd}"/>
  </bean>
  
  <bean id="userService" class="service.impl.UserServiceImpl">
      <property name="userDao" ref="userDao"/>
  </bean>
  ```

* 测试类

  ```java
  public class UserApp {
      public static void main(String[] args) {
          ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml");
          UserService userService = (UserService) ctx.getBean("userService");
          userService.save();
      }
  }
  ```

  

***



#### import

标签：<import>，<beans>标签的子标签

作用：在当前配置文件中导入其他配置文件中的项

格式：

```xml
<beans>
    <import />
</beans>
```

属性：

* resource：加载的配置文件名

```xml
<import resource=“config2.xml"/>
```

Spring 容器加载多个配置文件：

* applicationContext-book.xml

  ```xml
  <bean id="bookDao" class="dao.impl.BookDaoImpl">
      <property name="num" value="1"/>
  </bean>
  ```

* applicationContext-user.xml

  ```xml
  <bean id="userDao" class="dao.impl.UserDaoImpl">
      <property name="userName" value="${username}"/>
      <property name="password" value="${pwd}"/>
  </bean>
  
  <bean id="userService" class="service.impl.UserServiceImpl">
      <property name="userDao" ref="userDao"/>
      <property name="bookDao" ref="bookDao"/>
  </bean>
  ```

* applicationContext.xml

  ```xml
  <import resource="applicationContext-user.xml"/>
  <import resource="applicationContext-book.xml"/>
  
  <bean id="bookDao" class="com.seazean.dao.impl.BookDaoImpl">
      <property name="num" value="2"/>
  </bean>
  ```

* 测试类

  ```java
  new ClassPathXmlApplicationContext("applicationContext-user.xml","applicationContext-book.xml");
  new ClassPathXmlApplicationContext("applicationContext.xml");
  ```

Spring 容器中的 bean 定义冲突问题

- 同 id 的 bean，后定义的覆盖先定义的

- 导入配置文件可以理解为将导入的配置文件复制粘贴到对应位置，程序执行选择最下面的配置使用

- 导入配置文件的顺序与位置不同可能会导致最终程序运行结果不同



***



#### 三方资源

##### Druid

第三方资源配置

* pom.xml

  ```xml
  <dependency>
      <groupId>com.alibaba</groupId>
      <artifactId>druid</artifactId>
      <version>1.1.16</version>
  </dependency>
  ```

* applicationContext.xml

  ```xml
  <!--加载druid资源-->
  <bean id="dataSource" class="com.alibaba.druid.pool.DruidDataSource">
      <property name="driverClassName" value="com.mysql.jdbc.Driver"/>
      <property name="url" value="jdbc:mysql://192.168.2.185:3306/spring_db"/>
      <property name="username" value="root"/>
      <property name="password" value="123456"/>
  </bean>
  ```
  
* App.java

  ```java
  ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml");
  DruidDataSource datasource = (DruidDataSource) ctx.getBean("datasource");
  System.out.println(datasource);
  ```



****



##### Mybatis

Mybatis 核心配置文件消失

- 环境 environment 转换成数据源对象

- 映射 Mapper 扫描工作交由 Spring 处理

- 类型别名交由 Spring 处理

DAO 接口不需要创建实现类，MyBatis-Spring 提供了一个动态代理的实现 **MapperFactoryBean**，这个类可以让直接注入数据映射器接口到 service 层 bean 中，底层将会动态代理创建类

整合原理：利用 Spring 框架的 SPI 机制，在 META-INF 目录的 spring.handlers 中给 Spring 容器中导入 NamespaceHandler 类

* NamespaceHandler 的 init 方法注册 bean 信息的解析器 MapperScannerBeanDefinitionParser
* 解析器在 Spring 容器创建过程中去**解析 mapperScanner 标签**，解析出的属性填充到 MapperScannerConfigurer 中

* MapperScannerConfigurer 实现了 BeanDefinitionRegistryPostProcessor 接口，重写 postProcessBeanDefinitionRegistry() 方法，可以扫描到 MyBatis 的 Mapper



***
