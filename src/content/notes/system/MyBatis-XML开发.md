---
title: "XML开发"
date: 2023-09-26
planet: system
tags: ["Java", "基础", XML开发, system]
summary: "Aspect（切面）用于描述切入点与通知间的关系，是 AOP 编程中的一个概念"
private: false
---

### XML开发

#### AspectJ

Aspect（切面）用于描述切入点与通知间的关系，是 AOP 编程中的一个概念

AspectJ 是基于 java 语言对 Aspect 的实现



***



#### AOP

##### config

标签：<aop:config>，<beans> 的子标签

作用：设置 AOP

格式：

```xml
<beans>
    <aop:config>……</aop:config>
    <aop:config>……</aop:config>
    <!--一个beans标签中可以配置多个aop:config标签-->
</beans>
```



***



##### pointcut

标签：<aop:pointcut>，归属于 aop:config 标签和 aop:aspect 标签

作用：设置切入点

格式：

```xml
<aop:config>
    <aop:pointcut id="pointcutId" expression="……"/>
    <aop:aspect>
        <aop:pointcut id="pointcutId" expression="……"/>
    </aop:aspect>
</aop:config>
```

说明：

* 一个 aop:config 标签中可以配置多个 aop:pointcut 标签，且该标签可以配置在 aop:aspect 标签内

属性：

- id ：识别切入点的名称

- expression ：切入点表达式



***



##### aspect

标签：<aop:aspect>，aop:config 的子标签

作用：设置具体的 AOP 通知对应的切入点（切面）

格式：

```xml
<aop:config>
    <aop:aspect ref="beanId">……</aop:aspect>
    <aop:aspect ref="beanId">……</aop:aspect>
    <!--一个aop:config标签中可以配置多个aop:aspect标签-->
</aop:config>
```

属性：

- ref ：通知所在的 bean 的 id



***



#### Pointcut

##### 切入点

切入点描述的是某个方法

切入点表达式是一个快速匹配方法描述的通配格式，类似于正则表达式



***



##### 表达式

格式：

```xml
关键字(访问修饰符  返回值  包名.类名.方法名(参数)异常名)
```

示例：

```java
//匹配UserService中只含有一个参数的findById方法
execution(public User service.UserService.findById(int))
```

格式解析：

* 关键字：描述表达式的匹配模式（参看关键字列表）
* 访问修饰符：方法的访问控制权限修饰符
* 类名：方法所在的类（此处可以配置接口名称）
* 异常：方法定义中指定抛出的异常

关键字：

- execution ：匹配执行指定方法

- args ：匹配带有指定参数类型的方法

- within、this、target、@within、@target、@args、@annotation、bean、reference pointcut等


通配符：

* *：单个独立的任意符号，可以独立出现，也可以作为前缀或者后缀的匹配符出现

  ```java
  //匹配com.seazean包下的任意包中的UserService类或接口中所有find开头的带有一个任意参数的方法
  execution(public * com.seazean.*.UserService.find*(*)
  ```

* .. ：多个连续的任意符号，可以独立出现，常用于简化包名与参数

  ```java
  //匹配com包下的任意包中的UserService类或接口中所有名称为findById参数任意数量和类型的方法
  execution(public User com..UserService.findById(..))
  ```

* +：专用于匹配子类类型

  ```java
  //匹配任意包下的Service结尾的类或者接口的子类或者实现类
  execution(* *..*Service+.*(..))
  ```

逻辑运算符：

- &&：连接两个切入点表达式，表示两个切入点表达式同时成立的匹配
- ||：连接两个切入点表达式，表示两个切入点表达式成立任意一个的匹配
- ! ：连接单个切入点表达式，表示该切入点表达式不成立的匹配

示例：

