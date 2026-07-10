# PMSpec 快速入门

10 分钟从零到一个可跟踪的项目计划。每条命令都真实可运行。

## 0. 安装与初始化

```bash
npm install -g @lusipad/pmspec

cd your-project
pmspec init --name "电商后台"
```

生成的结构：

```
pmspace/
├── project.md     # 项目概览
├── team.md        # 团队成员与技能
├── epics/
├── features/
└── stories/
```

小项目可以用 `pmspec init --minimal`，只建 `features/`（Epic 与 Story 层都是可选的）。

## 1. 配置团队（可选，但推荐）

编辑 `pmspace/team.md` 的 frontmatter：

```markdown
---
members:
  - name: alice
    skills: [react, typescript]
    capacity: 40        # 每周可用小时
  - name: bob
    skills: [node, postgres]
    capacity: 30
---
```

配置后 `pmspec validate` 会检查技能缺口，`pmspec stats --by-assignee` 会计算负载与超载告警。

## 2. 建立计划

### 方式 A：让 AI 干（推荐）

在 Claude Code 中运行：

```
/pmspec-breakdown 做一个商品管理模块：商品 CRUD、批量导入、库存预警
```

Agent 会直接创建 Epic/Feature/Story 文件并跑通 `pmspec validate`，你只需要 `git diff` 审查。

### 方式 B：手动创建

```bash
pmspec add epic --title "商品管理"
pmspec add feature --title "商品 CRUD" --epic EPIC-001 \
  --assignee alice --estimate 24h --skills "react,node" --priority high
pmspec add story --title "As an admin, I want to create a product" \
  --feature FEAT-001 --estimate 6
```

ID 自动分配（EPIC-001、FEAT-001、STORY-001 …），引用不存在的父级会被直接拦下。

## 3. 日常跟踪

```bash
# 查询
pmspec list features --status todo          # 待办功能
pmspec list features --assignee alice       # alice 名下
pmspec list stories --epic EPIC-001         # 某 Epic 下所有故事
pmspec show EPIC-001                        # 详情 + 子项完成度

# 更新
pmspec update STORY-001 --status in-progress
pmspec update FEAT-001 --status done --actual 20

# 统计
pmspec stats                    # 总进度 + 负载 + Epic 汇总
pmspec stats --by-assignee      # 谁超载（未完成估算 > 每周容量会标红）

# 检索
pmspec search "库存"            # 标题与正文全文检索，支持中文
```

## 4. 数据校验（建议挂到 CI）

```bash
pmspec validate
```

检查 ID 唯一性、引用完整性（Feature→Epic、Story→Feature）、状态与工时合法性、技能一致性。
有错误时退出码非 0，可以直接作为 CI 步骤：

```yaml
- run: npx @lusipad/pmspec validate
```

## 5. 与 git 协作

```bash
git add pmspace/
git commit -m "plan: 商品管理模块拆解"
```

- 每实体一文件 → 并行改计划几乎不冲突
- 计划评审 = PR 评审，AI 的分解结果同样走 `git diff`
- 历史追溯用 `git log -- pmspace/`，不需要专门的 changelog 功能

## 6. 机器接口（给脚本 / agent）

所有查询命令加 `--json` 输出纯 JSON：

```bash
pmspec list features --status todo --json | jq '.[].id'
pmspec stats --json | jq '.overall.progressPct'
```

写入接口的约定见 [AGENTS.md](./AGENTS.md)。

## 常见问题

**Q: 已有 v1 数据（features.csv 或旧 pmspace/）怎么办？**
`pmspec import <路径>` 自动识别格式迁移，导入后跑 `pmspec validate` 复核。

**Q: 可以手工编辑 pmspace/ 下的文件吗？**
可以，这是设计目标之一。frontmatter 写错 `pmspec validate` 会指出具体文件和字段。

**Q: frontmatter 里能加自定义字段吗？**
能（如 `jiraKey: PROJ-42`），CLI 更新时会原样保留。
