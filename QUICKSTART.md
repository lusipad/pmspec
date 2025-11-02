# PMSpec 快速入门指南

欢迎使用 PMSpec!这份指南将帮助你在 5 分钟内开始使用 PMSpec 管理你的项目。

## 前置要求

- Node.js >= 20.0.0
- 基本的命令行使用经验
- (可选) Claude Code 用于 AI 功能

## 安装

### 方式 1: 通过 npm 安装 (推荐)

```bash
npm install -g @pmspec/core
```

### 方式 2: 从源码安装

```bash
git clone https://github.com/pmspec/pmspec.git
cd pmspec
npm install
npm run build
npm link
```

验证安装:

```bash
pmspec --version
```

## 5 分钟快速上手

### 第 1 步: 初始化项目 (30 秒)

在你的项目目录中运行:

```bash
mkdir my-project
cd my-project
pmspec init
```

这会创建以下目录结构:

```
pmspace/
├── project.md      # 项目概览
├── team.md         # 团队信息
├── epics/          # Epic 文件
└── features/       # Feature 文件
```

### 第 2 步: 配置团队 (1 分钟)

编辑 `pmspace/team.md`,添加你的团队成员:

```bash
# 使用你喜欢的编辑器
code pmspace/team.md  # VS Code
vim pmspace/team.md   # Vim
notepad pmspace/team.md  # Windows 记事本
```

示例内容:

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

### 第 3 步: 创建你的第一个 Epic (1 分钟)

使用交互式命令创建 Epic:

```bash
pmspec create epic
```

或者手动在 `pmspace/epics/` 创建 `epic-001.md`:

```markdown
# Epic: 用户认证系统

- **ID**: EPIC-001
- **Status**: planning
- **Owner**: Alice
- **Estimate**: 80 hours
- **Actual**: 0 hours

## Description
构建完整的用户认证系统,包括登录、注册和密码重置功能。

## Features
- [ ] FEAT-001: 登录表单
- [ ] FEAT-002: 注册表单
- [ ] FEAT-003: 密码重置流程
```

### 第 4 步: 创建 Feature (1.5 分钟)

使用交互式命令:

```bash
pmspec create feature
```

或手动创建 `pmspace/features/feat-001.md`:

```markdown
# Feature: 登录表单

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: Alice
- **Estimate**: 16 hours
- **Actual**: 0 hours
- **Skills Required**: React, TypeScript

## Description
实现响应式登录表单,包含邮箱和密码字段。

## User Stories
- [ ] STORY-001: 用户可以输入凭证 (4h)
- [ ] STORY-002: 用户可以看到验证错误 (3h)
- [ ] STORY-003: 用户可以点击忘记密码链接 (2h)

## Acceptance Criteria
- [ ] 表单验证邮箱格式
- [ ] 密码字段被遮罩
- [ ] 显示无效输入的错误消息
- [ ] 成功后重定向到仪表板
```

### 第 5 步: 查看项目状态 (1 分钟)

```bash
# 列出所有 Epics
pmspec list epics

# 列出所有 Features
pmspec list features

# 查看 Epic 详情
pmspec show EPIC-001

# 查看 Feature 详情
pmspec show FEAT-001

# 验证数据完整性
pmspec validate
```

## 常用命令速查

### 列表和查看

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
```

### 创建和更新

```bash
# 创建新的 Epic
pmspec create epic

# 创建新的 Feature
pmspec create feature

# 创建新的 User Story
pmspec create story

# 更新状态
pmspec update FEAT-001 --status in-progress
pmspec update FEAT-001 --status done

# 更新实际工时
pmspec update FEAT-001 --actual 10

# 更新负责人
pmspec update FEAT-001 --assignee Bob
```

### AI 辅助功能 (需要 Claude Code)

```bash
# 在 Claude Code 中使用以下 slash commands:

# 将需求描述分解为 Epic/Feature/Story
/pmspec-breakdown

# 为任务估算工时
/pmspec-estimate

# 生成完整的项目结构
/pmspec-generate

# 优化和细化现有结构
/pmspec-refine
```

### 工作负载分析

```bash
# 查看团队负载情况
pmspec analyze

# 获取人员分配建议
pmspec analyze --recommend

# 识别技能缺口
pmspec analyze --skills
```

### 验证和调试

```bash
# 验证整个项目
pmspec validate

# 验证特定 Epic
pmspec validate EPIC-001

# 验证特定 Feature
pmspec validate FEAT-001
```

## 典型工作流程

### 工作流程 1: 新项目启动

```bash
# 1. 初始化
pmspec init

# 2. 配置团队 (编辑 pmspace/team.md)
code pmspace/team.md

# 3. 使用 AI 生成项目结构 (在 Claude Code 中)
/pmspec-generate

# 4. 验证生成的结构
pmspec validate

# 5. 查看并调整
pmspec list epics
pmspec list features
```

### 工作流程 2: 日常任务管理

```bash
# 1. 查看待办任务
pmspec list features --status todo

