# 实施任务

## 1. 脚手架
- [x] 1.1 创建 electron/main 与 electron/preload 目录及入口文件，形成最小可运行桌面端骨架。
- [x] 1.2 在项目配置中声明 Electron 运行入口与桌面端源码路径，避免影响现有 CLI/Web 入口。
- [x] 1.3 补充桌面端基础环境变量约定（开发/生产），用于后续主进程加载策略。

## 2. 脚本
- [x] 2.1 在 package.json 新增桌面端开发脚本（如 desktop:dev），支持同时启动渲染层与 Electron。
- [x] 2.2 新增桌面端构建脚本（如 desktop:build），先构建渲染层再构建桌面进程代码。
- [x] 2.3 新增桌面端打包脚本（如 desktop:package），统一输出安装包产物目录。

## 3. 主进程
- [x] 3.1 实现 BrowserWindow 创建逻辑，默认开启 contextIsolation、关闭 nodeIntegration。
- [x] 3.2 按环境区分加载目标：开发模式加载本地 dev server，生产模式加载本地构建文件。
- [x] 3.3 实现应用生命周期事件（ready、window-all-closed、activate）以保证稳定启动与退出。

## 4. 预加载
- [x] 4.1 实现 preload 脚本并通过 contextBridge 暴露最小可用 API，不直接暴露 Node.js 能力。
- [x] 4.2 建立主进程与渲染进程的 IPC 白名单通道，限制可调用事件范围。
- [x] 4.3 为暴露 API 增加类型声明，确保渲染层调用可被 TypeScript 校验。

## 5. 打包
- [x] 5.1 配置 Electron 打包工具（如 electron-builder/electron-forge）与应用元数据。
- [x] 5.2 配置目标平台产物格式与输出路径，确保可生成可分发安装包。
- [x] 5.3 校验打包清单仅包含运行必需文件，排除无关开发资源。

## 6. 验证
- [x] 6.1 执行桌面端相关静态检查（lint/typecheck）并修复阻塞问题。
- [x] 6.2 进行本地冒烟验证：启动桌面应用、加载主界面、执行一次基础交互。
- [ ] 6.3 执行打包验证：生成安装包并在本机完成安装与启动回归。
