# 项目结构规范

## ADDED Requirements

### Requirement: MUST 支持三层层次模型
PMSpec MUST 支持由 Epic（史诗）、Feature（功能）和 UserStory（用户故事）组成的三层项目层次结构。每个层次MUST 具有明确的职责和关联关系。

#### Scenario: 创建包含嵌套 Features 的 Epic
- **WHEN** 用户创建 ID 为 "EPIC-001" 的 Epic
- **THEN** 系统 MUST允许在该 Epic 下添加多个 Features
- **AND** 每个 Feature 必须引用其父级 Epic 的 ID

#### Scenario: 从 Story 导航到 Epic
- **WHEN** 用户查看 UserStory "STORY-042"
- **THEN** 系统 MUST显示其父级 Feature 的 ID
- **AND** 必须显示其祖父级 Epic 的 ID

### Requirement: MUST 使用 Markdown 文件存储
All project data MUST结构数据必须以标准化的目录布局存储为 Markdown 文件。Each Epic MUST 和 Feature 必须是独立的文件。

#### Scenario: 初始化项目结构
- **WHEN** 用户运行 `pmspec init`
- **THEN** 系统 MUST创建 `pmspace/` 目录，包含 `project.md`、`team.md`、`epics/` 和 `features/` 子目录

#### Scenario: 创建 Epic 文件
- **WHEN** 用户创建 Epic "EPIC-001"
- **THEN** 系统 MUST创建 `pmspace/epics/epic-001.md` 文件，包含元数据字段（ID、状态、负责人、工时估算）和描述章节

### Requirement: MUST 使用唯一标识符
Each Epic MUST、Feature 和 UserStory MUST 具有遵循 `{类型}-{编号}` 模式的唯一标识符。

#### Scenario: 防止重复的 Epic ID
- **WHEN** 用户尝试创建 "EPIC-001" 但该 ID 已存在
- **THEN** 系统 MUST拒绝操作并显示错误消息 "Epic EPIC-001 已存在"

#### Scenario: 自动递增 ID
- **WHEN** 用户创建新 Epic 但未指定 ID
- **THEN** 系统 MUST自动生成下一个可用 ID（例如，如果 EPIC-004 存在，则生成 "EPIC-005"）

### Requirement: 必须管理状态生命周期
Each Epic MUST、Feature 和 UserStory MUST 具有状态字段，且只能使用预定义的有效值。

#### Scenario: Epic 状态流转
- **WHEN** 创建一个 Epic
- **THEN** 其状态MUST 为 "planning"（规划中）
- **AND** 有效的状态转换MUST 为：planning → in-progress → completed

#### Scenario: 拒绝无效状态
- **WHEN** 用户尝试将 Epic 状态设置为 "archived"
- **THEN** 系统 MUST拒绝并显示错误 "无效状态 'archived'。有效值：planning, in-progress, completed"

### Requirement: MUST 提供时间跟踪字段
Each Epic MUST 和 Feature MUST 包含以小时为单位的估算时间和实际时间字段。

#### Scenario: 记录估算和实际工时
- **WHEN** 创建估算为 16 小时的 Feature
- **THEN** 该 Feature MUST 具有 `Estimate: 16 hours` 和 `Actual: 0 hours` 字段
- **AND** 实际工时必须可随工作进展更新

#### Scenario: 验证时间值为正数
- **WHEN** 用户尝试将估算设置为 -5 小时
- **THEN** 系统 MUST拒绝并显示错误 "估算工时必须大于 0"
