---
title: "IOC"
date: 2023-09-26
planet: system
tags: ["Java", "基础", IOC, system]
summary: "Spring IOC 容器是 ApplicationContext 或者 BeanFactory，使用多个 Map 集合保存单实例 Bean，环境信息等资源，不同层级有不同的容器，比如整合 SpringMVC 的父子容器（先看 Bean 部"
private: false
---

### IOC

#### 容器启动

Spring IOC 容器是 ApplicationContext 或者 BeanFactory，使用多个 Map 集合保存单实例 Bean，环境信息等资源，不同层级有不同的容器，比如整合 SpringMVC 的父子容器（先看 Bean 部分的源码解析再回看容器）

ClassPathXmlApplicationContext 与 AnnotationConfigApplicationContext 差不多：

```java
public AnnotationConfigApplicationContext(Class<?>... annotatedClasses) {
    this();
    register(annotatedClasses);// 解析配置类，封装成一个 BeanDefinitionHolder，并注册到容器
    refresh();// 加载刷新容器中的 Bean
}
```

```java
public AnnotationConfigApplicationContext() {
    // 注册 Spring 的注解解析器到容器
    this.reader = new AnnotatedBeanDefinitionReader(this);
    // 实例化路径扫描器，用于对指定的包目录进行扫描查找 bean 对象
    this.scanner = new ClassPathBeanDefinitionScanner(this);
}
```

AbstractApplicationContext.refresh()：

* prepareRefresh()：刷新前的**预处理**

  * `this.startupDate = System.currentTimeMillis()`：设置容器的启动时间
  * `initPropertySources()`：初始化一些属性设置，可以自定义个性化的属性设置方法
  * `getEnvironment().validateRequiredProperties()`：检查环境变量
  * `earlyApplicationEvents= new LinkedHashSet<ApplicationEvent>()`：保存容器中早期的事件

* obtainFreshBeanFactory()：获取一个**全新的 BeanFactory 接口实例**，如果容器中存在工厂实例直接销毁
  
  `refreshBeanFactory()`：创建 BeanFactory，设置序列化 ID、读取 BeanDefinition 并加载到工厂
  
  * `if (hasBeanFactory())`：applicationContext 内部拥有一个 beanFactory 实例，需要将该实例完全释放销毁
  * `destroyBeans()`：销毁原 beanFactory 实例，将 beanFactory 内部维护的单实例 bean 全部清掉，如果哪个 bean 实现了 Disposablejie接口，还会进行 bean distroy 方法的调用处理
    * `this.singletonsCurrentlyInDestruction = true`：设置当前 beanFactory 状态为销毁状态
    * `String[] disposableBeanNames`：获取销毁集合中的 bean，如果当前 bean 有**析构函数**就会在销毁集合
    * `destroySingleton(disposableBeanNames[i])`：遍历所有的 disposableBeans，执行销毁方法
      * `removeSingleton(beanName)`：清除三级缓存和 registeredSingletons 中的当前 beanName 的数据
      * `this.disposableBeans.remove(beanName)`：从销毁集合中清除，每个 bean 只能 destroy 一次
      * `destroyBean(beanName, disposableBean)`：销毁 bean
        * dependentBeanMap 记录了依赖当前 bean 的其他 bean 信息，因为依赖的对象要被回收了，所以依赖当前 bean 的其他对象都要执行 destroySingleton，遍历 dependentBeanMap 执行销毁
        * `bean.destroy()`：解决完成依赖后，执行 DisposableBean 的 destroy 方法
        * ` this.dependenciesForBeanMap.remove(beanName)`：保存当前 bean 依赖了谁，直接清除
    * 进行一些集合和缓存的清理工作
  * `closeBeanFactory()`：将容器内部的 beanFactory 设置为空，重新创建
  * `beanFactory = createBeanFactory()`：创建新的 DefaultListableBeanFactory 对象
  * `beanFactory.setSerializationId(getId())`：进行 ID 的设置，可以根据 ID 获取 BeanFactory 对象
  * `customizeBeanFactory(beanFactory)`：设置是否允许覆盖和循环引用
  * `loadBeanDefinitions(beanFactory)`：**加载 BeanDefinition 信息，注册 BD注册到 BeanFactory 中**
  * `this.beanFactory = beanFactory`：把 beanFactory 填充至容器中
  
  `getBeanFactory()`：返回创建的 DefaultListableBeanFactory 对象，该对象继承 BeanDefinitionRegistry
  
* prepareBeanFactory(beanFactory)：**BeanFactory 的预准备**工作，向容器中添加一些组件

  * `setBeanClassLoader(getClassLoader())`：给当前 bf 设置一个**类加载器**，加载 bd 的 class 信息
  * `setBeanExpressionResolver()`：设置 EL 表达式解析器
  * `addPropertyEditorRegistrar`：添加一个属性编辑器，解决属性注入时的格式转换
  * `addBeanPostProcessor()`：添加后处理器，主要用于向 bean 内部注入一些框架级别的实例
  * `ignoreDependencyInterface()`：设置忽略自动装配的接口，bean 内部的这些类型的字段   不参与依赖注入
  * `registerResolvableDependency()`：注册一些类型依赖关系
  * `addBeanPostProcessor()`：将配置的监听者注册到容器中，当前 bean 实现 ApplicationListener 接口就是监听器事件
  * `beanFactory.registerSingleton()`：添加一些系统信息

* postProcessBeanFactory(beanFactory)：BeanFactory 准备工作完成后进行的后置处理工作，扩展方法

* invokeBeanFactoryPostProcessors(beanFactory)：**执行 BeanFactoryPostProcessor 的方法**

  * `processedBeans = new HashSet<>()`：存储已经执行过的 BeanFactoryPostProcessor 的 beanName

  * `if (beanFactory instanceof BeanDefinitionRegistry)`：**当前 BeanFactory 是 bd 的注册中心，bd 全部注册到 bf**

  * `for (BeanFactoryPostProcessor postProcessor : beanFactoryPostProcessors)`：遍历所有的 bf 后置处理器

  * `if (postProcessor instanceof BeanDefinitionRegistryPostProcessor)`：是 Registry 类的后置处理器

    `registryProcessor.postProcessBeanDefinitionRegistry(registry)`：向 bf 中注册一些 bd

    `registryProcessors.add(registryProcessor)`：添加到 BeanDefinitionRegistryPostProcessor 集合

  * `regularPostProcessors.add(postProcessor)`：添加到 BeanFactoryPostProcessor 集合

  * 逻辑到这里已经获取到所有 BeanDefinitionRegistryPostProcessor 和 BeanFactoryPostProcessor  接口类型的后置处理器

  * **首先回调 BeanDefinitionRegistryPostProcessor 类的后置处理方法 postProcessBeanDefinitionRegistry()**

    * 获取实现了 PriorityOrdered（主排序接口）接口的 bdrpp，进行 sort 排序，然后全部执行并放入已经处理过的集合
    * 再执行实现了 Ordered（次排序接口）接口的 bdrpp
    
    * 最后执行没有实现任何优先级或者是顺序接口 bdrpp，`boolean reiterate = true` 控制 while 是否需要再次循环，循环内是查找并执行 bdrpp 后处理器的 registry 相关的接口方法，接口方法执行以后会向 bf 内注册 bd，注册的 bd 也有可能是 bdrpp 类型，所以需要该变量控制循环
    * `processedBeans.add(ppName)`：已经执行过的后置处理器存储到该集合中，防止重复执行
    * ` invokeBeanFactoryPostProcessors()`：bdrpp 继承了 BeanFactoryPostProcessor，有 postProcessBeanFactory 方法
    
  * **执行普通 BeanFactoryPostProcessor 的相关 postProcessBeanFactory 方法，按照主次无次序执行**
  
    * `if (processedBeans.contains(ppName))`：会过滤掉已经执行过的后置处理器
  
  * `beanFactory.clearMetadataCache()`：清除缓存中合并的 Bean 定义，因为后置处理器可能更改了元数据

