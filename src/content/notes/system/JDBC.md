---
title: "JDBC"
date: 2023-09-26
planet: system
tags: ["Java", "基础", JDBC, system]
summary: "单独导入 MySQL 驱动是因为不确定用户使用的什么数据库"
private: false
---

## 数据访问

### JDBC

#### 基本使用

导入 starter：

```xml
<!--导入 JDBC 场景-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jdbc</artifactId>
</dependency>
<!--导入 MySQL 驱动-->
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <!--版本对应你的 MySQL 版本<version>5.1.49</version>-->
</dependency>
```

单独导入 MySQL 驱动是因为不确定用户使用的什么数据库

配置文件：

```yaml
spring:
  datasource:
    url: jdbc:mysql://192.168.0.107:3306/db1?useSSL=false	# 不加 useSSL 会警告
    username: root
    password：[已隐藏]
    driver-class-name: com.mysql.jdbc.Driver
```

测试文件：

```java
@Slf4j
@SpringBootTest
class Boot05WebAdminApplicationTests {

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {
        Long res = jdbcTemplate.queryForObject("select count(*) from account_tbl", Long.class);
        log.info("记录总数：{}", res);
    }
}
```





****



#### 自动配置

DataSourceAutoConfiguration：数据源的自动配置

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {
    
	@Conditional(PooledDataSourceCondition.class) 
	@ConditionalOnMissingBean({ DataSource.class, XADataSource.class })
	@Import({ DataSourceConfiguration.Hikari.class, DataSourceConfiguration.Tomcat.class,
			DataSourceConfiguration.Dbcp2.class, DataSourceConfiguration.OracleUcp.class})
	protected static class PooledDataSourceConfiguration {}
}
// 配置项
@ConfigurationProperties(prefix = "spring.datasource")
public class DataSourceProperties implements BeanClassLoaderAware, InitializingBean {}
```

- 底层默认配置好的连接池是：**HikariDataSource**
- 数据库连接池的配置，是容器中没有 DataSource 才自动配置的
- 修改数据源相关的配置：spring.datasource

相关配置：

- DataSourceTransactionManagerAutoConfiguration： 事务管理器的自动配置
- JdbcTemplateAutoConfiguration： JdbcTemplate 的自动配置
  - 可以修改这个配置项 @ConfigurationProperties(prefix = **"spring.jdbc"**) 来修改JdbcTemplate
  - `@AutoConfigureAfter(DataSourceAutoConfiguration.class)`：在 DataSource 装配后装配
- JndiDataSourceAutoConfiguration： jndi 的自动配置
- XADataSourceAutoConfiguration： 分布式事务相关





****
