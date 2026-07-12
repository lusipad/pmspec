# Design: Decouple CLI and Web for Independent Use

## Context

PMSpec 当前是一个单一的 npm 包（`@pmspec/core`），包含 CLI 工具和 Web UI。虽然代码在目录结构上已经分离（`src/` vs `web/`），但在发布和使用上仍然耦合在一起。用户无法选择只安装 CLI 或只安装 Web UI，这在某些场景下（如 CI/CD、离线环境、服务器部署）造成不便。

### Stakeholders
- **CLI 用户**: 需要轻量级的命令行工具，不需要 Web 依赖
- **Web 用户**: 需要独立部署 Web UI
- **CI/CD 管道**: 需要最小化的 CLI 工具
- **离线环境用户**: 需要可离线分发的安装包
- **包维护者**: 需要独立发布和版本管理

### Constraints
- 必须保持向后兼容性（现有用户不受影响）
- 必须支持 Node.js >=20.0.0
- 必须保持现有 CLI 命令的行为
- 发布流程必须自动化

## Goals / Non-Goals

### Goals
1. 将 CLI 和 Web 拆分为独立的 npm 包
2. 支持离线包分发（tar.gz、zip、Docker）
3. 优化包体积（CLI < 5MB）
4. 提供向后兼容的迁移路径
5. 独立的版本管理和发布流程

### Non-Goals
- 不实现 Electron 桌面应用
- 不支持插件系统（Post-MVP）
- 不提供移动端原生应用
- 不实现企业级私有部署（Post-MVP）

## Decisions

### Decision 1: Monorepo Structure with Workspaces

**What**: 使用 npm workspaces 管理多个包

**Why**:
- 共享依赖和构建配置
- 简化本地开发和测试
- 支持跨包的类型引用
- 便于统一的 CI/CD

**Structure**:
```
pmspec/
├── packages/
│   ├── cli/              # @pmspec/cli
│   │   ├── src/          # 从根目录迁移
│   │   ├── bin/
│   │   └── package.json
│   ├── web/              # @pmspec/web
│   │   ├── frontend/
│   │   ├── backend/
│   │   ├── shared/
│   │   └── package.json
│   └── core/             # @pmspec/core (meta package)
│       └── package.json  # 仅依赖 cli + web
├── scripts/
│   └── build-offline.ts
└── package.json          # workspace root
```

**Alternatives Considered**:
- **多仓库 (Multi-repo)**: 管理复杂，依赖同步困难
- **Lerna**: 功能过于复杂，npm workspaces 已足够

### Decision 2: Meta Package Strategy

**What**: `@pmspec/core` 作为元包，依赖 `@pmspec/cli` 和 `@pmspec/web`

**Why**:
- 保持向后兼容（现有用户可继续使用 `@pmspec/core`）
- 提供便捷的完整安装选项
- 避免破坏性的包名更改

**Implementation**:
```json
{
  "name": "@pmspec/core",
  "version": "2.0.0",
  "dependencies": {
    "@pmspec/cli": "^2.0.0",
    "@pmspec/web": "^2.0.0"
  },
  "bin": {
    "pmspec": "./node_modules/@pmspec/cli/bin/pmspec.js"
  }
}
```

**Alternatives Considered**:
- **完全废弃 @pmspec/core**: 破坏性太大，影响现有用户
- **@pmspec/core 继续作为完整包**: 无法实现拆分目标

### Decision 3: Optional Web Dependency in CLI

**What**: CLI 的 `serve` 命令动态检测 `@pmspec/web` 的存在

**Why**:
- CLI 不强制依赖 Web
- 保持 `serve` 命令的可用性
- 提供友好的安装提示

**Implementation**:
```typescript
// src/commands/serve.ts
export const serveCommand = new Command('serve')
  .option('--web-path <path>', 'Custom path to Web UI')
  .action(async (options) => {
    const webPath = options.webPath || await findWebPackage();

    if (!webPath) {
      console.error('❌ Web UI not found.');
      console.log('\n💡 Install it with:');
      console.log('   npm install -g @pmspec/web');
      console.log('\nOr specify a custom path:');
      console.log('   pmspec serve --web-path /path/to/web');
      process.exit(1);
    }

    // Start server...
  });

async function findWebPackage(): Promise<string | null> {
  // Try global installation
  try {
    const globalPath = execSync('npm root -g', { encoding: 'utf-8' }).trim();
    const webPath = path.join(globalPath, '@pmspec/web');
    await fs.access(webPath);
    return webPath;
  } catch {}

  // Try local node_modules
  try {
    const localPath = path.join(process.cwd(), 'node_modules/@pmspec/web');
    await fs.access(localPath);
    return localPath;
  } catch {}

  return null;
}
```

**Alternatives Considered**:
- **移除 serve 命令**: 破坏现有功能
- **将 serve 移到 @pmspec/web**: 用户体验不佳，需要切换包

### Decision 4: Offline Package Distribution

**What**: 提供多种离线安装包格式

**Formats**:
1. **Tarball (.tar.gz)**:
   - CLI: 预编译的 TypeScript + node_modules
   - Web: 预构建的 frontend dist + backend
   - 适用于 Linux/macOS

2. **ZIP (.zip)**:
   - 与 tarball 相同内容，Windows 友好