**以上是 BeanFactory 的创建及预准备工作，接下来进入 Bean 的流程**

* registerBeanPostProcessors(beanFactory)：**注册 Bean 的后置处理器**，为了干预 Spring 初始化 bean 的流程，这里仅仅是向容器中**注入而非使用**

  * `beanFactory.getBeanNamesForType(BeanPostProcessor.class)`：**获取配置中实现了 BeanPostProcessor 接口类型**

  * `int beanProcessorTargetCount`：后置处理器的数量，已经注册的 + 未注册的 + 即将要添加的一个

  * `beanFactory.addBeanPostProcessor(new BeanPostProcessorChecker())`：添加一个检查器

    `BeanPostProcessorChecker.postProcessAfterInitialization()`：初始化后的后处理器方法

    * `!(bean instanceof BeanPostProcessor) `：当前 bean 类型是普通 bean，不是后置处理器
    * `!isInfrastructureBean(beanName)`：成立说明当前 beanName 是用户级别的 bean  不是 Spring 框架的
    * `this.beanFactory.getBeanPostProcessorCount() < this.beanPostProcessorTargetCount`：BeanFactory 上面注册后处理器数量 < 后处理器数量，说明后处理框架尚未初始化完成

  * `for (String ppName : postProcessorNames)`：遍历 PostProcessor 集合，**根据实现不同的顺序接口添加到不同集合**

  * `sortPostProcessors(priorityOrderedPostProcessors, beanFactory)`：实现 PriorityOrdered 接口的后处理器排序

    `registerBeanPostProcessors(beanFactory, priorityOrderedPostProcessors)`：**注册到 beanFactory 中**

  * 接着排序注册实现 Ordered 接口的后置处理器，然后注册普通的（ 没有实现任何优先级接口）后置处理器

  * 最后排序 MergedBeanDefinitionPostProcessor 类型的处理器，根据实现的排序接口，排序完注册到 beanFactory 中

  * `beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(applicationContext))`：重新注册 ApplicationListenerDetector 后处理器，用于在 Bean 创建完成后检查是否属于 ApplicationListener 类型，如果是就把 Bean 放到**监听器容器**中保存起来

* initMessageSource()：初始化 MessageSource 组件，主要用于做国际化功能，消息绑定与消息解析

  * `if (beanFactory.containsLocalBean(MESSAGE_SOURCE_BEAN_NAME))`：容器是否含有名称为 messageSource 的 bean
  * `beanFactory.getBean(MESSAGE_SOURCE_BEAN_NAME, MessageSource.class)`：如果有证明用户自定义了该类型的 bean，获取后直接赋值给 this.messageSource
  * `dms = new DelegatingMessageSource()`：容器中没有就新建一个赋值

* initApplicationEventMulticaster()：**初始化事件传播器**，在注册监听器时会用到

  * `if (beanFactory.containsLocalBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME))`：**条件成立说明用户自定义了事件传播器**，可以实现 ApplicationEventMulticaster 接口编写自己的事件传播器，通过 bean 的方式提供给 Spring
  * 如果有就直接从容器中获取；如果没有则创建一个 SimpleApplicationEventMulticaster 注册

* onRefresh()：留给用户去实现，可以硬编码提供一些组件，比如提供一些监听器

* registerListeners()：注册通过配置提供的 Listener，这些**监听器**最终注册到 ApplicationEventMulticaster 内

  * `for (ApplicationListener<?> listener : getApplicationListeners()) `：注册编码实现的监听器

  * `getBeanNamesForType(ApplicationListener.class, true, false)`：注册通过配置提供的 Listener

  * `multicastEvent(earlyEvent)`：**发布前面步骤产生的事件 applicationEvents**

    `Executor executor = getTaskExecutor()`：获取线程池，有线程池就异步执行，没有就同步执行

* finishBeanFactoryInitialization()：**实例化非懒加载状态的单实例**

  * `beanFactory.freezeConfiguration()`：**冻结配置信息**，就是冻结 BD 信息，冻结后无法再向 bf 内注册 bd

  * `beanFactory.preInstantiateSingletons()`：实例化 non-lazy-init singletons

    * `for (String beanName : beanNames)`：遍历容器内所有的 beanDefinitionNames

    * `getMergedLocalBeanDefinition(beanName)`：获取与父类合并后的对象（Bean → 获取流程部分详解此函数）

    * `if (!bd.isAbstract() && bd.isSingleton() && !bd.isLazyInit())`：BD 对应的 Class 满足非抽象、单实例，非懒加载，需要预先实例化

      `if (isFactoryBean(beanName))`：BD 对应的 Class 是 factoryBean 对象

      * `getBean(FACTORY_BEAN_PREFIX + beanName)`：获取工厂 FactoryBean 实例本身
      * `isEagerInit`：控制 FactoryBean 内部管理的 Bean 是否也初始化
      * `getBean(beanName)`：**初始化 Bean，获取 Bean 详解此函数**

      `getBean(beanName)`：不是工厂 bean 直接获取

    * `for (String beanName : beanNames)`：检查所有的 Bean 是否实现 SmartInitializingSingleton 接口，实现了就执行 afterSingletonsInstantiated()，进行一些创建后的操作

* `finishRefresh()`：完成刷新后做的一些事情，主要是启动生命周期

  * `clearResourceCaches()`：清空上下文缓存
  * `initLifecycleProcessor()`：**初始化和生命周期有关的后置处理器**，容器的生命周期
    * `if (beanFactory.containsLocalBean(LIFECYCLE_PROCESSOR_BEAN_NAME))`：成立说明自定义了生命周期处理器
    * `defaultProcessor = new DefaultLifecycleProcessor()`：Spring 默认提供的生命周期处理器
    * ` beanFactory.registerSingleton()`：将生命周期处理器注册到 bf 的一级缓存和注册单例集合中
  * `getLifecycleProcessor().onRefresh()`：获取该**生命周期后置处理器回调 onRefresh()**，调用 `startBeans(true)`
    * `lifecycleBeans = getLifecycleBeans()`：获取到所有实现了 Lifecycle 接口的对象包装到 Map 内，key 是beanName， value 是 Lifecycle 对象
    * `int phase = getPhase(bean)`：获取当前 Lifecycle 的 phase 值，当前生命周期对象可能依赖其他生命周期对象的执行结果，所以需要 phase 决定执行顺序，数值越低的优先执行
    * `LifecycleGroup group = phases.get(phase)`：把 phsae 相同的 Lifecycle 存入 LifecycleGroup
    * `if (group == null)`：group 为空则创建，初始情况下是空的
    * `group.add(beanName, bean)`：将当前 Lifecycle 添加到当前 phase 值一样的 group 内
    * `Collections.sort(keys)`：**从小到大排序，按优先级启动**
    * `phases.get(key).start()`：遍历所有的 Lifecycle 对象开始启动
    * `doStart(this.lifecycleBeans, member.name, this.autoStartupOnly)`：底层调用该方法启动
      * `bean = lifecycleBeans.remove(beanName)`： 确保 Lifecycle 只被启动一次，在一个分组内被启动了在其他分组内就看不到 Lifecycle 了
      * `dependenciesForBean = getBeanFactory().getDependenciesForBean(beanName)`：获取当前即将被启动的 Lifecycle 所依赖的其他 beanName，需要**先启动所依赖的 bean**，才能启动自身
      * `if ()`：传入的参数 autoStartupOnly 为 true 表示启动 isAutoStartUp 为 true 的 SmartLifecycle 对象，不会启动普通的生命周期的对象；false 代表全部启动
      * bean.start()：**调用启动方法**
  * `publishEvent(new ContextRefreshedEvent(this))`：**发布容器刷新完成事件**
  * `liveBeansView.registerApplicationContext(this)`：暴露 Mbean

