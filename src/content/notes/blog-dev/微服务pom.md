---
title: "阶段一：创建顶层聚合父工程（全局版本管控核心）"
date: 2026-08-11
planet: blog-dev
tags: ["后端", "实战"]
summary: "1.  单体架构演进微服务架构 Maven POM 改造实战笔记"
private: false
---
1. # 单体架构演进微服务架构 Maven POM 改造实战笔记

   ## 一、架构分层设计（先定分层，再改POM）

   ### 1. 原单体架构POM痛点（线上踩坑总结）

   1. 单pom承载全部依赖，第三方版本无统一锁，多业务组件版本混乱，升级SpringBoot全量改版本极易漏改；
   2. 公共实体、工具类、通用序列化逻辑散落在单体内部，无法复用，重复开发；
   3. WebMVC与WebFlux包混在同一工程，未来新增网关、异步服务直接启动冲突；
   4. 数据库、权限、缓存、注册中心全部耦合，无法独立扩缩容，发布全量发布风险高；
   5. 无聚合父工程，Maven打包只能整体打包，不支持单服务独立构建、镜像打包；
   6. 内部业务无公共jar包分层，无法实现依赖按需传递，全量依赖导致包体积臃肿。

   ### 2. 微服务分层标准（阿里统一四层拆分规范）

   ```
   blog-cloud 【聚合父工程，pom打包，全局版本管控层】
   ├── blog-common 【公共基础层，纯工具Jar，无启动类，全局通用能力】
   ├── blog-gateway 【接入网关层，WebFlux，流量入口、鉴权、路由】
   ├── blog-user-service 【业务微服务层：用户域，MVC，权限/JWT/Redis】
   ├── blog-article-service 【业务微服务层：文章域，MVC，JPA/MySQL】
   ```

   分层约束：**层之间单向依赖，禁止循环依赖**

   - 网关、业务服务 → 依赖 common
   - common 不依赖任何业务、网关组件
   - 网关与业务服务无互相依赖，通过Nacos + OpenFeign远程调用通信

   ## 二、分阶段POM改造完整落地步骤

   # 阶段一：创建顶层聚合父工程（全局版本管控核心）

   ## 1. 父工程核心职责

   1. 统一管理JDK编译版本，强制JDK17，适配SpringBoot4最低基线；
   2. 导入SpringBoot、SpringCloud、SpringCloudAlibaba三大官方BOM，统一第三方中间件版本，子模块无需声明version；
   3. 注册全部子模块，Maven可批量构建、单模块精准构建；
   4. 统一管控SpringBoot打包插件版本，标准化云原生可执行Jar打包逻辑；
   5. 不承载任何业务依赖，仅做版本治理，杜绝父工程依赖泛滥。

   ## 2. 父工程标准pom.xml（生产可用模板）

   ```java
   <?xml version="1.0" encoding="UTF-8"?>
   <project xmlns="http://maven.apache.org/POM/4.0.0"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
            http://maven.apache.org/xsd/maven-4.0.0.xsd">
       <modelVersion>4.0.0</modelVersion>
   
       <groupId>com.blog</groupId>
       <artifactId>blog-cloud</artifactId>
       <version>1.0.0</version>
       <packaging>pom</packaging>
   
       <!-- 子模块注册清单，新增微服务必须同步添加 -->
       <modules>
           <module>blog-common</module>
           <module>blog-gateway</module>
           <module>blog-user-service</module>
           <module>blog-article-service</module>
       </modules>
   
       <!-- 全局编译统一基线，强制JDK17，解决List.of等高版本API编译报错 -->
       <properties>
           <java.version>17</java.version>
           <maven.compiler.source>17</maven.compiler.source>
           <maven.compiler.target>17</maven.compiler.target>
           <spring-boot.version>4.0.6</spring-boot.version>
           <spring-cloud.version>2025.0.0</spring-cloud.version>
           <spring-cloud-alibaba.version>2025.0.0.0</spring-cloud-alibaba.version>
       </properties>
   
       <!-- 依赖版本锁管理，子模块直接引用坐标，省略version -->
       <dependencyManagement>
           <dependencies>
               <!-- SpringBoot 官方BOM -->
               <dependency>
                   <groupId>org.springframework.boot</groupId>
                   <artifactId>spring-boot-dependencies</artifactId>
                   <version>${spring-boot.version}</version>
                   <type>pom</type>
                   <scope>import</scope>
               </dependency>
               <!-- SpringCloud 官方BOM -->
               <dependency>
                   <groupId>org.springframework.cloud</groupId>
                   <artifactId>spring-cloud-dependencies</artifactId>
                   <version>${spring-cloud.version}</version>
                   <type>pom</type>
                   <scope>import</scope>
               </dependency>
               <!-- SpringCloud Alibaba 中间件BOM（Nacos/Sentinel等） -->
               <dependency>
                   <groupId>com.alibaba.cloud</groupId>
                   <artifactId>spring-cloud-alibaba-dependencies</artifactId>
                   <version>${spring-cloud-alibaba.version}</version>
                   <type>pom</type>
                   <scope>import</scope>
               </dependency>
           </dependencies>
       </dependencyManagement>
   
       <!-- 插件版本统一治理，子模块无需指定插件version -->
       <build>
           <pluginManagement>
               <plugins>
                   <plugin>
                       <groupId>org.springframework.boot</groupId>
                       <artifactId>spring-boot-maven-plugin</artifactId>
                       <version>${spring-boot.version}</version>
                   </plugin>
               </plugins>
           </pluginManagement>
       </build>
   </project>
   ```

   ## 3. 父工程落地红线规范（线上强制约束）

   1. packaging 固定为 pom，禁止jar/war；
   2. 禁止在父工程`<dependencies>`中写入任何依赖，仅允许在dependencyManagement管控版本；
   3. 新增子模块必须在`<modules>`注册，否则`mvn install`无法批量构建；
   4. JDK编译版本全局统一，禁止子模块单独修改编译级别。

   # 阶段二：抽离公共基础模块 blog-common（单体公共代码剥离）

   ## 1. common模块定位

   全局通用能力沉淀Jar，无启动类、无Web容器、无持久层组件，所有业务/网关统一依赖，消除代码重复。

   ### 依赖拆分标准（从原单体pom剥离）

   ✅ 允许存放：

   - 实体简化：lombok
   - 全局JSON序列化：jackson时间序列化包
   - 统一返回体、错误枚举、全局异常父类、通用工具类 ❌ 绝对禁止存放：
   - spring-boot-starter-web（MVC）、spring-cloud-starter-gateway（WebFlux），会引发容器冲突；
   - JPA、MySQL、Redis、Security、JWT等业务专属组件；
   - 任何`@SpringBootApplication`启动类，common不能独立运行。

   ## 2. blog-common 标准pom.xml

   ```java
   <?xml version="1.0" encoding="UTF-8"?>
   <project xmlns="http://maven.apache.org/POM/4.0.0"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
            http://maven.apache.org/xsd/maven-4.0.0.xsd">
       <modelVersion>4.0.0</modelVersion>
   
       <!-- 继承顶层聚合父工程 -->
       <parent>
           <groupId>com.blog</groupId>
           <artifactId>blog-cloud</artifactId>
           <version>1.0.0</version>
           <relativePath>../pom.xml</relativePath>
       </parent>
   
       <artifactId>blog-common</artifactId>
   
       <dependencies>
           <!-- 实体简化，optional=true 仅本模块生效，不传递污染业务服务 -->
           <dependency>
               <groupId>org.projectlombok</groupId>
               <artifactId>lombok</artifactId>
               <optional>true</optional>
           </dependency>
           <!-- Java8 LocalDateTime序列化，BOM未托管，手动指定版本 -->
           <dependency>
               <groupId>com.fasterxml.jackson.datatype</groupId>
               <artifactId>jackson-datatype-jsr310</artifactId>
               <version>2.18.3</version>
           </dependency>
       </dependencies>
   </project>
   ```

   ## 3. common模块POM构建流程

   1. 根目录执行`mvn clean install -DskipTests`，将common安装至本地Maven仓库；
   2. 后续网关、业务服务才能正常引用，否则报`blog-common:unknown`依赖缺失；
   3. 依赖scope规范：通用工具无scope，lombok添加optional=true，避免全服务传递。

   # 阶段三：新增网关模块 blog-gateway（单体无网关组件，微服务流量层）

   ## 1. Gateway POM核心线上坑点（阿里中间件团队高频故障点）

   1. WebFlux与SpringMVC互斥，**网关模块严禁引入spring-boot-starter-web**，启动直接抛容器冲突异常；
   2. SpringCloud多模块并行解析POM时，父BOM未加载完成，gateway依赖缺失version直接阻断全部Maven构建，必须手动指定Gateway版本；
   3. SpringCloud 2025.x 默认关闭bootstrap上下文，必须手动引入bootstrap依赖，否则无法读取Nacos远程配置；
   4. 网关为独立可执行微服务，必须配置spring-boot-maven-plugin打包插件。

   ## 2. blog-gateway 标准pom.xml

   ```java
   <?xml version="1.0" encoding="UTF-8"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
            http://maven.apache.org/xsd/maven-4.0.0.xsd">
       <modelVersion>4.0.0</modelVersion>
   
       <parent>
           <groupId>com.blog</groupId>
           <artifactId>blog-cloud</artifactId>
           <version>1.0.0</version>
           <relativePath>../pom.xml</relativePath>
       </parent>
   
       <artifactId>blog-gateway</artifactId>
   
       <dependencies>
           <!-- 内部自定义公共Jar，BOM不管理业务模块，强制声明version -->
           <dependency>
               <groupId>com.blog</groupId>
               <artifactId>blog-common</artifactId>
               <version>1.0.0</version>
           </dependency>
           <!-- 网关核心依赖，手动指定版本，规避多模块并行解析报错 -->
           <dependency>
               <groupId>org.springframework.cloud</groupId>
               <artifactId>spring-cloud-starter-gateway</artifactId>
               <version>4.0.1</version>
           </dependency>
           <!-- Nacos 服务注册发现，统一服务治理 -->
           <dependency>
               <groupId>com.alibaba.cloud</groupId>
               <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
           </dependency>
           <!-- Nacos 远程配置中心，路由规则、全局参数托管至配置中心 -->
           <dependency>
               <groupId>com.alibaba.cloud</groupId>
               <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
           </dependency>
           <!-- 开启bootstrap上下文，加载Nacos远程配置文件 -->
           <dependency>
               <groupId>org.springframework.cloud</groupId>
               <artifactId>spring-cloud-starter-bootstrap</artifactId>
           </dependency>
           <dependency>
               <groupId>org.projectlombok</groupId>
               <artifactId>lombok</artifactId>
               <optional>true</optional>
           </dependency>
       </dependencies>
   
       <!-- 可执行Jar打包插件，云原生镜像构建必备 -->
       <build>
           <plugins>
               <plugin>
                   <groupId>org.springframework.boot</groupId>
                   <artifactId>spring-boot-maven-plugin</artifactId>
               </plugin>
           </plugins>
       </build>
   </project>
   ```

   # 阶段四：业务微服务POM改造（以blog-user-service为标准模板）

   ## 1. 业务模块依赖拆分规则（原单体依赖切割标准）

   1. MVC基础包：spring-boot-starter-web、validation，仅业务服务持有，网关禁止引入；
   2. 域专属依赖：用户模块持有Security、JWT、Redis、Redisson；文章模块移除权限、缓存相关依赖；
   3. 持久层统一：JPA + MySQL驱动，所有数据库业务服务按需引入；
   4. 微服务治理统一依赖：nacos-discovery、nacos-config、bootstrap，所有微服务统一引入；
   5. 强制依赖blog-common并指定version=1.0.0，解决内部Jar版本缺失报错。

   ## 2. blog-user-service 生产级pom.xml

   ```java
   <?xml version="1.0" encoding="UTF-8"?>
   <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   		 xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
   	<modelVersion>4.0.0</modelVersion>
   	<parent>
   		<groupId>com.blog</groupId>
   		<artifactId>blog-cloud</artifactId>
   		<version>1.0.0</version>
   		<relativePath>../pom.xml</relativePath>
   	</parent>
   	<artifactId>blog-user-service</artifactId>
   	<name>blog-user-service</name>
   	<description>用户域微服务：登录、注册、权限、会话管理</description>
   
   	<dependencies>
   		<!-- MVC Web容器，业务服务专属 -->
   		<dependency>
   			<groupId>org.springframework.boot</groupId>
   			<artifactId>spring-boot-starter-web</artifactId>
   		</dependency>
   		<dependency>
   			<groupId>org.springframework.boot</groupId>
   			<artifactId>spring-boot-starter-validation</artifactId>
   		</dependency>
   		<!-- 单元测试 -->
   		<dependency>
   			<groupId>org.springframework.boot</groupId>
   			<artifactId>spring-boot-starter-test</artifactId>
   			<scope>test</scope>
   		</dependency>
   		<!-- 公共基础Jar，强制携带版本号 -->
   		<dependency>
   			<groupId>com.blog</groupId>
   			<artifactId>blog-common</artifactId>
   			<version>1.0.0</version>
   		</dependency>
   		<!-- 持久层 JPA + MySQL -->
   		<dependency>
   			<groupId>org.springframework.boot</groupId>
   			<artifactId>spring-boot-starter-data-jpa</artifactId>
   		</dependency>
   		<dependency>
   			<groupId>com.mysql</groupId>
   			<artifactId>mysql-connector-j</artifactId>
   			<scope>runtime</scope>
   		</dependency>
   		<!-- 用户域专属：安全框架 + JWT无状态鉴权 -->
   		<dependency>
   			<groupId>org.springframework.boot</groupId>
   			<artifactId>spring-boot-starter-security</artifactId>
   		</dependency>
   		<dependency>
   			<groupId>io.jsonwebtoken</groupId>
   			<artifactId>jjwt-api</artifactId>
   			<version>0.12.6</version>
   		</dependency>
   		<dependency>
   			<groupId>io.jsonwebtoken</groupId>
   			<artifactId>jjwt-impl</artifactId>
   			<version>0.12.6</version>
   			<scope>runtime</scope>
   		</dependency>
   		<dependency>
   			<groupId>io.jsonwebtoken</groupId>
   			<artifactId>jjwt-jackson</artifactId>
   			<version>0.12.6</version>
   			<scope>runtime</scope>
   		</dependency>
   		<!-- 分布式缓存 + 分布式锁 -->
   		<dependency>
   			<groupId>org.springframework.boot</groupId>
   			<artifactId>spring-boot-starter-data-redis</artifactId>
   		</dependency>
   		<dependency>
   			<groupId>org.apache.commons</groupId>
   			<artifactId>commons-pool2</artifactId>
   		</dependency>
   		<dependency>
   			<groupId>org.redisson</groupId>
   			<artifactId>redisson</artifactId>
   			<version>3.27.0</version>
   		</dependency>
   		<!-- 微服务统一治理：Nacos注册、配置 -->
   		<dependency>
   			<groupId>com.alibaba.cloud</groupId>
   			<artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
   		</dependency>
   		<dependency>
   			<groupId>com.alibaba.cloud</groupId>
   			<artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
   		</dependency>
   		<!-- 加载bootstrap配置文件 -->
   		<dependency>
   			<groupId>org.springframework.cloud</groupId>
   			<artifactId>spring-cloud-starter-bootstrap</artifactId>
   		</dependency>
   		<dependency>
   			<groupId>org.projectlombok</groupId>
   			<artifactId>lombok</artifactId>
   			<optional>true</optional>
   		</dependency>
   	</dependencies>
   
   	<build>
   		<plugins>
   			<plugin>
   				<groupId>org.springframework.boot</groupId>
   				<artifactId>spring-boot-maven-plugin</artifactId>
   			</plugin>
   		</plugins>
   	</build>
   </project>
   ```

   ## 3. 多业务模块复用改造规范

   blog-article-service 直接复制user-service模板，做裁剪：

   1. 删除Security、jjwt、redisson、redis相关缓存依赖；
   2. 修改artifactId、name、description；
   3. 保留web、jpa、mysql、nacos、bootstrap、blog-common基础依赖。

   # 三、改造后标准构建验证流程（线上发布前置校验流程）

   ## 1. 缓存清理（规避旧单体依赖缓存干扰）

   删除本地Maven仓库业务包缓存：`[本地路径]

   ## 2. 全量构建（根目录blog-cloud执行）

   ```java
   # 清理 + 编译 + 打包 + 安装至本地仓库，跳过测试加速构建
   mvn clean install -DskipTests
   ```

   构建顺序由Maven自动管控：blog-common → blog-gateway → blog-user-service → blog-article-service 输出`BUILD SUCCESS`代表全部POM语法、依赖版本无故障。

   ## 3. 单服务精准构建（开发调试常用）

   ```java
   # 仅构建用户服务，同时构建依赖模块common
   mvn compile -pl blog-user-service -am -DskipTests
   # 仅构建网关服务
   mvn compile -pl blog-gateway -am -DskipTests
   ```

   ## 4. IDE环境同步校验

   1. IDEA/VS Code 加载根工程blog-cloud；
   2. 刷新Maven项目，校验所有依赖无红色报错；
   3. 统一所有模块语言级别为17，消除JDK版本API报错。

   # 四、POM改造高频线上故障根因与修复方案（阿里故障库收录）

   | 故障报错                                                     | 根因                                                         | 标准修复方案                                       |
   | ------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------- |
   | `'dependencies.dependency.version' for com.blog:blog-common missing` | 内部业务Jar不受父BOM版本管理，未声明version                  | 所有依赖common的模块补充`<version>1.0.0</version>` |
   | Mvn执行直接卡在blog-gateway，报gateway版本缺失               | Maven并行扫描全部modules，gateway依赖无version，阻断全局构建 | gateway的gateway核心依赖手动指定version=4.0.1      |
   | 服务启动 WebMVC/WebFlux 容器冲突                             | gateway模块引入spring-boot-starter-web                       | 彻底删除gateway内所有web starter依赖               |
   | `List.of()` 找不到符号                                       | 模块编译级别为JDK8，与父pom17配置不一致                      | IDE全模块语言级别改为17，父pom统一maven.compiler   |
   | 无法读取Nacos远程配置                                        | SpringCloud2025默认关闭bootstrap上下文                       | 所有微服务统一引入spring-cloud-starter-bootstrap   |
   | blog-common依赖报unknown，本地仓库找不到                     | 未执行mvn install安装公共Jar                                 | 根目录执行全量install，将common打入本地Maven仓库   |

-    # 常见改造报错对应解决方案

   1. 报错：

      ```java
      'dependencies.dependency.version' for com.blog:blog-common is missing
      ```

      - 解决：业务服务引入 common 时补充 version=1.0.0

   2. 报错：

      ```java
      List.of() 找不到符号
      ```

      - 解决：所有模块语言级别改为 17，JDK 环境变量切换 17

   3. 报错：Gateway 与 Web MVC 冲突启动失败

      - 解决：移除 gateway 模块所有 spring-boot-starter-web 依赖

   4. 警告：Jackson2JsonRedisSerializer 已过时

      - 解决：使用带 ObjectMapper 参数的构造函数重构 RedisTemplate 配置

   5. Maven 扫描 POM 报错，卡在 blog-gateway

      - 解决：给 gateway 依赖补充 version，父工程并行扫描会优先读取网关 pom

   6. blog-common 无法被识别，本地仓库找不到 jar

      - 解决：根目录执行`mvn clean install -DskipTests`安装公共模块至本地 Maven 仓库

   # 五、单体→微服务POM核心变更对比总结

   ## 1. 原单体POM特征

   1. 单工程单pom，packaging=jar；
   2. 无父工程，所有依赖、插件全部声明version；
   3. Web、网关、数据库、缓存、权限依赖全部耦合在同一pom；
   4. 无分层，无法按需构建、独立发布；
   5. 无版本统一锁，升级中间件全量人工改版本，风险极高。

   ## 2. 微服务多模块POM核心变更点

   1. 引入**聚合父pom**，统一全局版本、编译基线、插件版本；
   2. 分层拆分：公共Jar层、网关层、多业务微服务层，依赖单向流通；
   3. 第三方中间件版本由三大BOM托管，子模块省略version，降低升级成本；
   4. 内部业务Jar（blog-common）单独打包，复用通用能力；
   5. 网关、业务服务解耦容器依赖，规避MVC/WebFlux冲突；
   6. 支持单服务独立打包、镜像构建，适配K8s云原生发布；
   7. 统一接入Nacos微服务治理依赖，标准化分布式配置、注册中心接入。

   # 六、生产环境落地红线（代码合并强制校验）

   1. 禁止在父工程添加业务dependencies，仅允许dependencyManagement管控版本；
   2. gateway模块禁止引入spring-boot-starter-web；
   3. blog-common禁止引入任何Web、持久层、权限业务依赖；
   4. 所有业务/网关引用blog-common必须显式声明version；
   5. 所有模块JDK编译级别统一17，禁止单独降级；
   6. 新增微服务必须同步在父工程modules注册，完成全量install验证再提交代码。
