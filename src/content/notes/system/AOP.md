---
title: "AOP"
date: 2023-09-26
planet: system
tags: ["Java", "基础", AOP, system]
summary: "@EnableAspectJAutoProxy：AOP 注解驱动，给容器中导入 AspectJAutoProxyRegistrar"
private: false
---

### AOP

#### 注解原理

@EnableAspectJAutoProxy：AOP 注解驱动，给容器中导入 AspectJAutoProxyRegistrar

```java
@Import(AspectJAutoProxyRegistrar.class)
public @interface EnableAspectJAutoProxy {
    // 是否强制使用 CGLIB 创建代理对象 
    // 配置文件方式：<aop:aspectj-autoproxy proxy-target-class="true"/>
	boolean proxyTargetClass() default false;
	
    // 将当前代理对象暴露到上下文内，方便代理对象内部的真实对象拿到代理对象
    // 配置文件方式：<aop:aspectj-autoproxy expose-proxy="true"/>
	boolean exposeProxy() default false;
}
```

AspectJAutoProxyRegistrar 在用来向容器中注册 **AnnotationAwareAspectJAutoProxyCreator**，以 BeanDefiantion 形式存在，在容器初始化时加载。AnnotationAwareAspectJAutoProxyCreator 间接实现了 InstantiationAwareBeanPostProcessor，Order 接口，该类会在 Bean 的实例化和初始化的前后起作用

工作流程：创建 IOC 容器，调用 refresh() 刷新容器，`registerBeanPostProcessors(beanFactory)` 阶段，通过 getBean() 创建 AnnotationAwareAspectJAutoProxyCreator 对象，在生命周期的初始化方法中执行回调 initBeanFactory() 方法初始化注册三个工具类：BeanFactoryAdvisorRetrievalHelperAdapter、ReflectiveAspectJAdvisorFactory、BeanFactoryAspectJAdvisorsBuilderAdapter



***



#### 后置处理

Bean 初始化完成的执行后置处理器的方法：

```java
public Object postProcessAfterInitialization(@Nullable Object bean,String bN){
    if (bean != null) {
        // cacheKey 是 【beanName 或者加上 & 的 beanName】
        Object cacheKey = getCacheKey(bean.getClass(), beanName);
            if (this.earlyProxyReferences.remove(cacheKey) != bean) {
                // 去提前代理引用池中寻找该 key，不存在则创建代理
                // 如果存在则证明被代理过，则判断是否是当前的 bean，不是则创建代理
                return wrapIfNecessary(bean, bN, cacheKey);
            }
    }
    return bean;
}
```

AbstractAutoProxyCreator.wrapIfNecessary()：根据通知创建动态代理，没有通知直接返回原实例

```java
protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
    // 条件一般不成立，很少使用 TargetSourceCreator 去创建对象 BeforeInstantiation 阶段，doCreateBean 之前的阶段
    if (StringUtils.hasLength(beanName) && this.targetSourcedBeans.contains(beanName)) {
        return bean;
    }
    // advisedBeans 集合保存的是 bean 是否被增强过了
    // 条件成立说明当前 beanName 对应的实例不需要被增强处理，判断是在 BeforeInstantiation 阶段做的
    if (Boolean.FALSE.equals(this.advisedBeans.get(cacheKey))) {
        return bean;
    }
    // 条件一：判断当前 bean 类型是否是基础框架类型，这个类的实例不能被增强
    // 条件二：shouldSkip 判断当前 beanName 是否是 .ORIGINAL 结尾，如果是就跳过增强逻辑，直接返回
    if (isInfrastructureClass(bean.getClass()) || shouldSkip(bean.getClass(), beanName)) {
        this.advisedBeans.put(cacheKey, Boolean.FALSE);
        return bean;
    }

    // 【查找适合当前 bean 实例的增强方法】（下一节详解）
    Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(bean.getClass(), beanName, null);
    // 条件成立说明上面方法查询到适合当前class的通知
    if (specificInterceptors != DO_NOT_PROXY) {
        this.advisedBeans.put(cacheKey, Boolean.TRUE);
        // 根据查询到的增强创建代理对象（下一节详解）
        // 参数一：目标对象
        // 参数二：beanName
        // 参数三：匹配当前目标对象 clazz 的 Advisor 数据
        Object proxy = createProxy(
            bean.getClass(), beanName, specificInterceptors, new SingletonTargetSource(bean));
        // 保存代理对象类型
        this.proxyTypes.put(cacheKey, proxy.getClass());
        // 返回代理对象
        return proxy;
    }
	// 执行到这里说明没有查到通知，当前 bean 不需要增强
    this.advisedBeans.put(cacheKey, Boolean.FALSE);
    // 【返回原始的 bean 实例】
    return bean;
}
```



