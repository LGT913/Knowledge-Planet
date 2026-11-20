---
title: "响应处理"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 响应处理, system]
summary: "直接进入方法执行完后的逻辑 ServletInvocableHandlerMethodinvokeAndHandle："
private: false
---

### 响应处理

#### 响应数据

以 Person 为例：

```java
@ResponseBody  		// 利用返回值处理器里面的消息转换器进行处理，而不是视图
@GetMapping(value = "/person")
public Person getPerson(){
    Person person = new Person();
    person.setAge(28);
    person.setBirth(new Date());
    person.setUserName("zhangsan");
    return person;
}
```

直接进入方法执行完后的逻辑 ServletInvocableHandlerMethod#invokeAndHandle：

```java
public void invokeAndHandle(ServletWebRequest webRequest, ModelAndViewContainer mavContainer,
                            Object... providedArgs) throws Exception {
	// 【执行目标方法】，return person 对象
    Object returnValue = invokeForRequest(webRequest, mavContainer, providedArgs);
    // 设置状态码
    setResponseStatus(webRequest);

    // 判断方法是否有返回值
    if (returnValue == null) {
        if (isRequestNotModified(webRequest) || getResponseStatus() != null || mavContainer.isRequestHandled()) {
            disableContentCachingIfNecessary(webRequest);
            mavContainer.setRequestHandled(true);
            return;
        }
    }	// 返回值是字符串
    else if (StringUtils.hasText(getResponseStatusReason())) {
        // 设置请求处理完成
        mavContainer.setRequestHandled(true);
        return;
	// 设置请求没有处理完成，还需要进行返回值的逻辑
    mavContainer.setRequestHandled(false);
    Assert.state(this.returnValueHandlers != null, "No return value handlers");
    try {
        // 【返回值的处理】
        this.returnValueHandlers.handleReturnValue(
            returnValue, getReturnValueType(returnValue), mavContainer, webRequest);
    }
    catch (Exception ex) {}
}
```

* **没有加 @ResponseBody 注解的返回数据按照视图处理的逻辑**，ViewNameMethodReturnValueHandler（视图详解）
* 此例是加了注解的，返回的数据不是视图，HandlerMethodReturnValueHandlerComposite#handleReturnValue：

```java
public void handleReturnValue(@Nullable Object returnValue, MethodParameter returnType,
                              ModelAndViewContainer mavContainer, NativeWebRequest webRequest)  {
	// 获取合适的返回值处理器
    HandlerMethodReturnValueHandler handler = selectHandler(returnValue, returnType);
    if (handler == null) {
        throw new IllegalArgumentException();
    }
    // 使用处理器处理返回值（详解源码中的这两个函数）
    handler.handleReturnValue(returnValue, returnType, mavContainer, webRequest);
}
```

HandlerMethodReturnValueHandlerComposite#selectHandler：获取合适的返回值处理器

* `boolean isAsyncValue = isAsyncReturnValue(value, returnType)`：是否是异步请求

* `for (HandlerMethodReturnValueHandler handler : this.returnValueHandlers)`：遍历所有的返回值处理器
  * `RequestResponseBodyMethodProcessor#supportsReturnType`：**处理标注 @ResponseBody 注解的返回值**
  * `ModelAndViewMethodReturnValueHandler#supportsReturnType`：处理返回值类型是 ModelAndView 的处理器
  * `ModelAndViewResolverMethodReturnValueHandler#supportsReturnType`：直接返回 true，处理所有数据



RequestResponseBodyMethodProcessor#handleReturnValue：处理返回值，要进行**内容协商**

* `mavContainer.setRequestHandled(true)`：设置请求处理完成

* `inputMessage = createInputMessage(webRequest)`：获取输入的数据

* `outputMessage = createOutputMessage(webRequest)`：获取输出的数据

* `writeWithMessageConverters(returnValue, returnType, inputMessage, outputMessage)`：使用消息转换器进行写出

  * `if (value instanceof CharSequence)`：判断返回的数据是不是字符类型

  * `body = value`：把 value 赋值给 body，此时 body 中就是自定义方法执行完后的 Person 对象

  * `if (isResourceType(value, returnType))`：当前数据是不是流数据

  * `MediaType selectedMediaType`：**内容协商后选择使用的类型，浏览器和服务器都支持的媒体（数据）类型**

  * `MediaType contentType = outputMessage.getHeaders().getContentType()`：获取响应头的数据

  * `if (contentType != null && contentType.isConcrete())`：判断当前响应头中是否已经有确定的媒体类型

    `selectedMediaType = contentType`：前置处理已经使用了媒体类型，直接继续使用该类型

  * `acceptableTypes = getAcceptableMediaTypes(request)`：**获取浏览器支持的媒体类型，请求头字段**

    * `this.contentNegotiationManager.resolveMediaTypes()`：调用该方法
    * `for(ContentNegotiationStrategy strategy:this.strategies)`：**默认策略是提取请求头的字段的内容**，策略类为HeaderContentNegotiationStrategy，可以配置添加其他类型的策略
      * `List<MediaType> mediaTypes = strategy.resolveMediaTypes(request)`：解析 Accept 字段存储为 List
        * `headerValueArray = request.getHeaderValues(HttpHeaders.ACCEPT)`：获取请求头中 Accept 字段
        * `List<MediaType> mediaTypes = MediaType.parseMediaTypes(headerValues)`：解析成 List 集合
        * `MediaType.sortBySpecificityAndQuality(mediaTypes)`：按照相对品质因数 q 降序排序
    
  
  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/SpringMVC-浏览器支持接收的数据类型.png)
  
