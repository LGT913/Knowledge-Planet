---
title: "注解开发"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 注解开发, system]
summary: "- 在进行包扫描时，会对配置的包及其子包中所有文件进行扫描，多个包采用,隔开 - 扫描过程是以文件夹递归迭代的形式进行的 - 扫描过程仅读取合法的 Java 文件 - 扫描时仅读取 Spring 可识别的注解 - 扫描结束后会将可识别的有效"
private: false
---

### 注解开发

#### 注解驱动

##### XML

启动注解扫描，加载类中配置的注解项：

```xml
<context:component-scan base-package="packageName1,packageName2"/>
```

说明：

- 在进行包扫描时，会对配置的包及其子包中所有文件进行扫描，多个包采用`,`隔开
- 扫描过程是以文件夹递归迭代的形式进行的
- 扫描过程仅读取合法的 Java 文件
- 扫描时仅读取 Spring 可识别的注解
- 扫描结束后会将可识别的有效注解转化为 Spring 对应的资源加入 IoC 容器
- 从加载效率上来说注解优于 XML 配置文件

注解：启动时使用注解的形式替代 xml 配置，将 Spring 配置文件从工程中消除，简化书写

缺点：为了达成注解驱动的目的，可能会将原先很简单的书写，变的更加复杂。XML 中配置第三方开发的资源是很方便的，但使用注解驱动无法在第三方开发的资源中进行编辑，因此会增大开发工作量

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/注解驱动示例.png)



***



##### 纯注解

注解配置类

名称：@Configuration、@ComponentScan

类型：类注解

作用：**设置当前类为 Spring 核心配置加载类**

格式：

```java
@Configuration
@ComponentScan({"scanPackageName1","scanPackageName2"})
public class SpringConfigClassName{
}
```

说明：

- 核心配合类用于替换 Spring 核心配置文件，此类可以设置空的，不设置变量与属性
- bean 扫描工作使用注解 @ComponentScan 替代，多个包用 `{} 和 ,` 隔开

加载纯注解格式上下文对象，需要使用 **AnnotationConfigApplicationContext**

```java
@Configuration
public class SpringConfig {
    @Bean
    public Person person() {
        return new Person1("lisi", 20);
    }
}

public class MainTest {
    public static void main(String[] args) {
        ApplicationContext applicationContext = new 
            		AnnotationConfigApplicationContext(SpringConfig.class);
        //方式一：名称对应类名
        Person bean = applicationContext.getBean(Person.class);
        System.out.println(bean);
		
        //方式二：名称对应方法名 
        Person bean1 = (Person) applicationContext.getBean("person1");	
        
        //方法三：指定名称@Bean("person2")
    }
}
```



***



##### 扫描器

组件扫描过滤器

开发过程中，需要根据需求加载必要的 bean，排除指定 bean

名称：@ComponentScan

类型：**类注解**

作用：设置 Spring 配置加载类扫描规则

格式：

```java
@ComponentScan(
    value = {"dao","service"},			//设置基础扫描路径
    excludeFilters =					//设置过滤规则，当前为排除过滤
	@ComponentScan.Filter(				//设置过滤器
	    type= FilterType.ANNOTATION,  	//设置过滤方式为按照注解进行过滤
	    classes = Service.class)     	//设置具体的过滤项，过滤所有@Service修饰的bean
    )
)
```

属性：

* includeFilters：设置包含性过滤器 
* excludeFilters：设置排除性过滤器
* type：设置过滤器类型





***



#### 基本注解

##### 设置 bean

名称：@Component、@Controller、@Service、@Repository

类型：类注解，写在类定义上方

作用：设置该类为 Spring 管理的 bean

格式：

```java
@Component
public class ClassName{}
```

说明：@Controller、@Service 、@Repository 是 @Component 的衍生注解，功能同 @Component

属性：

- value（默认）：定义 bean 的访问 id



***



##### 作用范围

名称：@Scope

类型：类注解，写在类定义上方

作用：设置该类作为 bean 对应的 scope 属性

格式：

```java
@Scope
public class ClassName{}
```

相关属性

- value（默认）：定义 bean 的作用域，默认为 singleton，非单例取值 prototype



***



##### 生命周期

名称：@PostConstruct、@PreDestroy

类型：方法注解，写在方法定义上方

作用：设置该类作为 bean 对应的生命周期方法

示例：

```java
//定义bean，后面添加bean的id
@Component("userService")
//定义bean的作用域
@Scope("singleton")
public class UserServiceImpl implements UserService {
    //初始化
    @PostConstruct
    public void init(){
        System.out.println("user service init...");
    }
	//销毁
    @PreDestroy
    public void destroy(){
        System.out.println("user service destroy...");
    }
}
```

一个对象的执行顺序：Constructor >> @Autowired（注入属性） >> @PostConstruct（初始化逻辑）



***



##### 加载资源

名称：@Bean

类型：方法注解

