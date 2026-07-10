# project-data 规格增量

## ADDED Requirements

### Requirement: 唯一数据模型

系统 MUST 以 Epic → Feature → Story 三层结构作为唯一数据模型，Story 层可选；全部实体类型 MUST 由 `src/core` 中单一 zod schema 定义，仓库内不得存在第二处领域类型定义。

#### Scenario: 全仓库单一类型来源

- **WHEN** 任何模块（CLI 命令、导入器、未来的 UI）需要 Epic/Feature/Story 类型
- **THEN** 它 import `src/core` 导出的 schema 与类型，而非自行定义

#### Scenario: Story 层可选

- **WHEN** 一个 Feature 没有任何 Story 子项
- **THEN** 该 Feature 仍是合法实体，进度以自身 status 计算

### Requirement: Markdown + frontmatter 存储

系统 MUST 将每个实体存储为 `pmspace/` 下独立的 Markdown 文件：结构化字段（id、状态、负责人、估算、技能等）置于 YAML frontmatter，描述、用户故事、验收标准等叙述性内容置于正文。存储 MUST 可离线使用、不依赖数据库，且对 git diff 友好。

#### Scenario: 写入实体

- **WHEN** 通过 CLI 或 agent 创建 FEAT-001
- **THEN** 生成 `pmspace/features/FEAT-001.md`，frontmatter 包含 id/epic/status/assignee/estimate 等字段，且能被 schema 校验通过

#### Scenario: 人工直接编辑

- **WHEN** 用户绕过 CLI 直接用编辑器修改实体文件
- **THEN** 后续任何 CLI 读取都能正确解析；若编辑破坏 schema，`pmspec validate` 报出具体文件与字段

### Requirement: 数据完整性校验

系统 MUST 提供对整个 `pmspace/` 的完整性校验，至少涵盖：ID 唯一性、引用完整性（Feature 引用的 Epic 存在、Story 引用的 Feature 存在）、状态枚举合法性、工时数值合法性（估算 > 0，实际 ≥ 0），以及技能一致性警告（所需技能不在 team.md 中时告警而非报错）。

#### Scenario: 引用悬空

- **WHEN** FEAT-002 的 frontmatter 声明 `epic: EPIC-999` 而该 Epic 不存在
- **THEN** `pmspec validate` 以非零退出码失败，并指明 FEAT-002 与缺失的 EPIC-999

#### Scenario: 技能缺口仅告警

- **WHEN** Feature 要求的技能未出现在任何团队成员的技能列表中
- **THEN** 校验输出 warning 但退出码为 0

### Requirement: v1 数据迁移

系统 MUST 提供从 v1 两种格式（简单模型 `features.csv`、富模型 `pmspace/` 目录）到 v2 存储格式的单向导入；导入 MUST 只做新增写入，不修改或删除源数据。

#### Scenario: 从 v1 CSV 迁移

- **WHEN** 用户对 v1 的 `features.csv` 执行 `pmspec import`
- **THEN** 每行生成一个 v2 Feature 文件，可映射字段（名称、估算、负责人、状态、优先级）完整保留，且导入结果通过 `pmspec validate`