补充生命周期 stop() 方法的调用

* DefaultLifecycleProcessor.stop()：调用 DefaultLifecycleProcessor.stopBeans()

  * 获取到所有实现了 Lifecycle 接口的对象并按 phase 数值分组的

  * `keys.sort(Collections.reverseOrder())`：按 phase 降序排序 Lifecycle 接口，最先启动的最晚关闭（责任链？）

  * `phases.get(key).stop()`：遍历所有的 Lifecycle 对象开始停止

    * `latch = new CountDownLatch(this.smartMemberCount)`：创建 CountDownLatch，设置 latch 内部的值为当前分组内的  smartMemberCount 的数量

    * `countDownBeanNames = Collections.synchronizedSet(new LinkedHashSet<>())`：保存当前正在处理关闭的smartLifecycle 的 BeanName

    * `for (LifecycleGroupMember member : this.members)`：处理本分组内需要关闭的 Lifecycle

      `doStop(this.lifecycleBeans, member.name, latch, countDownBeanNames)`：真正的停止方法

      * `getBeanFactory().getDependentBeans(beanName)`：**获取依赖当前 Lifecycle 的其他对象的 beanName**，因为当前的 Lifecycle 即将要关闭了，所有的依赖了当前 Lifecycle 的 bean 也要关闭
      * `countDownBeanNames.add(beanName)`：将当前 SmartLifecycle beanName 添加到 countDownBeanNames 集合内，该集合表示正在关闭的 SmartLifecycle

      * `bean.stop()`：调用停止的方法



***



#### 获取Bean

单实例：在容器启动时创建对象

多实例：在每次获取的时候创建对象

获取流程：**获取 Bean 时先从单例池获取，如果没有则进行第二次获取，并带上工厂类去创建并添加至单例池**

Java 启动 Spring 代码：

```java
ApplicationContext ctx = new ClassPathXmlApplicationContext("applicationContext.xml");
UserService userService = (UserService) context.getBean("userService");
```

AbstractBeanFactory.doGetBean()：获取 Bean，context.getBean() 追踪到此

* `beanName = transformedBeanName(name)`：name 可能是一个别名，重定向出来真实 beanName；也可能是一个 & 开头的 name，说明要获取的 bean 实例对象，是一个 FactoryBean 对象（IOC 原理 → 核心类）

  * `BeanFactoryUtils.transformedBeanName(name)`：判断是哪种 name，返回截取 & 以后的 name 并放入缓存
    * `transformedBeanNameCache.computeIfAbsent`：缓存是并发安全集合，key == null || value == null 时 put 成功 
    * do while 循环一直去除 & 直到不再含有 &
  * `canonicalName(name)`：aliasMap 保存别名信息，其中的 do while 逻辑是迭代查找，比如 A 别名叫做 B，但是 B 又有别名叫 C， aliasMap 为 {"C":"B", "B":"A"}，get(C) 最后返回的是  A

* `DefaultSingletonBeanRegistry.getSingleton()`：**第一次获取从缓存池获取**（循环依赖详解此代码）

  * 缓存中有数据进行 getObjectForBeanInstance() 获取可使用的 Bean（本节结束部分详解此函数）
  * 缓存中没有数据进行下面的逻辑进行创建

* `if(isPrototypeCurrentlyInCreation(beanName))`：检查 bean 是否在原型（Prototype）正在被创建的集合中，如果是就报错，说明产生了循环依赖，**原型模式解决不了循环依赖**

  原因：先加载 A，把 A 加入集合，A 依赖 B 去加载 B，B 又依赖 A，去加载 A，发现 A 在正在创建集合中，产生循环依赖

* `markBeanAsCreated(beanName)`：把 bean 标记为已经创建，**防止其他线程重新创建 Bean**

* `mbd = getMergedLocalBeanDefinition(beanName)`：**获取合并父 BD 后的 BD 对象**，BD 是直接继承的，合并后的 BD 信息是包含父类的 BD 信息

  * `this.mergedBeanDefinitions.get(beanName)`：从缓存中获取

  * `if(bd.getParentName()==null)`：beanName 对应 BD 没有父 BD 就不用处理继承，封装为 RootBeanDefinition 返回

  * `parentBeanName = transformedBeanName(bd.getParentName())`：处理父 BD 的 name 信息

  * `if(!beanName.equals(parentBeanName))`：一般情况父子 BD 的名称不同

    `pbd = getMergedBeanDefinition(parentBeanName)`：递归调用，最终返回父 BD 的父 BD 信息

  * `mbd = new RootBeanDefinition(pbd)`：按照父 BD 信息创建 RootBeanDefinition 对象

  * `mbd.overrideFrom(bd)`：**子 BD 信息覆盖 mbd**，因为是要以子 BD 为基准，不存在的才去父 BD 寻找（**类似 Java 继承**）

  * `this.mergedBeanDefinitions.put(beanName, mbd)`：放入缓存

* `checkMergedBeanDefinition()`：判断当前 BD 是否为**抽象 BD**，抽象 BD 不能创建实例，只能作为父 BD 被继承

* `mbd.getDependsOn()`：获取 bean 标签 depends-on

* `if(dependsOn != null)`：**遍历所有的依赖加载，解决不了循环依赖**

  `isDependent(beanName, dep)`：判断循环依赖，出现循环依赖问题报错

  * 两个 Map：`<bean name="A" depends-on="B" ...>`

    * dependentBeanMap：记录依赖了当前 beanName 的其他 beanName（谁依赖我，我记录谁）
    * dependenciesForBeanMap：记录当前 beanName 依赖的其它 beanName 
    * 以 B 为视角 dependentBeanMap {"B"：{"A"}}，以 A 为视角 dependenciesForBeanMap {"A" :{"B"}}

  * `canonicalName(beanName)`：处理 bean 的 name

  * `dependentBeans = this.dependentBeanMap.get(canonicalName)`：获取依赖了当前 bean 的 name

  * `if (dependentBeans.contains(dependentBeanName))`：依赖了当前 bean 的集合中是否有该 name，有就产生循环依赖

  * 进行递归处理所有的引用：假如 `<bean name="A" dp="B"> <bean name="B" dp="C"> <bean name="C" dp="A">`

    ```java
    dependentBeanMap={A:{C}, B:{A}, C:{B}} 
    // C 依赖 A     		判断谁依赖了C				递归判断				谁依赖了B
    isDependent(C, A)  → C#dependentBeans={B} → isDependent(B, A); → B#dependentBeans={A} //返回true
    ```

  `registerDependentBean(dep, beanName)`：把 bean 和依赖注册到两个 Map 中，注意参数的位置，被依赖的在前

  `getBean(dep)`：**先加载依赖的 Bean**，又进入 doGetBean() 的逻辑

