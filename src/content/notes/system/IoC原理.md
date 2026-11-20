---
title: "IoC原理"
date: 2023-09-26
planet: system
tags: ["Java", "基础", IoC原理, system]
summary: "1. ApplicationContext 是一个接口，提供了访问 Spring 容器的 API"
private: false
---

### IoC原理

#### 核心类

##### BeanFactory

ApplicationContext：

1. ApplicationContext 是一个接口，提供了访问 Spring 容器的 API

2. ClassPathXmlApplicationContext 是一个类，实现了上述功能

3. ApplicationContext 的顶层接口是 BeanFactory

4. BeanFactory 定义了 bean 相关的最基本操作

5. ApplicationContext 在 BeanFactory 基础上追加了若干新功能

**ApplicationContext 和 BeanFactory对比：**

* BeanFactory 和 ApplicationContext 是 Spring 的两大核心接口，都可以当做 Spring 的容器
* BeanFactory 是 Spring 里面最底层的接口，是 IoC 的核心，定义了 IoC 的基本功能，包含了各种 Bean 的定义、加载、实例化，依赖注入和生命周期管理。ApplicationContext 接口作为 BeanFactory 的子类，除了提供 BeanFactory 所具有的功能外，还提供了更完整的框架功能：

  * 继承 MessageSource，因此支持国际化
  * 资源文件访问，如 URL 和文件（ResourceLoader）。
  * 载入多个（有继承关系）上下文（即加载多个配置文件） ，使得每一个上下文都专注于一个特定的层次，比如应用的 web 层
  * 提供在监听器中注册 bean 的事件
* BeanFactory 创建的 bean 采用延迟加载形式，只有在使用到某个 Bean 时（调用 getBean），才对该 Bean 进行加载实例化（Spring 早期使用该方法获取 bean），这样就不能提前发现一些存在的 Spring 的配置问题；ApplicationContext 是在容器启动时，一次性创建了所有的 Bean，容器启动时，就可以发现 Spring 中存在的配置错误，这样有利于检查所依赖属性是否注入
* ApplicationContext 启动后预载入所有的单实例 Bean，所以程序启动慢，运行时速度快
* 两者都支持 BeanPostProcessor、BeanFactoryPostProcessor 的使用，但两者之间的区别是：BeanFactory 需要手动注册，而 ApplicationContext 则是自动注册

FileSystemXmlApplicationContext：加载文件系统中任意位置的配置文件，而 ClassPathXmlAC 只能加载类路径下的配置文件

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Spring-ApplicationContext层级结构图.png)

BeanFactory 的成员属性：

```java
String FACTORY_BEAN_PREFIX = "&";
```

* 区分是 FactoryBean 还是创建的 Bean，加上 & 代表是工厂，getBean 将会返回工厂
* FactoryBean：如果某个 bean 的配置非常复杂，或者想要使用编码的形式去构建它，可以提供一个构建该 bean 实例的工厂，这个工厂就是 FactoryBean 接口实现类，FactoryBean 接口实现类也是需要 Spring 管理
  * 这里产生两种对象，一种是 FactoryBean 接口实现类（IOC 管理），另一种是 FactoryBean 接口内部管理的对象
  * 获取 FactoryBean 接口实现类，使用 getBean 时传的 beanName 需要带 & 开头
  * 获取 FactoryBean 内部管理的对象，不需要带 & 开头

BeanFactory 的基本使用：

```java
Resource res = new ClassPathResource("applicationContext.xml");
BeanFactory bf = new XmlBeanFactory(res);
UserService userService = (UserService)bf.getBean("userService");
```



****



##### FactoryBean

FactoryBean：对单一的 bean 的初始化过程进行封装，达到简化配置的目的

FactoryBean与 BeanFactory 区别：

- FactoryBean：封装单个 bean 的创建过程，就是工厂的 Bean

- BeanFactory：Spring 容器顶层接口，定义了 bean 相关的获取操作

代码实现：

