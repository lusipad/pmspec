# Commercial Roadmap - Technical Design

## Context
PMSpec 从 MVP 向商业级软件演进，需要在保持轻量级优势的同时，增加企业级功能。主要挑战是在无数据库架构下实现高级功能。

## Goals / Non-Goals

### Goals
- 保持 "Markdown-first" 的核心理念
- 支持团队协作（5-50 人规模）
- 提供企业级安全和合规能力
- 实现可扩展的插件架构
- 支持主流项目管理工具集成

### Non-Goals
- 不替代 Jira/Linear 等成熟产品的全部功能
- 不支持超大规模（>1000 人）部署
- 不实现内置实时多人编辑（依赖 Git）
- 不构建 SaaS 多租户架构（第一阶段）

## Decisions

### 1. 存储架构
- **Decision**: 保持文件系统存储，添加可选 SQLite 索引层
- **Why**: 保持 Git 友好性，同时支持快速搜索和查询
- **Alternative**: PostgreSQL → 违背轻量级原则

### 2. 认证方案
- **Decision**: JWT + 可选 OAuth，本地部署默认无认证
- **Why**: 灵活适配不同部署场景
- **Alternative**: 仅 OAuth → 本地开发体验差

### 3. 实时协作
- **Decision**: 文件监听 + WebSocket 推送变更通知
- **Why**: 不改变底层存储，通过通知实现"近实时"
- **Alternative**: CRDT → 过度复杂

### 4. 插件系统
- **Decision**: 基于 Hook 的同步插件 API
- **Why**: 简单可预测，避免异步复杂性
- **Alternative**: 独立进程插件 → 通信开销大

### 5. 类型共享
- **Decision**: 创建 @pmspec/types 包，前后端共用
- **Why**: 单一数据源，减少类型不一致
- **Structure**:
  ```
  packages/
  ├── types/          # 共享类型定义
  ├── core/           # 核心 CLI
  ├── web-backend/    # API 服务
  └── web-frontend/   # React 应用
  ```

## Architecture Evolution

### Current (MVP)
```
┌─────────────┐     ┌─────────────┐
│   CLI       │     │  Frontend   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  File       │◄────│  Backend    │
│  System     │     │  (Express)  │
└─────────────┘     └─────────────┘
```

### Target (Commercial)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CLI       │     │  Frontend   │     │  Plugins    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │            ┌──────┴──────┐            │
       │            │  WebSocket  │            │
       │            └──────┬──────┘            │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                    API Layer (v1)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │  Auth   │  │  RBAC   │  │  Audit  │  │ Webhook│ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  File       │ │  SQLite     │ │  External   │
│  System     │ │  Index      │ │  Services   │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Data Model Changes

### New: Milestone
```typescript
interface Milestone {
  id: string;           // MILE-XXX
  title: string;
  targetDate: string;   // ISO date
  status: 'upcoming' | 'active' | 'completed';
  features: string[];   // Feature IDs
}
```

### New: Dependency
```typescript
interface Dependency {
  from: string;         // Feature ID
  to: string;           // Feature ID
  type: 'blocks' | 'relates-to';
}
```

### New: Changelog Entry
```typescript
interface ChangelogEntry {
  timestamp: string;
  user: string;
  entity: { type: 'epic' | 'feature'; id: string };
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| 文件系统性能瓶颈 | 大项目查询慢 | SQLite 索引层 |
| Breaking changes | 用户升级困难 | 提供迁移脚本和工具 |
| 功能蔓延 | 偏离轻量级定位 | 严格的 scope 控制 |
| 插件安全 | 恶意代码风险 | 沙箱执行 + 代码审核 |

## Migration Plan

### v1.x → v2.0 (Phase 2)
1. 添加 `pmspec migrate` 命令
2. 自动检测旧格式文件
3. 备份原文件后原地升级
4. 提供回滚选项

### 数据格式变更
```markdown
# Feature: Login Form (v1)
- **Dependencies**: (新增字段)
  - blocks: FEAT-003
  - relates-to: FEAT-005
```

## Open Questions

1. **插件分发**：npm 包 vs 独立市场？
2. **SaaS 路线**：是否第二阶段考虑托管版本？
3. **定价模式**：开源核心 + 商业插件？还是 Open Core？
4. **数据库可选**：是否支持 PostgreSQL 作为可选后端？
