# Enhance UI Visual Priority and Workload Indicators

## Why

当前 PMSpec Web UI 在任务排版和可视化方面存在以下限制：

1. **缺少优先级字段**: Feature 数据模型中没有 priority 字段，无法对任务进行优先级管理
2. **视觉区分度不足**: 虽然有状态颜色区分，但缺少基于优先级和工作量的视觉层次
3. **信息密度较高**: 看板卡片和表格中所有任务的视觉权重相同，难以快速识别重要任务
4. **缺少工作量可视化**: estimate 字段仅以数字显示，缺少直观的大小/规模感知

项目经理和团队成员需要：
- **快速识别高优先级任务**: 通过颜色和视觉突出度立即定位需要关注的任务
- **感知任务规模**: 通过卡片大小或视觉比重直观理解工作量分布
- **优化任务安排**: 基于优先级和工作量的可视化做出更好的资源分配决策
- **提升团队协作效率**: 团队成员无需阅读详细信息即可理解任务的相对重要性

## What Changes

### 核心功能

1. **添加优先级字段**
   - Feature 数据模型新增 `priority` 字段: `'high' | 'medium' | 'low' | 'critical'`
   - 支持 CSV 导入导出优先级
   - 在 Features 表格中添加优先级列

2. **优先级视觉化**
   - **颜色编码**:
     - Critical: 红色/深红色 (#DC2626, #991B1B)
     - High: 橙色/琥珀色 (#F59E0B, #D97706)
     - Medium: 蓝色 (#3B82F6, #2563EB)
     - Low: 灰色 (#6B7280, #4B5563)
   - **视觉突出**:
     - Critical: 加粗边框 (3px) + 阴影效果
     - High: 加粗边框 (2px)
     - Medium: 标准边框 (1px)
     - Low: 细边框 (1px) + 半透明效果
   - **优先级标签**: 在卡片和表格中显示带颜色的优先级徽章

3. **工作量视觉化**
   - **卡片尺寸缩放**:
     - 基于 estimate 动态调整卡片高度/宽度
     - 小任务 (0-8h): 紧凑卡片
     - 中等任务 (8-40h): 标准卡片
     - 大任务 (40h+): 放大卡片
   - **工作量指示器**:
     - 显示相对大小图标 (S/M/L/XL)
     - 使用渐变色表示工作量级别
     - 在卡片中添加工作量条形图

4. **看板视图增强**
   - 按优先级排序选项 (默认高优先级在上)
   - 优先级分组视图 (可选)
   - 高亮显示 critical 和 high priority 任务
   - 工作量热力图模式 (颜色深浅表示工作量)

5. **表格视图增强**
   - 优先级列带颜色标签
   - 点击优先级列排序
   - 按优先级筛选
   - 工作量可视化列 (条形图)

6. **交互功能**
   - 快速设置优先级 (下拉菜单或快捷键)
   - 批量修改优先级
   - 优先级变更历史记录

### Technical Stack

**无新增技术栈**，使用现有技术实现：
- TypeScript (类型定义扩展)
- Tailwind CSS (颜色和样式类)
- React (组件增强)

## Impact

### Affected Specs

- **MODIFIED** `feature-list-management`: 添加 priority 字段和批量优先级操作
- **MODIFIED** `kanban-board`: 添加基于优先级和工作量的视觉指示器

### Affected Code

**修改文件**:
- `web/shared/types.ts` - 添加 priority 字段到 Feature 接口
- `web/frontend/src/components/Kanban/FeatureCard.tsx` - 增强卡片视觉样式
- `web/frontend/src/components/Kanban/KanbanColumn.tsx` - 添加排序和分组选项
- `web/frontend/src/pages/Features.tsx` - 添加优先级列和筛选器
- `web/frontend/src/pages/Kanban.tsx` - 添加视图模式切换
- `web/backend/src/services/csvService.ts` - 支持优先级导入导出
- `web/backend/src/services/parserService.ts` - 解析优先级字段

**新增文件**:
- `web/frontend/src/components/PriorityBadge.tsx` - 优先级徽章组件
- `web/frontend/src/components/WorkloadIndicator.tsx` - 工作量指示器组件
- `web/frontend/src/utils/visualHelpers.ts` - 视觉计算辅助函数

### Breaking Changes

**无破坏性变更**

- Priority 字段为可选 (默认 'medium')
- 现有 Markdown 文件兼容 (无 priority 字段默认为 medium)
- CSV 导入向后兼容 (priority 列可选)
- 所有现有功能继续正常工作

## Timeline Estimate

**预计 1-2 周完成**

- Days 1-2: 数据模型扩展 + CSV 导入导出支持
- Days 3-4: 优先级视觉化组件开发
- Days 5-6: 工作量视觉化实现
- Days 7-8: 看板和表格视图集成
- Days 9-10: 测试、优化、文档

## Success Criteria

1. **优先级支持**
   - Feature 接口包含 priority 字段
   - CSV 可以导入导出优先级
   - 支持 4 个优先级级别: critical/high/medium/low

2. **优先级视觉化**
   - 不同优先级使用不同颜色
   - Critical 任务有明显视觉突出
   - 看板卡片和表格都显示优先级标签

3. **工作量视觉化**
   - 卡片大小反映 estimate 大小
   - 显示工作量级别指示器 (S/M/L/XL)
   - 工作量在视觉上可区分

4. **交互功能**
   - 可按优先级排序和筛选
   - 支持批量修改优先级
   - 可切换不同视图模式 (标准/优先级/工作量)

5. **向后兼容**
   - 现有数据正常加载 (默认 medium priority)
   - 旧版 CSV 文件可以导入
   - 所有现有功能不受影响

## Non-Goals (Post-MVP)

- 自动优先级建议 (基于依赖关系)
- 优先级变更通知
- 优先级历史趋势图
- 基于优先级的自动排期
- 优先级冲突检测