* `if (mbd.isSingleton())`：**判断 bean 是否是单例的 bean**

  `getSingleton(String, ObjectFactory<?>)`：**第二次获取，传入一个工厂对象**，这个方法更倾向于创建实例并返回

  ```java
  sharedInstance = getSingleton(beanName, () -> {
      return createBean(beanName, mbd, args);//创建，跳转生命周期
      //lambda表达式，调用了ObjectFactory的getObject()方法，实际回调接口实现的是 createBean()方法进行创建对象
  });
  ```

  * `singletonObjects.get(beanName)`：从一级缓存检查是否已经被加载，单例模式复用已经创建的 bean

  * `this.singletonsCurrentlyInDestruction`：容器销毁时会设置这个属性为 true，这时就不能再创建 bean 实例了

  * `beforeSingletonCreation(beanName)`：检查构造注入的依赖，**构造参数注入产生的循环依赖无法解决**

    `!this.singletonsCurrentlyInCreation.add(beanName)`：将当前 beanName 放入到正在创建中单实例集合，放入成功说明没有产生循环依赖，失败则产生循环依赖，进入判断条件内的逻辑抛出异常

    原因：加载 A，向正在创建集合中添加了 {A}，根据 A 的构造方法实例化 A 对象，发现 A 的构造方法依赖 B，然后加载 B，B 构造方法的参数依赖于 A，又去加载 A 时来到当前方法，因为创建中集合已经存在 A，所以添加失败

  * `singletonObject = singletonFactory.getObject()`：**创建 bean**（生命周期部分详解）

  * **创建完成以后，Bean 已经初始化好，是一个完整的可使用的 Bean**

  * `afterSingletonCreation(beanName)`：从正在创建中的集合中移出

  * `addSingleton(beanName, singletonObject)`：**添加一级缓存单例池中，从二级三级缓存移除**

  `bean = getObjectForBeanInstance`：**单实例可能是普通单实例或者 FactoryBean**，如果是 FactoryBean 实例，需要判断 name 是带 & 还是不带 &，带 & 说明 getBean 获取 FactoryBean 对象，否则是获取 FactoryBean 内部管理的实例

  * 参数 name 是未处理 & 的 name，beanName 是处理过 & 和别名后的 name

  * `if(BeanFactoryUtils.isFactoryDereference(name))`：判断 doGetBean 中参数 name 前是否带 &，不是处理后的

  * `if(!(beanInstance instanceof FactoryBean) || BeanFactoryUtils.isFactoryDereference(name))`：Bean 是普通单实例或者是 FactoryBean 就可以直接返回，否则进入下面的获取 **FactoryBean 内部管理的实例**的逻辑

  * `getCachedObjectForFactoryBean(beanName)`：尝试到缓存获取，获取到直接返回，获取不到进行下面逻辑

  * `if (mbd == null && containsBeanDefinition(beanName))`：Spring 中有当前 beanName 的 BeanDefinition 信息

    `mbd = getMergedLocalBeanDefinition(beanName)`：获取合并后的 BeanDefinition

  * `mbd.isSynthetic()`：默认值是 false 表示这是一个用户对象，如果是 true 表示是系统对象

  * `object = getObjectFromFactoryBean(factory, beanName, !synthetic)`：从工厂内获取实例

    * `factory.isSingleton() && containsSingleton(beanName)`：工厂内部维护的对象是单实例并且一级缓存存在该 bean
    * 首先去缓存中获取，获取不到就**使用工厂获取**然后放入缓存，进行循环依赖判断

* `else if (mbd.isPrototype())`：**bean 是原型的 bean**

  `beforePrototypeCreation(beanName)`：当前线程正在创建的原型对象 beanName 存入 prototypesCurrentlyInCreation

  * `curVal = this.prototypesCurrentlyInCreation.get()`：获取当前线程的正在创建的原型类集合
  * `this.prototypesCurrentlyInCreation.set(beanName)`：集合为空就把当前 beanName 加入
  * `if (curVal instanceof String)`：已经有线程相关原型类创建了，把当前的创建的加进去

  `createBean(beanName, mbd, args)`：创建原型类对象，不需要三级缓存

  `afterPrototypeCreation(beanName)`：从正在创建中的集合中移除该 beanName， **与 beforePrototypeCreation逻辑相反**

* `convertIfNecessary()`：**依赖检查**，检查所需的类型是否与实际 bean 实例的类型匹配

* `return (T) bean`：返回创建完成的 bean




***



#### 生命周期

##### 四个阶段

Bean 的生命周期：实例化 instantiation，填充属性 populate，初始化 initialization，销毁 destruction

AbstractAutowireCapableBeanFactory.createBean()：进入 Bean 生命周期的流程

* `resolvedClass = resolveBeanClass(mbd, beanName)`：判断 mdb 中的 class 是否已经**加载到 JVM**，如果未加载则使用类加载器将 beanName 加载到 JVM中并返回 class 对象
* `if (resolvedClass != null && !mbd.hasBeanClass() && mbd.getBeanClassName() != null)`：条件成立封装 mbd 并把 resolveBeanClass 设置到 bd 中
  * 条件二：mbd 在 resolveBeanClass 之前是否有 class
  * 条件三：mbd 有 className
* `bean = resolveBeforeInstantiation(beanName, mbdToUse)`：实例化前的后置处理器返回一个代理实例对象（不是 AOP）
  * 自定义类继承 InstantiationAwareBeanPostProcessor，重写 postProcessBeforeInstantiation 方法，**方法逻辑为创建对象** 
  * 并配置文件 `<bean class="intefacePackage.MyInstantiationAwareBeanPostProcessor">` 导入为 bean
  * 条件成立，**短路操作**，直接 return bean

* `Object beanInstance = doCreateBean(beanName, mbdToUse, args)`：Do it

AbstractAutowireCapableBeanFactory.**doCreateBean**(beanName, RootBeanDefinition, Object[] args)：创建 Bean

* `BeanWrapper instanceWrapper = null`：**Spring 给所有创建的 Bean 实例包装成 BeanWrapper**，内部最核心的方法是获取实例，提供了一些额外的接口方法，比如属性访问器

* `instanceWrapper = this.factoryBeanInstanceCache.remove(beanName)`：单例对象尝试从缓存中获取，会移除缓存

* `createBeanInstance()`：**缓存中没有实例就进行创建实例**（逻辑复杂，下一小节详解）

* `if (!mbd.postProcessed)`：每个 bean 只进行一次该逻辑

  `applyMergedBeanDefinitionPostProcessors()`：**后置处理器，合并 bd 信息**，接下来要属性填充了

  `AutowiredAnnotationBeanPostProcessor.postProcessMergedBeanDefinition()`：**后置处理逻辑（@Autowired）**

  * `metadata = findAutowiringMetadata(beanName, beanType, null)`：提取当前 bean 整个继承体系内的 **@Autowired、@Value、@Inject** 信息，存入一个 InjectionMetadata 对象，保存着当前 bean 信息和要自动注入的字段信息

    ```java
    private final Class<?> targetClass;							//当前 bean 
    private final Collection<InjectedElement> injectedElements;	//要注入的信息集合
    ```
    
    * `metadata = buildAutowiringMetadata(clazz)`：查询当前 clazz 感兴趣的注解信息
    
      * `ReflectionUtils.doWithLocalFields()`：提取**字段**的注解的信息
    
        `findAutowiredAnnotation(field)`：代表感兴趣的注解就是那三种注解，获取这三种注解的元数据
    
      * `ReflectionUtils.doWithLocalMethods()`：提取**方法**的注解的信息
    
      * `do{} while (targetClass != null && targetClass != Object.class)`：循环从父类中解析，直到 Object 类
    
    * `this.injectionMetadataCache.put(cacheKey, metadata)`：存入缓存

  `mbd.postProcessed = true`：设置为 true，下次访问该逻辑不会再进入

