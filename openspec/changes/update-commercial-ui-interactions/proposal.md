## Why

当前 Web 端交互在商业化场景下存在三个核心问题：

1. `Features` 页面以本地前端筛选为主，数据量增长后体验和性能下降。
2. 缺少统一反馈机制，仍有 `alert` 弹窗，无法形成可恢复、可追踪的操作闭环。
3. 批量操作和内联编辑能力不足，项目经理与 Tech Lead 的高频动作路径偏长。

## What Changes

- 为 `GET /api/features` 增加服务端筛选、排序、分页能力（并保持向后兼容）。
- 新增 `PATCH /api/features/:id` 和 `POST /api/features/batch`，支撑内联编辑和批量更新。
- `Features` 页面重构为商业级数据表：服务端分页、批量选择、批量状态/优先级/负责人更新、内联编辑。
- 引入全局 `ToastProvider` 与 `ConfirmDialog`，替换 `alert`，统一成功/失败反馈。
- 首页默认入口从甘特图切换为仪表盘（Dashboard）。

## Impact

- Affected specs:
  - `feature-list-management`（MODIFIED）
  - `web-app-architecture`（MODIFIED）
- Affected code:
  - `web/backend/src/routes/features.ts`
  - `web/frontend/src/services/api.ts`
  - `web/frontend/src/pages/Features.tsx`
  - `web/frontend/src/components/ui/Toast.tsx`
  - `web/frontend/src/components/ui/ConfirmDialog.tsx`
  - `web/frontend/src/App.tsx`
- Breaking changes: 无（`GET /api/features` 在无分页参数时保持原数组返回）
