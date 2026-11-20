---
title: "第 5 周：服务拆分 + Nacos 注册中心"
date: 2026-07-11
planet: growth
tags: ["面试", "复习", 第 5 周：服务拆分 + Nacos 注册中心, growth]
summary: ""
private: false
---

## 第 5 周：服务拆分 + Nacos 注册中心

### 第 5 周 星期一（第 21 天）
- **今日目标**：理解微服务架构 + 搭建 Nacos 注册中心
- **项目改造任务**：
  - 新建目录：`blog-cloud/`（微服务父项目）
  - 新建文件：`blog-cloud/pom.xml`
    ```xml
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
        
        <properties>
            <java.version>21</java.version>
            <spring-boot.version>3.2.0</spring-boot.version>
            <spring-cloud.version>2023.0.0</spring-cloud.version>
            <spring-cloud-alibaba.version>2022.0.0.0</spring-cloud-alibaba.version>
        </properties>
        
        <dependencyManagement>
            <dependencies>
                <dependency>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-dependencies</artifactId>
                    <version>${spring-boot.version}</version>
                    <type>pom</type>
                    <scope>import</scope>
                </dependency>
                <dependency>
                    <groupId>org.springframework.cloud</groupId>
                    <artifactId>spring-cloud-dependencies</artifactId>
                    <version>${spring-cloud.version}</version>
                    <type>pom</type>
                    <scope>import</scope>
                </dependency>
                <dependency>
                    <groupId>com.alibaba.cloud</groupId>
                    <artifactId>spring-cloud-alibaba-dependencies</artifactId>
                    <version>${spring-cloud-alibaba.version}</version>
                    <type>pom</type>
                    <scope>import</scope>
                </dependency>
            </dependencies>
        </dependencyManagement>
    </project>
    ```
  - 新建子模块：`blog-cloud/blog-user-service/`（用户服务：负责用户登录/注册）
  - 新建子模块：`blog-cloud/blog-article-service/`（文章服务：负责文章/分类/评论）
  - 预期效果：创建两个空的 Spring Boot 子模块，注册到 Nacos
- **核心知识点**：
  - 学习内容：微服务架构概念（拆分原则、服务发现、配置中心）、Nacos 安装与启动
  - 学习资源：[Nacos 官方文档 - Quick Start](https://nacos.io/zh-cn/docs/quick-start.html)（读 Quick Start + Spring Cloud 整合）
  - Nacos 启动命令：
    ```bash
    # Windows
    startup.cmd -m standalone
    ```
- **LeetCode刷题**：
  - 题目：[543. 二叉树的直径](https://leetcode.cn/problems/diameter-of-binary-tree/)（考察：DFS）
- **今日检查项**：
  - [ ] Nacos 访问 http://localhost:8848/nacos 进入控制台
  - [ ] 两个子服务都注册到 Nacos（服务列表能看到）
- **常见问题与解决方案**：
  - Nacos 启动闪退：检查是否配置了 `JAVA_HOME` 环境变量
  - 模块太多编译报错：检查 parent 的 groupId/artifactId 是否正确

---

### 第 5 周 星期二（第 22 天）
- **今日目标**：完成用户服务的拆分，从原博客复制用户模块代码
- **项目改造任务**：
  - 预期效果：入口统一走 8080 端口，Gateway 自动路由到对应服务
- **核心知识点**：
  - 学习内容：Spring Cloud Gateway 路由配置（Path 断言）、负载均衡（lb://）、过滤器、配置中心 Nacos Config（bootstrap.yml）
  - 学习资源：[Spring Cloud Gateway 官方文档](https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/)（读 Proxy Filters 章节）
- **LeetCode刷题**：
  - 题目：[33. 搜索旋转排序数组](https://leetcode.cn/problems/search-in-rotated-sorted-array/)（考察：二分查找变体）
- **今日检查项**：
  - [ ] Gateway 8080 端口能正常转发到 user-service 和 article-service
  - [ ] 前端不改任何代码，访问 8080 能和之前一样工作
  - [ ] 能从 Nacos Config 读取配置
- **常见问题与解决方案**：
  - Gateway 依赖了 `spring-boot-starter-web` 会冲突：Gateway 依赖 `spring-boot-starter-webflux` 而不是 `web`
  - 路由规则写错了不会匹配：检查 `Path` 断言格式，`/**` 表示多层路径

---

### 第 5 周 星期六 & 星期日
- **复盘任务**：
  - 写技术笔记：《从单体到微服务——个人博客服务化拆分实践》
  - 整理 Spring Cloud 面试题（Nacos、Feign、Gateway）
  - 复习本周 LeetCode

---
