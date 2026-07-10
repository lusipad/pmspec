# Design: PMSpec v2

## Context

PMSpec v1 试图同时成为 CLI 工具、Web 应用、桌面应用和可部署服务，但 CLI 与 Web 运行在两套互不兼容的数据模型上，AI 集成停留在"打印 prompt 让人手动粘贴"。项目已停滞（近期提交全部为依赖升级）。本设计确立 v2 的产品定位、架构决策与迁移路径。

约束（继承自 `openspec/project.md`，仍然有效）：
- 离线可用，无外部数据库
- 数据人类可读（Markdown），Git 友好
- TypeScript strict，禁止 `any`

## Goals / Non-Goals

- Goals:
  - 一个能走通的核心闭环：需求描述 → AI 分解落盘 → 人审查 → 跟踪统计
  - 唯一数据模型 + 唯一存储格式，CLI 是唯一的程序化入口
  - AI agent（Claude Code 及同类）成为一等操作者，无任何复制粘贴环节
  - 维护面缩小到一个人可以业余维护的规模（目标 ≤5k 行核心代码）
- Non-Goals:
  - 不做多用户/权限/托管服务（git 就是协作层）
  - 不做 Web/桌面 GUI（阶段二视真实需求重估）
  - 不做在线 AI API 直连（agent 已在用户侧运行，密钥不经过 PMSpec）
  - 不做 Jira/Linear 双向同步（仅保留单向导入的可能性）

## Decisions

### D1: 唯一数据模型 = Epic → Feature → Story（Story 可选）

单一 zod schema 定义于 `src/core/schema.ts`，全仓库唯一类型来源。
存储：`pmspace/` 下每实体一个 Markdown 文件，结构化字段放 YAML frontmatter，描述性内容放正文。

```
pmspace/
├── project.md          # 项目概览 + 配置（frontmatter）
├── team.md             # 成员、技能、容量
├── epics/EPIC-001.md
├── features/FEAT-001.md
└── stories/STORY-001.md   # 可选层
```

frontmatter 示例（Feature）：

```yaml
---
id: FEAT-001
epic: EPIC-001
status: todo          # todo | in-progress | done | blocked
assignee: alice
estimate: 16h
skills: [react, typescript]
---
```

- Alternatives considered:
  - 保留 v1 扁平简单模型（CSV 单表）——拒绝：三层分解正是"AI 帮你拆需求"这一核心价值的载体，扁平表与 Excel 无差异，产品失去存在理由。
  - 双模型继续并存、做转换层——拒绝：转换层是维护面而非价值，v1 的失败正源于此。
  - 结构化字段全放正文用正则解析（v1 富模型做法）——拒绝：frontmatter 有成熟解析器（gray-matter），schema 校验可直接对接 zod，避免 v1 手写正则解析器的脆弱性。

### D2: AI 集成层 = 文件格式 + CLI JSON 接口 + agent skills

2026 年的 AI agent 可以直接读写文件、执行命令。因此 PMSpec 不需要"调用 AI"，只需要**把自己变成 agent 容易操作的对象**：

1. 数据格式对 LLM 友好（Markdown + frontmatter，见 D1）
2. 每个 CLI 命令支持 `--json` 输出，agent 用它查询状态而非猜测文件位置
3. `.claude/skills/pmspec-*` 重写为操作指南：breakdown（分解需求为 Epic/Feature/Story 并直接写文件）、estimate（估算并回写 frontmatter）、refine（细化验收标准）、assign（按技能/负载建议分配）
4. 每个 skill 的收尾步骤强制运行 `pmspec validate`，校验不通过不得结束
5. `AGENTS.md` 提供给非 Claude 的通用 agent 同样的操作契约

人审查 AI 产出的方式就是 git diff——不需要专门的审查 UI。

- Alternatives considered:
  - 内嵌 Claude Agent SDK 提供 `pmspec ai breakdown` 直连——推迟到阶段二：引入密钥管理与网络依赖，违背离线约束；agent 侧已能完成同样闭环。
  - 保留 v1 的 prompt 打印 + 人肉粘贴——拒绝：这是 v1 "AI 驱动名不副实"的根源。

### D3: 表面积收缩为 core + CLI + skills

