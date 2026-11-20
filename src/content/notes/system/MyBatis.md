---
title: "MyBatis"
date: 2023-09-26
planet: system
tags: ["Java", "基础", MyBatis, system]
summary: "编写 MyBatis 相关配置：application.yml"
private: false
---

### MyBatis

#### 基本使用

导入坐标：

```xml
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>2.1.4</version>
</dependency>
```

* 编写 MyBatis 相关配置：application.yml

  ```yaml
  # 配置mybatis规则
  mybatis:
  #  config-location: classpath:mybatis/mybatis-config.xml  建议不写
    mapper-locations: classpath:mybatis/mapper/*.xml
    configuration:
      map-underscore-to-camel-case: true
      
   #可以不写全局配置文件，所有全局配置文件的配置都放在 configuration 配置项中即可
  ```

* 定义表和实体类

  ```java
  public class User {
      private int id;
      private String username;
      private String password;
  }
  ```

* 编写 dao 和 mapper 文件/纯注解开发

  dao：**@Mapper 注解必须加，使用自动装配的 package，否则在启动类指定 @MapperScan() 扫描路径（不建议）**

  ```java
  @Mapper  //必须加Mapper
  @Repository
  public interface UserXmlMapper {
      public List<User> findAll();
  }
  ```

  mapper.xml

  ```xml
  <?xml version="1.0" encoding="UTF-8" ?>
  <!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
  <mapper namespace="com.seazean.springbootmybatis.mapper.UserXmlMapper">
      <select id="findAll" resultType="user">
          select * from t_user
      </select>
  </mapper>
  ```

* 纯注解开发

  ```java
  @Mapper
  @Repository
  public interface UserMapper {
      @Select("select * from t_user")
      public List<User> findAll();
  }
  ```



****



#### 自动配置

MybatisAutoConfiguration：

```java
@EnableConfigurationProperties(MybatisProperties.class)	//MyBatis配置项绑定类。
@AutoConfigureAfter({ DataSourceAutoConfiguration.class, MybatisLanguageDriverAutoConfiguration.class })
public class MybatisAutoConfiguration {
    @Bean
  	@ConditionalOnMissingBean
  	public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
    	SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
        return factory.getObject();
    }
    
    @org.springframework.context.annotation.Configuration
   	@Import(AutoConfiguredMapperScannerRegistrar.class)
   	@ConditionalOnMissingBean({ MapperFactoryBean.class, MapperScannerConfigurer.class })
   	public static class MapperScannerRegistrarNotFoundConfiguration implements InitializingBean {}
}

@ConfigurationProperties(prefix = "mybatis")
public class MybatisProperties {}
```

* 配置文件：`mybatis`
* 自动配置了 SqlSessionFactory
* 导入 `AutoConfiguredMapperScannerRegistra` 实现 @Mapper 的扫描



****



#### MyBatis-Plus

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>3.4.1</version>
</dependency>
```

自动配置类：MybatisPlusAutoConfiguration 

只需要 Mapper 继承 **BaseMapper** 就可以拥有 CRUD 功能



***
