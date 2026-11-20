---
title: "Cookie 会话"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Cookie, system]
summary: "浏览器和服务器可能产生多次的请求和响应，从浏览器访问服务器开始，到访问服务器结束（关闭浏览器、到了过期时间），这期间产生的多次请求和响应加在一起称为浏览器和服务器之间的一次对话"
private: false
---

## Cookie

### 会话技术

**会话**：浏览器和服务器之间的多次请求和响应

浏览器和服务器可能产生多次的请求和响应，从浏览器访问服务器开始，到访问服务器结束（关闭浏览器、到了过期时间），这期间产生的多次请求和响应加在一起称为浏览器和服务器之间的一次对话

作用：保存用户各自的数据（以浏览器为单位），在多次请求间实现数据共享

**常用的会话管理技术**：

* Cookie：客户端会话管理技术，用户浏览的信息以键值对（key=value）的形式保存在浏览器上。如果没有关闭浏览器，再次访问服务器，会把 cookie 带到服务端，服务端就可以做相应的处理
* Session：服务端会话管理技术。当客户端第一次请求 session 对象时，服务器为每一个浏览器开辟一块内存空间，并将通过特殊算法算出一个 session 的 ID，用来标识该 session 对象。由于内存空间是每一个浏览器独享的，所有用户在访问的时候，可以把信息保存在 session 对象中，同时服务器会把 sessionId 写到 cookie 中，再次访问的时候，浏览器会把 cookie(sessionId) 带过来，找到对应的 session 对象即可

  tomcat 生成的 sessionID 叫做 jsessionID

两者区别：

* Cookie 存储在客户端中，而 Session 存储在服务器上，相对来说 Session 安全性更高。如果要在 Cookie 中存储一些敏感信息，不要直接写入 Cookie，应该将 Cookie 信息加密然后使用到的时候再去服务器端解密

* Cookie 一般用来保存用户信息，在 Cookie 中保存已经登录过得用户信息，下次访问网站的时候就不需要重新登录，因为用户登录的时候可以存放一个 Token 在 Cookie 中，下次登录的时候只需要根据 Token 值来查找用户即可（为了安全考虑，重新登录一般要将 Token 重写），所以登录一次网站后访问网站其他页面不需要重新登录

* Session 通过服务端记录用户的状态，服务端给特定的用户创建特定的 Session 之后就可以标识这个用户并且跟踪这个用户

* Cookie 只能存储 ASCII 码，而 Session 可以存储任何类型的数据



参考文章：https://blog.csdn.net/weixin_43625577/article/details/92393581



***



### 基本介绍

Cookie：客户端会话管理技术，把要共享的数据保存到了客户端（也就是浏览器端）。每次请求时，把会话信息带到服务器，从而实现多次请求的数据共享。

作用：保存客户浏览器访问网站的相关内容（需要客户端不禁用 Cookie），从而在每次访问同一个内容时，先从本地缓存获取，使资源共享，提高效率。

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/Cookie类讲解.png)



***



### 基本使用

#### 常用API

* **Cookie属性：**

  | 属性名称 | 属性作用                 | 是否重要 |
  | -------- | ------------------------ | -------- |
  | name     | cookie的名称             | 必要属性 |
  | value    | cookie的值（不能是中文） | 必要属性 |
  | path     | cookie的路径             | 重要     |
  | domain   | cookie的域名             | 重要     |
  | maxAge   | cookie的生存时间         | 重要     |
  | version  | cookie的版本号           | 不重要   |
  | comment  | cookie的说明             | 不重要   |

  注意：Cookie 有大小，个数限制。每个网站最多只能存20个 Cookie，且大小不能超过 4kb。同时所有网站的 Cookie 总数不超过300个。

* **Cookie类API：**

  * `Cookie(String name, String value)` : 构造方法创建 Cookie 对象

  * Cookie 属性对应的 set 和 get 方法，name 属性被 final 修饰，没有 set 方法    

* HttpServletResponse 类 API：
  
  * `void addCookie(Cookie cookie)`：向客户端添加 Cookie，Adds cookie to the response
  
* HttpServletRequest类API：

  * `Cookie[] getCookies()`：获取所有的 Cookie 对象，client sent with this request



***



#### 有效期

