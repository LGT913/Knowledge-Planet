---
title: "Restful"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Restful, system]
summary: "Rest（REpresentational State Transfer）：表现层状态转化，定义了资源在网络传输中以某种表现形式进行状态转移，即网络资源的访问方式"
private: false
---

### Restful

#### 基本介绍

Rest（REpresentational State Transfer）：表现层状态转化，定义了**资源在网络传输中以某种表现形式进行状态转移**，即网络资源的访问方式

* 资源：把真实的对象数据称为资源，一个资源既可以是一个集合，也可以是单个个体；每一种资源都有特定的 URI（统一资源标识符）与之对应，如果获取这个资源，访问这个 URI 就可以，比如获取特定的班级 `/class/12`；资源也可以包含子资源，比如 `/classes/classId/teachers` 某个指定班级的所有老师
* 表现形式：资源是一种信息实体，它可以有多种外在表现形式，把资源具体呈现出来的形式比如 json、xml、image、txt 等等叫做它的"表现层/表现形式"
* 状态转移：描述的服务器端资源的状态，比如增删改查（通过 HTTP 动词实现）引起资源状态的改变，互联网通信协议 HTTP 协议，是一个**无状态协议**，所有的资源状态都保存在服务器端



***



#### 访问方式

Restful 是按照 Rest 风格访问网络资源

* 传统风格访问路径：http://localhost/user/get?id=1
* Rest 风格访问路径：http://localhost/user/1

优点：隐藏资源的访问行为，通过地址无法得知做的是何种操作，书写简化

Restful 请求路径简化配置方式：`@RestController = @Controller + @ResponseBody`

相关注解：@GetMapping 注解是 @RequestMapping 注解的衍生，所以效果是一样的，建议使用 @GetMapping 

* `@GetMapping("/poll")` = `@RequestMapping(value = "/poll",method = RequestMethod.GET)`

  ```java
  @RequestMapping(method = RequestMethod.GET)			// @GetMapping 就拥有了 @RequestMapping 的功能
  public @interface GetMapping {
      @AliasFor(annotation = RequestMapping.class)	// 与 RequestMapping 相通
  	String name() default "";
  }
  ```

* `@PostMapping("/push")` = `@RequestMapping(value = "/push",method = RequestMethod.POST)`


过滤器：HiddenHttpMethodFilter 是 SpringMVC 对 Restful 风格的访问支持的过滤器

代码实现：

* restful.jsp：

  * 页面表单**使用隐藏域提交请求类型**，参数名称固定为 _method，必须配合提交类型 method=post 使用

  * GET 请求通过地址栏可以发送，也可以通过设置 form 的请求方式提交
  * POST 请求必须通过 form 的请求方式提交

  ```html
  <h1>restful风格请求表单</h1>
  <!--切换请求路径为restful风格-->
  <form action="/user" method="post">
  	<!--一隐藏域，切换为PUT请求或DELETE请求，但是form表单的提交方式method属性必须填写post-->
  	<input name="_method" type="hidden" value="PUT"/>
  	<input value="REST-PUT 提交" type="submit"/>
  </form>
  ```

* java / controller / UserController

  ```java
  @RestController				//设置rest风格的控制器
  @RequestMapping("/user/")	//设置公共访问路径，配合下方访问路径使用
  public class UserController {
      @GetMapping("/user")
      //@RequestMapping(value = "/user",method = RequestMethod.GET)
      public String getUser(){
          return "GET-张三";
      }
  
      @PostMapping("/user")
      //@RequestMapping(value = "/user",method = RequestMethod.POST)
      public String saveUser(){
          return "POST-张三";
      }
  
      @PutMapping("/user")
      //@RequestMapping(value = "/user",method = RequestMethod.PUT)
      public String putUser(){
          return "PUT-张三";
      }
  
      @DeleteMapping("/user")
      //@RequestMapping(value = "/user",method = RequestMethod.DELETE)
      public String deleteUser(){
          return "DELETE-张三";
      }
  }
  ```