# 2. 更新任务状态
pmspec update FEAT-001 --status in-progress

# 3. 记录实际工时
pmspec update FEAT-001 --actual 8

# 4. 完成任务
pmspec update FEAT-001 --status done

# 5. 查看进度
pmspec show EPIC-001
```

### 工作流程 3: 团队负载平衡

```bash
# 1. 查看当前负载
pmspec analyze

# 2. 获取分配建议
pmspec analyze --recommend

# 3. 分配任务
pmspec update FEAT-002 --assignee Bob

# 4. 再次验证负载
pmspec analyze
```

## 数据文件说明

### `project.md` - 项目概览

```markdown
# Project: 我的项目

## Overview
项目描述

## Timeline
- Start: 2025-01-01
- End: 2025-03-31

## Team Capacity
- Total: 480 person-hours
- Available: 400 person-hours
```

### `team.md` - 团队配置

```markdown
# Team

## Members

### [成员名称]
- **Skills**: [技能列表,逗号分隔]
- **Capacity**: [每周可用小时数] hours/week
- **Current Load**: [当前负载小时数] hours/week
```

### `epics/*.md` - Epic 文件

```markdown
# Epic: [标题]

- **ID**: EPIC-XXX
- **Status**: planning | in-progress | completed
- **Owner**: [负责人]
- **Estimate**: [估算小时数] hours
- **Actual**: [实际小时数] hours

## Description
[详细描述]

## Features
- [ ] FEAT-XXX: [Feature 标题]
```

### `features/*.md` - Feature 文件

```markdown
# Feature: [标题]

- **ID**: FEAT-XXX
- **Epic**: EPIC-XXX
- **Status**: todo | in-progress | done
- **Assignee**: [负责人]
- **Estimate**: [估算小时数] hours
- **Actual**: [实际小时数] hours
- **Skills Required**: [所需技能]

## Description
[详细描述]

## User Stories
- [ ] STORY-XXX: [故事描述] ([估算]h)

## Acceptance Criteria
- [ ] [验收标准]
```

## 最佳实践

### 1. Epic 层面

- **粒度**: 一个 Epic 应该是 2-4 周的工作量 (80-160 小时)
- **描述**: 清晰说明业务目标和价值
- **Features**: 包含 3-8 个 Features

### 2. Feature 层面

- **粒度**: 一个 Feature 应该是 1-2 周的工作量 (16-80 小时)
- **独立性**: 每个 Feature 应该可以独立交付价值
- **技能**: 明确列出所需技能,便于任务分配

### 3. User Story 层面

- **粒度**: 一个 Story 应该是 1-3 天的工作量 (4-24 小时)
- **格式**: 使用 "As a [角色], I want [功能], so that [价值]"
- **可测试**: 每个 Story 都应该有明确的验收标准

### 4. 工时估算

- **保守估算**: 留出 20-30% 的缓冲时间
- **参考历史**: 使用类似任务的实际工时作为参考
- **团队参与**: 让实际执行者参与估算

### 5. 版本控制

- **频繁提交**: 每次有意义的更新都提交到 Git
- **清晰消息**: 提交消息说明具体变更 (如 "Add FEAT-003" 或 "Update EPIC-001 status")
- **避免冲突**: 不同成员管理不同的 Epic/Feature 文件

### 6. AI 辅助使用

- **明确输入**: 给 AI 提供清晰、具体的需求描述
- **人工审查**: AI 生成的结构需要人工审查和调整
- **迭代优化**: 使用 `/pmspec-refine` 不断优化结构

## 故障排查

### 问题: `pmspec: command not found`

**解决方法**:

```bash
# 检查是否正确安装
npm list -g @pmspec/core

# 重新安装
npm install -g @pmspec/core

# 或使用 npx
npx @pmspec/core init
```

### 问题: 验证失败 - ID 重复

**解决方法**:

```bash
# 运行验证查看具体错误
pmspec validate

# 修改重复的 ID
# 确保每个 Epic/Feature/Story 的 ID 唯一
```

### 问题: Feature 引用的 Epic 不存在

**解决方法**:

```bash
# 检查 Feature 中的 Epic ID 是否正确
pmspec validate

# 修正 Feature 文件中的 Epic ID
# 或创建缺失的 Epic
```

### 问题: 技能不匹配警告

**解决方法**:

这是警告而非错误,表示 Feature 需要的技能在团队中不存在:

1. 在 `team.md` 中添加缺失的技能
2. 或修改 Feature 的技能要求
3. 或计划技能培训

## 下一步

- 📖 阅读完整的 [README.md](./README.md) 了解所有功能
- 🔍 查看 [demo/](./demo/) 目录了解完整示例项目
- 💡 在 Claude Code 中使用 `/pmspec-*` 命令体验 AI 辅助功能
- 🤝 查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何贡献

## 获取帮助

- GitHub Issues: https://github.com/pmspec/pmspec/issues
- 文档: https://github.com/pmspec/pmspec#readme

---

**开始你的 PMSpec 之旅吧!** 🚀