* FactoryBean，实现类一般是 MapperFactoryBean，创建 DAO 层接口的实现类

  ```java
  public class EquipmentDaoImplFactoryBean implements FactoryBean {
      @Override	//获取Bean
      public Object getObject() throws Exception {
          return new EquipmentDaoImpl();
      }
      
      @Override	//获取bean的类型
      public Class<?> getObjectType() {
          return null;
      }
      
      @Override	//是否单例
      public boolean isSingleton() {
          return false;
      }
  }
  ```

* MapperFactoryBean 继承 SqlSessionDaoSupport，可以获取 SqlSessionTemplate，完成 MyBatis 的整合

  ```java
  public abstract class SqlSessionDaoSupport extends DaoSupport {
    	private SqlSessionTemplate sqlSessionTemplate;
  	// 获取 SqlSessionTemplate 对象
  	public void setSqlSessionFactory(SqlSessionFactory sqlSessionFactory) {
      	if (this.sqlSessionTemplate == null || 
          	sqlSessionFactory != this.sqlSessionTemplate.getSqlSessionFactory()) {
        		this.sqlSessionTemplate = createSqlSessionTemplate(sqlSessionFactory);
      	}
    	}
  }
  ```






***



#### 过滤器

##### 数据准备

* DAO 层 UserDao、AccountDao、BookDao、EquipmentDao

  ```java
  public interface UserDao {
  	public void save();
  }
  ```

  ```java
  @Component("userDao")
  public class UserDaoImpl implements UserDao {
      public void save() {
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
  @Service("userService")
  public class UserServiceImpl implements UserService {
      @Autowired
      private UserDao userDao;//...........BookDao等
  
      public void save() {
          System.out.println("user service running...");
          userDao.save();
      }
  }
  ```
  



***



##### 过滤器

名称：TypeFilter

类型：**接口**

作用：自定义类型过滤器

示例：

* config / filter / MyTypeFilter

  ```java
  public class MyTypeFilter implements TypeFilter {
      @Override
      /**
      * metadataReader:读取到的当前正在扫描的类的信息
      * metadataReaderFactory:可以获取到任何其他类的信息
      */
      //加载的类满足要求，匹配成功
      public boolean match(MetadataReader metadataReader, MetadataReaderFactory metadataReaderFactory) throws IOException {
          //获取当前类注解的信息
  		AnnotationMetadata am = metadataReader.getAnnotationMetadata();
  		//获取当前正在扫描的类的类信息
  		ClassMetadata classMetadata = metadataReader.getClassMetadata();
  		//获取当前类资源（类的路径）
  		Resource resource = metadataReader.getResource();
          
          
          //通过类的元数据获取类的名称
          String className = classMetadata.getClassName();
          //如果加载的类名满足过滤器要求，返回匹配成功
          if(className.equals("service.impl.UserServiceImpl")){
         	//返回true表示匹配成功，返回false表示匹配失败。此处仅确认匹配结果，不会确认是排除还是加入，排除/加入由配置项决定，与此处无关
              return true;
          }
          return false;
      }
  }
  ```

* SpringConfig

  ```java
  @Configuration
  //设置排除bean，排除的规则是自定义规则（FilterType.CUSTOM），具体的规则定义为MyTypeFilter
  @ComponentScan(
          value = {"dao","service"},
          excludeFilters = @ComponentScan.Filter(
                  type= FilterType.CUSTOM,
                  classes = MyTypeFilter.class
          )
  )
  public class SpringConfig {
  }
  ```




***



#### 导入器

bean 只有通过配置才可以进入 Spring 容器，被 Spring 加载并控制

- 配置 bean 的方式如下：

  - XML 文件中使用 <bean/> 标签配置
  - 使用 @Component 及衍生注解配置

导入器可以快速高效导入大量 bean，替代 @Import({a.class,b.class})，无需在每个类上添加 @Bean

名称： ImportSelector

类型：**接口**

作用：自定义bean导入器

