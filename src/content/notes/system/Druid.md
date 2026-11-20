---
title: "Druid"
date: 2023-09-26
planet: system
tags: ["Java", "基础", Druid, system]
summary: "- 扩展配置项 spring.datasource.druid - DruidSpringAopConfiguration： 监控 SpringBean，配置项为 spring.datasource.druid.aop-patterns"
private: false
---

### Druid

导入坐标：

```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>1.1.17</version>
</dependency>
```

```java
@Configuration
@ConditionalOnClass(DruidDataSource.class)
@AutoConfigureBefore(DataSourceAutoConfiguration.class)
@EnableConfigurationProperties({DruidStatProperties.class, DataSourceProperties.class})
@Import({DruidSpringAopConfiguration.class,
    DruidStatViewServletConfiguration.class,
    DruidWebStatFilterConfiguration.class,
    DruidFilterConfiguration.class})
public class DruidDataSourceAutoConfigure {}
```

自动配置：

- 扩展配置项 **spring.datasource.druid**
- DruidSpringAopConfiguration： 监控 SpringBean，配置项为 `spring.datasource.druid.aop-patterns`

- DruidStatViewServletConfiguration：监控页的配置项为 `spring.datasource.druid.stat-view-servlet`，默认开启
- DruidWebStatFilterConfiguration：Web 监控配置项为 `spring.datasource.druid.web-stat-filter`，默认开启

- DruidFilterConfiguration：所有 Druid 自己 filter 的配置

配置示例：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/db_account
    username: root
    password：[已隐藏]
    driver-class-name: com.mysql.jdbc.Driver

    druid:
      aop-patterns: com.atguigu.admin.*  #监控SpringBean
      filters: stat,wall     # 底层开启功能，stat（sql监控），wall（防火墙）

      stat-view-servlet:   # 配置监控页功能
        enabled: true
        login-username: admin	#项目启动访问：http://localhost:8080/druid ，账号和密码是 admin
        login-password: admin
        resetEnable: false

      web-stat-filter:  # 监控web
        enabled: true
        urlPattern: /*
        exclusions: '*.js,*.gif,*.jpg,*.png,*.css,*.ico,/druid/*'


      filter:
        stat:    # 对上面filters里面的stat的详细配置
          slow-sql-millis: 1000
          logSlowSql: true
          enabled: true
        wall:
          enabled: true
          config:
            drop-table-allow: false
```



配置示例：https://github.com/alibaba/druid/tree/master/druid-spring-boot-starter

配置项列表：https://github.com/alibaba/druid/wiki/DruidDataSource%E9%85%8D%E7%BD%AE%E5%B1%9E%E6%80%A7%E5%88%97%E8%A1%A8



****