* `producibleTypes = getProducibleMediaTypes(request, valueType, targetType)`：**服务器能生成的媒体类型**
  
  * `request.getAttribute(HandlerMapping.PRODUCIBLE_MEDIA_TYPES_ATTRIBUTE)`：从请求域获取默认的媒体类型
    * ` for (HttpMessageConverter<?> converter : this.messageConverters)`：遍历所有的消息转换器
    * `converter.canWrite(valueClass, null)`：是否支持当前的类型
    * ` result.addAll(converter.getSupportedMediaTypes())`：把当前 MessageConverter 支持的所有类型放入 result
  
* `List<MediaType> mediaTypesToUse = new ArrayList<>()`：存储最佳匹配的集合
  
* **内容协商：**
  
  ```java
    for (MediaType requestedType : acceptableTypes) {				// 遍历所有浏览器能接受的媒体类型
        for (MediaType producibleType : producibleTypes) {		// 遍历所有服务器能产出的
            if (requestedType.isCompatibleWith(producibleType)) {	// 判断类型是否匹配，最佳匹配
                // 数据协商匹配成功，一般有多种
                mediaTypesToUse.add(getMostSpecificMediaType(requestedType, producibleType));
            }
        }
    }
  ```
  
* `MediaType.sortBySpecificityAndQuality(mediaTypesToUse)`：按照相对品质因数 q 排序，降序排序，越大的越好
  
* `for (MediaType mediaType : mediaTypesToUse)`：**遍历所有的最佳匹配**，选择一种赋值给选择的类型
  
* `selectedMediaType = selectedMediaType.removeQualityValue()`：媒体类型去除相对品质因数
  
* `for (HttpMessageConverter<?> converter : this.messageConverters)`：**遍历所有的 HTTP 数据转换器**
  
* `GenericHttpMessageConverter genericConverter`：**MappingJackson2HttpMessageConverter 可以将对象写为 JSON**
  
* `((GenericHttpMessageConverter) converter).canWrite()`：判断转换器是否可以写出给定的类型
  
  `AbstractJackson2HttpMessageConverter#canWrit`
  
  * `if (!canWrite(mediaType))`：是否可以写出指定类型
      * `MediaType.ALL.equalsTypeAndSubtype(mediaType)`：是不是 `*/*` 类型
    * `getSupportedMediaTypes()`：支持 `application/json` 和 `application/*+json` 两种类型
      * `return true`：返回 true
    * `objectMapper = selectObjectMapper(clazz, mediaType)`：选择可以使用的 objectMapper 
    * `causeRef = new AtomicReference<>()`：获取并发安全的引用
    * `if (objectMapper.canSerialize(clazz, causeRef))`：objectMapper 可以序列化当前类
    * `return true`：返回 true
  
  * ` body = getAdvice().beforeBodyWrite()`：**获取要响应的所有数据，就是 Person 对象**
  
* `addContentDispositionHeader(inputMessage, outputMessage)`：检查路径
  
* `genericConverter.write(body, targetType, selectedMediaType, outputMessage)`：调用消息转换器的 write 方法
  
  `AbstractGenericHttpMessageConverter#write`：该类的方法
  
  * `addDefaultHeaders(headers, t, contentType)`：**设置响应头中的数据类型**
  
    ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/SpringMVC-服务器设置数据类型.png)
  
  * `writeInternal(t, type, outputMessage)`：**数据写出为 JSON 格式**
  
    * `Object value = object`：value 引用 Person 对象
    * `ObjectWriter objectWriter = objectMapper.writer()`：获取 ObjectWriter 对象
    * `objectWriter.writeValue(generator, value)`：使用 ObjectWriter 写出数据为 JSON





***



#### 协商策略

开启基于请求参数的内容协商模式：（SpringBoot 方式）

```yaml
spring.mvc.contentnegotiation:favor-parameter: true  # 开启请求参数内容协商模式
```

发请求： http://localhost:8080/person?format=json，解析 format

策略类为 ParameterContentNegotiationStrategy，运行流程如下：

* `acceptableTypes = getAcceptableMediaTypes(request)`：获取浏览器支持的媒体类型

  `mediaTypes = strategy.resolveMediaTypes(request)`：解析请求 URL 参数中的数据

  * `return resolveMediaTypeKey(webRequest, getMediaTypeKey(webRequest))`：

    `getMediaTypeKey(webRequest)`：

    * `request.getParameter(getParameterName())`：获取 URL 中指定的需求的数据类型
      * `getParameterName()`：获取参数的属性名 format
      * `getParameter()`：**获取 URL 中 format 对应的数据**

    `resolveMediaTypeKey()`：解析媒体类型，封装成集合

自定义内容协商策略：

```java
public class WebConfig implements WebMvcConfigurer {
    @Bean
    public WebMvcConfigurer webMvcConfigurer() {
        return new WebMvcConfigurer() {
            @Override	//自定义内容协商策略
            public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
                Map<String, MediaType> mediaTypes = new HashMap<>();
                mediaTypes.put("json", MediaType.APPLICATION_JSON);
                mediaTypes.put("xml",MediaType.APPLICATION_XML);
                mediaTypes.put("person",MediaType.parseMediaType("application/x-person"));
                // 指定支持解析哪些参数对应的哪些媒体类型
                ParameterContentNegotiationStrategy parameterStrategy = new ParameterContentNegotiationStrategy(mediaTypes);

                // 请求头解析
                HeaderContentNegotiationStrategy headStrategy = new HeaderContentNegotiationStrategy();

                // 添加到容器中，即可以解析请求头 又可以解析请求参数
                configurer.strategies(Arrays.asList(parameterStrategy,headStrategy));
            }
            
            @Override 	// 自定义消息转换器
            public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
                converters.add(new GuiguMessageConverter());
            }
        }
    }
}
```

也可以自定义 HttpMessageConverter，实现 HttpMessageConverter<T> 接口重写方法即可



***
