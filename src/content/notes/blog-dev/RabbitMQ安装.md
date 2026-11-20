---
title: "Linux安装Docker部署RabbitMQ"
date: 2026-08-02
planet: blog-dev
tags: ["后端", "实战"]
summary: "注：学后端尽量使用Linux，联系命令。Window是安装Docker Desktop图形化。"
private: false
---
# Linux安装Docker部署RabbitMQ

注：学后端尽量使用Linux，联系命令。Window是安装Docker Desktop图形化。

## 步骤：

##### 1.先进入 Ubuntu-24.04

PowerShell 执行：

```powershell
wsl -d Ubuntu-24.04
```

##### 2.在 Ubuntu 终端逐条运行 Docker 安装脚本

```powershell
sudo apt update && sudo apt upgrade -y
sudo apt install ca-certificates curl gnupg lsb-release -y

# 添加Docker官方密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker软件源
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y
```

#####  3.配置免 sudo 操作 docker（必执行）

```powershell
sudo usermod -aG docker $USER
```

⚠️ **执行后完全关闭 Ubuntu 窗口，重新打开终端生效**

规范操作建议**日常工作固定切换到家目录(cd ~)**

#####  4.进入正确系统

PowerShell 启动 Ubuntu24.04：

```powershell
wsl -d Ubuntu-24.04
```

##### 5、WSL 内执行启动 Docker

```powershell
# 启动docker服务
service docker start
# 验证
docker run hello-world
# 3.验证docker是否安装成功
docker -v
# 4.运行测试容器
docker run hello-world
```

问题：`docker run hello-world 报错：i/o`  timeoutWSL 内无法访问 Docker 官方镜像仓库，网络拉取超时（国内常见）

解决方案：配置国内镜像加速器

​            1.创建 / 修改 docker 配置文件

```powershell
mkdir -p /etc/docker
vim /etc/docker/daemon.json
```

·粘贴下面内容（国内镜像源）：

```powershell
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

·保存退出（vim：按`ESC`，输入`:wq`回车）

​          2.重启 Docker 生效

```
service docker restart
```

​          3.再次测试

```
docker run hello-world
```

到这就可以部署RabbitMQ。

如果失败，就参考[Docker部署配置全流程（超详细——Windows和Linux）-CSDN博客](https://blog.csdn.net/y_wu794/article/details/149692346)，从头部署docker。(建议从头部署)。

### 6.部署RabbitMQ

```powershell
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

如果read: connection timed out断连就分开拉取：先单独 pull 镜像，全部下载完成再启动容器，不要一条命令边下载边创建容器。

```powershell
docker pull rabbitmq:3-management
```

等待镜像完整下载结束，没有报错之后，再执行启动:

```powershell
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 7.访问管理后台

浏览器打开：`http://localhost:15672`

账号：`guest`

密码：[已隐藏]

##### 备用命令（后续常用）

```powershell
# 查看日志（启动异常排查）
docker logs rabbitmq
# 重启服务
docker restart rabbitmq
# 删除容器（需要重建时使用）
docker rm -f rabbitmq
```

### 8.在 Ubuntu 上创建 RabbitMQ 远程用户

**重要**：RabbitMQ 默认的 `guest` 账户只能从 localhost 连接，Windows 远程连会被拒。需要创建一个新用户：

```bash
# 创建用户 admin，密码 admin123
sudo docker exec -it rabbitmq rabbitmqctl add_user admin admin123

# 设置为管理员角色
sudo docker exec -it rabbitmq rabbitmqctl set_user_tags admin administrator

# 授权所有权限
sudo docker exec -it rabbitmq rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"
```