```java
execution(* *(..))		//前三个都是匹配全部
execution(* *..*(..))
execution(* *..*.*(..))
execution(public * *..*.*(..))
execution(public int *..*.*(..))
execution(public void *..*.*(..))
execution(public void com..*.*(..)) 
execution(public void com..service.*.*(..))
execution(public void com.seazean.service.*.*(..))
execution(public void com.seazean.service.User*.*(..))
execution(public void com.seazean.service.*Service.*(..))
execution(public void com.seazean.service.UserService.*(..))
execution(public User com.seazean.service.UserService.find*(..))	//find开头
execution(public User com.seazean.service.UserService.*Id(..))		//I
execution(public User com.seazean.service.UserService.findById(..))
execution(public User com.seazean.service.UserService.findById(int))
execution(public User com.seazean.service.UserService.findById(int,int))
execution(public User com.seazean.service.UserService.findById(int,*))
execution(public User com.seazean.service.UserService.findById())
execution(List com.seazean.service.*Service+.findAll(..))
```



***



##### 配置方式

XML 配置规则：

- 企业开发命名规范严格遵循规范文档进行

- 先为方法配置局部切入点，再抽取类中公共切入点，最后抽取全局切入点

- 代码走查过程中检测切入点是否存在越界性包含

- 代码走查过程中检测切入点是否存在非包含性进驻

- 设定 AOP 执行检测程序，在单元测试中监控通知被执行次数与预计次数是否匹配（不绝对正确：加进一个不该加的，删去一个不该删的相当于结果不变）

- 设定完毕的切入点如果发生调整务必进行回归测试

```xml
<aop:config>
    <!--1.配置公共切入点-->
    <aop:pointcut id="pt1" expression="execution(* *(..))"/>
    <aop:aspect ref="myAdvice">
        <!--2.配置局部切入点-->
        <aop:pointcut id="pt2" expression="execution(* *(..))"/>
        <!--引用公共切入点-->
        <aop:before method="logAdvice" pointcut-ref="pt1"/>
        <!--引用局部切入点-->
        <aop:before method="logAdvice" pointcut-ref="pt2"/>
        <!--3.直接配置切入点-->
        <aop:before method="logAdvice" pointcut="execution(* *(..))"/>
    </aop:aspect>
</aop:config>
```





***



#### Advice

##### 通知类型

AOP 的通知类型共5种：前置通知，后置通知、返回后通知、抛出异常后通知、环绕通知

###### before

标签：<aop:before>，aop:aspect的子标签

作用：设置前置通知

* **前置通知**：原始方法执行前执行，如果通知中抛出异常，阻止原始方法运行
* 应用：数据校验

格式：

```xml
<aop:aspect ref="adviceId">
    <aop:before method="methodName" pointcut="execution(* *(..))"/>
    <!--一个aop:aspect标签中可以配置多个aop:before标签-->
</aop:aspect>
```

基本属性：

- method：在通知类中设置当前通知类别对应的方法

- pointcut：设置当前通知对应的切入点表达式，与pointcut-ref属性冲突

- pointcut-ref：设置当前通知对应的切入点id，与pointcut属性冲突



###### after

标签：<aop:after>，aop:aspect的子标签

作用：设置后置通知

* **后置通知**：原始方法执行后执行，无论原始方法中是否出现异常，都将执行通知

* 应用：现场清理

格式：

```xml
<aop:aspect ref="adviceId">
    <aop:after method="methodName" pointcut="execution(* *(..))"/>
    <!--一个aop:aspect标签中可以配置多个aop:after标签-->
</aop:aspect>
```

基本属性：

- method：在通知类中设置当前通知类别对应的方法

- pointcut：设置当前通知对应的切入点表达式，与pointcut-ref属性冲突

- pointcut-ref：设置当前通知对应的切入点id，与pointcut属性冲突



###### after-r

标签：<aop:after-returning>，aop:aspect的子标签

作用：设置返回后通知

* **返回后通知**：原始方法正常执行完毕并返回结果后执行，如果原始方法中抛出异常，无法执行

* 应用：返回值相关数据处理

格式：

```xml
<aop:aspect ref="adviceId">
    <aop:after-returning method="methodName" pointcut="execution(* *(..))"/>
    <!--一个aop:aspect标签中可以配置多个aop:after-returning标签-->
</aop:aspect>
```

