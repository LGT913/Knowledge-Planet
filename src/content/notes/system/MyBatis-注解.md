---
title: "注解"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 注解, system]
summary: "注解类启动容器的时，注册 ClassPathBeanDefinitionScanner 到容器，用来扫描 Bean 的相关信息"
private: false
---

### 注解

#### Component

@Component 解析流程：

* 注解类启动容器的时，注册 ClassPathBeanDefinitionScanner 到容器，用来扫描 Bean 的相关信息

  ```java
  protected Set<BeanDefinitionHolder> doScan(String... basePackages) {
      Set<BeanDefinitionHolder> beanDefinitions = new LinkedHashSet<>();
      // 遍历指定的所有的包，【这就相当于扫描了】
      for (String basePackage : basePackages) {
          // 读取当前包下的资源装换为 BeanDefinition，字节流的方式
          Set<BeanDefinition> candidates = findCandidateComponents(basePackage);
          for (BeanDefinition candidate : candidates) {
              // 遍历，封装，类似于 XML 的解析方式，注册到容器中
              registerBeanDefinition(definitionHolder, this.registry)
          }
      return beanDefinitions;
  }
  ```
  
* ClassPathScanningCandidateComponentProvider.findCandidateComponents()

  ```java
  public Set<BeanDefinition> findCandidateComponents(String basePackage) {
      if (this.componentsIndex != null && indexSupportsIncludeFilters()) {
          return addCandidateComponentsFromIndex(this.componentsIndex, basePackage);
      }
      else {
          return scanCandidateComponents(basePackage);
      }
  }
  ```

  ```java
  private Set<BeanDefinition> scanCandidateComponents(String basePackage) {}
  ```

    * `String packageSearchPath = ResourcePatternResolver.CLASSPATH_ALL_URL_PREFIX resolveBasePackage(basePackage) + '/' + this.resourcePattern` ：将 package 转化为 ClassLoader 类资源搜索路径 packageSearchPath，例如：`com.sea.spring.boot` 转化为 `classpath*:com/sea/spring/boot/**/*.class`

    * `resources = getResourcePatternResolver().getResources(packageSearchPath)`：加载路径下的资源

    * `for (Resource resource : resources) `：遍历所有的资源

      `metadataReader = getMetadataReaderFactory().getMetadataReader(resource)`：获取元数据阅读器

      `if (isCandidateComponent(metadataReader))`：**当前类不匹配任何排除过滤器，并且匹配一个包含过滤器**，返回 true

        * includeFilters 由 `registerDefaultFilters()` 设置初始值，方法有 @Component，没有 @Service，因为 @Component 是 @Service 的元注解，Spring 在读取 @Service 时也读取了元注解，并将 @Service 作为 @Component 处理

          ```java
          this.includeFilters.add(new AnnotationTypeFilter(Component.class))
          ```

          ```java
          @Target({ElementType.TYPE})
          @Retention(RetentionPolicy.RUNTIME)
          @Documented
          @Component	// 拥有了 Component 功能
          public @interface Service {}
          ```

      `candidates.add(sbd)`：添加到返回结果的 list



参考文章：https://my.oschina.net/floor/blog/4325651



***



#### Autowired

打开 @Autowired 源码，注释上写 Please consult the javadoc for the AutowiredAnnotationBeanPostProcessor

AutowiredAnnotationBeanPostProcessor 间接实现 InstantiationAwareBeanPostProcessor，就具备了实例化前后（而不是初始化前后）管理对象的能力，实现了 BeanPostProcessor，具有初始化前后管理对象的能力，实现 BeanFactoryAware，具备随时拿到 BeanFactory 的能力，所以这个类**具备一切后置处理器的能力**

**在容器启动，为对象赋值的时候，遇到 @Autowired 注解，会用后置处理器机制，来创建属性的实例，然后再利用反射机制，将实例化好的属性，赋值给对象上，这就是 Autowired 的原理**

作用时机：

* Spring 在每个 Bean 实例化之后，调用 AutowiredAnnotationBeanPostProcessor 的 `postProcessMergedBeanDefinition()` 方法，查找该 Bean 是否有 @Autowired 注解，进行相关元数据的获取
* Spring 在每个 Bean 调用 `populateBean()` 进行属性注入的时候，即调用 `postProcessProperties()` 方法，查找该 Bean 属性是否有 @Autowired 注解，进行相关数据的填充







****





# MVC
