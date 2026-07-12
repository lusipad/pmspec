# AI 任务分解规范

## ADDED Requirements

### Requirement: MUST 支持基于提示词的任务分解
PMSpec MUST 通过提示词文件与 Claude Code 集成，实现 AI 驱动的任务分解。系统MUST 提供结构化的提示词，指导 AI 将高层次需求分解为 Epic/Feature/UserStory 层次结构。

#### Scenario: 通过 slash 命令分解需求
- **WHEN** 用户在 Claude Code 中使用需求文本运行 `/pmspec-breakdown`
- **THEN** AI MUST 分析需求并生成包含 Epic、Features 和 Stories 的结构化输出
- **AND** 输出必须遵循标准化的 Markdown 格式

#### Scenario: 解析 AI 生成的分解结果
- **WHEN** AI 生成包含 1 个 Epic 和 3 个 Features 的分解结果
- **THEN** `pmspec breakdown` 命令必须解析输出并创建相应的 Markdown 文件
- **AND** MUST 通过 ID 引用建立父子关系

### Requirement: MUST 使用结构化输出格式
AI 生成的任务分解 MUST 遵循严格的 Markdown 格式以确保可解析性。

#### Scenario: 验证 AI 输出结构
- **WHEN** AI 生成分解结果
- **THEN** 输出MUST 包含清晰的章节标题：`# Epic:`、`## Feature:`、`### UserStory:`
- **AND** 每个条目MUST 包含必需的元数据：ID、估算、描述

#### Scenario: 处理格式错误的 AI 输出
- **WHEN** AI 输出缺少必需的 ID 字段
- **THEN** `pmspec breakdown` 必须报告验证错误 "Feature 章节缺少必需字段：ID"
- **AND** 不得创建不完整的文件

### Requirement: MUST 生成工时估算
AI MUST 在分解过程中为Each Epic MUST、Feature 和 UserStory 提供时间估算。

#### Scenario: 以小时为单位生成估算
- **WHEN** AI 分解一个 Feature
- **THEN** 每个 UserStory MUST 包含以小时为单位的估算（例如 "4h"、"8h"）
- **AND** Feature 的估算必须等于其所有 UserStory 估算的总和

#### Scenario: 验证估算范围
- **WHEN** AI 生成估算
- **THEN** UserStory 估算MUST 在 1-24 小时之间
- **AND** Feature 估算MUST 在 4-80 小时之间
- **AND** Epic 估算MUST 在 20-500 小时之间

### Requirement: MUST 推断技能需求
AI MUST 根据任务描述推断并标记每个 Feature 和 UserStory 所需的技能。

#### Scenario: 为前端 Feature 标记 React 技能
- **WHEN** AI 分析 Feature "构建用户仪表板 UI"
- **THEN** 该 Feature 必须被标记技能：["React", "TypeScript", "CSS"]

#### Scenario: 将技能与团队能力匹配
- **WHEN** 分解结果包含技能 "GraphQL"
- **THEN** 系统 MUST验证此技能是否存在于 `team.md` 中
- **AND** 如果没有团队成员拥有该技能，必须发出警告

### Requirement: MUST 支持迭代式优化
用户 MUST能够通过后续提示词优化 AI 生成的分解结果。

#### Scenario: 请求分解优化
- **WHEN** 用户使用附加上下文运行 `/pmspec-refine EPIC-001`
- **THEN** AI MUST重新生成分解结果，融入新的需求
- **AND** 必须保留现有 ID 以保持一致性

#### Scenario: 合并优化后的分解结果
- **WHEN** 应用优化后的分解结果
- **THEN** 系统 MUST更新现有文件而不是创建重复文件
- **AND** 必须保留手动编辑的字段（例如 Assignee、Actual hours）