3. **Standalone Binary (Optional)**:
   - 使用 `pkg` 或 `esbuild` 打包 CLI
   - 单文件可执行，无需 Node.js（仅 CLI）

4. **Docker Image (Optional)**:
   - 包含 CLI + Web 的完整镜像
   - 适用于容器化部署

**Implementation**:
```typescript
// scripts/build-offline.ts
async function buildOfflinePackages() {
  // 1. Build CLI package
  await buildCLI();
  await createTarball('packages/cli', 'dist/offline/pmspec-cli.tar.gz');
  await createZip('packages/cli', 'dist/offline/pmspec-cli.zip');

  // 2. Build Web package
  await buildWeb();
  await createTarball('packages/web', 'dist/offline/pmspec-web.tar.gz');
  await createZip('packages/web', 'dist/offline/pmspec-web.zip');

  // 3. Build complete package
  await createTarball(['packages/cli', 'packages/web'], 'dist/offline/pmspec-full.tar.gz');
  await createZip(['packages/cli', 'packages/web'], 'dist/offline/pmspec-full.zip');

  // 4. Optional: Build standalone binary
  if (process.env.BUILD_BINARY) {
    await buildStandaloneBinary();
  }
}
```

**Why**:
- 满足离线环境的需求
- 简化分发和安装
- 支持无网络的 CI/CD 环境

**Alternatives Considered**:
- **仅提供 npm tarball**: 不够灵活，需要 npm 环境
- **仅提供 Docker**: 不适用于所有场景

### Decision 5: Independent Versioning

**What**: 各包独立管理语义化版本

**Strategy**:
- `@pmspec/cli`: 独立版本（如 2.1.0）
- `@pmspec/web`: 独立版本（如 2.0.5）
- `@pmspec/core`: 同步主版本号，依赖最新的 CLI 和 Web

**Release Workflow**:
```yaml
# .github/workflows/release-cli.yml
name: Release CLI
on:
  push:
    tags:
      - 'cli-v*'  # cli-v2.1.0

# .github/workflows/release-web.yml
name: Release Web
on:
  push:
    tags:
      - 'web-v*'  # web-v2.0.5

# .github/workflows/release-core.yml
name: Release Core
on:
  push:
    tags:
      - 'core-v*'  # core-v2.1.0
```

**Why**:
- CLI 和 Web 可以独立迭代
- 减少不必要的发布
- 更清晰的版本管理

**Alternatives Considered**:
- **同步版本**: 每次更新都需要同时发布所有包，浪费资源

## Risks / Trade-offs

### Risk 1: 迁移复杂度

**Risk**: 现有用户可能不理解新的包结构

**Mitigation**:
- 提供详细的迁移指南
- `@pmspec/core` 保持向后兼容
- 在文档中明确说明各包的用途
- 在 CLI 中显示友好的提示信息

### Risk 2: 包发现问题

**Risk**: 用户可能找不到 `@pmspec/cli` 或 `@pmspec/web`

**Mitigation**:
- 在 `@pmspec/core` 的 README 中显著提示
- npm 包描述中清楚说明
- 在 GitHub 主页更新安装说明

### Risk 3: Monorepo 管理复杂性

**Risk**: 多包管理可能增加维护成本

**Mitigation**:
- 使用 npm workspaces，工具链成熟
- 统一的构建和测试脚本
- 自动化的发布流程

### Trade-off: 包体积 vs 功能完整性

**Trade-off**: CLI 独立后可能缺少某些 Web 相关功能

**Decision**:
- CLI 专注于核心功能，不包含 Web
- `serve` 命令检测并提示安装 Web
- 用户可根据需求选择安装

## Migration Plan

### Phase 1: Monorepo Setup (Week 1)

1. 创建 `packages/` 目录
2. 迁移 `src/` → `packages/cli/src/`
3. 迁移 `web/` → `packages/web/`
4. 设置 npm workspaces
5. 更新 TypeScript 配置
6. 更新构建脚本

### Phase 2: Offline Build (Week 2)

1. 实现 `scripts/build-offline.ts`
2. 支持 tarball 和 zip 打包
3. 测试离线安装
4. 添加 GitHub Actions 工作流
5. 生成离线包文档

### Phase 3: Publishing and Documentation (Week 3)

1. 配置独立的发布工作流
2. 发布 alpha/beta 版本进行测试
3. 更新 README 和 PUBLISHING 文档
4. 编写迁移指南
5. 发布正式版本 v2.0.0

### Rollback Plan

如果迁移出现问题：
1. 保留 v1.x 分支，继续维护旧版本
2. 通过 `@pmspec/core` v1.x 提供回退选项
3. 暂停新版本发布，修复问题后重新发布

## Open Questions

1. **是否需要支持 standalone binary?**
   - Pro: 无需 Node.js 环境，更便携
   - Con: 增加构建复杂度，体积较大
   - **Decision**: 作为可选功能，通过环境变量控制

2. **是否需要 Docker 镜像?**
   - Pro: 容器化部署更便捷
   - Con: 增加维护成本
   - **Decision**: 作为后续优化，非 MVP 必需

3. **CLI 和 Web 的最低 Node.js 版本?**
   - Current: Node.js >= 20.0.0
   - **Decision**: 保持一致，都使用 >= 20.0.0

4. **是否支持 Yarn/pnpm workspaces?**
   - **Decision**: 优先使用 npm workspaces，确保兼容性
