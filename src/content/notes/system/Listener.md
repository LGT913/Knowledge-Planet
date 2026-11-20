---
title: "Listener 监听器"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Listener, system]
summary: "监听器：当事件源触发事件后，可以完成的功能。一般是一个接口，由使用者来实现。（此处的思想还涉及了一个策略模式）"
private: false
---

## Listener

### 观察者设计者

所有的监听器都是基于观察者设计模式的。

观察者模式通常由以下三部分组成：

* 事件源：触发事件的对象。

* 事件：触发的动作，里面封装了事件源。

* 监听器：当事件源触发事件后，可以完成的功能。一般是一个接口，由使用者来实现。（此处的思想还涉及了一个策略模式）



***



### 监听器分类

在程序当中，我们可以对：对象的创建销毁、域对象中属性的变化、会话相关内容进行监听。

Servlet规范中共计8个监听器，**监听器都是以接口形式提供**，具体功能需要我们自己完成

#### 监听对象

* ServletContextListener：用于监听ServletContext对象的创建和销毁

  | 方法                                             | 作用                 |
  | ------------------------------------------------ | -------------------- |
  | void contextInitialized(ServletContextEvent sce) | 对象创建时执行该方法 |
  | void contextDestroyed(ServletContextEvent sce)   | 对象销毁时执行该方法 |

  参数ServletContextEvent 代表事件对象，事件对象中封装了事件源ServletContext，真正的事件指的是创建或者销毁ServletContext对象的操作

* HttpSessionListener：用于监听HttpSession对象的创建和销毁

  | 方法                                       | 作用                 |
  | ------------------------------------------ | :------------------- |
  | void sessionCreated(HttpSessionEvent se)   | 对象创建时执行该方法 |
  | void sessionDestroyed(HttpSessionEvent se) | 对象销毁时执行该方法 |

  参数HttpSessionEvent 代表事件对象，事件对象中封装了事件源HttpSession，真正的事件指的是创建或者销毁HttpSession对象的操作

* ServletRequestListener：用于监听ServletRequest对象的创建和销毁

  | 方法                                             | 作用                 |
  | ------------------------------------------------ | :------------------- |
  | void requestInitialized(ServletRequestEvent sre) | 对象创建时执行该方法 |
  | void requestDestroyed(ServletRequestEvent sre)   | 对象销毁时执行该方法 |

  参数ServletRequestEvent 代表事件对象，事件对象中封装了事件源ServletRequest，真正的事件指的是创建或者销毁ServletRequest对象的操作



***



#### 监听域对象属性

* ServletContextAttributeListener：用于监听ServletContext应用域中属性的变化

  | 方法                                                       | 作用                     |
  | ---------------------------------------------------------- | ------------------------ |
  | void attributeAdded(ServletContextAttributeEvent event)    | 域中添加属性时执行该方法 |
  | void attributeRemoved(ServletContextAttributeEvent event)  | 域中移除属性时执行该方法 |
  | void attributeReplaced(ServletContextAttributeEvent event) | 域中替换属性时执行该方法 |

  参数ServletContextAttributeEvent 代表事件对象，事件对象中封装了事件源ServletContext，真正的事件指的是添加、移除、替换应用域中属性的操作

* HttpSessionAttributeListener：用于监听HttpSession会话域中属性的变化

  | 方法                                                  | 作用                     |
  | ----------------------------------------------------- | ------------------------ |
  | void attributeAdded(HttpSessionBindingEvent event)    | 域中添加属性时执行该方法 |
  | void attributeRemoved(HttpSessionBindingEvent event)  | 域中移除属性时执行该方法 |
  | void attributeReplaced(HttpSessionBindingEvent event) | 域中替换属性时执行该方法 |

  参数HttpSessionBindingEvent 代表事件对象，事件对象中封装了事件源HttpSession，真正的事件指的是添加、移除、替换应用域中属性的操作

* ServletRequestAttributeListener：用于监听ServletRequest请求域中属性的变化

  | 方法                                                      | 作用                     |
  | --------------------------------------------------------- | ------------------------ |
  | void attributeAdded(ServletRequestAttributeEvent srae)    | 域中添加属性时执行该方法 |
  | void attributeRemoved(ServletRequestAttributeEvent srae)  | 域中移除属性时执行该方法 |
  | void attributeReplaced(ServletRequestAttributeEvent srae) | 域中替换属性时执行该方法 |

  参数ServletRequestAttributeEvent 代表事件对象，事件对象中封装了事件源ServletRequest，真正的事件指的是添加、移除、替换应用域中属性的操作

