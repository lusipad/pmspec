## Why
当前已有 Web 与 CLI 两种入口：Web 适合可视化操作，CLI 适合自动化与脚本化；但在离线可用性、桌面集成（安装包、系统托盘、原生窗口）和本地一体化体验上仍有缺口。需要新增 Electron 桌面客户端，复用现有能力并降低使用门槛。

## What Changes
- 新增基于 Electron 的桌面客户端能力，作为现有 Web + CLI 的第三种官方入口。
- 桌面端优先复用现有 Web 前端与本地服务能力，保持核心业务逻辑单一实现，避免分叉。
- 增加桌面应用基础能力：应用壳、窗口生命周期、打包分发（Windows/macOS/Linux）与本地配置管理。
- 明确桌面端与 CLI/Web 的协作边界（同一数据模型与文件格式，统一项目目录读写约定）。
- 非目标：
  - 不重写现有 Web 前端或 CLI 命令体系。
  - 不在本次变更中引入云同步、账号体系或在线依赖。
  - 不在本次变更中新增与桌面形态无关的业务功能。

## Impact
- Affected specs: desktop-client（新增）, web-gui（协作约束补充）, cli（协作约束补充）
- Affected code: Electron 主/渲染进程骨架、桌面打包配置、Web/CLI 启动与集成适配层
- Compatibility: 对现有 Web 与 CLI 保持向后兼容；现有命令、数据格式（Markdown/CSV）与项目结构不变，桌面端仅新增入口与集成能力