* `earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences && isSingletonCurrentlyInCreation(beanName)`：单例、解决循环引用、是否在单例正在创建集合中

  ```java
  if (earlySingletonExposure) {
      // 【放入三级缓存一个工厂对象，用来获取提前引用】
      addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
      // lamda 表达式，用来获取提前引用，循环依赖部分详解该逻辑
  }
  ```




* ` populateBean(beanName, mbd, instanceWrapper)`：**属性填充，依赖注入，整体逻辑是先处理标签再处理注解，填充至 pvs 中，最后通过 apply 方法最后完成属性依赖注入到 BeanWrapper **

  * `if (!ibp.postProcessAfterInstantiation(bw.getWrappedInstance(), beanName))`：实例化后的后置处理器，默认返回 true，可以自定义类继承 InstantiationAwareBeanPostProcessor 修改后置处理方法的返回值为 false，使 continueWithPropertyPopulation 为 false，**会导致直接返回，不进行属性的注入**

  * `if (!continueWithPropertyPopulation)`：自定义方法返回值会造成该条件成立，逻辑为直接返回，**不进行依赖注入**

  * `PropertyValues pvs = (mbd.hasPropertyValues() ? mbd.getPropertyValues() : null)`：处理依赖注入逻辑开始

  * `mbd.getResolvedAutowireMode() == ?`：**根据 bean 标签配置的 autowire** 判断是 BY_NAME 或者 BY_TYPE

    `autowireByName(beanName, mbd, bw, newPvs)`：根据字段名称去获取依赖的 bean，还没注入，只是添加到 pvs

    * `propertyNames = unsatisfiedNonSimpleProperties(mbd, bw)`：bean 实例中有该字段和该字段的 setter 方法，但是在 bd 中没有 property 属性

      * 拿到配置的 property 信息和 bean 的所有字段信息

      * `pd.getWriteMethod() != null`：**当前字段是否有 set 方法，配置类注入的方式需要 set 方法**

        `!isExcludedFromDependencyCheck(pd)`：当前字段类型是否在忽略自动注入的列表中

        `!pvs.contains(pd.getName()`：当前字段不在 xml 或者其他方式的配置中，也就是 bd 中不存在对应的 property

        `!BeanUtils.isSimpleProperty(pd.getPropertyType()`：是否是基本数据类型和内置的几种数据类型，基本数据类型不允许自动注入

    * `if (containsBean(propertyName))`：BeanFactory 中存在当前 property 的 bean 实例，说明找到对应的依赖数据

    * `getBean(propertyName)`：**拿到 propertyName 对应的 bean 实例**

    * `pvs.add(propertyName, bean)`：填充到 pvs 中

    * `registerDependentBean(propertyName, beanName))`：添加到两个依赖 Map（dependsOn）中

    `autowireByType(beanName, mbd, bw, newPvs)`：根据字段类型去查找依赖的 bean

    * `desc = new AutowireByTypeDependencyDescriptor(methodParam, eager)`：依赖描述信息
    * `resolveDependency(desc, beanName, autowiredBeanNames, converter)`：根据描述信息，查找依赖对象，容器中没有对应的实例但是有对应的 BD，会调用 getBean(Type) 获取对象

    `pvs = newPvs`：newPvs 是处理了依赖数据后的 pvs，所以赋值给 pvs

  * `hasInstAwareBpps`：表示当前是否有 InstantiationAwareBeanPostProcessors 的后置处理器（Autowired）

  * `pvsToUse = ibp.postProcessProperties(pvs, bw.getWrappedInstance(), beanName)`：**@Autowired 注解的注入**，这个传入的 pvs 对象，最后原封不动的返回，不会添加东西

    * `findAutowiringMetadata()`：包装着当前 bd 需要注入的注解信息集合，**三种注解的元数据**，直接缓存获取

    * `InjectionMetadata.InjectedElement.inject()`：遍历注解信息解析后注入到 Bean，方法和字段的注入实现不同

      以字段注入为例：

      * `value = resolveFieldValue(field, bean, beanName)`：处理字段属性值

        `value = beanFactory.resolveDependency()`：解决依赖

        `result = doResolveDependency()`：**真正处理自动注入依赖的逻辑**

        * `Object shortcut = descriptor.resolveShortcut(this)`：默认返回 null

        * `Object value = getAutowireCandidateResolver().getSuggestedValue(descriptor)`：**获取 @Value 的值**

        * `converter.convertIfNecessary(value, type, descriptor.getTypeDescriptor())`：如果 value 不是 null，就直接进行类型转换返回数据

        * `matchingBeans = findAutowireCandidates(beanName, type, descriptor)`：如果 value 是空说明字段是引用类型，**获取 @Autowired 的 Bean**

          ```java
          // addCandidateEntry() → Object beanInstance = descriptor.resolveCandidate()
          public Object resolveCandidate(String beanName, Class<?> requiredType, BeanFactory beanFactory) throws BeansException {
          	// 获取 bean
              return beanFactory.getBean(beanName);
          }
          ```

      * `ReflectionUtils.makeAccessible(field)`：修改访问权限
      * `field.set(bean, value)`：获取属性访问器为此 field 对象赋值

  * `applyPropertyValues()`：**将所有解析的 PropertyValues 的注入至 BeanWrapper 实例中**（深拷贝）

    * `if (pvs.isEmpty())`：注解 @Autowired 和 @Value 标注的信息在后置处理的逻辑注入完成，此处为空直接返回
    * 下面的逻辑进行 XML 配置的属性的注入，首先获取转换器进行数据转换，然后**获取 WriteMethod (set) 方法进行反射调用**，完成属性的注入