* 页面域对象没有监听器



****



#### 感知型监听器

监听会话相关的感知型监听器，和会话域相关的两个感知型监听器是无需配置（注解）的，可以直接编写代码

* HttpSessionBindingListener：用于感知对象和会话域绑定的监听器

  | 方法                                             | 作用                                 |
  | ------------------------------------------------ | ------------------------------------ |
  | void valueBound(HttpSessionBindingEvent event)   | 数据添加到会话域中(绑定)时执行该方法 |
  | void valueUnbound(HttpSessionBindingEvent event) | 数据从会话域中移除(解绑)时执行该方法 |

  参数HttpSessionBindingEvent 代表事件对象，事件对象中封装了事件源HttpSession，真正的事件指的是添加、移除、替换应用域中属性的操作

* HttpSessionActivationListener：用于感知会话域中对象和钝化和活化的监听器

  | 方法                                           | 作用                         |
  | ---------------------------------------------- | ---------------------------- |
  | void sessionWillPassivate(HttpSessionEvent se) | 会话域中数据钝化时执行该方法 |
  | void sessionDidActivate(HttpSessionEvent se)   | 会话域中数据活化时执行该方法 |

  

***



### 监听器使用

#### ServletContextListener

ServletContext对象的创建和销毁的监听器

注解方式：

```java
@WebListener
public class ServletContextListenerDemo implements ServletContextListener {
    //创建时执行此方法
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        System.out.println("监听到对象的创建....");//启动服务器就创建

        ServletContext servletContext = sce.getServletContext();
        System.out.println(servletContext);
    }
    //销毁时执行的方法
    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        System.out.println("监听到对象的销毁...");//关闭服务器就销毁
    }
}
```

配置web.xml

```xml
<web-app>
<!--配置监听器-->
    <listener>
        <listener-class>listener.ServletContextAttributeListenerDemo</listener-class>
    </listener>
</web-app>
```



***



#### ServletContextAttributeListener

应用域对象中的属性变化的监听器

```java
public class ServletContextAttributeListenerDemo implements ServletContextAttributeListener{
    /*
        向应用域对象中添加属性时执行此方法
     */
    @Override
    public void attributeAdded(ServletContextAttributeEvent scae) {
        System.out.println("监听到了属性的添加...");

        //获取应用域对象
        ServletContext servletContext = scae.getServletContext();
        //获取属性
        Object value = servletContext.getAttribute("username");
        System.out.println(value);//zhangsan 
    }

    /*
        向应用域对象中替换属性时执行此方法
     */
    @Override
    public void attributeReplaced(ServletContextAttributeEvent scae) {
        System.out.println("监听到了属性的替换...");

        //获取应用域对象
        ServletContext servletContext = scae.getServletContext();
        //获取属性
        Object value = servletContext.getAttribute("username");
        System.out.println(value);//lisi
    }

    /*
        向应用域对象中移除属性时执行此方法
     */
    @Override
    public void attributeRemoved(ServletContextAttributeEvent scae) {
        System.out.println("监听到了属性的移除...");

        //获取应用域对象
        ServletContext servletContext = scae.getServletContext();
        //获取属性
        Object value = servletContext.getAttribute("username");
        System.out.println(value);//null
    }
}
```

```java
public class ServletContextListenerDemo implements ServletContextListener{
    //ServletContext对象创建的时候执行此方法
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        System.out.println("监听到了对象的创建...");
        //获取对象
        ServletContext servletContext = sce.getServletContext();

        //添加属性
        servletContext.setAttribute("username","zhangsan");

        //替换属性
        servletContext.setAttribute("username","lisi");

        //移除属性
        servletContext.removeAttribute("username");
    }

    //ServletContext对象销毁的时候执行此方法
    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        System.out.println("监听到了对象的销毁...");
    }
}
```

控制台输出：

```html
监听到了对象的创建...
监听到了属性的添加...
zhangsan
监听到了属性的替换
lisi
监听到属性的移除
null
```







****





# JS

## 概述

JavaScript 是一种客户端脚本语言。运行在客户端浏览器中，每一个浏览器都具备解析 JavaScript 的引擎。

脚本语言：不需要编译，就可以被浏览器直接解析执行了。

作用：增强用户和 HTML 页面的交互过程，让页面产生动态效果，增强用户的体验。

组成部分：ECMAScript、DOM、BOM

开发环境搭建：安装Node.js，是JavaScript运行环境



***