***



#### 获取通知

AbstractAdvisorAutoProxyCreator.getAdvicesAndAdvisorsForBean()：查找适合当前类实例的增强，并进行排序

```java
protected Object[] getAdvicesAndAdvisorsForBean(Class<?> beanClass, String beanName, @Nullable TargetSource targetSource) {
	// 查询适合当前类型的增强通知
    List<Advisor> advisors = findEligibleAdvisors(beanClass, beanName);
    if (advisors.isEmpty()) {
        // 增强为空直接返回 null，不需要创建代理
        return DO_NOT_PROXY;
    }
    // 不是空，转成数组返回
    return advisors.toArray();
}
```

AbstractAdvisorAutoProxyCreator.findEligibleAdvisors()：

* `candidateAdvisors = findCandidateAdvisors()`：**获取当前容器内可以使用（所有）的 advisor**，调用的是 AnnotationAwareAspectJAutoProxyCreator 类的方法，每个方法对应一个 Advisor 

  * `advisors = super.findCandidateAdvisors()`：**查询出 XML 配置的所有 Advisor 类型**

    * `advisorNames = BeanFactoryUtils.beanNamesForTypeIncludingAncestors()`：通过 BF 查询出来 BD 配置的 class 中 是 Advisor 子类的 BeanName
    * `advisors.add()`：使用 Spring 容器获取当前这个 Advisor 类型的实例

  * `advisors.addAll(....buildAspectJAdvisors())`：**获取所有添加 @Aspect 注解类中的 Advisor**

    `buildAspectJAdvisors()`：构建的方法，**把 Advice 封装成 Advisor**

    * ` beanNames = BeanFactoryUtils.beanNamesForTypeIncludingAncestors(this.beanFactory, Object.class, true, false)`：获取出容器内 Object 所有的 beanName，就是全部的

    * ` for (String beanName : beanNames)`：遍历所有的 beanName，判断每个 beanName 对应的 Class 是否是 Aspect 类型，就是加了 @Aspect 注解的类

      * `factory = new BeanFactoryAspectInstanceFactory(this.beanFactory, beanName)`：使用工厂模式管理 Aspect 的元数据，关联的真实 @Aspect 注解的实例对象

      * `classAdvisors = this.advisorFactory.getAdvisors(factory)`：添加了 @Aspect 注解的类的通知信息

        * aspectClass：@Aspect 标签的类的 class

        * `for (Method method : getAdvisorMethods(aspectClass))`：遍历**不包括 @Pointcut 注解的方法**

          `Advisor advisor = getAdvisor(method, lazySingletonAspectInstanceFactory, advisors.size(), aspectName)`：**将当前 method 包装成 Advisor 数据**

          * `AspectJExpressionPointcut expressionPointcut = getPointcut()`：获取切点表达式

          * `return new InstantiationModelAwarePointcutAdvisorImpl()`：把 method 中 Advice 包装成 Advisor，Spring 中每个 Advisor 内部一定是持有一个 Advice 的，Advice 内部最重要的数据是当前 method 和aspectInstanceFactory，工厂用来获取实例

            `this.instantiatedAdvice = instantiateAdvice(this.declaredPointcut)`：实例化 Advice 对象，逻辑是获取注解信息，根据注解的不同生成对应的 Advice 对象

      * `advisors.addAll(classAdvisors)`：保存通过 @Aspect 注解定义的 Advisor 数据

    * `this.aspectBeanNames = aspectNames`：将所有 @Aspect 注解 beanName 缓存起来，表示提取 Advisor 工作完成

    * `return advisors`：返回 Advisor 列表