* `initializeBean(String,Object,RootBeanDefinition)`：**初始化，分为配置文件和实现接口两种方式**

  * `invokeAwareMethods(beanName, bean)`：根据 bean 是否实现 Aware 接口执行初始化的方法

  * `wrappedBean = applyBeanPostProcessorsBeforeInitialization`：初始化前的后置处理器，可以继承接口重写方法

    * `processor.postProcessBeforeInitialization()`：执行后置处理的方法，默认返回 bean 本身
    * `if (current == null) return result`：重写方法返回 null，会造成后置处理的短路，直接返回

  * `invokeInitMethods(beanName, wrappedBean, mbd)`：**反射执行初始化方法**

    * `isInitializingBean = (bean instanceof InitializingBean)`：初始化方法的定义有两种方式，一种是自定义类实现 InitializingBean 接口，另一种是配置文件配置 <bean id="..." class="..." init-method="init"/ >

    * `isInitializingBean && (mbd == null || !mbd.isExternallyManagedInitMethod("afterPropertiesSet"))`：

      * 条件一：当前 bean 是不是实现了 InitializingBean 

      * 条件二：InitializingBean 接口中的方法 afterPropertiesSet，判断该方法是否是容器外管理的方法

    * `if (mbd != null && bean.getClass() != NullBean.class)`：成立说明是配置文件的方式

      `if(!(接口条件))`表示**如果通过接口实现了初始化方法的话，就不会在调用配置类中 init-method 定义的方法**

      `((InitializingBean) bean).afterPropertiesSet()`：调用方法

      `invokeCustomInitMethod`：执行自定义的方法
      
      * `initMethodName = mbd.getInitMethodName()`：获取方法名
      * `Method initMethod = ()`：根据方法名获取到 init-method 方法
      * ` methodToInvoke = ClassUtils.getInterfaceMethodIfPossible(initMethod)`：将方法转成从接口层面获取
      * `ReflectionUtils.makeAccessible(methodToInvoke)`：访问权限设置成可访问
      * ` methodToInvoke.invoke(bean)`：**反射调用初始化方法**，以当前 bean 为角度去调用

  * `wrappedBean = applyBeanPostProcessorsAfterInitialization`：初始化后的后置处理器

    * `AbstractAutoProxyCreator.postProcessAfterInitialization()`：如果 Bean 被子类标识为要代理的 bean，则使用配置的拦截器**创建代理对象**，AOP 部分详解

    * 如果不存在循环依赖，创建动态代理 bean 在此处完成；否则真正的创建阶段是在属性填充时获取提前引用的阶段，**循环依赖**详解，源码分析：

      ```java
      // 该集合用来避免重复将某个 bean 生成代理对象，
      private final Map<Object, Object> earlyProxyReferences = new ConcurrentHashMap<>(16);
      
      public Object postProcessAfterInitialization(@Nullable Object bean,String bN){
          if (bean != null) {
              // cacheKey 是 beanName 或者加上 &
              Object cacheKey = getCacheKey(bean.getClass(), beanName);y
                  if (this.earlyProxyReferences.remove(cacheKey) != bean) {
                      // 去提前代理引用池中寻找该key，不存在则创建代理
                      // 如果存在则证明被代理过，则判断是否是当前的 bean，不是则创建代理
                      return wrapIfNecessary(bean, bN, cacheKey);
                  }
          }
          return bean;
      }
      ```




* `if (earlySingletonExposure)`：是否允许提前引用

  `earlySingletonReference = getSingleton(beanName, false)`：**从二级缓存获取实例**，放入一级缓存是在 doGetBean 中的sharedInstance = getSingleton() 逻辑中，此时在 createBean 的逻辑还没有返回，所以一级缓存没有

  `if (earlySingletonReference != null)`：当前 bean 实例从二级缓存中获取到了，说明**产生了循环依赖**，在属性填充阶段会提前调用三级缓存中的工厂生成 Bean 的代理对象（或原始实例），放入二级缓存中，然后使用原始 bean 继续执行初始化

  * ` if (exposedObject == bean)`：**初始化后的 bean == 创建的原始实例**，条件成立的两种情况：当前的真实实例不需要被代理；当前实例存在循环依赖已经被提前代理过了，初始化时的后置处理器直接返回 bean 原实例

    `exposedObject = earlySingletonReference`：**把代理后的 Bean 传给 exposedObject 用来返回，因为只有代理对象才封装了拦截器链，main 方法中用代理对象调用方法时会进行增强，代理是对原始对象的包装，所以这里返回的代理对象中含有完整的原实例（属性填充和初始化后的），是一个完整的代理对象，返回后外层方法会将当前 Bean 放入一级缓存**

  * `else if (!this.allowRawInjectionDespiteWrapping && hasDependentBean(beanName))`：是否有其他 bean 依赖当前 bean，执行到这里说明是不存在循环依赖、存在增强代理的逻辑，也就是正常的逻辑

    * `dependentBeans = getDependentBeans(beanName)`：取到依赖当前 bean 的其他 beanName

    * `if (!removeSingletonIfCreatedForTypeCheckOnly(dependentBean))`：判断 dependentBean 是否创建完成

      * `if (!this.alreadyCreated.contains(beanName))`：成立当前 bean 尚未创建完成，当前 bean 是依赖exposedObject 的 bean，返回 true
    * `return false`：创建完成返回 false
  
      `actualDependentBeans.add(dependentBean)`：创建完成的 dependentBean 加入该集合

    * `if (!actualDependentBeans.isEmpty())`：条件成立说明有依赖于当前 bean 的 bean 实例创建完成，但是当前的 bean 还没创建完成返回，依赖当前 bean 的外部 bean 持有的是不完整的 bean，所以需要报错

* `registerDisposableBeanIfNecessary`：判断当前 bean 是否需要**注册析构函数回调**，当容器销毁时进行回调

  * `if (!mbd.isPrototype() && requiresDestruction(bean, mbd))`

    * 如果是原型 prototype 不会注册析构回调，不会回调该函数，对象的回收由 JVM 的 GC 机制完成

    * requiresDestruction()：

      * `DisposableBeanAdapter.hasDestroyMethod(bean, mbd)`：bd 中定义了 DestroyMethod 返回 true

      * `hasDestructionAwareBeanPostProcessors()`：后处理器框架决定是否进行析构回调

  * `registerDisposableBean()`：条件成立进入该方法，给当前单实例注册回调适配器，适配器内根据当前 bean 实例是继承接口（DisposableBean）还是自定义标签来判定具体调用哪个方法实现
* `this.disposableBeans.put(beanName, bean)`：向销毁集合添加实例



****



##### 创建实例

AbstractAutowireCapableBeanFactory.createBeanInstance(beanName, RootBeanDefinition, Object[] args)

* `resolveBeanClass(mbd, beanName)`：确保 Bean 的 Class 真正的被加载

* 判断类的访问权限是不是 public，不是进入下一个判断，是否允许访问类的 non-public 的构造方法，不允许则报错

* `Supplier<?> instanceSupplier = mbd.getInstanceSupplier()`：获取创建实例的函数，可以自定义，没有进入下面的逻辑

* `if (mbd.getFactoryMethodName() != null)`：**判断 bean 是否设置了 factory-method 属性，优先使用**

  <bean class="" factory-method="">，设置了该属性进入 factory-method 方法创建实例

* `resolved = false`：代表 bd 对应的构造信息是否已经解析成可以反射调用的构造方法

* `autowireNecessary = false`：是否自动匹配构造方法

* `if(mbd.resolvedConstructorOrFactoryMethod != null)`：获取 bd 的构造信息转化成反射调用的 method 信息

  * method 为 null 则 resolved 和 autowireNecessary 都为默认值 false
  * `autowireNecessary = mbd.constructorArgumentsResolved`：构造方法有参数，设置为 true

* **bd 对应的构造信息解析完成，可以直接反射调用构造方法了**：

  * `return autowireConstructor(beanName, mbd, null, null)`：**有参构造**，根据参数匹配最优的构造器创建实例

  * `return instantiateBean(beanName, mbd)`：**无参构造方法通过反射创建实例**

    * `SimpleInstantiationStrategy.instantiate()`：**真正用来实例化的函数**（无论如何都会走到这一步）

      * `if (!bd.hasMethodOverrides())`：没有方法重写覆盖

        `BeanUtils.instantiateClass(constructorToUse)`：调用 `Constructor.newInstance()` 实例化

      * `instantiateWithMethodInjection(bd, beanName, owner)`：**有方法重写采用 CGLIB  实例化**

    * `BeanWrapper bw = new BeanWrapperImpl(beanInstance)`：包装成 BeanWrapper 类型的对象

    * `return bw`：返回实例

