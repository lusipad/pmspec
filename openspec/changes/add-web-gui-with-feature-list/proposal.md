# PMSpec Web GUI with Complete Feature List Management

## Why

PMSpec 当前只有 CLI 界面，对于项目经理和团队协作场景存在以下限制：

1. **可视化不足**: CLI 难以直观展示项目整体进度、团队负载和时间线
2. **协作困难**: 多人无法同时查看和讨论项目状态，需要各自运行命令
3. **数据分析受限**: 缺少图表和报表，难以进行数据驱动的决策
4. **操作效率低**: 频繁的命令行操作对非技术人员不友好
5. **功能清单管理缺失**: 当前 Epic/Feature 结构较重，缺少轻量级的功能清单管理

我们需要一个 Web GUI 来提供：
- **可视化看板**: 直观展示任务状态和进度
- **甘特图**: 展示项目时间线和依赖关系
- **数据报表**: 工时统计、团队效率、进度分析
- **简化的功能清单**: CSV 导入导出，快速批量管理
- **实时协作**: 团队成员同时查看项目状态

## What Changes

### Core Features

1. **Web 应用基础架构**
   - React + TypeScript 前端应用
   - Node.js/Express 后端 API
   - WebSocket 支持实时更新
   - 响应式设计，支持移动端

2. **功能清单管理**
   - CSV/Excel 批量导入功能清单
   - 表格视图编辑 Features
   - 批量操作（状态更新、分配、删除）
   - 模板导入（预定义的常见功能）

3. **可视化看板**
   - Kanban 看板视图（Todo / In Progress / Done）
   - 拖拽更新任务状态
   - 按 Epic、Assignee、Sprint 筛选
   - 卡片详情快速预览

4. **甘特图和时间线**
   - Epic/Feature 时间线可视化
   - 依赖关系展示
   - 关键路径高亮
   - 拖拽调整时间计划

5. **报表和仪表板**
   - 项目进度仪表板（完成率、工时对比）
   - 团队工作负载图表
   - 燃尽图 (Burndown Chart)
   - 工时统计报表
   - 技能分布分析

6. **数据管理**
   - 实时同步 Markdown 文件
   - CSV 导出所有数据
   - 数据备份和恢复
   - 冲突检测和解决

### Technical Stack

**Frontend:**
- React 18 + TypeScript
- Vite (构建工具)
- TanStack Query (数据管理)
- Recharts / Chart.js (图表)
- React DnD (拖拽)
- Tailwind CSS (样式)

**Backend:**
- Node.js + Express
- WebSocket (Socket.io)
- Chokidar (文件监控)
- CSV Parser/Writer

## Impact

### Affected Specs

- **NEW** `web-app-architecture`: Web 应用架构和技术栈规范
- **NEW** `feature-list-management`: 功能清单导入导出和批量管理
- **NEW** `kanban-board`: 看板视图交互和状态管理
- **NEW** `gantt-chart`: 甘特图渲染和时间线计算
- **NEW** `dashboard-reports`: 仪表板和报表规范
- **NEW** `realtime-sync`: 实时数据同步机制
- **MODIFIED** `cli-commands`: 添加 `pmspec serve` 命令启动 Web 服务器

### Affected Code

**新增代码**:
- `web/` - 整个 Web 应用目录
  - `web/frontend/` - React 前端应用
  - `web/backend/` - Express 后端 API
  - `web/shared/` - 共享类型定义
- `src/server/` - Web 服务器入口
- `src/api/` - API 路由和控制器
- `src/websocket/` - WebSocket 处理
- `src/services/csv.ts` - CSV 导入导出服务

**修改代码**:
- `src/cli/index.ts` - 添加 `serve` 命令
- `src/core/parser.ts` - 增强解析支持批量操作
- `package.json` - 添加 Web 依赖

### Breaking Changes

**无破坏性变更**

- CLI 功能完全保留
- Markdown 文件格式不变
- 所有现有命令继续工作
- Web GUI 作为可选功能，通过 `pmspec serve` 启用

## Timeline Estimate

**预计 4-6 周完成完整版本**

- Week 1-2: Web 应用基础架构 + 功能清单管理
- Week 3: 看板视图 + 基础 API
- Week 4: 甘特图 + 时间线
- Week 5: 报表和仪表板
- Week 6: 优化、测试、文档

## Success Criteria

1. **Web 应用可访问**
   - `pmspec serve` 启动 Web 服务器
   - 浏览器访问 `http://localhost:3000`
   - 响应式设计，支持桌面和移动端

2. **功能清单管理**
   - 支持 CSV/Excel 导入功能列表
   - 表格视图可编辑、排序、筛选
   - 批量更新状态、分配人员
   - 导出为 CSV/Markdown

3. **可视化看板**
   - Kanban 看板显示所有 Features
   - 拖拽更新状态
   - 按多维度筛选（Epic、人员、状态）
   - 卡片显示关键信息（工时、负责人、进度）

4. **甘特图展示**
   - 时间线显示 Epic 和 Feature
   - 支持依赖关系展示
   - 可拖拽调整计划时间
   - 关键路径识别

5. **报表和统计**
   - 仪表板显示项目整体进度
   - 团队负载柱状图/饼图
   - 燃尽图显示剩余工作
   - 工时对比（估算 vs 实际）

6. **实时同步**
   - 文件变更自动刷新界面
   - 多用户查看实时更新
   - 修改冲突检测和提示

## Non-Goals (Post-MVP)

- 用户认证和权限管理
- 评论和讨论功能
- 文件上传（图片、附件）
- 移动端原生应用
- 离线模式
- 与外部工具集成（Jira、Linear）