* selector / MyImportSelector

  ```java
  public class MyImportSelector implements ImportSelector{
      @Override
      public String[] selectImports(AnnotationMetadata importingClassMetadata) {
  //      1.编程形式加载一个类
  //      return new String[]{"dao.impl.BookDaoImpl"};
  
  //      2.加载import.properties文件中的单个类名
  //      ResourceBundle bundle = ResourceBundle.getBundle("import");
  //      String className = bundle.getString("className");
  
  //      3.加载import.properties文件中的多个类名
          ResourceBundle bundle = ResourceBundle.getBundle("import");
          String className = bundle.getString("className");
          return className.split(",");
      }
  }
  ```

* import.properties

  ```properties
  #2.加载import.properties文件中的单个类名
  #className=dao.impl.BookDaoImpl
  
  #3.加载import.properties文件中的多个类名
  #className=dao.impl.BookDaoImpl,dao.impl.AccountDaoImpl
  
  #4.导入包中的所有类
  path=dao.impl.*
  ```

* SpringConfig

  ```java
  @Configuration
  @ComponentScan({"dao","service"})
  @Import(MyImportSelector.class)
  public class SpringConfig {
  }
  ```



***



#### 注册器

可以取代 ComponentScan 扫描器

名称：ImportBeanDefinitionRegistrar

类型：**接口**

作用：自定义 bean 定义注册器

* registrar / MyImportBeanDefinitionRegistrar

  ```java
  public class MyImportBeanDefinitionRegistrar implements ImportBeanDefinitionRegistrar {
  /**
   * AnnotationMetadata:当前类的注解信息
   * BeanDefinitionRegistry:BeanDefinition注册类，把所有需要添加到容器中的bean调用registerBeanDefinition手工注册进来
   */
      @Override
      public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
          //自定义注册器
          //1.开启类路径bean定义扫描器，需要参数bean定义注册器BeanDefinitionRegistry，需要制定是否使用默认类型过滤器
          ClassPathBeanDefinitionScanner scanner = new ClassPathBeanDefinitionScanner(registry,false);
          //2.添加包含性加载类型过滤器（可选，也可以设置为排除性加载类型过滤器）
          scanner.addIncludeFilter(new TypeFilter() {
              @Override
              public boolean match(MetadataReader metadataReader, MetadataReaderFactory metadataReaderFactory) throws IOException {
                  //所有匹配全部成功，此处应该添加实际的业务判定条件
                  return true;
              }
          });
          //设置扫描路径
          scanner.addExcludeFilter(tf);//排除
          scanner.scan("dao","service");
      }
  }
  ```

* SpringConfig

  ```java
  @Configuration
  @Import(MyImportBeanDefinitionRegistrar.class)
  public class SpringConfig {
  }
  ```

  



***



#### 处理器

通过创建类**继承相应的处理器的接口**，重写后置处理的方法，来实现**拦截 Bean 的生命周期**来实现自己自定义的逻辑

BeanPostProcessor：bean 后置处理器，bean 创建对象初始化前后进行拦截工作的

BeanFactoryPostProcessor：beanFactory 的后置处理器

 * 		加载时机：在 BeanFactory 初始化之后调用，来定制和修改 BeanFactory 的内容；所有的 bean 定义已经保存加载到 beanFactory，但是 bean 的实例还未创建

* 		执行流程：
    * ioc 容器创建对象
    * invokeBeanFactoryPostProcessors(beanFactory)：执行 BeanFactoryPostProcessor
      * 在 BeanFactory 中找到所有类型是 BeanFactoryPostProcessor 的组件，并执行它们的方法
      * 在初始化创建其他组件前面执行

BeanDefinitionRegistryPostProcessor：

* 加载时机：在所有 bean 定义信息将要被加载，但是 bean 实例还未创建，优先于 BeanFactoryPostProcessor 执行；利用 BeanDefinitionRegistryPostProcessor 给容器中再额外添加一些组件

* 执行流程：
  * ioc 容器创建对象
  * refresh() → invokeBeanFactoryPostProcessors(beanFactory)
  * 从容器中获取到所有的 BeanDefinitionRegistryPostProcessor 组件
    * 依次触发所有的 postProcessBeanDefinitionRegistry() 方法
    * 再来触发 postProcessBeanFactory() 方法