* `ctors = determineConstructorsFromBeanPostProcessors(beanClass, beanName)`：**@Autowired 注解**，对应的后置处理器 AutowiredAnnotationBeanPostProcessor 逻辑

  * 配置了 lookup 的相关逻辑

  * `this.candidateConstructorsCache.get(beanClass)`：从缓存中获取构造方法，第一次获取为 null，进入下面逻辑

  * `rawCandidates = beanClass.getDeclaredConstructors()`：获取所有的构造器

  * `Constructor<?> requiredConstructor = null`：唯一的选项构造器，**@Autowired(required = "true")** 时有值

  * `for (Constructor<?> candidate : rawCandidates)`：遍历所有的构造器：

    `ann = findAutowiredAnnotation(candidate)`：有三种注解中的一个会返回注解的属性

    * 遍历 this.autowiredAnnotationTypes 中的三种注解：

      ```java
      this.autowiredAnnotationTypes.add(Autowired.class);//！！！！！！！！！！！！！！
      this.autowiredAnnotationTypes.add(Value.class);
      this.autowiredAnnotationTypes.add(...ClassUtils.forName("javax.inject.Inject"));
      ```

    * ` AnnotatedElementUtils.getMergedAnnotationAttributes(ao, type)`：获取注解的属性

    * `if (attributes != null) return attributes`：任意一个注解属性不为空就注解返回

    `if (ann == null)`：注解属性为空

    * `userClass = ClassUtils.getUserClass(beanClass)`：如果当前 beanClass 是代理对象，方法上就已经没有注解了，所以**获取原始的用户类型重新获取该构造器上的注解属性**（**事务注解失效**也是这个原理）

    `if (ann != null)`：注解属性不为空了

    * `required = determineRequiredStatus(ann)`：获取 required 属性的值

      * `!ann.containsKey(this.requiredParameterName) || `：判断属性是否包含 required，不包含进入后面逻辑
      * `this.requiredParameterValue == ann.getBoolean(this.requiredParameterName)`：获取属性值返回

    * `if (required)`：代表注解 @Autowired(required = true)

      `if (!candidates.isEmpty())`：true 代表只能有一个构造方法，构造集合不是空代表可选的构造器不唯一，报错

      `requiredConstructor = candidate`：把构造器赋值给 requiredConstructor

    * `candidates.add(candidate)`：把当前构造方法添加至 candidates 集合

    ` if(candidate.getParameterCount() == 0)`：当前遍历的构造器的参数为 0 代表没有参数，是**默认构造器**，赋值给 defaultConstructor 

  * `candidateConstructors = candidates.toArray(new Constructor<?>[0])`：**将构造器转成数组返回**

* `if(ctors != null)`：条件成立代表指定了**构造方法数组**

  `mbd.getResolvedAutowireMode() == AUTOWIRE_CONSTRUCTOR`：<bean autowire=""> 标签内 autowiremode 的属性值，默认是 no，AUTOWIRE_CONSTRUCTOR 代表选择最优的构造方法

  `mbd.hasConstructorArgumentValues()`：bean 信息中是否配置了构造参数的值

  `!ObjectUtils.isEmpty(args)`：getBean 时，指定了参数 arg

* `return autowireConstructor(beanName, mbd, ctors, args)`：**选择最优的构造器进行创建实例**（复杂，不建议研究）

  * `beanFactory.initBeanWrapper(bw)`：向 BeanWrapper 中注册转换器，向工厂中注册属性编辑器

  * `Constructor<?> constructorToUse = null`：实例化反射构造器

    `ArgumentsHolder argsHolderToUse`：实例化时真正去用的参数，并持有对象

    * rawArguments 是转换前的参数，arguments 是类型转换完成的参数

    `Object[] argsToUse`：参数实例化时使用的参数

  * `Object[] argsToResolve`：表示构造器参数做转换后的参数引用

  * `if (constructorToUse != null && mbd.constructorArgumentsResolved)`：

    * 条件一成立说明当前 bd 生成的实例不是第一次，缓存中有解析好的构造器方法可以直接拿来反射调用
    * 条件二成立说明构造器参数已经解析过了

  * `argsToUse = resolvePreparedArguments()`：argsToResolve 不是完全解析好的，还需要继续解析

  * `if (constructorToUse == null || argsToUse == null)`：条件成立说明缓存机制失败，进入构造器匹配逻辑

  * `Constructor<?>[] candidates = chosenCtors`：chosenCtors  只有在构造方法上有 autowaire 三种注解时才有数据

  * `if (candidates == null)`：candidates 为空就根据 beanClass 是否允许访问非公开的方法来获取构造方法

  * `if (candidates.length == 1 && explicitArgs == null && !mbd.hasConstructorArgumentValues())`：默认无参

    `bw.setBeanInstance(instantiate())`：**使用无参构造器反射调用，创建出实例对象，设置到 BeanWrapper 中去**

  * `boolean autowiring`：**需要选择最优的构造器**

  * `cargs = mbd.getConstructorArgumentValues()`：获取参数值

    `resolvedValues = new ConstructorArgumentValues()`：获取已经解析后的构造器参数值

    * `final Map<Integer, ValueHolder> indexedArgumentValues`：key 是 index， value 是值
    * `final List<ValueHolder> genericArgumentValues`：没有 index 的值

    `minNrOfArgs = resolveConstructorArguments(..,resolvedValues)`：从 bd 中解析并获取构造器参数的个数

    * `valueResolver.resolveValueIfNecessary()`：将引用转换成真实的对象
    * `resolvedValueHolder.setSource(valueHolder)`：将对象填充至 ValueHolder 中
    * ` resolvedValues.addIndexedArgumentValue()`：将参数值封装至 resolvedValues 中

  * `AutowireUtils.sortConstructors(candidates)`：排序规则 public > 非公开的 > 参数多的 > 参数少的

  * ` int minTypeDiffWeight = Integer.MAX_VALUE`：值越低说明构造器**参数列表类型**和构造参数的匹配度越高

  * `Set<Constructor<?>> ambiguousConstructors`：模棱两可的构造器，两个构造器匹配度相等时放入

  * `for (Constructor<?> candidate : candidates)`：遍历筛选出 minTypeDiffWeight 最低的构造器

  * `Class<?>[] paramTypes = candidate.getParameterTypes()`：获取当前处理的构造器的参数类型

  * `if()`：candidates 是排过序的，当前筛选出来的构造器的优先级一定是优先于后面的 constructor

  * `if (paramTypes.length < minNrOfArgs)`：需求的小于给的，不匹配

  * `int typeDiffWeight`：获取匹配度

    * `mbd.isLenientConstructorResolution()`：true 表示 ambiguousConstructors 允许有数据，false 代表不允许有数据，有数据就报错（LenientConstructorResolution：宽松的构造函数解析）
    * `argsHolder.getTypeDifferenceWeight(paramTypes)`：选择参数转换前和转换后匹配度最低的，循环向父类中寻找该方法，直到寻找到 Obejct 类

  * ` if (typeDiffWeight < minTypeDiffWeight)`：条件成立说明当前循环处理的构造器更优

  * `else if (constructorToUse != null && typeDiffWeight == minTypeDiffWeight)`：当前处理的构造器的计算出来的 DiffWeight 与上一次筛选出来的最优构造器的值一致，说明有模棱两可的情况

  * `if (constructorToUse == null)`：未找到可以使用的构造器，报错

  * ` else if (ambiguousConstructors != null && !mbd.isLenientConstructorResolution())`：模棱两可有数据，LenientConstructorResolution == false，所以报错

  * `argsHolderToUse.storeCache(mbd, constructorToUse)`：匹配成功，进行缓存，方便后来者使用该 bd 实例化

  * ` bw.setBeanInstance(instantiate(beanName, mbd, constructorToUse, argsToUse))`：匹配成功调用 instantiate 创建出实例对象，设置到 BeanWrapper 中去

