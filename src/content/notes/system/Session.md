---
title: "Session 会话"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Session, system]
summary: "Session：服务器端会话管理技术，本质也是采用客户端会话管理技术，不过在客户端保存的是一个特殊标识，共享的数据保存到了服务器的内存对象中。每次请求时，会将特殊标识带到服务器端，根据标识来找到对应的内存空间，从而实现数据共享。简单说它就是"
private: false
---

## Session

### 基本介绍

Session：服务器端会话管理技术，本质也是采用客户端会话管理技术，不过在客户端保存的是一个特殊标识，共享的数据保存到了服务器的内存对象中。每次请求时，会将特殊标识带到服务器端，根据标识来找到对应的内存空间，从而实现数据共享。简单说它就是一个服务端会话对象，用于存储用户的会话数据

Session 域（会话域）对象是 Servlet 规范中四大域对象之一，并且它也是用于实现数据共享的

| 域对象         | 功能   | 创建         | 销毁                                      | 使用场景                                                     |
| -------------- | ------ | ------------ | ----------------------------------------- | ------------------------------------------------------------ |
| ServletContext | 应用域 | 服务器启动   | 服务器关闭                                | 在整个应用之间实现数据共享<br />（记录网站访问次数，聊天室） |
| ServletRequest | 请求域 | 请求到来     | 响应了这个请求                            | 在当前请求或者请求转发之间实现数据共享                       |
| HttpSession    | 会话域 | getSession() | session过期，调用invalidate()，服务器关闭 | 在当前会话范围中实现数据共享，可以在多次请求中实现数据共享。<br />（验证码校验, 保存用户登录状态等） |



***



### 基本使用

#### 获取会话

HttpServletRequest类获取Session：

| 方法                                  | 说明                                      |
| ------------------------------------- | ----------------------------------------- |
| HttpSession getSession()              | 获取HttpSession对象                       |
| HttpSession getSession(boolean creat) | 获取HttpSession对象，未获取到是否自动创建 |

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Session获取的两个方法.png" style="zoom: 80%;" />



***



#### 常用API

| 方法                                         | 说明                             |
| -------------------------------------------- | -------------------------------- |
| void setAttribute(String name, Object value) | 设置会话域中的数据               |
| Object getAttribute(String name)             | 获取指定名称的会话域数据         |
| Enumeration<String> getAttributeNames()      | 获取所有会话域所有属性的名称     |
| void removeAttribute(String name)            | 移除会话域中指定名称的数据       |
| String getId()                               | 获取唯一标识名称，Jsessionid的值 |
| void invalidate()                            | 立即失效session                  |



****



#### 实现会话

通过第一个Servlet设置共享的数据用户名，并在第二个Servlet获取到

项目执行完以后，去浏览器抓包，Request Headers 中的 Cookie JSESSIONID的值是一样的

```java
@WebServlet("/servletDemo01")
public class ServletDemo01 extends HttpServlet{
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        //1.获取请求的用户名
        String username = req.getParameter("username");
        //2.获取HttpSession的对象
        HttpSession session = req.getSession();
        System.out.println(session);
        System.out.println(session.getId());
        //3.将用户名信息添加到共享数据中
        session.setAttribute("username",username);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        doGet(req,resp);
    }
}
```

```java
@WebServlet("/servletDemo02")
public class ServletDemo02 extends HttpServlet{
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        //1.获取HttpSession对象
        HttpSession session = req.getSession();
        //2.获取共享数据
        Object username = session.getAttribute("username");
        //3.将数据响应给浏览器
        resp.getWriter().write(username+"");
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        doGet(req,resp);
    }
}
```



****



#### 生命周期

Session 的创建：一个常见的错误是以为 Session 在有客户端访问时就被创建，事实是直到某 server 端程序（如 Servlet）调用 `HttpServletRequest.getSession(true)` 这样的语句时才会被创建

Session 在以下情况会被删除：

* 程序调用 HttpSession.invalidate()
* 距离上一次收到客户端发送的 session id 时间间隔超过了 session 的最大有效时间
* 服务器进程被停止

注意事项：

* 客户端只保存 sessionID 到 cookie 中，而不会保存 session
* 关闭浏览器只会使存储在客户端浏览器内存中的 cookie 失效，不会使服务器端的 session 对象失效，同样也不会使已经保存到硬盘上的持久化cookie消失

打开两个浏览器窗口访问应用程序会使用的是不同的session，通常 session cookie 是不能跨窗口使用，当新开了一个浏览器窗口进入相同页面时，系统会赋予一个新的 session id，实现跨窗口信息共享：

* 先把 session id 保存在 persistent cookie 中（通过设置session的最大有效时间）
* 在新窗口中读出来，就可以得到上一个窗口的 session id，这样通过 session cookie 和 persistent cookie 的结合就可以实现跨窗口的会话跟踪



***



### 会话问题

#### 禁用Cookie

浏览器禁用Cookie解决办法：

* 方式一：通过提示信息告知用户

  ```java
  @WebServlet("/servletDemo03")
  public class ServletDemo03 extends HttpServlet{
      @Override
      protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          //1.获取HttpSession对象
          HttpSession session = req.getSession(false);
          System.out.println(session);
          if(session == null) {
              resp.setContentType("text/html;charset=UTF-8");
              resp.getWriter().write("为了不影响正常的使用，请不要禁用浏览器的Cookie~");
          }
      }
  
      @Override
      protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
          doGet(req,resp);
      }
  }
  ```

* 方式二：访问时拼接 jsessionid 标识，通过 encodeURL() 方法**重写地址**

  ```java
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
      HttpSession session = req.getSession();
      //实现url重写  相当于在地址栏后面拼接了一个jsessionid
      resp.getWriter().write("<a href='"+ resp.encodeURL
                             ("http://localhost:8080/session/servletDemo03") +
                             "'>go servletDemo03</a>");
  
  }
  ```




***



#### 钝化活化

Session 存放在服务器端的内存中，可以做持久化管理。

钝化：序列化，持久态。把长时间不用，但还不到过期时间的 HttpSession 进行序列化写到磁盘上。

活化：相反的状态

何时钝化：

* 当访问量很大时，服务器会根据getLastAccessTime来进行排序，对长时间不用，但是还没到过期时间的HttpSession进行序列化（持久化）
* 当服务器进行重启的时候，为了保持客户HttpSession中的数据，也要对HttpSession进行序列化（持久化）

注意：

* HttpSession的持久化由服务器来负责管理，我们不用关心
* 只有实现了序列化接口的类才能被序列化





****
