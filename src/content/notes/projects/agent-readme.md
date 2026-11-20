---
title: "QuillAgent（桌面智能创作助手）"
date: 2026-10-31
planet: projects
tags: ["QuillAgent"]
summary: "用户主导写作 + AI 赋能的桌面码字工具。Electron + Vue3 + TipTap 前端，Spring Boot 3.5 + Spring AI + SQLite 后端，本地与自有 API 双模式。"
private: false
---
# QuillAgent（桌面智能创作助手）

用户主导写作 + AI 赋能的桌面码字工具。Electron + Vue3 + TipTap 前端，Spring Boot 3.5 + Spring AI + SQLite 后端，本地与自有 API 双模式。

## 环境要求

- JDK 21（`JAVA_HOME` 建议配置）
- Node.js 18+ / npm
- 可选：Ollama（本地模型模式使用）

## 快速启动（Windows）

```powershell
# 方式 A：桌面应用（推荐，主进程自动拉起后端）
cd electron
npm install
npm run build
npx electron .

# 方式 B：开发热更新
cd electron
npm run dev          # 终端 1：Vite dev server（5173）
$env:NODE_ENV="development"; npx electron .   # 终端 2

# 方式 C：仅后端调试
cd backend
mvn spring-boot:run
```

> 同一时刻只选一种方式：后端固定监听 `127.0.0.1:8080`，Electron 启动前会自动回收残留的 8080 java 进程。

## 重要声明（本地模型模式）

1. 应用**不内置、不打包任何大模型**；
2. 本地模式需自行安装 Ollama 并**下载已预训练完成的开源模型**（如 `ollama pull qwen2.5:3b`）；
3. **不需要训练模型**——下载即可用；
4. 如不想安装 Ollama，可在设置中填入自有 OpenAI 兼容 API Key 使用全部功能。

## 数据与安全

- 数据目录：`%APPDATA%\quill-agent-desktop\data`（打包后由 `app.getPath('userData')` 定位）
  - `writer.db`：SQLite 单文件数据库（document / doc_version / prompt_template / material 四表）
  - `.local-token`：本机接口鉴权令牌（64 位 hex，启动生成）
  - `drafts/`：未保存草稿（主进程原子写入，崩溃/强杀后可恢复）
- 所有业务接口需 `X-Local-Token` 请求头（由 preload 注入，不经过 HTTP 下发）
- 服务仅绑定回环地址，并校验 Host 白名单（防 DNS rebinding）
- 日志对 `apiKey` 等敏感字段自动脱敏

## 常用命令

```powershell
cd backend; mvn test        # 后端单元测试
cd electron; npm run build  # 渲染层 + 主进程构建
```

## 当前能力（v0.2）

- 文档 CRUD（新建 / 重命名 / 删除 / 搜索 / 按文体过滤）
- TipTap 富文本编辑（标题 / 加粗 / 斜体 / 列表 / 引用 / 撤销重做）
- 2 秒防抖自动保存 + 主进程原子草稿（崩溃恢复提示）
- 实时字数 / 选中字数统计、护眼暗色主题
- AI 工具箱占位（W3 接入 ModelRouter 后启用）
- Ollama 健康探测三状态（READY / MODEL_MISSING / UNAVAILABLE）
