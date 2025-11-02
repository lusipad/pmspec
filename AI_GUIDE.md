# PMSpec AI 使用指南

PMSpec 与 Claude Code 深度集成,通过 AI 辅助实现需求分解、工时估算和任务优化。本指南介绍如何有效使用 PMSpec 的 AI 功能。

## 前置要求

- 安装 [Claude Code](https://claude.com/claude-code)
- 在项目根目录中有 `.claude/commands/` 目录
- PMSpec 项目已初始化 (`pmspec init`)

## 可用的 AI Commands

PMSpec 提供以下 slash commands,可在 Claude Code 中使用:

### 1. `/pmspec-breakdown` - 需求分解

**用途**: 将高层次的需求描述自动分解为 Epic → Feature → User Story 结构

**使用场景**:
- 项目初期,有粗略的需求描述
- 需要将大型功能拆分为可管理的小任务
- 想要快速生成项目结构框架

**使用方法**:

1. 在 Claude Code 中打开你的项目
2. 输入 `/pmspec-breakdown`
3. 将你的需求描述粘贴到提示的位置
4. Claude 会生成结构化的 Epic/Feature/Story

**输入示例**:

```
我们需要构建一个用户认证系统,包括:
- 用户可以使用邮箱和密码注册
- 用户可以登录并维持会话
- 用户可以重置密码
- 支持第三方登录 (Google, GitHub)
- 管理员可以管理用户权限
```

**输出示例**:

```markdown
# Epic: 用户认证系统

- **ID**: EPIC-001
- **Status**: planning
- **Owner**: TBD
- **Estimate**: 120 hours
- **Actual**: 0 hours

## Description
构建完整的用户认证和授权系统,支持多种登录方式和权限管理。

## Features
- [ ] FEAT-001: 用户注册和邮箱验证
- [ ] FEAT-002: 用户登录和会话管理
- [ ] FEAT-003: 密码重置流程
- [ ] FEAT-004: 第三方登录集成
- [ ] FEAT-005: 用户权限和角色管理

---

# Feature: 用户注册和邮箱验证

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: TBD
- **Estimate**: 16 hours
- **Actual**: 0 hours
- **Skills Required**: React, TypeScript, Node.js, PostgreSQL

## Description
实现用户注册功能,包括表单验证、密码加密和邮箱验证流程。

## User Stories
- [ ] STORY-001: As a new user, I want to fill out a registration form so that I can create an account (4h)
- [ ] STORY-002: As a new user, I want to receive a verification email so that I can verify my email address (3h)
- [ ] STORY-003: As a new user, I want to see clear error messages so that I know what went wrong (2h)
- [ ] STORY-004: As a new user, I want my password to be securely stored so that my account is protected (4h)

## Acceptance Criteria
- [ ] Form validates email format and password strength
- [ ] Password is hashed before storage
- [ ] Verification email is sent after registration
- [ ] User cannot login until email is verified
- [ ] Clear error messages for validation failures
```

**最佳实践**:

1. **明确需求**: 提供清晰、具体的需求描述
2. **包含上下文**: 说明项目类型、技术栈、团队规模
3. **人工审查**: AI 生成后,仔细审查并调整
4. **迭代优化**: 使用 `/pmspec-refine` 进一步优化

### 2. `/pmspec-estimate` - 工时估算

**用途**: 为已有的 Feature 或 User Story 估算合理的工时

**使用场景**:
- 已有 Feature 描述,需要估算工时
- 想要验证现有工时估算是否合理
- 需要为相似任务提供估算参考

**使用方法**:

1. 准备好 Feature 或 Story 的描述
2. 在 Claude Code 中输入 `/pmspec-estimate`
3. 粘贴你的任务描述
4. Claude 会分析并给出工时估算和理由

**输入示例**:

```
Feature: 实现商品搜索功能

需要支持:
- 全文搜索 (使用 Elasticsearch)
- 多维度筛选 (价格、分类、品牌)
- 搜索结果排序
- 搜索历史记录
- 自动补全建议

技术栈: React, TypeScript, Elasticsearch, Node.js
团队: 有 Elasticsearch 经验的开发者
```

**输出示例**:

```markdown
## 工时估算: 商品搜索功能

**总估算**: 32 小时

### 分解:

1. **Elasticsearch 集成和索引设计** (8h)
   - 设置 Elasticsearch 连接
   - 设计商品索引 schema
   - 实现索引同步逻辑

2. **搜索 API 开发** (10h)
   - 全文搜索接口
   - 多维度筛选逻辑
   - 搜索结果排序算法
   - 性能优化

3. **前端搜索 UI** (8h)
   - 搜索输入框组件
   - 筛选器 UI
   - 结果列表展示
   - 排序控件

4. **自动补全和搜索历史** (4h)
   - 自动补全 API
   - 搜索历史存储
   - 前端交互优化

5. **测试和调优** (2h)
   - 单元测试
   - 性能测试
   - Bug 修复

### 估算依据:

- ✅ 团队有 Elasticsearch 经验 (减少学习时间)
- ⚠️ 需要复杂的筛选逻辑 (增加开发时间)
- ✅ 使用成熟的 React 组件库 (加快 UI 开发)
- ⚠️ 需要性能优化和调优 (预留额外时间)

### 建议:

- 留出 20% 缓冲时间 (总计 ~38 小时)
- 可拆分为 2 个独立 Story:
  - STORY-1: 基础搜索和筛选 (24h)
  - STORY-2: 自动补全和历史 (8h)
```

**最佳实践**:

1. **提供技术细节**: 说明技术栈和团队经验
2. **包含复杂度**: 明确特殊要求或技术挑战
3. **参考历史**: 提供类似任务的实际工时
4. **保守估算**: 预留 20-30% 缓冲时间

### 3. `/pmspec-generate` - 完整项目生成

**用途**: 从项目描述生成完整的 PMSpec 项目结构 (project.md, team.md, epics, features)

**使用场景**:
- 新项目启动,需要快速搭建完整结构
- 想要从概念快速到可管理的项目
- 需要参考结构来学习 PMSpec

**使用方法**:

1. 准备好项目概述文档
2. 在 Claude Code 中输入 `/pmspec-generate`
3. 提供项目信息 (名称、目标、技术栈、团队)
4. Claude 会生成完整的项目结构

**输入示例**:

```
项目: 在线协作白板应用

目标:
- 构建实时协作的在线白板工具
- 支持多人同时编辑
- 丰富的绘图工具 (形状、文字、图片)
- 版本历史和回放

技术栈:
- 前端: React, TypeScript, Konva.js
- 后端: Node.js, Socket.io, MongoDB
- 基础设施: AWS, Redis

团队 (4 人):
- Alice: 全栈,React/Node.js 专家
- Bob: 后端,实时系统专家
- Carol: 前端,UI/UX 设计
- David: DevOps,AWS 专家

时间线: 3 个月
```

**输出**: 完整的项目文件结构 + 内容

**最佳实践**:

1. **详细输入**: 提供尽可能多的项目信息
2. **明确约束**: 说明时间、预算、团队限制
3. **审查调整**: 生成后仔细审查并根据实际调整
4. **增量迭代**: 从核心功能开始,逐步扩展

### 4. `/pmspec-refine` - 结构优化

**用途**: 优化和细化现有的 Epic/Feature 结构,提高可执行性

**使用场景**:
- 初步结构已生成,需要进一步细化
- Feature 粒度不合适,需要拆分或合并
- 工时分配不均,需要重新平衡
- 缺少验收标准或技术细节

**使用方法**:

1. 准备好现有的 Epic 或 Feature 内容
2. 在 Claude Code 中输入 `/pmspec-refine`
3. 粘贴需要优化的内容
4. 说明优化方向 (如"拆分更细"、"添加验收标准")
5. Claude 会给出优化建议

**输入示例**:

```
请帮我优化以下 Feature,问题:
- User Stories 粒度不够细
- 缺少明确的验收标准
- 工时估算可能过于乐观

---

# Feature: 实时聊天功能

- **ID**: FEAT-003
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: Alice
- **Estimate**: 20 hours
- **Actual**: 0 hours
- **Skills Required**: React, Socket.io, Node.js

## Description
实现实时聊天功能,支持文字消息和在线状态显示。

## User Stories
- [ ] STORY-001: 用户可以发送和接收消息 (10h)
- [ ] STORY-002: 用户可以看到在线状态 (5h)
- [ ] STORY-003: 消息持久化存储 (5h)
```

**输出示例**:

```markdown
# Feature: 实时聊天功能 (优化版)

- **ID**: FEAT-003
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: Alice
- **Estimate**: 28 hours (原 20h,调整 +40%)
- **Actual**: 0 hours
- **Skills Required**: React, Socket.io, Node.js, MongoDB

## Description
实现实时聊天功能,支持文字消息、在线状态和消息历史。使用 Socket.io 实现 WebSocket 通信,MongoDB 存储消息历史。

## User Stories (优化 - 更细粒度)

### 消息发送和接收
- [ ] STORY-001: 用户可以在聊天界面输入文字消息 (2h)
- [ ] STORY-002: 用户点击发送后消息通过 WebSocket 实时发送 (3h)
- [ ] STORY-003: 用户可以实时接收其他用户的消息 (3h)
- [ ] STORY-004: 消息显示发送者和时间戳 (2h)

### 在线状态
- [ ] STORY-005: 用户登录时广播在线状态 (2h)
- [ ] STORY-006: 用户离线时更新状态 (2h)
- [ ] STORY-007: 显示用户列表及在线/离线状态 (3h)

### 消息持久化
- [ ] STORY-008: 消息保存到 MongoDB (3h)
- [ ] STORY-009: 用户进入聊天室时加载历史消息 (4h)
- [ ] STORY-010: 支持消息分页加载 (4h)

## Acceptance Criteria (新增)

### 功能性
- [ ] 消息在 <100ms 内送达所有在线用户
- [ ] 支持至少 50 人同时在线聊天
- [ ] 消息历史可追溯到 30 天前
- [ ] 离线用户上线后可看到未读消息

### 技术性
- [ ] WebSocket 连接断开后自动重连
- [ ] 消息发送失败有重试机制
- [ ] 数据库查询有索引优化
- [ ] 消息内容经过 XSS 过滤

### 用户体验
- [ ] 消息发送有 loading 状态指示
- [ ] 新消息有视觉或声音提示
- [ ] 支持 Emoji 表情
- [ ] 移动端响应式布局

## 技术注意事项 (新增)

1. **WebSocket 连接管理**
   - 使用 Socket.io 的 room 功能实现聊天室
   - 实现心跳检测避免僵尸连接
   - 处理网络波动导致的断线重连

2. **性能优化**
   - MongoDB 为 `timestamp` 和 `roomId` 创建索引
   - 前端虚拟滚动加载大量消息
   - 限制消息发送频率 (防止刷屏)

3. **安全性**
   - 验证用户身份和权限
   - 消息内容 XSS 过滤
   - 限制消息长度和频率

## 优化说明

1. **User Stories 拆分**: 从 3 个拆分为 10 个,每个 2-4 小时,更易追踪
2. **工时调整**: 从 20h 增加到 28h,考虑:
   - WebSocket 连接管理复杂性
   - 消息分页和性能优化
   - 测试和 bug 修复时间
3. **验收标准**: 添加功能性、技术性和用户体验三个维度的标准
4. **技术细节**: 明确技术实现要点和注意事项

## 后续建议

- 可以将"消息持久化"部分 (STORY-008~010) 拆分为独立 Feature
- 建议先实现基础消息功能,然后迭代添加高级特性 (如 Emoji, 文件传输)
```

**最佳实践**:

1. **明确问题**: 清楚说明需要优化的方面
2. **提供上下文**: 包含相关的其他 Features 或约束
3. **迭代优化**: 可以多次 refine 直到满意
4. **保留历史**: 用 Git 保存原始版本,便于对比

## 完整工作流示例

### 场景: 从零开始创建新项目

```bash
# 步骤 1: 初始化 PMSpec 项目
mkdir my-project && cd my-project
pmspec init

# 步骤 2: 在 Claude Code 中使用 AI 生成项目结构
# 输入: /pmspec-generate
# 提供项目描述、团队信息

# 步骤 3: 审查并调整生成的文件
code pmspace/

# 步骤 4: 验证数据完整性
pmspec validate

# 步骤 5: 查看生成的结构
pmspec list epics
pmspec list features

# 步骤 6: 针对某些 Feature 进行细化
# 输入: /pmspec-refine
# 粘贴需要优化的 Feature

# 步骤 7: 工作负载分析
pmspec analyze --recommend

# 步骤 8: 根据建议分配任务
pmspec update FEAT-001 --assignee Alice
pmspec update FEAT-002 --assignee Bob

# 步骤 9: 开始执行
pmspec update FEAT-001 --status in-progress
```

### 场景: 为现有项目添加新功能

```bash
# 步骤 1: 使用 AI 分解新需求
# 输入: /pmspec-breakdown
# 描述: 我们需要添加数据导出功能,支持 CSV 和 PDF 格式

# 步骤 2: 将生成的内容保存为文件
# 创建 pmspace/epics/epic-005.md
# 创建对应的 Feature 文件

# 步骤 3: 估算工时
# 输入: /pmspec-estimate
# 粘贴 Feature 描述

# 步骤 4: 更新 Epic 引用
# 编辑 epic-005.md,确保 Features 列表正确

# 步骤 5: 验证
pmspec validate

# 步骤 6: 查看新的总体负载
pmspec analyze

# 步骤 7: 分配任务
pmspec update FEAT-025 --assignee Carol
```

## AI 输出质量优化建议

### 1. 提供清晰的输入

**差的输入**:
```
我需要一个电商网站
```

**好的输入**:
```
我需要构建一个 B2C 电商平台,包括:

核心功能:
- 用户注册和登录
- 商品浏览和搜索
- 购物车和结算
- 订单管理
- 支付集成 (Stripe)

技术栈:
- 前端: React, TypeScript, Tailwind CSS
- 后端: Node.js, Express, PostgreSQL
- 部署: AWS (EC2, S3, RDS)

团队:
- 2 个全栈工程师
- 1 个 UI/UX 设计师

时间: 3 个月
预算: 有限 (需要控制成本)
```

### 2. 迭代优化

不要期望一次生成完美结果,使用以下迭代流程:

1. **初次生成**: 使用 `/pmspec-breakdown` 获取基础结构
2. **人工审查**: 检查是否符合预期,识别问题
3. **细化优化**: 使用 `/pmspec-refine` 优化特定部分
4. **工时校准**: 使用 `/pmspec-estimate` 验证工时
5. **最终调整**: 根据团队实际情况手动调整

### 3. 结合人工经验

AI 生成的估算是基于一般经验,需要根据你的团队调整:

- **新技术栈**: 工时 × 1.5-2 (学习曲线)
- **有经验**: 工时 × 0.7-0.8 (效率提升)
- **复杂业务**: 工时 × 1.3-1.5 (业务理解成本)
- **技术债多**: 工时 × 1.2-1.4 (重构和兼容)

### 4. 保留上下文

在一个 Claude Code 会话中进行多次 AI 操作时,Claude 会记住上下文:

```
You: /pmspec-breakdown
[粘贴需求]

Claude: [生成 Epic/Features]

You: /pmspec-refine
FEAT-003 的 User Stories 拆分的太粗了,请细化

Claude: [针对 FEAT-003 细化,会记住前面生成的上下文]

You: /pmspec-estimate
FEAT-003 的工时估算合理吗?考虑到我们团队对这个技术栈不太熟悉

Claude: [基于细化后的内容和团队情况重新估算]
```

## 常见问题

### Q: AI 生成的 ID 是否会重复?

A: AI 会尝试生成唯一 ID,但建议生成后运行 `pmspec validate` 检查。如有重复,手动调整。

### Q: AI 估算的工时准确吗?

A: AI 基于一般经验估算,需要根据团队实际情况调整。建议:
- 初次使用,保守估算 (AI 工时 × 1.3-1.5)
- 有历史数据后,根据偏差调整

### Q: 可以让 AI 直接写入文件吗?

A: 目前 AI 生成 Markdown 文本,需要手动复制到文件。未来可能支持直接写入。

### Q: 如何处理 AI 生成的不合理内容?

A:
1. 使用 `/pmspec-refine` 要求 AI 重新生成
2. 手动编辑调整
3. 提供更多上下文重新生成

### Q: 多次运行同一个命令会得到相同结果吗?

A: 不一定。AI 有一定随机性,但如果输入相同,结果会类似。可以多次运行选择最佳结果。

## 进阶技巧

### 1. 模板化常用需求

为常见需求创建模板,加速 AI 生成:

```markdown
<!-- templates/crud-feature.md -->

需求: 实现 [实体名称] 的 CRUD 功能

包括:
- 创建新 [实体]
- 列表查看所有 [实体]
- 详情查看单个 [实体]
- 更新 [实体]
- 删除 [实体]

技术栈: [前端技术], [后端技术], [数据库]
团队: [成员和技能]
```

### 2. 批量处理

对于多个类似的 Features,可以一次性提供给 AI:

```
请为以下 3 个类似 Feature 生成 User Stories:

1. 商品管理 CRUD
2. 分类管理 CRUD
3. 订单管理 CRUD

技术栈相同,都是 React + Node.js + PostgreSQL
```

### 3. 与团队历史数据结合

提供历史数据让 AI 估算更准确:

```
请估算以下 Feature 的工时:

Feature: 实现用户评论功能

参考历史:
- 类似的"用户点赞功能"实际花费 12 小时 (估算 8 小时)
- 我们团队平均估算偏差 +30%
```

## 相关资源

- [README.md](./README.md) - PMSpec 完整文档
- [QUICKSTART.md](./QUICKSTART.md) - 快速入门指南
- [examples/](./examples/) - 示例项目
- [.claude/commands/](-./.claude/commands/) - AI Prompt 文件

---

**利用 AI 让项目管理更高效!** 🚀