* `eligibleAdvisors = findAdvisorsThatCanApply(candidateAdvisors, ...)`：**选出匹配当前类的增强**

  * `if (candidateAdvisors.isEmpty())`：条件成立说明当前 Spring 没有可以操作的 Advisor

  * `List<Advisor> eligibleAdvisors = new ArrayList<>()`：存放匹配当前 beanClass 的 Advisors 信息

  * `for (Advisor candidate : candidateAdvisors)`：**遍历所有的 Advisor**

    ` if (canApply(candidate, clazz, hasIntroductions))`：判断遍历的 advisor 是否匹配当前的 class，匹配就加入集合

    * `if (advisor instanceof PointcutAdvisor)`：创建的 advisor 是 InstantiationModelAwarePointcutAdvisorImpl 类型

      `PointcutAdvisor pca = (PointcutAdvisor) advisor`：封装当前 Advisor

      `return canApply(pca.getPointcut(), targetClass, hasIntroductions)`：重载该方法

      * `if (!pc.getClassFilter().matches(targetClass))`：**类不匹配 Pointcut 表达式，直接返回 false**
      * `methodMatcher = pc.getMethodMatcher()`：**获取 Pointcut 方法匹配器**，类匹配进行类中方法的匹配
      * `Set<Class<?>> classes`：保存目标对象 class 和目标对象父类超类的接口和自身实现的接口
      * `if (!Proxy.isProxyClass(targetClass))`：判断当前实例是不是代理类，确保 class 内存储的数据包括目标对象的class  而不是代理类的 class
      * `for (Class<?> clazz : classes)`：**检查目标 class 和上级接口的所有方法，查看是否会被方法匹配器匹配**，如果有一个方法匹配成功，就说明目标对象 AOP 代理需要增强
        * `specificMethod = AopUtils.getMostSpecificMethod(method, targetClass)`：方法可能是接口的，判断当前类有没有该方法
        * `return (specificMethod != method && matchesMethod(specificMethod))`：**类和方法的匹配**，不包括参数

* `extendAdvisors(eligibleAdvisors)`：在 eligibleAdvisors 列表的索引 0 的位置添加 DefaultPointcutAdvisor，**封装了 ExposeInvocationInterceptor 拦截器**

* ` eligibleAdvisors = sortAdvisors(eligibleAdvisors)`：**对拦截器进行排序**，数值越小优先级越高，高的排在前面
  
  * 实现 Ordered 或 PriorityOrdered 接口，PriorityOrdered 的级别要优先于 Ordered，使用 OrderComparator 比较器
  * 使用 @Order（Spring 规范）或 @Priority（JDK 规范）注解，使用 AnnotationAwareOrderComparator 比较器
  * ExposeInvocationInterceptor 实现了 PriorityOrdered ，所以总是排在第一位，MethodBeforeAdviceInterceptor 没实现任何接口，所以优先级最低，排在最后
* `return eligibleAdvisors`：返回拦截器链



****



#### 创建代理

AbstractAutoProxyCreator.createProxy()：根据增强方法创建代理对象

* `ProxyFactory proxyFactory = new ProxyFactory()`：**无参构造 ProxyFactory**，此处讲解一下两种有参构造方法：

  * public ProxyFactory(Object target)：

    ```java
    public ProxyFactory(Object target) {
    	// 将目标对象封装成 SingletonTargetSource 保存到父类的字段中
       	setTarget(target);
        // 获取目标对象 class 所有接口保存到 AdvisedSupport 中的 interfaces 集合中
       	setInterfaces(ClassUtils.getAllInterfaces(target));
    }
    ```

    ClassUtils.getAllInterfaces(target) 底层调用 getAllInterfacesForClassAsSet(java.lang.Class<?>, java.lang.ClassLoader)：

    *  `if (clazz.isInterface() && isVisible(clazz, classLoader))`：
       * 条件一：判断当前目标对象是接口
       * 条件二：检查给定的类在给定的 ClassLoader 中是否可见
    *  `Class<?>[] ifcs = current.getInterfaces()`：拿到自己实现的接口，拿不到接口实现的接口
    *  `current = current.getSuperclass()`：递归寻找父类的接口，去获取父类实现的接口

  * public ProxyFactory(Class<?> proxyInterface, Interceptor interceptor)：

    ```java
    public ProxyFactory(Class<?> proxyInterface, Interceptor interceptor) {
        // 添加一个代理的接口
        addInterface(proxyInterface);
        // 添加通知，底层调用 addAdvisor
        addAdvice(interceptor);
    }
    ```
    
    * `addAdvisor(pos, new DefaultPointcutAdvisor(advice))`：Spring 中 Advice 对应的接口就是 Advisor，Spring 使用 Advisor 包装 Advice 实例

