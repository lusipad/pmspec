# cli-core 规格增量

## ADDED Requirements

### Requirement: 项目初始化

CLI MUST 提供 `pmspec init` 生成 `pmspace/` 骨架（project.md、team.md、epics/、features/、stories/），并支持 `--minimal` 仅生成 features/ 的极简结构。

#### Scenario: 标准初始化

- **WHEN** 在空目录执行 `pmspec init`
- **THEN** 生成完整 `pmspace/` 骨架，且 `pmspec validate` 立即通过

### Requirement: 实体生命周期命令

CLI MUST 提供实体的创建（`add epic|feature|story`）、查询（`list` 支持按状态/负责人/Epic 过滤、`show` 含子项进度汇总）、更新（`update` 修改 frontmatter 字段）与全文检索（`search`）。文档中出现的每一条命令 MUST 在发布的 CLI 中真实存在。

#### Scenario: 创建并查询

- **WHEN** 执行 `pmspec add feature --epic EPIC-001 --name "Login form"` 后执行 `pmspec list features --epic EPIC-001`
- **THEN** 新 Feature 出现在列表中，ID 自动分配且不与现有 ID 冲突

#### Scenario: 文档与实现一致

- **WHEN** README/QUICKSTART 中引用任一 `pmspec` 命令并按文档执行
- **THEN** 命令存在且行为与文档描述一致

### Requirement: 机器可读输出

每个查询/校验/统计类 CLI 命令 MUST 支持 `--json` 输出结构化结果；`pmspec validate` 失败时 MUST 返回非零退出码，使 agent 与 CI 可以程序化消费。

#### Scenario: agent 查询状态

- **WHEN** agent 执行 `pmspec list features --status todo --json`
- **THEN** 输出为合法 JSON 数组，字段与核心 schema 一致，无多余装饰性文本

### Requirement: 进度与负载统计

CLI MUST 提供 `pmspec stats`，至少输出：整体进度（按状态计数与估算工时占比）、按负责人负载（已分配估算 vs team.md 容量）、按 Epic 汇总。

#### Scenario: 按人负载

- **WHEN** 执行 `pmspec stats --by-assignee`
- **THEN** 输出每位成员的已分配工时、容量与利用率，超容量成员被高亮标记