删除 `desktop/`、`helm/`、`Dockerfile`、`docker-compose.yml`、`web/`。全部在 git 历史中可恢复，不做"冻结分支"以免继续吸引 dependabot 噪音。

- Alternatives considered:
  - 修复 Web 使其共用统一模型——拒绝：Web 前后端 ~16.7k 行是 CLI 的 1.8 倍，是项目被依赖升级淹没而停滞的直接原因；且在核心闭环验证之前，看板 UI 是伪需求（git 平台/编辑器已能浏览 Markdown）。
  - 保留 Electron 壳——拒绝：壳的内容物就是 Web。
  - 阶段二方案已预留：如统一模型跑通后确有可视化需求，重建为 `pmspec serve` 单进程本地只读看板，直读 `pmspace/`，无独立后端 services 层、无 WebSocket、无鉴权。

### D4: CLI v2 命令集

Git 风格，每命令一文件（沿用 Command 模式），全部支持 `--json`：

| 命令 | 职责 |
|---|---|
| `pmspec init` | 生成 `pmspace/` 骨架 |
| `pmspec add epic\|feature\|story` | 交互式/参数式创建实体 |
| `pmspec list [type] [--status --assignee --epic]` | 列表与过滤 |
| `pmspec show <ID>` | 详情 + 子项进度汇总 |
| `pmspec update <ID> [--status --assignee ...]` | 更新字段 |
| `pmspec validate` | ID 唯一性、引用完整性、状态与工时合法性、技能存在性 |
| `pmspec stats [--by-assignee --by-epic]` | 进度/负载统计（吸收 v1 analyze） |
| `pmspec import <file>` | 从 v1 CSV / v1 富模型目录 / 通用 CSV 迁移 |
| `pmspec export [--csv --json]` | 导出 |
| `pmspec search <query>` | 全文检索 |

v1 的 `serve`、`simple`、`breakdown`（prompt 打印形态）、`history` 不再保留（history 由 git log 承担；changelog-service 删除）。

### D5: OpenSpec 流程复位

- 已完成未归档的 change（`add-npx-package-push`、`update-commercial-ui-interactions`、`add-electron-desktop-client`）按实际情况归档
- 被本提案取代/废弃的 change（`add-web-gui-with-feature-list`、`decouple-cli-web-offline`、`add-commercial-roadmap`、`enhance-ui-visual-priority`、`add-pmspec-core-mvp`）归档并注明废弃原因
- 本提案的 spec delta 成为首批 `openspec/specs/`，此后 specs 即 v2 的唯一真相

## Risks / Trade-offs

- **删除 Web 可能砍掉某些用户的入口** → git 历史可恢复；README 中明确说明决策与替代方案（编辑器/GitHub 直接浏览 Markdown）；阶段二有明确的重建路径（D3）
- **BREAKING 迁移丢数据** → `pmspec import` 覆盖两种 v1 格式并有测试；迁移是纯新增写入，不删除旧文件
- **agent skills 依赖 Claude Code 生态** → `AGENTS.md` 提供通用 agent 契约；CLI `--json` 对任何自动化都可用；最坏情况下人也能手写 Markdown
- **三层模型对极小项目过重** → Story 层可选；`pmspec init --minimal` 只建 features/

## Migration Plan

1. 阶段 0（本提案批准后）：仓库清理——删除死代码、垃圾文件、web/desktop/helm，一次独立 commit，先让主干干净
2. 阶段 1：`src/core/` 统一 schema + 存储 + parser（gray-matter），带完整单测
3. 阶段 2：CLI v2 命令集，`pmspec import` 打通 v1 数据迁移
4. 阶段 3：重写 skills 与 AGENTS.md/文档，端到端跑通"需求 → AI 分解 → validate → git diff 审查"
5. 阶段 4：OpenSpec 归档复位，发布 v2.0.0（npm major bump 明示 BREAKING）
6. 回滚：各阶段独立 commit；v2 未验证前不发 npm，git revert 即可回滚

## Open Questions

- Web 看板是否有真实用户在用？若有，阶段二 `pmspec serve` 的优先级需要提前
- 包名沿用 `@lusipad/pmspec` 还是趁 major 版本换 scope？（README 中 clone 地址 `github.com/pmspec/pmspec` 与实际仓库不符，需一并修正）
- Story 的估算单位：沿用小时还是改用故事点？（v2 默认沿用小时，保持迁移简单）
