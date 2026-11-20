---
title: "Filter案例"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Filter案例, system]
summary: "在访问html，js，image时，不需要每次都重新发送请求读取资源，就可以通过设置响应消息头的方式，设置缓存时间。但是如果每个Servlet都编写相同的代码，显然不符合我们统一调用和维护的理念。"
private: false
---

### Filter案例

在访问html，js，image时，不需要每次都重新发送请求读取资源，就可以通过设置响应消息头的方式，设置缓存时间。但是如果每个Servlet都编写相同的代码，显然不符合我们统一调用和维护的理念。

静态资源设置缓存时间：html设置为1小时，js设置为2小时，css设置为3小时

* 配置过滤器

  ```xml
  <filter>
      <filter-name>StaticResourceNeedCacheFilter</filter-name>
      <filter-class>filter.StaticResourceNeedCacheFilter</filter-class>
      <init-param>
          <param-name>html</param-name>
          <param-value>3</param-value>
      </init-param>
      <init-param>
          <param-name>js</param-name>
          <param-value>4</param-value>
      </init-param>
      <init-param>
          <param-name>css</param-name>
          <param-value>5</param-value>
      </init-param>
  </filter>
  <filter-mapping>
      <filter-name>StaticResourceNeedCacheFilter</filter-name>
      <url-pattern>*.html</url-pattern>
  </filter-mapping>
  <filter-mapping>
      <filter-name>StaticResourceNeedCacheFilter</filter-name>
      <url-pattern>*.js</url-pattern>
  </filter-mapping>
  <filter-mapping>
      <filter-name>StaticResourceNeedCacheFilter</filter-name>
      <url-pattern>*.css</url-pattern>
  </filter-mapping>
  ```

* 编写过滤器

  ```java
  public class StaticResourceNeedCacheFilter implements Filter {
  	private FilterConfig filterConfig;//获取初始化参数
      @Override
  	public void init(FilterConfig filterConfig) throws ServletException {
          this.filterConfig = filterConfig;
      }
      
      @Override
      public void doFilter(ServletRequest req, ServletResponse res,
                           FilterChain chain) throws IOException, ServletException {
          //1.把doFilter的请求和响应对象转换成跟http协议有关的对象
          HttpServletRequest  request;
          HttpServletResponse response;
          try {
              request = (HttpServletRequest) req;
              response = (HttpServletResponse) res;
          } catch (ClassCastException e) {
              throw new ServletException("non-HTTP request or response");
          }
          //2.获取请求资源URI
          String uri = request.getRequestURI();
          //3.得到请求资源到底是什么类型
          String extend = uri.substring(uri.lastIndexOf(".")+1);//我们只需要判断它是不是html,css,js。其他的不管
          //4.判断到底是什么类型的资源
          long time = 60*60*1000;
          if("html".equals(extend)){
              //html 缓存1小时
              String html = filterConfig.getInitParameter("html");
              time = time*Long.parseLong(html);
          }else if("js".equals(extend)){
              //js 缓存2小时
              String js = filterConfig.getInitParameter("js");
              time = time*Long.parseLong(js);
          }else if("css".equals(extend)){
              //css 缓存3小时
              String css = filterConfig.getInitParameter("css");
              time = time*Long.parseLong(css);
  
          }
          //5.设置响应消息头
          response.setDateHeader("Expires", System.currentTimeMillis()+time);
          //6.放行
          chain.doFilter(request, response);
      }
      
      @Override
      public void destroy() {}
  }
  ```

  



***
