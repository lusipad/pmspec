# 工作负载分析规范

## ADDED Requirements

### Requirement: MUST 提供基于技能的匹配
PMSpec MUST 分析团队成员的技能并将其与 Feature/UserStory 的需求匹配，以建议最优的任务分配。

#### Scenario: 计算技能匹配分数
- **WHEN** 一个 Feature 需要技能 ["React", "TypeScript"]
- **AND** 团队成员 Alice 拥有技能 ["React", "TypeScript", "Node.js"]
- **THEN** 匹配分数MUST 为 1.0（100% 匹配）
- **AND** 必须比部分匹配的成员具有更高优先级

#### Scenario: 部分技能匹配
- **WHEN** 一个 Feature 需要技能 ["React", "GraphQL", "PostgreSQL"]
- **AND** 团队成员 Bob 拥有技能 ["React", "PostgreSQL"]
- **THEN** 匹配分数MUST 为 0.67（2/3 匹配）
- **AND** 必须标记 "GraphQL" 为缺失技能

### Requirement: 必须实现负载平衡
系统MUST 计算每个团队成员的当前工作负载，并平衡任务分配以防止过度分配。

#### Scenario: 计算当前负载
- **WHEN** Alice 被分配的 Features 总估算为 30 小时
- **AND** 她的周容量为 40 小时
- **THEN** 她的当前负载MUST 为 75%（30/40）
- **AND** 她必须还有 10 小时可用

#### Scenario: 防止过度分配
- **WHEN** Alice 的当前负载为 38 小时，容量为 40 小时
- **AND** 一个新 Feature 需要 8 小时
- **THEN** 系统不得推荐 Alice
- **AND** 必须建议负载较低的成员

### Requirement: MUST 提供分配评分算法
系统MUST 使用结合技能匹配和当前负载的综合评分来对分配候选人进行排名。

#### Scenario: 计算分配评分
- **WHEN** 评估 Alice 是否适合某个 Feature
- **AND** 她的技能匹配度为 0.8
- **AND** 她的当前负载为 20/40（50%）
- **THEN** 她的分配评分MUST 为 0.8 * (1 - 0.5) = 0.4
- **AND** 较高的评分必须表示更好的候选人

#### Scenario: 按评分排序候选人
- **WHEN** 分析 3 个团队成员：Alice（评分 0.4）、Bob（评分 0.6）、Carol（评分 0.3）
- **THEN** 系统 MUST按以下顺序推荐：Bob、Alice、Carol

### Requirement: MUST 生成工作负载报告
PMSpec MUST 生成综合的工作负载报告，显示所有团队成员的分配状态。

#### Scenario: 生成工作负载摘要
- **WHEN** 用户运行 `pmspec analyze`
- **THEN** 系统 MUST显示包含以下列的表格：姓名、技能、容量、已分配、可用、负载 %
- **AND** 必须突出显示过度分配的成员（>100% 负载）

#### Scenario: 识别未分配的工作
- **WHEN** 运行工作负载分析
- **THEN** 系统 MUST列出状态为 "todo" 且无 Assignee 的 Features
- **AND** MUST 计算未分配工作的总小时数

### Requirement: MUST 提供团队技能缺口分析
系统MUST 识别没有团队成员拥有的必需技能。

#### Scenario: 检测缺失技能
- **WHEN** Features 需要技能 "Machine Learning"
- **AND** `team.md` 中没有团队成员拥有该技能
- **THEN** 系统 MUST报告 "检测到技能缺口：Machine Learning（FEAT-003、FEAT-007 需要）"
- **AND** 必须建议 "考虑培训或招聘该技能"

#### Scenario: 建议技能发展
- **WHEN** 3 个 Features 需要技能 "Kubernetes"
- **AND** 只有 1 个团队成员拥有该技能
- **THEN** 系统 MUST建议 "Kubernetes 需求量大。考虑让更多团队成员掌握该技能。"

### Requirement: MUST 支持历史性能集成
系统MUST 可选地使用历史完成数据来优化估算和分配（未来增强功能占位）。

#### Scenario: 跟踪估算准确性
- **WHEN** 一个 Feature 完成
- **AND** 实际工时与估算相差超过 50%
- **THEN** 系统 MUST标记 "估算偏差：FEAT-005 估算 10h，实际 18h"
- **AND** 必须建议调整未来类似任务的估算
