---
title: "自定义"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 自定义, system]
summary: "@EnableWebMvc：全面接管 SpringMVC，所有规则全部自己重新配置"
private: false
---

### 自定义

#### 定制规则

```java
@Configuration
public class MyWebMvcConfigurer implements WebMvcConfigurer {
    @Bean
    public WebMvcConfigurer webMvcConfigurer() {
        return new WebMvcConfigurer() {
            //进行一些方法重写，来实现自定义的规则
            //比如添加一些解析器和拦截器，就是对原始容器功能的增加
        }
    }
    //也可以不加 @Bean，直接从这里重写方法进行功能增加
}
```



***



#### 定制容器

@EnableWebMvc：全面接管 SpringMVC，所有规则全部自己重新配置

- @EnableWebMvc + WebMvcConfigurer + @Bean  全面接管SpringMVC

- @Import(DelegatingWebMvcConfiguration.**class**)，该类继承 WebMvcConfigurationSupport，自动配置了一些非常底层的组件，只能保证 SpringMVC 最基本的使用

原理：自动配置类 **WebMvcAutoConfiguration** 里面的配置要能生效，WebMvcConfigurationSupport 类不能被加载，所以 @EnableWebMvc 导致配置类失效，从而接管了 SpringMVC

```java
@ConditionalOnMissingBean(WebMvcConfigurationSupport.class)
public class WebMvcAutoConfiguration {}
```

注意：一般不适用此注解





***