* 配置拦截器 web.xml

  ```xml
  <!--配置拦截器，解析请求中的参数_method，否则无法发起PUT请求与DELETE请求，配合页面表单使用-->
  <filter>
      <filter-name>HiddenHttpMethodFilter</filter-name>
      <filter-class>org.springframework.web.filter.HiddenHttpMethodFilter</filter-class>
  </filter>
  <filter-mapping>
      <filter-name>HiddenHttpMethodFilter</filter-name>
      <servlet-name>DispatcherServlet</servlet-name>
  </filter-mapping>
  ```



***



#### 参数注解

Restful 开发中的参数注解

```java
@GetMapping("{id}")
public String getMessage(@PathVariable("id") Integer id){
}
```

使用 @PathVariable 注解获取路径上配置的具名变量，一般在有多个参数的时候添加

其他注解：

* @RequestHeader：获取请求头
* @RequestParam：获取请求参数（指问号后的参数，url?a=1&b=2）
* @CookieValue：获取 Cookie 值
* @RequestAttribute：获取 request 域属性
* @RequestBody：获取请求体 [POST]
* @MatrixVariable：矩阵变量
* @ModelAttribute：自定义类型变量

```java
@RestController	
@RequestMapping("/user/")
public class UserController {
    //rest风格访问路径简化书写方式，配合类注解@RequestMapping使用
    @RequestMapping("{id}")
    public String restLocation2(@PathVariable Integer id){
        System.out.println("restful is running ....get:" + id);
        return "success.jsp";
    }

    //@RequestMapping(value = "{id}",method = RequestMethod.GET)
    @GetMapping("{id}")
    public String get(@PathVariable Integer id){
        System.out.println("restful is running ....get:" + id);
        return "success.jsp";
    }

    @PostMapping("{id}")
    public String post(@PathVariable Integer id){
        System.out.println("restful is running ....post:" + id);
        return "success.jsp";
    }

    @PutMapping("{id}")
    public String put(@PathVariable Integer id){
        System.out.println("restful is running ....put:" + id);
        return "success.jsp";
    }

    @DeleteMapping("{id}")
    public String delete(@PathVariable Integer id){
        System.out.println("restful is running ....delete:" + id);
        return "success.jsp";
    }
}
```





****



#### 识别原理

表单提交要使用 REST 时，会带上 `_method=PUT`，请求过来被 `HiddenHttpMethodFilter` 拦截，进行过滤操作

org.springframework.web.filter.HiddenHttpMethodFilter.doFilterInternal()：

```java
public class HiddenHttpMethodFilter extends OncePerRequestFilter {
    // 兼容的请求 PUT、DELETE、PATCH
    private static final List<String> ALLOWED_METHODS =
			Collections.unmodifiableList(Arrays.asList(HttpMethod.PUT.name(),
					HttpMethod.DELETE.name(), HttpMethod.PATCH.name()));
    // 隐藏域的名字
	public static final String DEFAULT_METHOD_PARAM = "_method";

	private String methodParam = DEFAULT_METHOD_PARAM;
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        HttpServletRequest requestToUse = request;
        // 请求必须是 POST，
        if ("POST".equals(request.getMethod()) && request.getAttribute(WebUtils.ERROR_EXCEPTION_ATTRIBUTE) == null) {
            // 获取标签中 name="_method" 的 value 值
            String paramValue = request.getParameter(this.methodParam);
            if (StringUtils.hasLength(paramValue)) {
                // 转成大写
                String method = paramValue.toUpperCase(Locale.ENGLISH);
                // 兼容的请求方式
                if (ALLOWED_METHODS.contains(method)) {
                    // 包装请求
                    requestToUse = new HttpMethodRequestWrapper(request, method);
                }
            }
        }
        // 过滤器链放行的时候用wrapper。以后的方法调用getMethod是调用requesWrapper的
        filterChain.doFilter(requestToUse, response);
    }
}
```

Rest 使用客户端工具，如 Postman 可直接发送 put、delete 等方式请求不被过滤

改变默认的 `_method` 的方式：

```java
@Configuration(proxyBeanMethods = false)
public class WebConfig{
    //自定义filter
    @Bean
    public HiddenHttpMethodFilter hiddenHttpMethodFilter(){
        HiddenHttpMethodFilter methodFilter = new HiddenHttpMethodFilter();
        //通过set 方法自定义
        methodFilter.setMethodParam("_m");
        return methodFilter;
    }    
}
```



***