* `proxyFactory.copyFrom(this)`：填充一些信息到 proxyFactory

* `if (!proxyFactory.isProxyTargetClass())`：条件成立说明 proxyTargetClass 为 false（默认），两种配置方法：

  * `<aop:aspectj-autoproxy proxy-target-class="true"/> `：强制使用 CGLIB
  * `@EnableAspectJAutoProxy(proxyTargetClass = true)`

  `if (shouldProxyTargetClass(beanClass, beanName))`：如果 bd 内有 preserveTargetClass = true ，那么这个 bd 对应的 class **创建代理时必须使用 CGLIB**，条件成立设置 proxyTargetClass 为 true

  `evaluateProxyInterfaces(beanClass, proxyFactory)`：**根据目标类判定是否可以使用 JDK 动态代理**

  * `targetInterfaces = ClassUtils.getAllInterfacesForClass()`：获取当前目标对象 class 和父类的全部实现接口
  * `boolean hasReasonableProxyInterface = false`：实现的接口中是否有一个合理的接口
  * `if (!isConfigurationCallbackInterface(ifc) && !isInternalLanguageInterface(ifc) && ifc.getMethods().length > 0)`：遍历所有的接口，如果有任意一个接口满足条件，设置 hRPI 变量为 true
    * 条件一：判断当前接口是否是 Spring 生命周期内会回调的接口
    * 条件二：接口不能是 GroovyObject、Factory、MockAccess 类型的
    * 条件三：找到一个可以使用的被代理的接口
  * `if (hasReasonableProxyInterface)`：**有合理的接口，将这些接口设置到 proxyFactory 内**
  * `proxyFactory.setProxyTargetClass(true)`：**没有合理的代理接口，强制使用 CGLIB 创建对象**

* `advisors = buildAdvisors(beanName, specificInterceptors)`：匹配目标对象 clazz 的 Advisors，填充至 ProxyFactory

* `proxyFactory.setPreFiltered(true)`：设置为 true 表示传递给 proxyFactory 的 Advisors 信息做过基础类和方法的匹配

