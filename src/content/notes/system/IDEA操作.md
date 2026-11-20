---
title: "IDEA操作"
date: 2023-09-26
planet: system
tags: ["Java", "基础", IDEA操作, system]
summary: "File → Settings 打开设置窗口，找到 Version Control 下的 git 选项"
private: false
---

## IDEA操作

### 环境配置

File → Settings 打开设置窗口，找到 Version Control 下的 git 选项

选择 git 的安装目录后可以点击 Test 按钮测试是否正确配置：D:\Program Files\Git\cmd\git.exe



### 创建仓库

1、VCS → Import into Version Control → Create Git Repository

2、选择工程所在的目录,这样就创建好本地仓库了

3、点击git后边的对勾,将当前项目代码提交到本地仓库

​	注意: 项目中的配置文件不需要提交到本地仓库中,提交时,忽略掉即可



### 文件操作

右键项目名打开菜单 Git → Add → commit



### 版本管理

* 版本对比
  	![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/版本对比.png)

* 版本切换方式一：控制台 Version Control → Log → 右键 Reset Current Branch → Reset，这种切换会抛弃原来的提交记录
     		![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/版本切换方式一.png)
* 版本切换方式二：控制台 Version Control → Log → Revert Commit → Merge → 处理代码 → commit，这种切换会当成一个新的提交记录，之前的提交记录也都保留
   ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/版本切换方式二.png)

​           ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/版本切换方式二(1).png)





***



### 分支管理

* 创建分支：VCS → Git → Branches → New Branch → 给分支起名字 → ok
* 切换分支：idea 右下角 Git → 选择要切换的分支 → checkout
* 合并分支：VCS → Git → Merge changes → 选择要合并的分支 → merge
* 删除分支：idea 右下角 → 选中要删除的分支 → Delete



***



### 推送仓库

1. VCS → Git → Push → 点击 master Define remote
2. 将远程仓库的 url 路径复制过来 → Push
   ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/本地仓库推送到远程仓库.png)



***



### 克隆仓库

File → Close Project → Checkout from Version Control → Git → 指定远程仓库的路径 → 指定本地存放的路径 → clone

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/远程仓库克隆到本地仓库.png)







***





# Linux

## 操作系统

操作系统（Operation System），是管理计算机硬件与软件资源的计算机程序，同时也是计算机系统的内核与基石。操作系统需要处理管理与配置内存、决定系统资源供需的优先次序、控制输入设备与输出设备、操作网络与管理文件系统等基本事务，操作系统也提供一个让用户与系统交互的操作界面

操作系统作为接口的示意图：

<img src="https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/操作系统.png" style="zoom:80%;" />

移动设备操作系统：

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/移动设备操作系统.png)





***

## Linux系统

### 系统介绍

从内到位依次是硬件 → 内核层 → Shell 层 → 应用层 → 用户
![Linux](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/Linux系统.png)

内核层：核心和基础，附着在硬件平台上，控制和管理系统内的各种资源，有效的组织进程的运行，扩展硬件的功能，提高资源利用效率，为用户提供安全可靠的应用环境。

Shell 层：与用户直接交互的界面。用户可以在提示符下输入命令行，由 Shell 解释执行并输出相应结果或者有关信息，所以我们也把  Shell 称作命令解释器，利用系统提供的丰富命令可以快捷而简便地完成许多工作。



****



### 文件系统

Linux 文件系统目录结构和熟知的 windows 系统有较大区别，没有各种盘符的概念。根目录只有一个/，采用层级式的树状目录结构。

![Linux文件系统](https://seazean.oss-cn-beijing.aliyuncs.com/img/Tool/Linux文件系统.png)





***