基本属性：

- method：在通知类中设置当前通知类别对应的方法
- pointcut：设置当前通知对应的切入点表达式，与pointcut-ref属性冲突
- pointcut-ref：设置当前通知对应的切入点id，与pointcut属性冲突
- returning：设置接受返回值的参数，与通知类中对应方法的参数一致



###### after-t

标签：<aop:after-throwing>，aop:aspect的子标签

作用：设置抛出异常后通知

* **抛出异常后通知**：原始方法抛出异常后执行，如果原始方法没有抛出异常，无法执行
* 应用：对原始方法中出现的异常信息进行处理

格式：

```xml
<aop:aspect ref="adviceId">
    <aop:after-throwing method="methodName" pointcut="execution(* *(..))"/>
    <!--一个aop:aspect标签中可以配置多个aop:after-throwing标签-->
</aop:aspect>
```

基本属性：

- method：在通知类中设置当前通知类别对应的方法
- pointcut：设置当前通知对应的切入点表达式，与pointcut-ref属性冲突
- pointcut-ref：设置当前通知对应的切入点id，与pointcut属性冲突
- throwing：设置接受异常对象的参数，与通知类中对应方法的参数一致



###### around

标签：<aop:around>，aop:aspect的子标签

作用：设置环绕通知

* **环绕通知**：在原始方法执行前后均有对应执行执行，还可以阻止原始方法的执行

* 应用：功能强大，可以做任何事情

格式：

```xml
<aop:aspect ref="adviceId">
    <aop:around method="methodName" pointcut="execution(* *(..))"/>
    <!--一个aop:aspect标签中可以配置多个aop:around标签-->
</aop:aspect>
```

基本属性：

- method ：在通知类中设置当前通知类别对应的方法

- pointcut ：设置当前通知对应的切入点表达式，与pointcut-ref属性冲突

- pointcut-ref ：设置当前通知对应的切入点id，与pointcut属性冲突

环绕通知的开发方式（参考通知顺序章节）：

- 环绕通知是**在原始方法的前后添加功能**，在环绕通知中，存在对原始方法的显式调用

  ```java
  public Object around(ProceedingJoinPoint pjp) throws Throwable {
      Object ret = pjp.proceed();
      return ret;
  }
  ```

- 环绕通知方法相关说明：

  - 方法须设定 Object 类型的返回值，否则会**拦截**原始方法的返回。如果原始方法返回值类型为 void，通知方法也可以设定返回值类型为 void，最终返回 null

  - 方法需在第一个参数位置设定 ProceedingJoinPoint 对象，通过该对象调用 proceed() 方法，实现**对原始方法的调用**。如省略该参数，原始方法将无法执行

  - 使用 proceed() 方法调用原始方法时，因无法预知原始方法运行过程中是否会出现异常，强制抛出 Throwable 对象，封装原始方法中可能出现的异常信息



****



##### 通知顺序

当同一个切入点配置了多个通知时，通知会存在运行的先后顺序，该顺序以通知配置的顺序为准。

* AOPAdvice

  ```java
  public class AOPAdvice {
      public void before(){
          System.out.println("before...);
      }
      public void after(){
          System.out.println("after...");
      }
      public void afterReturing(){
          System.out.println("afterReturing...");
      }
      public void afterThrowing(){
          System.out.println("afterThrowing...");
      }
      public Object around(ProceedingJoinPoint pjp) {
          System.out.println("around before...");
         	//对原始方法的调用
          Object ret = pjp.proceed();
          System.out.println("around after..."+ret);
     	    return ret;
      }
  }
  ```

* applicationContext.xml  **顺序执行**

  ```xml
  <aop:config>
      <aop:pointcut id="pt" expression="execution(* *..*(..))"/>
      <aop:aspect ref="myAdvice">
  		<aop:before method="before" pointcut-ref="pt"/>
          <aop:after method="after" pointcut-ref="pt"/>
          <aop:after-returning method="afterReturing" pointcut-ref="pt"/>
          <aop:after-throwing method="afterThrowing" pointcut-ref="pt"/>
          <aop:around method="around" pointcut-ref="pt"/>
      </aop:aspect>
  </aop:config>
  ```

  

