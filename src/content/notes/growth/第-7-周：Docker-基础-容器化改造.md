---
title: "第 7 周：Docker 基础 + 容器化改造"
date: 2026-07-11
planet: growth
tags: ["面试", "复习", 第 7 周：Docker 基础 + 容器化改造, growth]
summary: "FROM nginx:alpine     COPY --from=builder /app/dist /usr/share/nginx/html     COPY nginx.conf /etc/nginx/conf.d/default."
private: false
---

## 第 7 周：Docker 基础 + 容器化改造

### 第 7 周 星期一（第 31 天）
- **今日目标**：Docker 安装 + 核心概念理解 + 使用 Docker 运行已有服务
- **项目改造任务**：
  - 无代码修改。用 Docker 运行已在用的中间件，替代本机安装：
    ```bash
    # 用 Docker 运行 MySQL
    docker run -d --name blog-mysql -p 3306:3306 \
      -e MYSQL_ROOT_PASSWORD：[已隐藏] \
      -e MYSQL_DATABASE=blog_db \
      mysql:8.0
    
    # 用 Docker 运行 Redis
    docker run -d --name blog-redis -p 6379:6379 redis:7-alpine
    ```
  - 预期效果：MySQL 和 Redis 服务完全由 Docker 容器提供
- **核心知识点**：
  - 学习内容：Docker 核心概念（镜像/容器/仓库）、Dockerfile 指令（FROM/RUN/COPY/CMD/EXPOSE）、docker run 常用参数（-d/-p/-v/-e/--name）
  - 学习资源：[Docker 官方 - Get Started](https://docs.docker.com/get-started/)（读 Part 1-2）
  - Windows Docker 安装：搜索 "Docker Desktop for Windows" 下载安装
- **LeetCode刷题**：
  - 题目：[283. 移动零](https://leetcode.cn/problems/move-zeroes/)（考察：双指针）
- **今日检查项**：
  - [ ] `docker ps` 能看到运行的容器
  - [ ] 博客项目连接 Docker 中的 MySQL 能正常工作
  - [ ] 能说出 docker build/run/pull/ps/stop/rm 命令的区别
- **常见问题与解决方案**：
  - Windows Docker Desktop 安装后 WSL2 报错：设置 Docker Desktop 用 WSL2 backend
  - 容器间通信：同一 Docker network 的容器可以用容器名互相访问

---

### 第 7 周 星期二（第 32 天）
- **今日目标**：编写后端 Dockerfile，将博客后端容器化
- **项目改造任务**：
  - 新建文件：`blog/Dockerfile`
    ```dockerfile
    # 1. 构建阶段
    FROM eclipse-temurin:21-jdk-alpine AS builder
    WORKDIR /app
    COPY . .
    RUN chmod +x mvnw && ./mvnw clean package -DskipTests
    
    # 2. 运行阶段
    FROM eclipse-temurin:21-jre-alpine
    WORKDIR /app
    COPY --from=builder /app/target/*.jar app.jar
    EXPOSE 8080
    ENTRYPOINT ["java", "-jar", "app.jar"]
    ```
  - 新建文件：`blog/.dockerignore`
    ```
    target/
    .git/
    .gitignore
    .mvn/
    mvnw.cmd
    *.md
    ```
  - 执行构建测试：
    ```bash
    cd blog
    docker build -t blog-backend:latest .
    docker run -d --name blog-backend -p 8080:8080 blog-backend:latest
    ```
  - 预期效果：后端服务在 Docker 容器中运行正常
- **核心知识点**：
  - 学习内容：多阶段构建（减少镜像体积）、Dockerfile 最佳实践（最小化镜像层、利用缓存）
  - 学习资源：[Docker 官方 - Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- **LeetCode刷题**：
  - 题目：[242. 有效的字母异位词](https://leetcode.cn/problems/valid-anagram/)（考察：哈希表）
- **今日检查项**：
  - [ ] `docker build` 成功，镜像大小 < 300MB（多阶段构建）
  - [ ] 容器中的后端能正常访问（不依赖外部数据库配置需调整）
- **常见问题与解决方案**：
  - Maven 构建慢：使用阿里云镜像或在 Dockerfile 中配置 settings.xml 镜像源
  - 数据库连接失败：容器内的 localhost 代表容器自身，不能连接宿主机 MySQL，需使用 `host.docker.internal` 或容器网络

---

### 第 7 周 星期三（第 33 天）
- **今日目标**：编写前端 Dockerfile + docker-compose 编排所有服务
- **项目改造任务**：
  - 新建文件：`blog-vue/Dockerfile`
    ```dockerfile
    FROM node:20-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    RUN npm run build
    
    FROM nginx:alpine
    COPY --from=builder /app/dist /usr/share/nginx/html
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    ```
  - 新建文件：`blog-vue/nginx.conf`
    ```nginx
    server {
        listen 80;
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }
        location /api/ {
            proxy_pass http://blog-backend:8080;  # 容器名
        }
    }
    ```
  - 新建文件：`blog/docker-compose.yml`
    ```yaml
    version: '3.8'
    services:
      mysql:
        image: mysql:8.0
        environment:
          MYSQL_ROOT_PASSWORD：[已隐藏]
          MYSQL_DATABASE: blog_db
        ports:
          - "3306:3306"
        volumes:
          - mysql-data:/var/lib/mysql
    
      redis:
        image: redis:7-alpine
        ports:
          - "6379:6379"
    
      backend:
        build: .
        ports:
          - "8080:8080"
        environment:
          SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/blog_db
          SPRING_DATASOURCE_USERNAME: root
          SPRING_DATASOURCE_PASSWORD：[已隐藏]
          SPRING_DATA_REDIS_HOST: redis
        depends_on:
          - mysql
          - redis
    
      frontend:
        build: ../blog-vue
        ports:
          - "80:80"
        depends_on:
          - backend
    
    volumes:
      mysql-data:
    ```
  - 预期效果：`docker-compose up -d` 一键启动所有服务
- **核心知识点**：
  - 学习内容：docker-compose 常用指令（depends_on/volumes/environment）、Docker 网络（默认 bridge/自定义 network）、前端 Nginx 反向代理配置
  - 学习资源：[Docker Compose 官方文档](https://docs.docker.com/compose/compose-file/)（读 services 和 volumes 章节）
- **LeetCode刷题**：
  - 题目：[349. 两个数组的交集](https://leetcode.cn/problems/intersection-of-two-arrays/)（考察：哈希集合）
- **今日检查项**：
  - [ ] `docker-compose up -d` 四个容器全部启动成功
  - [ ] 浏览器访问 http://localhost 能看到博客首页
  - [ ] 发布文章、评论等核心功能正常
- **常见问题与解决方案**：
  - `npm ci` 失败：如果用 `package-lock.json` 必须在 `npm ci` 前复制，且版本匹配
  - 前端访问后端 502：检查 `nginx.conf` 的 `proxy_pass` 地址，容器间用服务名而不是 localhost

---

### 第 7 周 星期四（第 34 天）
- **今日目标**：Docker 网络 + 数据卷 + 日志管理
- **项目改造任务**：
  - 修改文件：`blog/docker-compose.yml`
    ```yaml
    # 添加自定义网络
    networks:
      blog-network:
        driver: bridge
    
    # 为每个服务添加
    services:
      mysql:
        networks:
          - blog-network
        volumes:
          - mysql-data:/var/lib/mysql
          - ./logs/mysql:/var/log/mysql   # MySQL 日志挂载
    
      backend:
        networks:
          - blog-network
        volumes:
          - ./logs/backend:/app/logs     # 后端日志挂载
        logging:
          driver: "json-file"
          options:
            max-size: "10m"
            max-file: "3"
    
    volumes:
      mysql-data:
    ```
  - 预期效果：所有数据持久化到宿主机，日志可查看
- **核心知识点**：
  - 学习内容：Docker 网络模式（bridge/host/none/overlay）、volume 绑定挂载 vs 数据卷、日志驱动（json-file/syslog/fluentd）
  - 学习资源：[Docker 官方 - Networking overview](https://docs.docker.com/network/)（读 5 分钟了解网络模式）
- **LeetCode刷题**：
  - 题目：[136. 只出现一次的数字](https://leetcode.cn/problems/single-number/)（考察：异或运算）
- **今日检查项**：
  - [ ] 删除容器后重启，MySQL 数据不丢失
  - [ ] 宿主机能看到 logs/backend/ 目录下的日志文件
- **常见问题与解决方案**：
  - Windows 下 volume 路径用反斜杠问题：Docker Desktop 自动处理路径格式
  - 日志太多撑爆磁盘：设置 `max-size` 和 `max-file` 限制

---

### 第 7 周 星期五（第 35 天）
- **今日目标**：Docker 镜像优化 + 私有仓库 + 镜像推送
- **项目改造任务**：
  - 修改 `blog/Dockerfile`：使用更轻量的基础镜像、合并 RUN 命令减少层
    ```dockerfile
    FROM maven:3.9-eclipse-temurin-21-alpine AS builder
    WORKDIR /app
    COPY pom.xml .
    RUN mvn dependency:go-offline  # 提前下载依赖
    COPY src ./src
    RUN mvn clean package -DskipTests
    
    FROM eclipse-temurin:21-jre-alpine
    WORKDIR /app
    COPY --from=builder /app/target/*.jar app.jar
    EXPOSE 8080
    ENTRYPOINT ["java", "-jar", "app.jar"]
    ```
  - 推送镜像到 Docker Hub：
    ```bash
    docker tag blog-backend:latest 你的用户名/blog-backend:latest
    docker push 你的用户名/blog-backend:latest
    ```
  - 预期效果：镜像 < 200MB，可以分享给面试官看
- **核心知识点**：
  - 学习内容：镜像分层原理（layer cache）、distroless 镜像、Harbor 私有仓库
  - 学习资源：[Docker 镜像优化指南](https://docs.docker.com/develop/develop-images/optimize/)（读 10 分钟）
- **LeetCode刷题**：
  - 题目：[88. 合并两个有序数组](https://leetcode.cn/problems/merge-sorted-array/)（考察：双指针/逆向双指针）
- **今日检查项**：
  - [ ] 优化后镜像体积明显减小
  - [ ] 能在 Docker Hub 上看到推送的镜像
- **常见问题与解决方案**：
  - 构建缓存不生效：只修改了代码没改 pom.xml，`mvn dependency:go-offline` 行缓存可用
  - 推送镜像需要先登录：`docker login`

---

### 第 7 周 星期六 & 星期日
- **复盘任务**：
  - 写技术笔记：《从代码到部署——个人博客 Docker 容器化实践》
  - 整理 Docker 面试题（镜像/容器/网络/存储/编排）

---
