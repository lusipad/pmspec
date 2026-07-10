# Project Context

## Purpose
PMSpec 是"长在 Git 仓库里的 AI 原生项目管理"：项目计划是仓库中的 Markdown 文件，
AI agent 负责分解需求、估算工时、建议分配，人通过 git diff 审查。
目标用户是使用 AI 编码助手的小团队与独立开发者。

## Tech Stack
- **CLI**: TypeScript (strict), Commander.js, Chalk, cli-table3
- **数据**: Markdown + YAML frontmatter（gray-matter），zod 校验，无数据库
- **检索**: MiniSearch（CJK 逐字分词）
- **Testing**: Vitest（单元 + CLI 集成测试，pool: forks）
- **Build**: tsc

## Project Conventions

### Code Style
- TypeScript strict mode，禁止 `any`
- 命名：camelCase 变量/函数，PascalCase 类型/接口
- 领域类型唯一来源：`src/core/schema.ts`，禁止在别处重复定义

### Architecture Patterns
- **CLI**: Command 模式（每命令一文件，`src/commands/`）
- **数据流**: pmspace/ 文件 → storage(frontmatter 解析) → schema 校验 → Workspace → 命令
- **机器接口**: 查询类命令一律支持 `--json`；错误退出码为 1
- **回写保真**: 更新实体时合并原始 frontmatter，保留用户自定义键

### Testing Strategy
- 核心模块单元测试（`src/core/*.test.ts`）
- CLI 集成测试走真实临时目录闭环（`src/commands/cli.test.ts`）
- 提交前 `npm test` + `npx tsc --noEmit` 全绿

### Git Workflow
- 主分支：main；功能分支：feature/xxx；修复分支：fix/xxx
- Commit 格式：conventional commits (feat:, fix:, chore:, docs:)

## Domain Context
- **Epic → Feature → Story** 三层，Story 层可选（minimal 模式甚至无 Epic）
- **status** 统一枚举：`todo | in-progress | done | blocked`
- **工时**: 小时；estimate 必须 > 0，actual ≥ 0；接受 `16` 与 `"16h"` 两种写法
- **统计口径**: 有 Story 的 Feature 以 Story 计量（负责人缺省继承），避免双重计数
- **技能匹配**: feature.skills 对照 team.md members 的 skills；缺口是 warning 不是 error

## Important Constraints
- 必须支持离线使用；不内置任何在线 AI API 调用，不触碰密钥
- 数据必须人类可读、可手工编辑（validate 兜底）
- 不依赖外部数据库；兼容 Git 版本控制（每实体一文件，减少冲突）
- AI 集成形态 = agent 直接操作文件与 CLI（契约见根目录 AGENTS.md），禁止复制粘贴流程

## External Dependencies
- Claude Code slash commands（.claude/commands/pmspec-*.md）；其他 agent 走 AGENTS.md 契约
- 未来（如有真实需求）：`pmspec serve` 本地只读看板、Jira/Linear 单向导入
