# PMSpec Core MVP

## Why

项目管理的复杂性往往让管理者陷入繁琐的层次规划、任务分配和负载平衡中。受 OpenSpec 的启发，我们需要一个 AI 驱动的项目管理工具，让管理者专注于高层次的需求变更，而将 Epic/Feature/UserStory 的细分、工时估算和人员分配等工作交给 AI 自动处理。

PMSpec 旨在通过 Markdown 文档和 CLI 工具提供轻量级的项目管理体验，类似 OpenSpec 对规范管理的革新。

## What Changes

- 建立基础项目管理结构，定义 Epic/Feature/UserStory 三层层次模型
- 实现 AI 驱动的任务自动分解能力，通过 Claude Code 的 prompt 集成
- 提供工作负载自动分析，基于人员技能匹配和工时估算
- 开发 CLI 工具集（类似 openspec list/show/validate）用于项目管理
- 使用 Markdown 作为主要的数据存储和展示格式

## Impact

### Affected Specs
- **NEW** `project-structure`: 定义项目层次结构的核心数据模型
- **NEW** `ai-task-breakdown`: AI 驱动的任务分解能力规范
- **NEW** `workload-analysis`: 工作负载分析和人员分配规范
- **NEW** `cli-commands`: CLI 命令接口规范

### Affected Code
- 新建整个项目代码库（参考 OpenSpec 的架构）
- 需要创建 `src/core/`、`src/cli/`、`src/commands/`、`src/utils/` 等目录
- 需要配置 TypeScript、Commander、Inquirer 等依赖

### Breaking Changes
无（这是全新项目）

## Timeline Estimate
预计 2-3 周完成 MVP 版本

## Success Criteria
- CLI 工具可以成功创建和管理项目层次结构
- AI 可以通过 prompt 文件集成，自动分解需求为 Epic/Feature/Story
- 工作负载分析能够基于技能匹配和工时估算输出合理的人员分配建议
- 所有数据以 Markdown 格式存储，便于人工审查和版本控制
