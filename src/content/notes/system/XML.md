---
title: "XML"
date: 2023-09-26
planet: system
tags: ["Java", "基础", XML, system]
summary: "BeanDefinition：是 Spring 中极其重要的一个概念，存储了 bean 对象的所有特征信息，如是否单例、是否懒加载、factoryBeanName 等，和 bean 的关系就是类与对象的关系，一个不同的 bean 对应一个 "
private: false
---

## 原理

### XML

三大对象：

* **BeanDefinition**：是 Spring 中极其重要的一个概念，存储了 bean 对象的所有特征信息，如是否单例、是否懒加载、factoryBeanName 等，和 bean 的关系就是类与对象的关系，一个不同的 bean 对应一个 BeanDefinition

* **BeanDefinationRegistry**：存放 BeanDefination 的容器，是一种键值对的形式，通过特定的 Bean 定义的 id，映射到相应的 BeanDefination，**BeanFactory 的实现类同样继承 BeanDefinationRegistry 接口**，拥有保存 BD 的能力

* **BeanDefinitionReader**：读取配置文件，**XML 用 Dom4j 解析**，**注解用 IO 流加载解析**

程序：

```java
BeanFactory bf = new XmlBeanFactory(new ClassPathResource("applicationContext.xml"));
UserService userService1 = (UserService)bf.getBean("userService");
```

源码解析：

```java
public XmlBeanFactory(Resource resource, BeanFactory parentBeanFactory) {
    super(parentBeanFactory);
    this.reader.loadBeanDefinitions(resource);
}
public int loadBeanDefinitions(Resource resource) {
    //将 resource 包装成带编码格式的 EncodedResource
    //EncodedResource 中 getReader()方法，调用java.io包下的 转换流 创建指定编码的输入流对象
    return loadBeanDefinitions(new EncodedResource(resource));
}
```

* `XmlBeanDefinitionReader.loadBeanDefinitions()`：**把 Resource 解析成 BeanDefinition 对象**

  * `currentResources = this.resourcesCurrentlyBeingLoaded.get()`：拿到当前线程已经加载过的所有 EncodedResoure 资源，用 ThreadLocal 保证线程安全
  * `if (currentResources == null)`：判断 currentResources 是否为空，为空则进行初始化
  * `if (!currentResources.add(encodedResource))`：如果已经加载过该资源会报错，防止重复加载
  * `inputSource = new InputSource(inputStream)`：资源对象包装成 InputSource，InputSource 是 **SAX** 中的资源对象，用来进行 XML 文件的解析
  * `return doLoadBeanDefinitions()`：**加载返回**
  * `currentResources.remove(encodedResource)`：加载完成移除当前 encodedResource
  * `resourcesCurrentlyBeingLoaded.remove()`：ThreadLocal 为空时移除元素，防止内存泄露

* `XmlBeanDefinitionReader.doLoadBeanDefinitions(inputSource, resource)`：真正的加载函数

  `Document doc = doLoadDocument(inputSource, resource)`：转换成有**层次结构**的 Document 对象

  * `getEntityResolver()`**：获取用来解析 DTD、XSD 约束的解析器**

  * `getValidationModeForResource(resource)`：获取验证模式

  `int count = registerBeanDefinitions(doc, resource)`：**将 Document 解析成 BD 对象，注册（添加）到  BeanDefinationRegistry 中**，返回新注册的数量

  * `createBeanDefinitionDocumentReader()`：创建 DefaultBeanDefinitionDocumentReader 对象
  * `getRegistry().getBeanDefinitionCount()`：获取解析前 BeanDefinationRegistry 中的 bd 数量
  * `registerBeanDefinitions(doc, readerContext)`：注册 BD
    * `this.readerContext = readerContext`：保存上下文对象
    * `doRegisterBeanDefinitions(doc.getDocumentElement())`：真正的注册 BD 函数
      * `doc.getDocumentElement()`：拿出顶层标签 <beans></beans>
  * `return getRegistry().getBeanDefinitionCount() - countBefore`：返回新加入的数量

* `DefaultBeanDefinitionDocumentReader.doRegisterBeanDefinitions()`：注册 BD 到 BR

  * `createDelegate(getReaderContext(), root, parent)`：beans 是标签的解析器对象
  * `delegate.isDefaultNamespace(root)`：判断 beans 标签是否是默认的属性
  * `root.getAttribute(PROFILE_ATTRIBUTE)`：解析 profile 属性
  * `preProcessXml(root)`：解析前置处理，自定义实现
  * `parseBeanDefinitions(root, this.delegate)`：**解析 beans 标签中的子标签**
    * `parseDefaultElement(ele, delegate)`：如果是默认的标签，用该方法解析子标签
      * 判断标签名称，进行相应的解析
      * `processBeanDefinition(ele, delegate)`：
    * `delegate.parseCustomElement(ele)`：解析自定义的标签
  * `postProcessXml(root)`：解析后置处理

* `DefaultBeanDefinitionDocumentReader.processBeanDefinition()`：**解析 bean 标签并注册到注册中心**

  * `delegate.parseBeanDefinitionElement(ele)`：解析 bean 标签封装为 BeanDefinitionHolder

    * `if (!StringUtils.hasText(beanName) && !aliases.isEmpty())`：条件一成立说明 name 没有值，条件二成立说明别名有值

      `beanName = aliases.remove(0)`：拿别名列表的第一个元素当作 beanName

    * `parseBeanDefinitionElement(ele, beanName, containingBean)`：**解析 bean 标签**

      * `parseState.push(new BeanEntry(beanName))`：当前解析器的状态设置为 BeanEntry
      * class 和 parent 属性存在一个，parent 是作为父标签为了被继承
      * `createBeanDefinition(className, parent)`：设置了class 的 GenericBeanDefinition对象
      * `parseBeanDefinitionAttributes()`：解析 bean 标签的属性
      * 接下来解析子标签

    * `beanName = this.readerContext.generateBeanName(beanDefinition)`：生成 className + # + 序号的名称赋值给 beanName 

    * `return new BeanDefinitionHolder(beanDefinition, beanName, aliases)`：**包装成 BeanDefinitionHolder**

  * `registerBeanDefinition(bdHolder, getReaderContext().getRegistry())`：**注册到容器**

    * `beanName = definitionHolder.getBeanName()`：获取beanName
    * `this.beanDefinitionMap.put(beanName, beanDefinition)`：添加到注册中心

  * `getReaderContext().fireComponentRegistered()`：发送注册完成事件

  

**说明：源码部分的笔记不一定适合所有人阅读，作者采用流水线式去解析重要的代码，解析的结构类似于树状，如果视觉疲劳可以去网上参考一些博客和流程图学习源码。**



****
