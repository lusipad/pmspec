# Project Context

## Purpose
PMSpec 是一个 AI 驱动的轻量级项目管理工具，让管理者专注于高层次需求，将 Epic/Feature/UserStory 的细分、工时估算和人员分配交给 AI 处理。目标是成为中小团队的首选项目管理解决方案。

## Tech Stack
- **CLI**: TypeScript, Commander.js, Inquirer, Chalk
- **Frontend**: React 18, TypeScript, TailwindCSS, TanStack Query, Recharts, dnd-kit
- **Backend**: Node.js, Express, TypeScript
- **Storage**: Markdown files, CSV (无数据库依赖)
- **Testing**: Vitest
- **Build**: TypeScript Compiler (tsc)

## Project Conventions

### Code Style
- TypeScript strict mode
- ESLint with @typescript-eslint rules
- 禁止使用 `any` 类型，必须定义明确的接口
- 函数式组件 + Hooks（React）
- 命名：camelCase 变量/函数，PascalCase 类/组件/接口

### Architecture Patterns
- **CLI**: Command pattern (每个命令一个文件)
- **Frontend**: 页面组件 + 服务层 + 工具函数分离
- **Backend**: Express routes + services 分层
- **数据流**: 文件系统 → Parser → Model → Renderer

### Testing Strategy
- 单元测试：核心解析器、数据模型
- 集成测试：CLI 命令、API 端点
- E2E 测试：关键用户流程（待实现）
- 目标覆盖率：80%+

### Git Workflow
- 主分支：main
- 功能分支：feature/xxx
- 修复分支：fix/xxx
- Commit 格式：conventional commits (feat:, fix:, chore:, docs:)

## Domain Context
- **Epic**: 大型功能模块，包含多个 Feature
- **Feature**: 可交付的功能单元，包含多个 User Story
- **User Story**: 最小可估算的工作单元
- **工时**: 以小时为单位，支持估算和实际对比
- **技能匹配**: 根据团队成员技能分配任务

## Important Constraints
- 必须支持离线使用（无需网络连接）
- 数据必须是人类可读的（Markdown/CSV）
- 不依赖外部数据库
- 兼容 Git 版本控制

## External Dependencies
- Claude Code / AI IDE 集成（通过 slash commands）
- 未来：Jira, Linear, GitHub Issues 导入导出
