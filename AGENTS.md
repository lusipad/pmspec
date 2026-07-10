# PMSpec Agent 操作契约

本文件面向所有 AI agent（Claude Code、Cursor、Copilot 或任何能读文件、执行命令的助手）。
遵守这份契约，你就能安全地替用户管理项目计划。

## 你在操作什么

PMSpec 的全部数据是 `pmspace/` 目录下的 Markdown 文件（YAML frontmatter + 正文），每个实体一个文件：

```
pmspace/
├── project.md            # 项目概览（frontmatter: name, description）
├── team.md               # 团队（frontmatter: members[].{name, skills, capacity}）
├── epics/EPIC-001.md     # frontmatter: id, title, status, owner, estimate, actual, tags
├── features/FEAT-001.md  # frontmatter: id, epic, title, status, assignee, priority,
│                         #              estimate, actual, skills, tags
└── stories/STORY-001.md  # frontmatter: id, feature, title, status, assignee, estimate, actual
```

- `status`: `todo | in-progress | done | blocked`（所有实体统一）
- `priority`: `low | medium | high | critical`（仅 feature）
- `estimate`/`actual`: 小时数（写 `16` 或 `"16h"` 均可，工具会归一为数字）
- Story 层可选：Feature 没有 Story 时以自身状态计进度
- 正文（frontmatter 之后）是自由 Markdown：描述、验收标准、非目标等

## 机器接口

所有查询走 CLI 的 `--json`，不要自己猜文件再手写解析：

```bash
pmspec list features --status todo --json   # 结构化查询（支持 --assignee/--epic）
pmspec show FEAT-001 --json                 # 详情 + 子项进度
pmspec stats --by-assignee --json           # 负载（openHours vs capacity）
pmspec search "关键词" --json                # 全文检索（支持中文）
```

写入优先走 CLI（自动分配 ID、校验引用）：

```bash
pmspec add feature --title "..." --epic EPIC-001 --skills "react,ts" --json
pmspec update FEAT-001 --status done --actual 12
```

长正文（验收标准等）直接编辑实体文件的 Markdown 正文部分；**不要动 frontmatter 里你不理解的键**（用户自定义字段会被工具保留，你也必须保留）。

## 铁律

1. **校验闸门**：任何写入 `pmspace/` 的任务，收尾必须运行 `pmspec validate`，退出码非 0 就修复再验，不得以失败状态结束。
2. **禁止复制粘贴流程**：不要生成"请把以下内容粘贴到…"的输出。你有文件系统和 CLI，直接落盘，用户通过 `git diff` 审查。
3. **不预设进度**：新建实体状态一律 `todo`；不要虚构 `actual` 工时。
4. **涉及真人先确认**：修改 `assignee` 前把推荐和理由给用户确认。
5. **ID 只由工具分配**：不要手编 ID；引用不存在的 EPIC/FEAT 会被 validate 拦下。

## 常用任务入口（Claude Code slash commands）

- `/pmspec-breakdown` — 自然语言需求 → Epic/Feature/Story 落盘
- `/pmspec-estimate` — 补齐缺失的工时估算
- `/pmspec-refine` — 细化 Feature（验收标准 + 拆 Story）
- `/pmspec-assign` — 技能/负载匹配的人员分配建议

非 Claude 的 agent 照本契约直接操作文件与 CLI 即可，效果等价。

---

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
