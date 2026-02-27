# Design: Electron 桌面客户端

## Context

当前仓库已经具备：
- `web/frontend`：React + Vite 渲染层。
- `web/backend`：Express + WebSocket 本地服务层。
- `web/shared`：前后端共享类型。

本次新增 Electron 桌面客户端，不重写业务功能，而是增加“桌面应用壳”，复用现有 Web 能力，满足离线可用和本地一体化体验。

## Goals / Non-Goals

### Goals
- 提供 Electron 桌面入口，覆盖主进程、预加载、渲染进程分层。
- 明确开发态与生产态启动策略，保证可调试、可打包、可安装。
- 在离线环境下可完成核心功能（本地数据读写、列表查询、看板操作等）。
- 建立默认安全基线：`contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`。
- 最大化复用 `web/backend` 与 `web/frontend`，避免重复实现业务逻辑。

### Non-Goals
- 不引入云同步、账号体系、远程依赖编排。
- 不重构现有 Web 页面业务逻辑。
- 不在本次设计中扩展插件生态或多窗口复杂编排。

## Architecture Overview

### 进程分层

```text
+--------------------------------------------------------------+
| Electron Main Process                                        |
| - App 生命周期                                                |
| - BrowserWindow 安全配置                                      |
| - 启动/停止本地 backend（child process）                      |
| - IPC 路由与权限控制                                          |
+--------------------------+-----------------------------------+
                           |
                     contextBridge + IPC
                           |
+--------------------------v-----------------------------------+
| Preload Process                                              |
| - 暴露最小 API: window.desktop.*                             |
| - 白名单通道与参数校验                                        |
| - 屏蔽 Node 原生能力                                           |
+--------------------------+-----------------------------------+
                           |
                        Web APIs
                           |
+--------------------------v-----------------------------------+
| Renderer Process (复用 web/frontend)                          |
| - React 页面/路由/状态管理                                     |
| - 通过 API/WS 访问本地 backend                                |
| - 不直接访问 fs/process/child_process                         |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| Local Backend (复用 web/backend)                              |
| - REST API + WebSocket                                        |
| - 读写 pmspace Markdown/CSV                                   |
+--------------------------------------------------------------+
```

### 模块职责

- 主进程（`electron/main`）
  - 创建与管理主窗口。
  - 管理本地 backend 子进程生命周期（启动、健康检查、退出回收）。
  - 统一注入运行时配置（端口、数据目录、环境模式）。
  - 实施导航拦截、外链策略、权限最小化。

- 预加载（`electron/preload`）
  - 通过 `contextBridge.exposeInMainWorld` 暴露受控 API。
  - 仅允许白名单 IPC 通道（如应用信息、窗口控制、路径选择、日志桥接）。
  - 对入参与返回值做结构校验，避免渲染层构造任意 IPC 调用。

- 渲染进程（复用 `web/frontend`）
  - 保持 UI 逻辑与浏览器版一致。
  - API/WS 地址通过运行时配置注入，不硬编码 Electron 细节。
  - 仅依赖 `window.desktop` 的少量桌面扩展能力。

## 开发与生产启动策略

### 开发模式（`desktop:dev`）

- 启动顺序：
  1. 启动 `web/backend` 开发服务。
  2. 启动 `web/frontend` Vite dev server。
  3. 启动 Electron 主进程并加载 `http://localhost:<vite-port>`。
- 主进程通过环境变量读取开发地址与本地 API 基址（如 `ELECTRON_RENDERER_URL`、`PMSPEC_API_URL`）。
- 开发体验目标：前端 HMR + Electron 自动重启，最小化调试摩擦。

### 生产模式（`desktop:build` / `desktop:package`）

- 构建顺序：
  1. 构建 `web/shared`（类型产物）。
  2. 构建 `web/backend`（Node 可执行产物）。
  3. 构建 `web/frontend`（静态资源）。
  4. 构建 Electron 主进程与预加载代码。
- 运行方式：
  - Electron 主进程启动本地 backend（仅监听 `127.0.0.1`）。
  - 渲染进程从本地构建文件加载（`loadFile` 或等价本地协议）。
  - 主进程在 backend 健康后再展示窗口，避免空白页。

## 离线约束

- 安装后核心能力必须可离线运行：
  - 本地 Markdown/CSV 数据读取、编辑、统计、看板、时间线。
- 桌面端默认不依赖外部网络：
  - 前端静态资源、backend、类型与配置均来自本地包。
  - backend 只绑定环回地址，不暴露局域网端口。
- 远程能力（如 AI 或第三方导入）在离线时需显式降级：
  - 返回可理解错误，不阻塞核心本地流程。
- MVP 不启用强依赖在线服务的自动更新机制。

## 安全基线

### BrowserWindow 默认安全配置

- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- `enableRemoteModule: false`
- `webSecurity: true`

### IPC 与桥接约束

- 只允许白名单通道，不提供通配调用。
- 每个通道定义清晰的输入/输出类型（复用 `web/shared` 类型或新增 desktop types）。
- 主进程对 IPC 参数执行校验（推荐 `zod`），拒绝非法调用。

### 导航与外链策略

- 禁止任意跳转与新窗口创建。
- 外部链接通过主进程显式放行（最小白名单），其余全部拦截。
- 为渲染层设置 CSP，限制脚本来源为本地可信资源。

## 与 `web/backend`、`web/frontend` 的复用策略

### 复用 `web/frontend`

- 保持页面与组件实现不分叉；桌面端优先复用现有 React 代码。
- 将“运行环境差异”收敛在配置层：
  - 浏览器版继续使用 `VITE_API_URL` / `VITE_WS_URL`。
  - 桌面版由主进程注入本地 backend 地址。
- 仅在确有桌面特性的场景，通过 `window.desktop` 添加薄扩展，不污染通用页面逻辑。

### 复用 `web/backend`

- 复用现有路由与服务实现，不在 Electron 内重写业务逻辑。
- 新增“桌面运行时适配层”而非复制代码：
  - 注入 `PMSPACE_DIR`/工作区路径，避免依赖 `process.cwd()` 假设。
  - 注入监听地址与端口策略（默认 `127.0.0.1` + 动态端口或约定端口）。
- backend 仍作为唯一业务入口，保证 Web 与 Desktop 行为一致。

### 复用 `web/shared`

- 统一实体类型与接口契约，避免前后端与桌面桥接重复定义。
- 新增桌面桥接类型时优先放入共享层，保持 DRY。

## Risks / Trade-offs

- 子进程管理复杂度上升：需处理启动超时、端口占用、异常退出。
- 为保证安全默认开启 sandbox，调试与第三方库兼容性成本会增加。
- Web 与 Desktop 共用前端代码要求严格的环境隔离，需避免在渲染层引入 Node 假设。

## Migration Plan

1. 落地最小骨架（main/preload/renderer 加载链路）。
2. 接入本地 backend 生命周期管理与健康检查。
3. 完成开发脚本与生产构建/打包脚本。
4. 增补离线验证、安全基线验证与安装包回归。

## Open Questions

- backend 端口是否固定（便于调试）还是动态分配（降低冲突）？
- 桌面默认工作区路径是否跟随当前 CLI 约定，或首次启动引导用户选择？
- AI 相关功能在离线模式下的 UI 提示粒度是否需要统一文案规范？