作用：设置该方法的返回值作为 Spring 管理的 bean

格式：

```java
@Bean("dataSource")
public DruidDataSource createDataSource() {    return ……;    }
```

说明：

- 因为第三方 bean 无法在其源码上进行修改，使用 @Bean 解决第三方 bean 的引入问题

- 该注解用于替代 XML 配置中的静态工厂与实例工厂创建 bean，不区分方法是否为静态或非静态

- @Bean 所在的类必须被 Spring 扫描加载，否则该注解无法生效

相关属性

- value（默认）：定义 bean 的访问 id
- initMethod：声明初始化方法
- destroyMethod：声明销毁方法



***



#### 属性注入

##### 基本类型

名称：@Value

类型：属性注解、方法注解

作用：设置对应属性的值或对方法进行传参

格式：

```java
//@Value("${jdbc.username}")
@Value("root")
private String username;
```

说明：

- value 值**仅支持非引用类型数据**，赋值时对方法的所有参数全部赋值

- value 值支持读取 properties 文件中的属性值，通过类属性将 properties 中数据传入类中

- value 值支持 SpEL

- @value 注解如果添加在属性上方，可以省略 set 方法（set 方法的目的是为属性赋值）

相关属性：

- value（默认）：定义对应的属性值或参数值



****



##### 自动装配

###### 属性注入

名称：@Autowired、@Qualifier

类型：属性注解、方法注解

作用：设置对应属性的对象、对方法进行引用类型传参

格式：

```java
@Autowired(required = false)
@Qualifier("userDao")
private UserDao userDao;
```

说明：

- @Autowired 默认按类型装配，指定 @Qualifier 后可以指定自动装配的 bean 的 id

相关属性：

- required：**为 true （默认）表示注入 bean 时该 bean 必须存在**，不然就会注入失败抛出异常；为 false  表示注入时该 bean 存在就注入，不存在就忽略跳过

注意：在使用 @Autowired 时，首先在容器中查询对应类型的 bean，如果查询结果刚好为一个，就将该 bean 装配给 @Autowired 指定的数据，如果查询的结果不止一个，那么 @Autowired 会根据名称来查找，如果查询的结果为空，那么会抛出异常

解决方法：使用 required = false



***



###### 优先注入

名称：@Primary

类型：类注解

作用：设置类对应的 bean 按类型装配时优先装配

范例：

```java
@Primary
public class ClassName{}
```

说明：

- @Autowired 默认按类型装配，当出现相同类型的 bean，使用 @Primary 提高按类型自动装配的优先级，多个 @Primary 会导致优先级设置无效



***



###### 注解对比

名称：@Inject、@Named、@Resource

- @Inject 与 @Named 是 JSR330 规范中的注解，功能与 @Autowired 和 @Qualifier 完全相同，适用于不同架构场景
- @Resource 是 JSR250 规范中的注解，可以简化书写格式

@Resource 相关属性

- name：设置注入的 bean 的 id

- type：设置注入的 bean 的类型，接收的参数为 Class 类型

@Autowired 和 @Resource之间的区别：

*  @Autowired 默认是**按照类型装配**注入，默认情况下它要求依赖对象必须存在（可以设置 required 属性为 false）

*  @Resource 默认**按照名称装配**注入，只有当找不到与名称匹配的 bean 才会按照类型来装配注入



****



##### 静态注入

Spring 容器管理的都是实例对象，**@Autowired 依赖注入的都是容器内的对象实例**，在 Java 中 static 修饰的静态属性（变量和方法）是属于类的，而非属于实例对象

当类加载器加载静态变量时，Spring 上下文尚未加载，所以类加载器不会在 Bean 中正确注入静态类

```java
@Component
public class TestClass {
    @Autowired
    private static Component component;

    // 调用静态组件的方法
    public static void testMethod() {
        component.callTestMethod()；
    }  
}
// 编译正常，但运行时报java.lang.NullPointerException，所以在调用testMethod()方法时，component变量还没被初始化
```

解决方法：

* @Autowired 注解到**类的构造函数**上，Spring 扫描到 Component 的 Bean，然后赋给静态变量 component

  ```java
  @Component
  public class TestClass {
      private static Component component;
  
      @Autowired
      public TestClass(Component component) {
          TestClass.component = component;
      }
  
      public static void testMethod() {
          component.callTestMethod()；
      }
  }
  ```

* @Autowired 注解到**静态属性的 setter 方法**上

* 使用 @PostConstruct 注解一个方法，在方法内为 static 静态成员赋值

* 使用 Spring 框架工具类获取 bean，定义成局部变量使用

  ```java
  public class TestClass {
      // 调用静态组件的方法
     public static void testMethod() {
        Component component = SpringApplicationContextUtil.getBean("component");
        component.callTestMethod();
     }
  }
  ```



参考文章：http://jessehzx.top/2018/03/18/spring-autowired-static-field/



***