*****



#### 监听器

##### 基本概述

ApplicationListener：监听容器中发布的事件，完成事件驱动模型开发

```java
public interface ApplicationListener<E extends ApplicationEvent>
```

所以监听 ApplicationEvent 及其下面的子事件

应用监听器步骤：

 * 	  写一个监听器（ApplicationListener实现类）来监听某个事件（ApplicationEvent及其子类）
 * 	  把监听器加入到容器 @Component
 * 	  只要容器中有相关事件的发布，就能监听到这个事件；
       * 	  ContextRefreshedEvent：容器刷新完成（所有 bean 都完全创建）会发布这个事件
       * 	  ContextClosedEvent：关闭容器会发布这个事件
 * 	  发布一个事件：`applicationContext.publishEvent()`

```java
@Component
public class MyApplicationListener implements ApplicationListener<ApplicationEvent> {
	//当容器中发布此事件以后，方法触发
	@Override
	public void onApplicationEvent(ApplicationEvent event) {
		System.out.println("收到事件：" + event);
	}
}
```



****



##### 实现原理

ContextRefreshedEvent 事件：

- 容器初始化过程中执行 `initApplicationEventMulticaster()`：初始化事件多播器

  - 先去容器中查询 `id = applicationEventMulticaster` 的组件，有直接返回
  - 没有就执行 `this.applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory)` 并且加入到容器中
  - 以后在其他组件要派发事件，自动注入这个 applicationEventMulticaster

- 容器初始化过程执行 **registerListeners()** 注册监听器

  - 从容器中获取所有监听器：`getBeanNamesForType(ApplicationListener.class, true, false)`
  - 将 listener 注册到 ApplicationEventMulticaster

- 容器刷新完成：finishRefresh() → publishEvent(new ContextRefreshedEvent(this))

  发布 ContextRefreshedEvent 事件：

  - 获取事件的多播器（派发器）：getApplicationEventMulticaster()
  - multicastEvent 派发事件
    - 获取到所有的 ApplicationListener
    - 遍历 ApplicationListener
      - 如果有 Executor，可以使用 Executor 异步派发 `Executor executor = getTaskExecutor()`
      - 没有就同步执行 listener 方法 `invokeListener(listener, event)`，拿到 listener 回调 onApplicationEvent

容器关闭会发布 ContextClosedEvent



***



##### 注解实现

注解：@EventListener

基本使用：

```java
@Service
public class UserService{
    @EventListener(classes={ApplicationEvent.class})
	public void listen(ApplicationEvent event){
		System.out.println("UserService。。监听到的事件：" + event);
	}
}
```

原理：使用 EventListenerMethodProcessor 处理器来解析方法上的 @EventListener，Spring 扫描使用注解的方法，并为之创建一个监听对象

SmartInitializingSingleton 原理：afterSingletonsInstantiated()

 *   		IOC 容器创建对象并 refresh()
 *   		finishBeanFactoryInitialization(beanFactory)：初始化剩下的单实例 bean
        * 先创建所有的单实例 bean：getBean()
        * 获取所有创建好的单实例 bean，判断是否是 SmartInitializingSingleton 类型的，如果是就调用 afterSingletonsInstantiated()





***

## AOP

### 基本概述

AOP（Aspect Oriented Programing）：面向切面编程，一种编程**范式**，指导开发者如何组织程序结构

AOP 弥补了 OOP 的不足，基于 OOP 基础之上进行横向开发：

- uOOP 规定程序开发以类为主体模型，一切围绕对象进行，完成某个任务先构建模型

- uAOP 程序开发主要关注基于 OOP 开发中的共性功能，一切围绕共性功能进行，完成某个任务先构建可能遇到的所有共性功能（当所有功能都开发出来也就没有共性与非共性之分），将软件开发由手工制作走向半自动化/全自动化阶段，实现“插拔式组件体系结构”搭建

AOP 作用：

* 提高代码的可重用性
* 业务代码编码更简洁

* 业务代码维护更高效

* 业务功能扩展更便捷



***
