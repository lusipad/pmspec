# CLI 命令规范

## ADDED Requirements

### Requirement: MUST 提供项目初始化命令
PMSpec MUST 提供 `init` 命令来搭建新的项目管理工作空间。

#### Scenario: 初始化空项目
- **WHEN** 用户在空目录中运行 `pmspec init`
- **THEN** 系统 MUST创建 `pmspace/` 目录结构
- **AND** 必须创建模板文件：`project.md`、`team.md`、`epics/`、`features/`
- **AND** 必须显示成功消息 "PMSpec 项目已在 pmspace/ 中初始化"

#### Scenario: 防止重复初始化
- **WHEN** 用户在已有 `pmspace/` 的目录中运行 `pmspec init`
- **THEN** 系统 MUST显示错误 "PMSpec 项目已存在。使用 --force 重新初始化。"
- **AND** 除非提供 --force 标志，否则不得覆盖现有文件

### Requirement: MUST 提供 List 命令
系统MUST 提供 `list` 命令来显示 Epics、Features 或 UserStories，并支持过滤选项。

#### Scenario: 列出所有 Epics
- **WHEN** 用户运行 `pmspec list epics`
- **THEN** 系统 MUST显示包含以下列的表格：ID、标题、状态、负责人、估算、实际
- **AND** 必须按 ID 升序排序

#### Scenario: 按状态过滤
- **WHEN** 用户运行 `pmspec list features --status in-progress`
- **THEN** 系统 MUST仅显示状态为 "in-progress" 的 Features
- **AND** 必须显示计数 "显示 12 个 Features 中的 5 个"

#### Scenario: 按负责人过滤列表
- **WHEN** 用户运行 `pmspec list features --assignee Alice`
- **THEN** 系统 MUST仅显示分配给 Alice 的 Features
- **AND** MUST 计算显示项目的估算总工时

### Requirement: MUST 提供 Show 命令
系统MUST 提供 `show` 命令来显示特定 Epic、Feature 或 UserStory 的详细信息。

#### Scenario: 显示 Epic 详情
- **WHEN** 用户运行 `pmspec show EPIC-001`
- **THEN** 系统 MUST显示完整的 Epic 内容，包括元数据、描述和嵌套的 Features
- **AND** MUST 根据已完成的 Features 计算进度百分比

#### Scenario: 处理不存在的 ID
- **WHEN** 用户运行 `pmspec show FEAT-999`
- **AND** FEAT-999 不存在
- **THEN** 系统 MUST显示错误 "Feature FEAT-999 未找到"
- **AND** 如果可用，必须建议相似的 ID

### Requirement: MUST 提供 Create 命令
系统MUST 为 Epic、Feature 和 UserStory 提供交互式 `create` 命令。

#### Scenario: 交互式创建 Epic
- **WHEN** 用户运行 `pmspec create epic`
- **THEN** 系统 MUST提示输入：标题、描述、负责人、估算
- **AND** 必须自动生成下一个可用 ID
- **AND** 必须创建 `pmspace/epics/epic-{number}.md`

#### Scenario: 创建带父级 Epic 的 Feature
- **WHEN** 用户运行 `pmspec create feature --epic EPIC-001`
- **THEN** 系统 MUST验证 EPIC-001 存在
- **AND** 必须提示输入 Feature 详情
- **AND** MUST 在两个文件中建立 Feature 到 Epic 的链接

### Requirement: MUST 提供 Breakdown 命令
系统MUST 提供 `breakdown` 命令来触发 AI 驱动的任务分解。

#### Scenario: 从描述分解 Epic
- **WHEN** 用户运行 `pmspec breakdown epic --from "构建用户认证系统"`
- **THEN** 系统 MUST调用 AI 生成包含 Features 和 Stories 的 Epic
- **AND** 必须显示生成的结构预览
- **AND** 必须提示 "应用此分解？(y/n)"

#### Scenario: 将现有 Epic 分解为 Features
- **WHEN** 用户运行 `pmspec breakdown EPIC-002`
- **THEN** 系统 MUST读取 Epic 描述
- **AND** MUST 通过 AI 生成建议的 Features
- **AND** 必须将 Features 追加到 Epic 的功能列表

### Requirement: MUST 提供 Analyze 命令
系统MUST 提供 `analyze` 命令来执行工作负载分析并生成分配建议。

#### Scenario: 分析工作负载并显示报告
- **WHEN** 用户运行 `pmspec analyze`
- **THEN** 系统 MUST显示团队工作负载摘要表
- **AND** 必须显示未分配的 Features 数量
- **AND** 必须突出显示技能缺口

#### Scenario: 为未分配工作建议分配
- **WHEN** 用户运行 `pmspec analyze --recommend`
- **THEN** 系统MUST 为每个未分配的 Feature 输出分配建议
- **AND** MUST 为每个 Feature 显示前 3 名候选人及其评分

### Requirement: MUST 提供 Validate 命令
系统MUST 提供 `validate` 命令来检查数据完整性和一致性。

#### Scenario: 验证项目结构
- **WHEN** 用户运行 `pmspec validate`
- **THEN** 系统 MUST检查：唯一 ID、有效状态、现有 Epic 引用、正时间值
- **AND** 必须报告所有错误和警告
- **AND** 如果有效则退出代码为 0，如果发现错误则为 1

#### Scenario: 验证特定 Epic
- **WHEN** 用户运行 `pmspec validate EPIC-003`
- **THEN** 系统 MUST仅验证 EPIC-003 及其嵌套的 Features/Stories
- **AND** 必须显示 "EPIC-003 有效" 或列出具体错误

### Requirement: MUST 提供 Update 命令
系统MUST 提供 `update` 命令来修改 Epic、Feature 或 UserStory 的字段。

#### Scenario: 更新 Feature 状态
- **WHEN** 用户运行 `pmspec update FEAT-005 --status done`
- **THEN** 系统 MUST将 FEAT-005 的状态更改为 "done"
- **AND** 必须更新文件修改时间戳
- **AND** 必须显示 "FEAT-005 状态已更新为 done"

#### Scenario: 更新实际工时
- **WHEN** 用户运行 `pmspec update FEAT-005 --actual 12`
- **THEN** 系统 MUST将 Actual 字段设置为 12 小时
- **AND** MUST 计算偏差：(Actual - Estimate) / Estimate
- **AND** 必须显示 "FEAT-005 实际工时：12（偏差：+20%）"