#### 文件读取

名称：@PropertySource

类型：类注解

作用：加载 properties 文件中的属性值

格式：

```java
@PropertySource(value = "classpath:filename.properties")
public class ClassName {
    @Value("${propertiesAttributeName}")
    private String attributeName;
}
```

说明：

- 不支持 * 通配符，加载后，所有 Spring 控制的 bean 中均可使用对应属性值，加载多个需要用 `{} 和 ,` 隔开

相关属性

- value（默认）：设置加载的 properties 文件名

- ignoreResourceNotFound：如果资源未找到，是否忽略，默认为 false





***



#### 加载控制

##### 依赖加载

@DependsOn

- 名称：@DependsOn

- 类型：类注解、方法注解

- 作用：控制 bean 的加载顺序，使其在指定 bean 加载完毕后再加载

- 格式：

  ```java
  @DependsOn("beanId")
  public class ClassName {
  }
  ```

- 说明：

  - 配置在方法上，使 @DependsOn 指定的 bean 优先于 @Bean 配置的 bean 进行加载

  - 配置在类上，使 @DependsOn 指定的 bean 优先于当前类中所有 @Bean 配置的 bean 进行加载

  - 配置在类上，使 @DependsOn 指定的 bean 优先于 @Component 等配置的 bean 进行加载

- 相关属性

  - value（默认）：设置当前 bean 所依赖的 bean 的 id

@Order

- 名称：@Order

- 类型：**配置类注解**

- 作用：控制配置类的加载顺序，值越小越先加载

- 格式：

  ```java
  @Order(1)
  public class SpringConfigClassName {
  }
  ```

@Lazy

- 名称：@Lazy

- 类型：类注解、方法注解

- 作用：控制 bean 的加载时机，使其延迟加载，获取的时候加载

- 格式：

  ```java
  @Lazy
  public class ClassName {
  }
  ```



****



##### 应用场景

@DependsOn

- 微信订阅号，发布消息和订阅消息的 bean 的加载顺序控制（先开订阅，再发布）

- 双 11 活动，零点前是结算策略 A，零点后是结算策略 B，策略 B 操作的数据为促销数据，策略 B 加载顺序与促销数据的加载顺序

@Lazy

- 程序灾难出现后对应的应急预案处理是启动容器时加载时机

@Order

- 多个种类的配置出现后，优先加载系统级的，然后加载业务级的，避免细粒度的加载控制





****



#### 整合资源

##### 导入

名称：@Import

类型：类注解

作用：导入第三方 bean 作为 Spring 控制的资源，这些类都会被 Spring 创建并放入 ioc 容器

格式：

```java
@Configuration
@Import(OtherClassName.class)
public class ClassName {
}
```

说明：

- @Import 注解在同一个类上，仅允许添加一次，如果需要导入多个，使用数组的形式进行设定
- 在被导入的类中可以继续使用 @Import 导入其他资源
- @Bean 所在的类可以使用导入的形式进入 Spring 容器，无需声明为 bean



***



##### Druid

* 加载资源

  ```java
  @Component
  public class JDBCConfig {
      @Bean("dataSource")
      public static DruidDataSource getDataSource() {
          DruidDataSource ds = new DruidDataSource();
          ds.setDriverClassName("com.mysql.jdbc.Driver");
          ds.setUrl("jdbc:mysql://192.168.2.185:3306/spring_db");
          ds.setUsername("root");
          ds.setPassword("123456");
          return ds;
      }
  }
  ```

* 导入资源

  ```java
  @Configuration
  @ComponentScan(value = {"service","dao"})
  @Import(JDBCConfig.class)
  public class SpringConfig {
  }
  ```

* 测试

  ```java
  DruidDataSource dataSource = (DruidDataSource) ctx.getBean("dataSource");
  System.out.println(dataSource);
  ```

  

***



##### Junit

Spring 接管 Junit 的运行权，使用 Spring 专用的 Junit 类加载器，为 Junit 测试用例设定对应的 Spring 容器

注意：

- 从 Spring5.0 以后，要求 Junit 的版本必须是4.12及以上

- Junit 仅用于单元测试，不能将 Junit 的测试类配置成 Spring 的 bean，否则该配置将会被打包进入工程中 

test / java / service / UserServiceTest

```java
//设定spring专用的类加载器
@RunWith(SpringJUnit4ClassRunner.class)
//设定加载的spring上下文对应的配置
@ContextConfiguration(classes = SpringConfig.class)
public class UserServiceTest {
    @Autowired
    private AccountService accountService;
    @Test
    public void testFindById() {
        Account account = accountService.findById(1);
        Assert.assertEquals("Mike", account.getName());
    }
}
```

pom.xml

```xml
<dependency>
    <groupId>junit</groupId>
    <artifactId>junit</artifactId>
    <version>4.12</version>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-test</artifactId>
    <version>5.1.9.RELEASE</version>
</dependency>
```





****