如果不设置过期时间，表示这个 Cookie 生命周期为浏览器会话期间，只要关闭浏览器窗口 Cookie 就消失，这种生命期为浏览会话期的 Cookie 被称为会话 Cookie，会话 Cookie 一般不保存在硬盘上而是保存在内存里。

如果设置过期时间，浏览器就会把 Cookie 保存到硬盘上，关闭后再次打开浏览器，这些 Cookie 依然有效直到超过设定的过期时间。存储在硬盘上的 Cookie 可以在**不同的浏览器进程间共享**，比如两个 IE 窗口，而对于保存在内存的 Cookie，不同的浏览器有不同的处理方式

设置 Cookie 存活时间 API：`void setMaxAge(int expiry)` 

* -1：默认，代表 Cookie 数据存到浏览器关闭（保存在浏览器文件中）
* 0：代表删除 Cookie，如果要删除 Cookie 要确保**路径一致**
* 正整数：以秒为单位保存数据有有效时间（把缓存数据保存到磁盘中）

```java
@WebServlet("/servletDemo01")
public class ServletDemo01 extends HttpServlet{
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        //1.通过响应对象写出提示信息
        resp.setContentType("text/html;charset=UTF-8");
        PrintWriter pw = resp.getWriter();
        pw.write("欢迎访问本网站，您的最后访问时间为：<br>");

        //2.创建Cookie对象，用于记录最后访问时间
        Cookie cookie = new Cookie("time",System.currentTimeMillis()+"");

        //3.设置最大存活时间
        cookie.setMaxAge(3600);
        //cookie.setMaxAge(0);    // 立即清除

        //4.将cookie对象添加到客户端
        resp.addCookie(cookie);

        //5.获取cookie
        Cookie[] cookies = req.getCookies();
        for(Cookie c : cookies) {
            if("time".equals(c.getName())) {
                //6.获取cookie对象中的value，进行写出
                String value = c.getValue();
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                pw.write(sdf.format(Long.parseLong(value)));
            }
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        doGet(req,resp);
    }
}

```



***



#### 有效路径

`setPath(String url)` : Cookie 设置有效路径

有效路径作用 :

1. 保证不会携带别的网站/项目里面的 Cookie 到我们自己的项目
2. 路径不一样，Cookie 的 key 可以相同
3. 保证自己的项目可以合理的利用自己项目的 Cookie

判断路径是否携带 Cookie：请求资源 URI.startWith(cookie的path)，返回 true 就带

| 访问URL                                                      | URI部分                    | Cookie的Path | 是否携带Cookie | 能否取到Cookie |
| ------------------------------------------------------------ | -------------------------- | ------------ | -------------- | -------------- |
| [servletDemo02](http://localhost:8080/servlet/servletDemo02) | /servlet/servletDemo02     | /servlet/    | 带             | 能取到         |
| [servletDemo03](http://localhost:8080/servlet/servletDemo03) | /servlet/servletDemo03     | /servlet/    | 带             | 能取到         |
| [servletDemo04](http://localhost:8080/servlet/aaa/servletDemo03) | /servlet/aaa/servletDemo04 | /servlet/    | 带             | 能取到         |
| [servletDemo05](http://localhost:8080/bbb/servletDemo03)     | /bbb/servletDemo04         | /servlet/    | 不带           | 不能取到       |

只有当访问资源的 url 包含此 cookie 的有效 path 的时候，才会携带这个 cookie

想要当前项目下的 Servlet 可以使用该 cookie，一般设置：`cookie.setPath(request.getContextPath())`



****



#### 安全性

如果 Cookie 中设置了 HttpOnly 属性，通过 js 脚本将无法读取到 cookie 信息，这样能有效的防止 XSS 攻击，窃取 cookie 内容，这样就增加了安全性，即便是这样，也不要将重要信息存入cookie。

XSS 全称 Cross SiteScript，跨站脚本攻击，是Web程序中常见的漏洞，XSS 属于被动式且用于客户端的攻击方式，所以容易被忽略其危害性。其原理是攻击者向有 XSS 漏洞的网站中输入(传入)恶意的 HTML 代码，当其它用户浏览该网站时，这段HTML代码会自动执行，从而达到攻击的目的。如盗取用户 Cookie、破坏页面结构、重定向到其它网站等。




***