* `return proxyFactory.getProxy(getProxyClassLoader())`：创建代理对象

  ```java
  public Object getProxy() {
      return createAopProxy().getProxy();
  }
  ```

  DefaultAopProxyFactory.createAopProxy(AdvisedSupport config)：参数是一个配置对象，保存着创建代理需要的生产资料，会加锁创建，保证线程安全

  ```java
  public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
      // 条件二为 true 代表强制使用 CGLIB 动态代理
      if (config.isOptimize() || config.isProxyTargetClass() || 
          // 条件三：被代理对象没有实现任何接口或者只实现了 SpringProxy 接口，只能使用 CGLIB 动态代理
          hasNoUserSuppliedProxyInterfaces(config)) {
          Class<?> targetClass = config.getTargetClass();
          if (targetClass == null) {
              throw new AopConfigException("");
          }
          // 条件成立说明 target 【是接口或者是已经被代理过的类型】，只能使用 JDK 动态代理
          if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
              return new JdkDynamicAopProxy(config);	// 使用 JDK 动态代理
          }
          return new ObjenesisCglibAopProxy(config);	// 使用 CGLIB 动态代理
      }
      else {
          return new JdkDynamicAopProxy(config);		// 【有接口的情况下只能使用 JDK 动态代理】
      }
  }
  ```
  
  JdkDynamicAopProxy.getProxy(java.lang.ClassLoader)：获取 JDK 的代理对象
  
  ```java
    public JdkDynamicAopProxy(AdvisedSupport config) throws AopConfigException {
        // 配置类封装到 JdkDynamicAopProxy.advised 属性中
        this.advised = config;
    }
    public Object getProxy(@Nullable ClassLoader classLoader) {
        // 获取需要代理的接口数组
        Class<?>[] proxiedInterfaces = AopProxyUtils.completeProxiedInterfaces(this.advised, true);
        
        // 查找当前所有的需要代理的接口，看是否有 equals 方法和 hashcode 方法，如果有就做一个标记
        findDefinedEqualsAndHashCodeMethods(proxiedInterfaces);
        
        // 该方法最终返回一个代理类对象
        return Proxy.newProxyInstance(classLoader, proxiedInterfaces, this);
        // classLoader：类加载器  proxiedInterfaces：生成的代理类，需要实现的接口集合
        // this JdkDynamicAopProxy 实现了 InvocationHandler
    }
  ```
  
  AopProxyUtils.completeProxiedInterfaces(this.advised, true)：获取代理的接口数组，并添加 SpringProxy 接口
  
  * `specifiedInterfaces = advised.getProxiedInterfaces()`：从 ProxyFactory 中拿到所有的 target 提取出来的接口
    * `if (specifiedInterfaces.length == 0)`：如果没有实现接口，检查当前 target 是不是接口或者已经是代理类，封装到 ProxyFactory 的 interfaces 集合中
  
  * ` addSpringProxy = !advised.isInterfaceProxied(SpringProxy.class)`：判断目标对象所有接口中是否有 SpringProxy 接口，没有的话需要添加，这个接口**标识这个代理类型是 Spring 管理的**
    * `addAdvised = !advised.isOpaque() && !advised.isInterfaceProxied(Advised.class)`：判断目标对象的所有接口，是否已经有 Advised 接口
    * ` addDecoratingProxy = (decoratingProxy && !advised.isInterfaceProxied(DecoratingProxy.class))`：判断目标对象的所有接口，是否已经有 DecoratingProxy 接口
    * `int nonUserIfcCount = 0`：非用户自定义的接口数量，接下来要添加上面的三个接口了
    * `proxiedInterfaces = new Class<?>[specifiedInterfaces.length + nonUserIfcCount]`：创建一个新的 class 数组，长度是原目标对象提取出来的接口数量和 Spring 追加的数量，然后进行 **System.arraycopy 拷贝到新数组中**
    * `int index = specifiedInterfaces.length`：获取原目标对象提取出来的接口数量，当作 index
    * `if(addSpringProxy)`：根据上面三个布尔值把接口添加到新数组中
    * `return proxiedInterfaces`：返回追加后的接口集合
  
  JdkDynamicAopProxy.findDefinedEqualsAndHashCodeMethods()：查找在任何定义在接口中的 equals 和 hashCode 方法
  
  * `for (Class<?> proxiedInterface : proxiedInterfaces)`：遍历所有的接口
    * ` Method[] methods = proxiedInterface.getDeclaredMethods()`：获取接口中的所有方法
    * `for (Method method : methods)`：遍历所有的方法
      * `if (AopUtils.isEqualsMethod(method))`：当前方法是 equals 方法，把 equalsDefined 置为 true
      * `if (AopUtils.isHashCodeMethod(method))`：当前方法是 hashCode 方法，把 hashCodeDefined 置为 true
  
    * `if (this.equalsDefined && this.hashCodeDefined)`：如果有一个接口中有这两种方法，直接返回



***



#### 方法增强

main() 函数中调用用户方法，会进入代理对象的 invoke 方法

JdkDynamicAopProxy 类中的 invoke 方法是真正执行代理方法

