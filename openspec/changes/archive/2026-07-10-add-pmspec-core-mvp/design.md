# PMSpec Core MVP - Technical Design

## Context

PMSpec 是一个受 OpenSpec 启发的 AI 驱动项目管理工具。OpenSpec 成功地将规范管理简化为 Markdown 文档 + CLI 工具 + AI 集成的组合，我们希望将这个模式应用到项目管理领域。

关键背景：
- 目标用户：需要管理多人团队的项目经理/技术负责人
- 核心痛点：手动拆分任务、估算工时、平衡负载耗时且容易出错
- 约束条件：必须轻量级、易于版本控制、与现有工具（Git、IDE）无缝集成

## Goals / Non-Goals

### Goals
- 提供简洁的三层项目结构（Epic → Feature → UserStory）
- 通过 AI 自动化任务分解和负载分析
- 使用 Markdown 作为唯一的数据存储格式
- 提供类似 OpenSpec 的 CLI 体验
- 支持 Claude Code 的 slash commands 集成

### Non-Goals
- 不做可视化 UI（至少 MVP 不做）
- 不集成外部项目管理工具（Jira、Linear 等）
- 不处理时间跟踪或实际工时记录
- 不做实时协作功能

## Architecture Overview

```
pmspec/
├── src/
│   ├── core/               # 核心领域模型
│   │   ├── project.ts      # Project, Epic, Feature, Story
│   │   ├── team.ts         # TeamMember, Skill
│   │   ├── workload.ts     # WorkloadAnalyzer
│   │   └── parser.ts       # Markdown 解析器
│   ├── cli/                # CLI 入口
│   │   └── index.ts
│   ├── commands/           # CLI 命令实现
│   │   ├── init.ts         # pmspec init
│   │   ├── list.ts         # pmspec list
│   │   ├── show.ts         # pmspec show
│   │   ├── breakdown.ts    # pmspec breakdown (AI)
│   │   └── analyze.ts      # pmspec analyze (workload)
│   └── utils/
│       ├── markdown.ts     # MD 读写工具
│       └── validation.ts   # 数据验证
├── bin/
│   └── pmspec.js
└── .claude/
    └── commands/
        └── pmspec-*.md     # Slash commands for Claude Code
```

## Key Decisions

### Decision 1: 数据模型 - 三层层次结构

**选择**: Epic → Feature → UserStory

**原因**:
- Epic: 大的业务目标或里程碑（通常跨多个迭代）
- Feature: 可交付的功能单元（1-2 周）
- UserStory: 可独立实施的最小单元（1-3 天）

这个三层模型在敏捷实践中广泛使用，平衡了抽象层次和实用性。

**Alternatives Considered**:
- 两层模型（Feature → Task）: 太扁平，难以表达长期规划
- 四层模型（Theme → Epic → Feature → Story）: 过于复杂，MVP 不需要

### Decision 2: Markdown 文件结构

**选择**:
```
pmspace/
├── project.md              # 项目概览
├── team.md                 # 团队成员和技能
├── epics/
│   ├── epic-1.md
│   └── epic-2.md
└── features/
    ├── feature-1.md
    └── feature-2.md
```

每个 Epic 和 Feature 都是独立的 Markdown 文件，包含：
- 元数据（ID、状态、负责人、工时）
- 描述
- 子项列表

**原因**:
- 便于 Git 版本控制和 diff
- 便于 AI 读取和生成
- 便于人工审查和编辑

**Alternatives Considered**:
- 单个大文件: 难以并行协作，Git 冲突多
- JSON/YAML: 人类可读性差，不便于直接编辑

### Decision 3: AI 集成方式 - Prompt 文件

**选择**: 使用 `.claude/commands/pmspec-*.md` 作为 slash commands

**原因**:
- 与 OpenSpec 模式一致
- 无需维护 AI API 调用逻辑
- 用户可以在 Claude Code 中直接使用
- Prompt 可以随项目版本控制

**Commands 设计**:
- `/pmspec-breakdown`: 将需求描述分解为 Epic/Feature/Story
- `/pmspec-estimate`: 为任务估算工时
- `/pmspec-assign`: 根据技能匹配建议人员分配

**Alternatives Considered**:
- 内置 AI API 调用: 增加复杂度，需要 API key 管理
- 完全手动: 失去 AI 自动化的核心价值

### Decision 4: 工作负载分析算法

**选择**: 简单的启发式算法

**算法要素**:
1. **技能匹配度**: 计算成员技能与任务要求的重叠度（0-1）
2. **当前负载**: 统计成员已分配的总工时
3. **分配得分**: `score = skillMatch * (1 - currentLoad / maxCapacity)`

