# PMSpec

**长在 Git 仓库里的 AI 原生项目管理**

PMSpec 把项目计划变成仓库里的 Markdown 文件：AI agent 负责分解需求、估算工时、建议分配，人负责在 `git diff` 里审查。没有服务器、没有数据库、没有网页——数据和代码住在一起，随 PR 一起评审、随 git 一起协作。

> PMSpec 之于项目计划，如同 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 之于规范。

## 它是怎么工作的

```
你："做一个用户认证系统，支持邮箱登录和第三方 OAuth"
        │
        ▼  AI agent（/pmspec-breakdown）直接写文件
pmspace/
├── epics/EPIC-001.md        # 用户认证系统
├── features/FEAT-001.md     # 邮箱登录
├── features/FEAT-002.md     # OAuth 接入
└── stories/STORY-001.md     # As a user, I want ...
        │
        ▼  你审查
git diff  →  满意就 commit，不满意让 agent 改
        │
        ▼  日常跟踪
pmspec stats / pmspec list / pmspec validate
```

AI 集成不经过任何在线 API——agent（Claude Code 等）运行在你自己的环境里，PMSpec 只提供对 agent 友好的文件格式、`--json` 机器接口和现成的 slash command。**没有密钥要配置，离线完全可用。**

## 安装

```bash
npm install -g @lusipad/pmspec
```

## 五分钟上手

```bash
# 1. 在项目里初始化（生成 pmspace/ 目录）
pmspec init --name "我的项目"

# 2. 建立三层结构（或者直接让 AI 干：/pmspec-breakdown）
pmspec add epic --title "用户认证系统"
pmspec add feature --title "邮箱登录" --epic EPIC-001 --estimate 16h --skills "react,node"
pmspec add story --title "As a user, I want to enter credentials" --feature FEAT-001 --estimate 4

# 3. 日常使用
pmspec list features --status todo      # 查询过滤
pmspec update FEAT-001 --status done    # 更新状态
pmspec show EPIC-001                    # 详情 + 子项进度
pmspec stats --by-assignee              # 谁超载了？
pmspec validate                         # 数据完整性校验（CI 友好，错误时非零退出）
```

详细教程见 [QUICKSTART.md](./QUICKSTART.md)。

## 命令一览

| 命令 | 职责 |
|---|---|
| `pmspec init [--minimal] [--name]` | 初始化 `pmspace/` 工作区 |
| `pmspec add epic\|feature\|story` | 创建实体（ID 自动分配） |
| `pmspec list [类型] [--status --assignee --epic]` | 列表与过滤 |
| `pmspec show <ID>` | 详情与子项进度 |
| `pmspec update <ID> [--status --assignee ...]` | 更新字段（保留自定义 frontmatter 键） |
| `pmspec validate` | ID 唯一性 / 引用完整性 / 技能一致性校验 |
| `pmspec stats [--by-assignee --by-epic]` | 进度与负载统计 |
| `pmspec import <路径>` | 从 v1 数据或通用 CSV 迁移 |
| `pmspec export [--format csv\|json]` | 导出 |
| `pmspec search <词>` | 全文检索（支持中文） |

所有查询类命令支持 `--json`，供 agent 与脚本消费。

## 数据格式

每个实体一个 Markdown 文件，结构化字段在 YAML frontmatter，叙述性内容在正文：

```markdown
---
id: FEAT-001
epic: EPIC-001
title: 邮箱登录
status: in-progress        # todo | in-progress | done | blocked
assignee: alice
priority: high             # low | medium | high | critical
estimate: 16               # 小时
skills: [react, node]
---

响应式登录表单，支持邮箱 + 密码。

## 验收标准
- [ ] 邮箱格式校验
- [ ] 密码掩码显示
```

- 三层结构 Epic → Feature → Story，**Story 层可选**（小项目用 `pmspec init --minimal` 只建 features）
- 人手直接编辑文件完全合法，`pmspec validate` 会兜底
- 工具之外的自定义 frontmatter 键（如 `jiraKey: PROJ-42`）会被完整保留

## AI 助手怎么用

**Claude Code 用户**：仓库自带 4 个 slash command，开箱即用——

- `/pmspec-breakdown` — 一段话需求 → 三层结构直接落盘
- `/pmspec-estimate` — 补齐缺失的工时估算
- `/pmspec-refine` — 细化 Feature：验收标准 + 拆 Story
- `/pmspec-assign` — 按技能与负载推荐负责人（确认后写入）

**其他 agent**：阅读 [AGENTS.md](./AGENTS.md) 中的操作契约（文件格式 + CLI 接口 + 校验闸门），效果等价。

所有 AI 产出的变更都以 `pmspec validate` 通过为完成标准，并且只体现为文件修改——你用 `git diff` 审查，不满意就 revert。

## 从 v1 迁移

```bash
pmspec init
pmspec import 旧项目/features.csv     # v1 简单模型 CSV（自动识别表头）
pmspec import 旧项目/pmspace          # v1 富模型目录（Epic/Feature/Story 三层）
pmspec import 任意表格.csv            # 通用 CSV（识别中英文表头别名）
pmspec validate
```

导入只做新增写入，不会修改或删除源数据；ID 冲突自动重新分配并提示。

> **v2 是 BREAKING 变更**：v1 的 Web 界面、桌面客户端与 `simple/serve/history` 命令已移除，
> 数据模型统一为本 README 描述的格式。背景与决策记录见
> [openspec/changes/redesign-pmspec-v2/](./openspec/changes/redesign-pmspec-v2/)。

## 设计原则

1. **Git 即协作层**——不造服务器、不造多用户系统，分支/PR/diff 就是评审流程
2. **一个模型**——全仓库唯一 zod schema，CLI 是唯一程序化入口
3. **Agent 原生**——格式对 LLM 友好，接口对脚本友好，无复制粘贴环节
4. **离线优先**——不依赖网络与任何 AI API 密钥
5. **一个人能维护**——核心 + CLI 控制在最小依赖、最小表面积

## 开发

```bash
npm install
npm test              # vitest（单元 + CLI 集成测试）
npm run build         # tsc
npm run dev:cli -- list   # 本地跑 CLI
```

贡献指南见 [CONTRIBUTING.md](./CONTRIBUTING.md)，发布流程见 [PUBLISHING.md](./PUBLISHING.md)。

## 许可

MIT License