* `return instantiateBean(beanName, mbd)`：默认走到这里



****



#### 循环依赖

##### 循环引用

循环依赖：是一个或多个对象实例之间存在直接或间接的依赖关系，这种依赖关系构成一个环形调用

Spring 循环依赖有四种：

* DependsOn 依赖加载【无法解决】（两种 Map）
* 原型模式 Prototype 循环依赖【无法解决】（正在创建集合）
* 单例 Bean 循环依赖：构造参数产生依赖【无法解决】（正在创建集合，getSingleton() 逻辑中）
* 单例 Bean 循环依赖：setter 产生依赖【可以解决】

解决循环依赖：提前引用，提前暴露创建中的 Bean

* Spring 先实例化 A，拿到 A 的构造方法反射创建出来 A 的早期实例对象，这个对象被包装成 ObjectFactory 对象，放入三级缓存
* 处理 A 的依赖数据，检查发现 A 依赖 B 对象，所以 Spring 就会去根据 B 类型到容器中去 getBean(B)，这里产生递归
* 拿到 B 的构造方法，进行反射创建出来 B 的早期实例对象，也会把 B 包装成 ObjectFactory 对象，放到三级缓存，处理 B 的依赖数据，检查发现 B 依赖了 A 对象，然后 Spring 就会去根据 A 类型到容器中去 getBean(A.class)
* 这时从三级缓存中获取到 A 的早期对象进入属性填充

循环依赖的三级缓存：

```java
//一级缓存：存放所有初始化完成单实例 bean，单例池，key是beanName，value是对应的单实例对象引用
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

//二级缓存：存放实例化未进行初始化的 Bean，提前引用池
private final Map<String, Object> earlySingletonObjects = new HashMap<>(16);

/** Cache of singleton factories: bean name to ObjectFactory. 3*/
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
```

* 为什么需要三级缓存？

  * 循环依赖解决需要提前引用动态代理对象，AOP 动态代理是在 Bean 初始化后的后置处理中进行，这时的 bean 已经是成品对象。因为需要提前进行动态代理，三级缓存的 ObjectFactory 提前产生需要代理的对象，把提前引用放入二级缓存
  * 如果只有二级缓存，提前引用就直接放入了一级缓存，然后 Bean 初始化完成后又会放入一级缓存，产生数据覆盖，**导致提前引用的对象和一级缓存中的并不是同一个对象**
  * 一级缓存只能存放完整的单实例，**为了保证 Bean 的生命周期不被破坏**，不能将未初始化的 Bean 暴露到一级缓存
  * 若存在循环依赖，**后置处理不创建代理对象，真正创建代理对象的过程是在 getBean(B) 的阶段中**

* 三级缓存一定会创建提前引用吗？

  * 出现循环依赖就会去三级缓存获取提前引用，不出现就不会，走正常的逻辑，创建完成直接放入一级缓存
  * 存在循环依赖，就创建代理对象放入二级缓存，如果没有增强方法就返回 createBeanInstance 创建的实例，因为 addSingletonFactory 参数中传入了实例化的 Bean，在 singletonFactory.getObject() 中返回给 singletonObject，所以**存在循环依赖就一定会使用工厂**，但是不一定创建的是代理对象，不需要增强就是原始对象

* wrapIfNecessary 一定创建代理对象吗？（AOP 动态代理部分有源码解析）

  * 存在增强器会创建动态代理，不需要增强就不需要创建动态代理对象
  * 存在循环依赖会提前增强，初始化后不需要增强

* 什么时候将 Bean 的引用提前暴露给第三级缓存的 ObjectFactory 持有？

  * 实例化之后，依赖注入之前

    ```java
    createBeanInstance -> addSingletonFactory -> populateBean
    ```

    



***



##### 源码解析

假如 A 依赖 B，B 依赖 A

* 当 A 创建实例后填充属性前，执行：

  ````java
  addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean))
  ````

  ```java
  // 添加给定的单例工厂以构建指定的单例
  protected void addSingletonFactory(String beanName, ObjectFactory<?> singletonFactory) {
      Assert.notNull(singletonFactory, "Singleton factory must not be null");
      synchronized (this.singletonObjects) {
          // 单例池包含该Bean说明已经创建完成，不需要循环依赖
          if (!this.singletonObjects.containsKey(beanName)) {
              //加入三级缓存
              this.singletonFactories.put(beanName,singletonFactory);
              this.earlySingletonObjects.remove(beanName);
              // 从二级缓存移除，因为三个Map中都是一个对象，不能同时存在！
              this.registeredSingletons.add(beanName);
          }
      }
  }
  ```

* 填充属性时 A 依赖 B，这时需要 getBean(B)，也会把 B 的工厂放入三级缓存，接着 B 填充属性时发现依赖 A，去进行**第一次 ** getSingleton(A)

  ```java
  public Object getSingleton(String beanName) {
      return getSingleton(beanName, true);//为true代表允许拿到早期引用。
  }
  protected Object getSingleton(String beanName, boolean allowEarlyReference) {
      // 在一级缓存中获取 beanName 对应的单实例对象。
      Object singletonObject = this.singletonObjects.get(beanName);
      // 单实例确实尚未创建；单实例正在创建，发生了循环依赖
      if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
          synchronized (this.singletonObjects) {
              // 从二级缓存获取
              singletonObject = this.earlySingletonObjects.get(beanName);
              // 二级缓存不存在，并且允许获取早期实例对象，去三级缓存查看
              if (singletonObject == null && allowEarlyReference) {
                  ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
                  if (singletonFactory != null) {
                      // 从三级缓存获取工厂对象，并得到 bean 的提前引用
                      singletonObject = singletonFactory.getObject();
                      // 【缓存升级】，放入二级缓存，提前引用池
                      this.earlySingletonObjects.put(beanName, singletonObject);
                      // 从三级缓存移除该对象
                      this.singletonFactories.remove(beanName);
                  }
              }
          }
      }
      return singletonObject;
  }
  ```
  
* 从三级缓存获取 A 的 Bean：`singletonFactory.getObject()`，调用了 lambda 表达式的 getEarlyBeanReference 方法：

  ```java
  public Object getEarlyBeanReference(Object bean, String beanName) {
      Object cacheKey = getCacheKey(bean.getClass(), beanName);
      // 【向提前引用代理池 earlyProxyReferences 中添加该 Bean，防止对象被重新代理】
      this.earlyProxyReferences.put(cacheKey, bean);
      // 创建代理对象，createProxy
      return wrapIfNecessary(bean, beanName, cacheKey);
  }
  ```

* B 填充了 A 的提前引用后会继续初始化直到完成，**返回原始 A 的逻辑继续执行**



***
