# PMSpec

[English](./README.md)

**AI-driven project management with Markdown-based storage**

PMSpec 是一个轻量级的项目管理工具,受 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 启发,让管理者专注于高层次的需求变更,将 Epic/Feature/UserStory 的细分、工时估算和人员分配等工作交给 AI 自动处理。

## ✨ 特性

- 📝 **Markdown 存储**: 所有数据以 Markdown 格式存储,便于版本控制和人工审查
- 🤖 **AI 驱动**: 通过 Claude Code 集成,自动分解需求和估算工时
- 📊 **工作负载分析**: 基于技能匹配和负载平衡的智能人员分配建议
- 🎯 **三层层次结构**: Epic → Feature → UserStory,符合敏捷最佳实践
- 🛠️ **CLI 工具**: 类似 Git 的命令行界面,简洁高效

## 📦 安装

```bash
npm install -g @pmspec/core
```

或使用 npx(无需安装):

```bash
npx @pmspec/core init
```

或者本地开发:

```bash
git clone https://github.com/pmspec/pmspec.git
cd pmspec
npm install
npm run build
npm link
```

## 🚀 快速开始

### 1. 初始化项目

```bash
pmspec init
```

这会在当前目录创建 `pmspace/` 结构:

```
pmspace/
├── project.md     # 项目概览
├── team.md        # 团队成员和技能
├── epics/         # Epic 文件夹
└── features/      # Feature 文件夹
```

### 2. 配置团队

编辑 `pmspace/team.md`:

```markdown
# Team

## Members

### Alice
- **Skills**: React, TypeScript, Node.js
- **Capacity**: 40 hours/week
- **Current Load**: 0 hours/week

### Bob
- **Skills**: Python, Django, PostgreSQL
- **Capacity**: 30 hours/week
- **Current Load**: 0 hours/week
```

### 3. 创建 Epic

在 `pmspace/epics/` 创建 `epic-001.md`:

```markdown
# Epic: User Authentication System

- **ID**: EPIC-001
- **Status**: planning
- **Owner**: Alice
- **Estimate**: 80 hours
- **Actual**: 0 hours

## Description
Build a complete user authentication system with login, signup, and password reset.

## Features
- [ ] FEAT-001: Login form
- [ ] FEAT-002: Signup form
- [ ] FEAT-003: Password reset flow
```

### 4. 创建 Feature

在 `pmspace/features/` 创建 `feat-001.md`:

```markdown
# Feature: Login Form

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: Alice
- **Estimate**: 16 hours
- **Actual**: 0 hours
- **Skills Required**: React, TypeScript

## Description
Responsive login form with email and password fields.

## User Stories
- [ ] STORY-001: As a user, I want to enter credentials (4h)
- [ ] STORY-002: As a user, I want to see validation errors (3h)
- [ ] STORY-003: As a user, I want to reset password link (2h)

## Acceptance Criteria
- [ ] Form validates email format
- [ ] Password is masked
- [ ] Shows error messages for invalid input
- [ ] Redirects to dashboard on success
```

### 5. 查看项目状态

```bash
# 列出所有 Epics
pmspec list epics

# 列出所有 Features
pmspec list features

# 按状态过滤
pmspec list features --status in-progress

# 按负责人过滤
pmspec list features --assignee Alice

# 查看详情
pmspec show EPIC-001
pmspec show FEAT-001

# 验证项目数据
pmspec validate
```

## 📚 CLI 命令

### `pmspec init`

初始化新的 PMSpec 项目。

```bash
pmspec init           # 创建 pmspace/ 目录结构
pmspec init --force   # 强制重新初始化(覆盖现有文件)
```

### `pmspec list`

列出 Epics 或 Features。

```bash
pmspec list epics                        # 列出所有 Epics
pmspec list features                     # 列出所有 Features
pmspec list features --status todo       # 过滤状态
pmspec list features --assignee Alice    # 过滤负责人
```

### `pmspec show`

显示 Epic 或 Feature 的详细信息。

```bash
pmspec show EPIC-001   # 显示 Epic 详情和进度
pmspec show FEAT-001   # 显示 Feature 详情
```

### `pmspec validate`

验证项目数据完整性。

```bash
pmspec validate         # 验证整个项目
pmspec validate EPIC-001  # 验证特定 Epic
pmspec validate FEAT-001  # 验证特定 Feature
```

验证检查:
- ✅ ID 唯一性
- ✅ 引用完整性(Feature 引用的 Epic 存在)
- ✅ 状态有效性
- ✅ 工时合理性(估算 > 0,实际 >= 0)
- ⚠️ 技能一致性(警告:所需技能不在团队中)

## 🗂️ 数据模型

### Epic

- **ID**: EPIC-XXX
- **Status**: `planning` | `in-progress` | `completed`
- **Owner**: 负责人姓名
- **Estimate**: 估算工时(小时)
- **Actual**: 实际工时(小时)
- **Features**: 关联的 Feature ID 列表

### Feature

- **ID**: FEAT-XXX
- **Epic**: 父级 Epic ID
- **Status**: `todo` | `in-progress` | `done`
- **Assignee**: 分配给谁
- **Estimate**: 估算工时(小时)
- **Actual**: 实际工时(小时)
- **Skills Required**: 所需技能列表
- **User Stories**: 用户故事列表
- **Acceptance Criteria**: 验收标准

### UserStory

- **ID**: STORY-XXX
- **Title**: 故事描述
- **Estimate**: 估算工时(小时)
- **Status**: `todo` | `in-progress` | `done`
- **Feature ID**: 父级 Feature ID

## 🎯 设计理念

PMSpec 遵循以下设计原则:

1. **简单优先**: 默认 <100 行代码的实现,避免过度工程化
2. **Markdown 至上**: 所有数据都是人类可读的 Markdown 文件
3. **Git 友好**: 每个 Epic/Feature 独立文件,减少合并冲突
4. **AI 辅助**: 通过 Prompt 文件集成 Claude Code,无需 API 调用
5. **命令行优先**: 类似 Git 的 CLI 体验,适合开发者工作流

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式(监听文件变化)
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 本地测试 CLI
npm run dev:cli -- init
```

## 📚 文档

- **[快速入门指南 (QUICKSTART.md)](./QUICKSTART.md)** - 5 分钟上手 PMSpec
- **[AI 使用指南 (AI_GUIDE.md)](./AI_GUIDE.md)** - Claude Code AI 辅助功能详解
- **[发布指南 (PUBLISHING.md)](./PUBLISHING.md)** - 如何发布包到 npm
- **[示例项目 (examples/)](./examples/)** - 真实项目示例和最佳实践

## 📊 项目状态

**当前版本**: 1.0.0 (MVP 已完成)

已实现功能:
- ✅ 核心数据模型 (Epic, Feature, UserStory, Team)
- ✅ Markdown 解析器和生成器
- ✅ CLI 框架 (init, list, show, validate, create, update)
- ✅ 工作负载分析算法 (analyze 命令)
- ✅ 数据验证
- ✅ AI 任务分解集成 (Claude Code slash commands)
- ✅ 完整文档和示例

计划功能 (Post-MVP):
- ⏳ 历史性能追踪
- ⏳ 依赖管理
- ⏳ 时间线可视化
- ⏳ 外部工具集成 (Jira, Linear)

## 🤝 贡献

欢迎贡献!请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)(待添加)。

## 📝 许可

MIT License - 详见 [LICENSE](./LICENSE)

## 🙏 鸣谢

PMSpec 受到 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 的启发。感谢 OpenSpec 团队提供了优秀的规范驱动开发模式。

---

**Made with ❤️ for better project management**