```java
// proxy：代理对象，method：目标对象的方法，args：目标对象方法对应的参数
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    Object oldProxy = null;
    boolean setProxyContext = false;

    // advised 就是初始化 JdkDynamicAopProxy 对象时传入的变量
    TargetSource targetSource = this.advised.targetSource;
    Object target = null;

    try {
        // 条件成立说明代理类实现的接口没有定义 equals 方法，并且当前 method 调用 equals 方法，
        // 就调用 JdkDynamicAopProxy 提供的 equals 方法
        if (!this.equalsDefined && AopUtils.isEqualsMethod(method)) {
            return equals(args[0]);
        } //.....

        Object retVal;
		// 需不需要暴露当前代理对象到 AOP 上下文内
        if (this.advised.exposeProxy) {
            // 【把代理对象设置到上下文环境】
            oldProxy = AopContext.setCurrentProxy(proxy);
            setProxyContext = true;
        }

        // 根据 targetSource 获取真正的代理对象
        target = targetSource.getTarget();
        Class<?> targetClass = (target != null ? target.getClass() : null);

        // 查找【适合该方法的增强】，首先从缓存中查找，查找不到进入主方法【下文详解】
        List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);

		// 拦截器链是空，说明当前 method 不需要被增强
        if (chain.isEmpty()) {
            Object[] argsToUse = AopProxyUtils.adaptArgumentsIfNecessary(method, args);
            retVal = AopUtils.invokeJoinpointUsingReflection(target, method, argsToUse);
        }
        else {
            // 有匹配当前 method 的方法拦截器，要做增强处理，把方法信息封装到方法调用器里
            MethodInvocation invocation =
                new ReflectiveMethodInvocation(proxy, target, method, args, targetClass, chain);
            // 【拦截器链驱动方法，核心】
            retVal = invocation.proceed();
        }

        Class<?> returnType = method.getReturnType();
        if (retVal != null && retVal == target &&
            returnType != Object.class && returnType.isInstance(proxy) &&
            !RawTargetAccess.class.isAssignableFrom(method.getDeclaringClass())) {
          	// 如果目标方法返回目标对象，这里做个普通替换返回代理对象
            retVal = proxy;
        }
        
        // 返回执行的结果
        return retVal;
    }
    finally {
        if (target != null && !targetSource.isStatic()) {
            targetSource.releaseTarget(target);
        }
        // 如果允许了提前暴露，这里需要设置为初始状态
        if (setProxyContext) {
            // 当前代理对象已经完成工作，【把原始对象设置回上下文】
            AopContext.setCurrentProxy(oldProxy);
        }
    }
}
```

this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass)：查找适合该方法的增强，首先从缓存中查找，获取通知时是从全部增强中获取适合当前类的，这里是**从当前类的中获取适合当前方法的增强**

* `AdvisorAdapterRegistry registry = GlobalAdvisorAdapterRegistry.getInstance()`：向容器注册适配器，**可以将非 Advisor 类型的增强，包装成为 Advisor，将 Advisor 类型的增强提取出来对应的 MethodInterceptor**

  * `instance = new DefaultAdvisorAdapterRegistry()`：该对象向容器中注册了 MethodBeforeAdviceAdapter、AfterReturningAdviceAdapter、ThrowsAdviceAdapter 三个适配器

  * Advisor 中持有 Advice 对象

    ```java
    public interface Advisor {
    	Advice getAdvice();
    }
    ```

* `advisors = config.getAdvisors()`：获取 ProxyFactory 内部持有的增强信息

* `interceptorList = new ArrayList<>(advisors.length)`：拦截器列表有 5 个，1 个 ExposeInvocation和 4 个增强器

* `actualClass = (targetClass != null ? targetClass : method.getDeclaringClass())`：真实的目标对象类型

* `Boolean hasIntroductions = null`：引介增强，不关心

* `for (Advisor advisor : advisors)`：**遍历所有的 advisor 增强**

* `if (advisor instanceof PointcutAdvisor)`：条件成立说明当前 Advisor 是包含切点信息的，进入匹配逻辑

  `pointcutAdvisor = (PointcutAdvisor) advisor`：转成可以获取到切点信息的接口

  `if(config.isPreFiltered() || pointcutAdvisor.getPointcut().getClassFilter().matches(actualClass))`：当前代理被预处理，或者当前被代理的 class 对象匹配当前 Advisor 成功，只是 class 匹配成功

  * `mm = pointcutAdvisor.getPointcut().getMethodMatcher()`：获取切点的方法匹配器，不考虑引介增强

  * `match = mm.matches(method, actualClass)`：**静态匹配成功返回 true，只关注于处理类及其方法，不考虑参数**

  * `if (match)`：如果静态切点检查是匹配的，在运行的时候才进行**动态切点检查，会考虑参数匹配**（代表传入了参数）。如果静态匹配失败，直接不需要进行参数匹配，提高了工作效率

    `interceptors = registry.getInterceptors(advisor)`：提取出当前 advisor 内持有的 advice 信息 

    * `Advice advice = advisor.getAdvice()`：获取增强方法

    * `if (advice instanceof MethodInterceptor)`：当前 advice 是 MethodInterceptor 直接加入集合

    * `for (AdvisorAdapter adapter : this.adapters)`：**遍历三个适配器进行匹配**（初始化时创建的），匹配成功创建对应的拦截器返回，以 MethodBeforeAdviceAdapter 为例

      `if (adapter.supportsAdvice(advice))`：判断当前 advice 是否是对应的 MethodBeforeAdvice

      `interceptors.add(adapter.getInterceptor(advisor))`：条件成立就往拦截器链中添加 advisor

      * `advice = (MethodBeforeAdvice) advisor.getAdvice()`：**获取增强方法**
      * `return new MethodBeforeAdviceInterceptor(advice)`：**封装成 MethodBeforeAdviceInterceptor 返回**

    `interceptorList.add(new InterceptorAndDynamicMethodMatcher(interceptor, mm))`：向拦截器链添加动态匹配器

    `interceptorList.addAll(Arrays.asList(interceptors))`：将当前 advisor 内部的方法拦截器追加到 interceptorList

