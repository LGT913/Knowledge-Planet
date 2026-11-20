---
title: "Maven / Git"
date: 2026-07-07
planet: growth
tags: ["面试", "复习", 六、Maven / Git, growth]
summary: "1. clean：清理 2. default（build）：编译、测试、打包、安装、部署    - compile → test → package → install → deploy 3. site：生成站点文档"
private: false
---

## 六、Maven / Git

### Maven（⭐⭐⭐）

**Maven 是什么？**

- 项目管理工具，管理依赖、构建项目

**Maven 生命周期**

1. clean：清理
2. default（build）：编译、测试、打包、安装、部署
   - compile → test → package → install → deploy
3. site：生成站点文档

**Maven 依赖范围**

- `compile`：默认，编译测试运行都有效
- `provided`：编译测试有效，运行时由容器提供（如 servlet-api）
- `runtime`：测试运行有效，编译不需要（如 JDBC 驱动）
- `test`：只测试有效
- `system`：从本地系统加载

**依赖冲突怎么解决？**

1. 最短路径优先
2. 声明顺序优先
3. 手动排除 `exclusion`

---

### Git（⭐⭐⭐⭐）

**常用命令**

```bash
git init                    # 初始化仓库
git add .                   # 添加到暂存区
git commit -m "msg"         # 提交
git push origin master      # 推送到远程
git pull origin master      # 拉取远程
git clone <url>             # 克隆
git branch                  # 查看分支
git branch dev              # 创建分支
git checkout dev            # 切换分支
git merge dev               # 合并分支
git rebase                  # 变基
git status                  # 查看状态
git log                     # 查看提交记录
git diff                    # 查看差异
git reset --hard HEAD^      # 回退版本
git stash                   # 暂存当前修改
```

**git pull 和 git fetch 区别**

- `git fetch`：只拉取远程代码，不合并
- `git pull`：拉取 + 合并（相当于 fetch + merge）

**git merge 和 git rebase 区别**

- merge：保留合并记录，有分叉，更清晰
- rebase：变基，变成一条直线，更干净
- 注意：公共分支不要 rebase

**什么是 Git 冲突？怎么解决？**

- 两个人修改了同一行代码，合并时无法自动合并
- 解决：手动编辑冲突的文件，选择保留哪边，然后 add + commit

---