***



##### 获取数据

###### 参数

第一种方式：

* 设定通知方法第一个参数为 JoinPoint，通过该对象调用 getArgs() 方法，获取原始方法运行的参数数组

  ```java
  public void before(JoinPoint jp) throws Throwable {
      Object[] args = jp.getArgs();
  }
  ```

* 所有的通知均可以获取参数，环绕通知使用ProceedingJoinPoint.getArgs()方法

第二种方式：

* 设定切入点表达式为通知方法传递参数（锁定通知变量名）

* 流程图：![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/AOP通知获取参数方式二.png)

* 解释：
  * `&amp` 代表并且 &
  * 输出结果：a = param1   b = param2

第三种方式：

* 设定切入点表达式为通知方法传递参数（改变通知变量名的定义顺序）
* 流程图：![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/AOP通知获取参数方式三.png)

* 解释：输出结果 a = param2   b = param1



****



###### 返回值

环绕通知和返回后通知可以获取返回值，后置通知不一定，其他类型获取不到

第一种方式：适用于返回后通知（after-returning）

- 设定返回值变量名

- 原始方法：

  ```java
  public class UserServiceImpl implements UserService {
      @Override
      public int save() {
          System.out.println("user service running...");
          return 100;
      }
  }
  ```

- AOP 配置：

  ```xml
  <aop:aspect ref="myAdvice">
      <aop:pointcut id="pt" expression="execution(* *(..))"/>
      <aop:after-returning method="afterReturning" pointcut-ref="pt" returning="ret"/>
  </aop:aspect>
  ```

- 通知类：

  ```java
  public class AOPAdvice {
      public void afterReturning(Object ret) {
          System.out.println("return:" + ret);
      }
  }
  ```

  


第二种：适用于环绕通知（around）

- 在通知类的方法中调用原始方法获取返回值

- 原始方法：

  ```java
  public class UserServiceImpl implements UserService {
      @Override
      public int save() {
          System.out.println("user service running...");
          return 100;
      }
  }
  ```

- AOP 配置：

  ```xml
  <aop:aspect ref="myAdvice">
      <aop:pointcut id="pt" expression="execution(* *(..))  "/>
      <aop:around method="around" pointcut-ref="pt" />
  </aop:aspect>
  ```

- 通知类：

  ```java
  public class AOPAdvice {    
  	public Object around(ProceedingJoinPoint pjp) throws Throwable {
          Object ret = pjp.proceed();
          return ret;
      }
  }
  ```

- 测试类：

  ```java
  public class App {
      public static void main(String[] args) {
          ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml");
          UserService userService = (UserService) ctx.getBean("userService");
  		int ret = userService.save();
         	System.out.println("app....." + ret);
      }
  }
  ```

  

***



###### 异常

环绕通知和抛出异常后通知可以获取异常，后置通知不一定，其他类型获取不到

第一种：适用于返回后通知（after-throwing）

- 设定异常对象变量名

- 原始方法

  ```java
  public class UserServiceImpl implements UserService {
      @Override
  	public void save() {
          System.out.println("user service running...");
          int i = 1/0;
      }
  }
  ```

- AOP 配置

  ```xml
  <aop:aspect ref="myAdvice">
  	<aop:pointcut id="pt" expression="execution(* *(..))  "/>
      <aop:after-throwing method="afterThrowing" pointcut-ref="pt" throwing="t"/>
  </aop:aspect>
  ```

- 通知类

  ```java
  public void afterThrowing(Throwable t){
      System.out.println(t.getMessage());
  }
  ```

  


第二种：适用于环绕通知（around）

* 在通知类的方法中调用原始方法捕获异常

- 原始方法：

  ```java
  public class UserServiceImpl implements UserService {
      @Override
  	public void save() {
          System.out.println("user service running...");
          int i = 1/0;
      }
  }
  ```