* `interceptors = registry.getInterceptors(advisor)`：进入 else 的逻辑，说明当前 Advisor 匹配全部 class 的全部 method，全部加入到 interceptorList

* `return interceptorList`：返回 method 方法的拦截器链

retVal = invocation.proceed()：**拦截器链驱动方法**

* `if (this.currentInterceptorIndex == this.interceptorsAndDynamicMethodMatchers.size() - 1)`：条件成立说明方法拦截器全部都已经调用过了（index 从 - 1 开始累加），接下来需要执行目标对象的目标方法

  `return invokeJoinpoint()`：**调用连接点（目标）方法**

* `this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex)`：**获取下一个方法拦截器**

* `if (interceptorOrInterceptionAdvice instanceof InterceptorAndDynamicMethodMatcher)`：需要运行时匹配

  `if (dm.methodMatcher.matches(this.method, targetClass, this.arguments))`：判断是否匹配成功

  * `return dm.interceptor.invoke(this)`：匹配成功，执行方法
  * `return proceed()`：匹配失败跳过当前拦截器

* `return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this)`：**一般方法拦截器都会执行到该方法，此方法内继续执行 proceed() 完成责任链的驱动，直到最后一个  MethodBeforeAdviceInterceptor 调用前置通知，然后调用 mi.proceed()，发现是最后一个拦截器就直接执行连接点（目标方法），return 到上一个拦截器的 mi.proceed() 处，依次返回到责任链的上一个拦截器执行通知方法**

图示先从上往下建立链，然后从下往上依次执行，责任链模式

* 正常执行：（环绕通知）→ 前置通知 → 目标方法 → 后置通知 → 返回通知

 * 出现异常：（环绕通知）→ 前置通知 → 目标方法 → 后置通知 → 异常通知

 * MethodBeforeAdviceInterceptor 源码：

   ```java
   public Object invoke(MethodInvocation mi) throws Throwable {
       // 先执行通知方法，再驱动责任链
       this.advice.before(mi.getMethod(), mi.getArguments(), mi.getThis());
       // 开始驱动目标方法执行，执行完后返回到这，然后继续向上层返回
       return mi.proceed();
   }
   ```
   
   AfterReturningAdviceInterceptor 源码：没有任何异常处理机制，直接抛给上层
   
   ```java
   public Object invoke(MethodInvocation mi) throws Throwable {
       // 先驱动责任链，再执行通知方法
       Object retVal = mi.proceed();
       this.advice.afterReturning(retVal, mi.getMethod(), mi.getArguments(), mi.getThis());
       return retVal;
   }
   ```
   
   AspectJAfterThrowingAdvice 执行异常处理：
   
   ```java
   public Object invoke(MethodInvocation mi) throws Throwable {
       try {
           // 默认直接驱动责任链
           return mi.proceed();
       }
       catch (Throwable ex) {
           // 出现错误才执行该方法
           if (shouldInvokeOnThrowing(ex)) {
               invokeAdviceMethod(getJoinPointMatch(), null, ex);
           }
           throw ex;
       }
   }
   ```

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/Spring-AOP动态代理执行方法.png)



参考视频：https://www.bilibili.com/video/BV1gW411W7wy




***
