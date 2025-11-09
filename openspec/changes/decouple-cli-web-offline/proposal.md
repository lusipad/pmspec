# Decouple CLI and Web for Independent Use and Offline Distribution

## Why

当前 PMSpec 的 CLI 和 Web UI 在代码结构上虽然分离，但在发布和使用上存在以下耦合问题：

1. **发布耦合**: `@pmspec/core` 包同时包含 CLI 和 Web，用户无法单独安装使用
2. **依赖臃肿**: 仅需 CLI 的用户也必须下载 Web 相关的依赖（React、Express 等），增加安装体积
3. **使用场景受限**:
   - CI/CD 环境中只需 CLI，不需要 Web UI
   - 离线环境下难以分发和使用
   - 服务器部署时无法单独部署 Web UI
4. **维护困难**: 更新 CLI 或 Web 任一部分都需要重新发布整个包

我们需要将 CLI 和 Web 解耦，使它们可以独立安装、使用和分发，同时支持离线包分发场景。

## What Changes

### 1. 包拆分策略

拆分为三个独立的 npm 包：

- **`@pmspec/cli`**: 核心 CLI 工具
  - 包含 `src/` 目录下的所有 CLI 功能
  - 不包含 `web/` 目录
  - 可独立使用，体积小巧

- **`@pmspec/web`**: Web UI 应用
  - 包含 `web/` 目录（frontend + backend + shared）
  - 可作为独立 Web 应用部署
  - 支持连接到项目的 pmspace 目录

- **`@pmspec/core`**: 便捷元包（Meta Package）
  - 依赖 `@pmspec/cli` 和 `@pmspec/web`
  - 为需要完整功能的用户提供一键安装
  - 保持向后兼容性

### 2. CLI 改进

- 修改 `serve` 命令，支持动态检测 `@pmspec/web` 是否安装
- 如果未安装 Web 包，提示用户安装：`npm install -g @pmspec/web`
- 支持通过环境变量或配置指定 Web UI 路径

### 3. 离线包分发

提供离线安装包选项：

- **CLI 离线包**: 包含编译后的 CLI 二进制文件（通过 pkg 或 nexe）
- **Web 离线包**: 包含预构建的 frontend + backend
- **完整离线包**: CLI + Web 的组合包

支持的离线分发格式：
- `.tar.gz` 归档包（Linux/macOS）
- `.zip` 归档包（Windows）
- Docker 镜像（可选）

### 4. 发布流程优化

- 独立的发布工作流：
  - `release-cli.yml`: 发布 `@pmspec/cli`
  - `release-web.yml`: 发布 `@pmspec/web`
  - `release-core.yml`: 发布 `@pmspec/core` 元包
  - `release-offline.yml`: 构建离线安装包
- 语义化版本管理，各包可独立版本
- 支持预发布版本（alpha、beta、rc）

## Impact

### Affected Specs

- **MODIFIED** `cli-commands`: 更新 `serve` 命令，支持可选的 Web 依赖
- **MODIFIED** `package-publishing`: 重构发布流程，支持多包发布和离线包
- **MODIFIED** `web-app-architecture`: Web 作为独立应用，支持独立部署

### Affected Code

**新增代码**:
- `packages/cli/` - CLI 独立包结构
- `packages/web/` - Web 独立包结构
- `packages/core/` - 元包配置
- `scripts/build-offline.ts` - 离线包构建脚本
- `.github/workflows/release-*.yml` - 独立发布工作流

**修改代码**:
- `src/commands/serve.ts` - 支持可选 Web 依赖检测
- `package.json` - 拆分为多个 package.json
- `README.md` - 更新安装和使用说明
- `PUBLISHING.md` - 更新发布指南

**迁移路径**:
- 现有 `src/` → `packages/cli/src/`
- 现有 `web/` → `packages/web/`
- 根 `package.json` → `packages/core/package.json`

### Breaking Changes

**轻微破坏性变更**:

1. **包名变更**（提供迁移路径）:
   - `@pmspec/core` 从完整包变为元包
   - 建议用户迁移到 `@pmspec/cli` 或 `@pmspec/web`
   - 保留 `@pmspec/core` 作为元包以保持向后兼容

2. **`serve` 命令行为**:
   - 如果未安装 `@pmspec/web`，会提示安装而不是报错
   - 可通过 `--web-path` 参数指定自定义 Web UI 路径

**迁移策略**:
- 提供迁移指南文档
- 在 `@pmspec/core` v2.0 中显示弃用警告
- v3.0 正式移除完整包，仅保留元包

## Timeline Estimate

**预计 2-3 周完成**

- Week 1: 包拆分和重构（monorepo 设置，package 拆分）
- Week 2: 离线包构建和测试（二进制打包，Docker 镜像）
- Week 3: 发布流程、文档更新和验证测试

## Success Criteria

1. **独立安装和使用**
   - `npm install -g @pmspec/cli` 可独立使用所有 CLI 功能
   - `npm install -g @pmspec/web` 可独立运行 Web UI
   - `npm install -g @pmspec/core` 一键安装完整功能

2. **离线包可用**
   - CLI 离线包可在无网络环境下安装和运行
   - Web 离线包可在无网络环境下部署
   - 完整离线包提供 CLI + Web 的开箱即用体验

3. **包体积优化**
   - `@pmspec/cli` 体积 < 5MB（不含 node_modules）
   - `@pmspec/web` 独立管理依赖
   - `@pmspec/core` 仅包含依赖声明

4. **向后兼容**
   - 现有用户升级 `@pmspec/core` 不受影响
   - 所有 CLI 命令继续正常工作
   - Web UI 功能保持不变

5. **文档完善**
   - 提供详细的安装和迁移指南
   - 更新 README 和 PUBLISHING 文档
   - 提供离线包使用说明

## Non-Goals (Post-MVP)

- Electron 桌面应用打包
- 移动端原生应用
- 插件系统和扩展机制
- 企业级私有部署方案
