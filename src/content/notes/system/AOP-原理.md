---
title: "AOP 原理"
date: 2023-09-26
planet: system
tags: ["Java", "基础", AOP 原理, system]
summary: "装饰者模式（Decorator Pattern）：在不惊动原始设计的基础上，为其添加功能"
private: false
---

### AOP 原理

#### 静态代理

装饰者模式（Decorator Pattern）：在不惊动原始设计的基础上，为其添加功能

```java
public class UserServiceDecorator implements UserService{
    private UserService userService;
    
    public UserServiceDecorator(UserService userService) {
        this.userService = userService;
    }
    
    public void save() {
        //原始调用
        userService.save();
        //增强功能（后置）
        System.out.println("后置增强功能");
    }
}
```



***



#### Proxy

JDKProxy 动态代理是针对对象做代理，要求原始对象具有接口实现，并对接口方法进行增强，因为**代理类继承Proxy**

静态代理和动态代理的区别：

* 静态代理是在编译时就已经将接口、代理类、被代理类的字节码文件确定下来
* 动态代理是程序在运行后通过反射创建字节码文件交由 JVM 加载

```java
public class UserServiceJDKProxy {
    public static UserService createUserServiceJDKProxy(UserService userService) {
        UserService service = (UserService) Proxy.newProxyInstance(
            userService.getClass().getClassLoader(),//获取被代理对象的类加载器
            userService.getClass().getInterfaces(),	//获取被代理对象实现的接口
            new InvocationHandler() {				//对原始方法执行进行拦截并增强
				@Override
				public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
                    if (method.getName().equals("save")) {
                        System.out.println("前置增强");
                        Object ret = method.invoke(userService, args);
                        System.out.println("后置增强");
                        return ret;
                    }
                    return null;
				}
 			});
        return service;
    }
}
```



***



#### CGLIB

CGLIB（Code Generation Library）：Code 生成类库 

CGLIB 特点：

* CGLIB 动态代理**不限定**是否具有接口，可以对任意操作进行增强
* CGLIB 动态代理无需要原始被代理对象，动态创建出新的代理对象
* CGLIB **继承被代理类**，如果代理类是 final 则不能实现

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/AOP底层原理-cglib.png)

* CGLIB 类

  * JDKProxy 仅对接口方法做增强，CGLIB 对所有方法做增强，包括 Object 类中的方法（toString、hashCode）
  * 返回值类型采用多态向下转型，所以需要设置父类类型

  需要对方法进行判断是否是 save，来选择性增强

  ```java
  public class UserServiceImplCglibProxy {
      public static UserService createUserServiceCglibProxy(Class cls){
          //1.创建Enhancer对象（可以理解为内存中动态创建了一个类的字节码）
          Enhancer enhancer = new Enhancer();
          
          //2.设置Enhancer对象的父类是指定类型UserServerImpl
          enhancer.setSuperclass(cls);
          
          //3.设置回调方法
          enhancer.setCallback(new MethodInterceptor() {
              @Override
              public Object intercept(Object o, Method m, Object[] args, MethodProxy mp) throws Throwable {
                  //o是被代理出的类创建的对象，所以使用MethodProxy调用，并且是调用父类
                  //通过调用父类的方法实现对原始方法的调用
                  Object ret = methodProxy.invokeSuper(o, args);
                  //后置增强内容,需要判断是都是save方法
                  if (method.getName().equals("save")) {
                      System.out.println("I love Java");
                  }
                  return ret;
              }
          });
          //使用Enhancer对象创建对应的对象
          return (UserService)enhancer.create();
      }
  }
  ```

* Test类

  ```java
  public class App {
      public static void main(String[] args) {
          UserService userService = UserServiceCglibProxy.createUserServiceCglibProxy(UserServiceImpl.class);
          userService.save();
      }
  }
  ```

  



***



#### 代理选择

Spirng 可以通过配置的形式控制使用的代理形式，Spring 会先判断是否实现了接口，如果实现了接口就使用 JDK 动态代理，如果没有实现接口则使用 CGLIB 动态代理，通过配置可以修改为使用 CGLIB 

- XML 配置

  ```xml
  <!--XML配置AOP-->
  <aop:config proxy-target-class="false"></aop:config>
  ```

- XML 注解支持

  ```xml
  <!--注解配置AOP-->
  <aop:aspectj-autoproxy proxy-target-class="false"/>
  ```

- 注解驱动

  ```java
  //修改为使用 cglib 创建代理对象
  @EnableAspectJAutoProxy(proxyTargetClass = true)
  ```

* JDK 动态代理和 CGLIB 动态代理的区别：

  * JDK 动态代理只能对实现了接口的类生成代理，没有实现接口的类不能使用。
  * CGLIB 动态代理即使被代理的类没有实现接口也可以使用，因为 CGLIB 动态代理是使用继承被代理类的方式进行扩展
  * CGLIB 动态代理是通过继承的方式，覆盖被代理类的方法来进行代理，所以如果方法是被 final 修饰的话，就不能进行代理





***



#### 织入时机

![AOP织入时机](https://seazean.oss-cn-beijing.aliyuncs.com/img/Frame/AOP织入时机.png)





***