**原因**:
- MVP 阶段保持简单
- 可解释性强
- 无需复杂的优化求解器

**Alternatives Considered**:
- 线性规划优化: 过于复杂，MVP 不需要
- 机器学习预测: 需要历史数据，冷启动问题

### Decision 5: CLI 命令设计

**核心命令**:
```bash
pmspec init                    # 初始化项目
pmspec list [epics|features]   # 列出所有 Epic 或 Feature
pmspec show <id>               # 显示详情
pmspec create epic|feature|story  # 创建新项
pmspec breakdown <epic-id>     # AI 分解 Epic
pmspec analyze                 # 负载分析
pmspec validate                # 验证数据完整性
```

**原因**:
- 命令命名与 OpenSpec 风格一致
- 覆盖项目管理的核心场景
- 易于记忆和使用

## Data Schema

### Project.md
```markdown
# Project: [项目名称]

## Overview
[项目描述]

## Timeline
- Start: YYYY-MM-DD
- End: YYYY-MM-DD

## Team Capacity
- Total: X person-weeks
- Available: Y person-weeks
```

### Team.md
```markdown
# Team

## Members

### [姓名]
- **Skills**: React, TypeScript, Node.js
- **Capacity**: 40 hours/week
- **Current Load**: 20 hours/week
```

### Epic.md
```markdown
# Epic: [标题]

- **ID**: EPIC-001
- **Status**: planning | in-progress | completed
- **Owner**: [负责人]
- **Estimate**: 80 hours
- **Actual**: 0 hours

## Description
[详细描述]

## Features
- [ ] FEAT-001: [Feature 标题]
- [ ] FEAT-002: [Feature 标题]
```

### Feature.md
```markdown
# Feature: [标题]

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo | in-progress | done
- **Assignee**: [负责人]
- **Estimate**: 16 hours
- **Skills Required**: React, TypeScript

## Description
[详细描述]

## User Stories
- [ ] STORY-001: As a user, I want to... (4h)
- [ ] STORY-002: As a user, I want to... (6h)

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
```

## Validation Rules

1. **ID 唯一性**: 所有 Epic/Feature/Story 的 ID 必须唯一
2. **引用完整性**: Feature 引用的 Epic ID 必须存在
3. **状态有效性**: 状态必须是预定义的枚举值
4. **工时合理性**: 估算工时必须 > 0，实际工时 >= 0
5. **技能一致性**: 所需技能必须在团队技能库中存在

## Migration Plan

### Phase 1: 基础设施（Week 1）
1. 搭建 TypeScript + Commander 项目结构
2. 实现 Markdown 解析器和数据模型
3. 实现基础 CLI 命令（init、list、show）

### Phase 2: AI 集成（Week 2）
1. 编写 `/pmspec-breakdown` prompt
2. 实现 `pmspec breakdown` 命令（读取 AI 输出）
3. 测试任务分解质量

### Phase 3: 负载分析（Week 2-3）
1. 实现技能匹配算法
2. 实现负载分析命令
3. 添加 `pmspec analyze` 输出格式

### Phase 4: 验证和文档（Week 3）
1. 实现 `pmspec validate` 命令
2. 编写完整的 README 和使用文档
3. 创建示例项目

## Risks / Trade-offs

### Risk 1: AI 输出质量不稳定
- **Mitigation**: 提供明确的 prompt 模板，要求结构化输出
- **Fallback**: 支持手动编辑 AI 生成的结果

### Risk 2: Markdown 解析复杂度
- **Mitigation**: 使用严格的模板格式，减少解析歧义
- **Fallback**: 提供 `pmspec validate` 提前发现问题

### Risk 3: 技能匹配算法过于简单
- **Trade-off**: MVP 优先可用性，后续迭代可以引入更复杂算法
- **Mitigation**: 输出匹配得分，让用户可以人工调整

## Open Questions

1. **时区处理**: 如果团队跨时区，工作时间如何计算？
   - **Answer**: MVP 不考虑时区，所有时间都是抽象的"工作小时"

2. **依赖关系**: 是否需要支持任务之间的依赖关系？
   - **Answer**: MVP 不做复杂的依赖图，Feature 之间的依赖通过顺序表达

3. **版本控制**: 如果项目计划频繁变更，如何查看历史？
   - **Answer**: 依赖 Git，不在 pmspec 内部实现版本控制

4. **多项目支持**: 一个团队管理多个项目如何处理？
   - **Answer**: MVP 每个项目独立目录，未来可考虑工作空间概念