- AOP 配置：

  ```xml
  <aop:aspect ref="myAdvice">
      <aop:pointcut id="pt" expression="execution(* *(..))  "/>
      <aop:around method="around" pointcut-ref="pt" />
  </aop:aspect>
  ```

- 通知类：try……catch……捕获异常后，ret为null

  ```java
  public Object around(ProceedingJoinPoint pjp) throws Throwable {
      Object ret = pjp.proceed();	//对此处调用进行try……catch……捕获异常，或抛出异常
      /* try {
              ret = pjp.proceed();
          } catch (Throwable throwable) {
              System.out.println("around exception..." + throwable.getMessage());
          }*/
      return ret;
  }
  ```

* 测试类

  ```java
  userService.delete();
  ```

  



***



###### 获取全部

* UserService

  ```java
  public interface UserService {
      public void save(int i, int m);
  
      public int update();
  
      public void delete();
  }
  ```

  ```java
  public class UserServiceImpl implements UserService {
      @Override
      public void save(int i, int m) {
          System.out.println("user service running..." + i + "," + m);
      }
  
      @Override
      public int update() {
          System.out.println("user service update running...");
          return 100;
      }
  
      @Override
      public void delete() {
          System.out.println("user service delete running...");
          int i = 1 / 0;
      }
  }
  ```

* AOPAdvice

  ```java
  public class AOPAdvice {
      public void before(JoinPoint jp){
          //通过JoinPoint参数获取调用原始方法所携带的参数
          Object[] args = jp.getArgs();
          System.out.println("before..."+args[0]);
      }
  
      public void after(JoinPoint jp){
          Object[] args = jp.getArgs();
          System.out.println("after..."+args[0]);
      }
  
      public void afterReturing(Object ret){
          System.out.println("afterReturing..."+ret);
      }
  
      public void afterThrowing(Throwable t){
          System.out.println("afterThrowing..."+t.getMessage());
      }
  
      public Object around(ProceedingJoinPoint pjp) {
          System.out.println("around before...");
          Object ret = null;
          try {
              //对原始方法的调用
              ret = pjp.proceed();
          } catch (Throwable throwable) {
              System.out.println("around...exception...."+throwable.getMessage());
          }
          System.out.println("around after..."+ret);
          return ret;
      }
  }
  ```

* applicationContext.xml

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <beans xmlns="http://www.springframework.org/schema/beans"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xmlns:context="http://www.springframework.org/schema/context"
         xmlns:aop="http://www.springframework.org/schema/aop"
         xsi:schemaLocation="
          http://www.springframework.org/schema/beans
          https://www.springframework.org/schema/beans/spring-beans.xsd
          http://www.springframework.org/schema/context
          https://www.springframework.org/schema/context/spring-context.xsd
          http://www.springframework.org/schema/aop
          https://www.springframework.org/schema/aop/spring-aop.xsd
          ">
      <bean id="userService" class="service.impl.UserServiceImpl"/>
      <bean id="myAdvice" class="aop.AOPAdvice"/>
  
      <aop:config>
          <aop:pointcut id="pt" expression="execution(* *..*(..))"/>
          <aop:aspect ref="myAdvice">
              <aop:before method="before" pointcut="pt"/>
              <aop:around method="around" pointcut-ref="pt"/>
              <aop:after method="after" pointcut="pt"/>
              <aop:after-returning method="afterReturning" pointcut-ref="pt" returning="ret"/>
              <aop:after-throwing method="afterThrowing" pointcut-ref="pt" throwing="t"/>
          </aop:aspect>
      </aop:config>
  </beans>
  ```

* 测试类

  ```java
  public class App {
      public static void main(String[] args) {
          ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml");
          UserService userService = (UserService) ctx.getBean("userService");
  //        userService.save(666, 888);
  //        int ret = userService.update();
  //        System.out.println("app....." + ret);
          userService.delete();
      }
  }
  ```

  



***
