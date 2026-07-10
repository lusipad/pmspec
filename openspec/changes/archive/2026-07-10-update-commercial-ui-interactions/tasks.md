## 1. Backend Features API

- [x] 1.1 扩展 `GET /api/features`，支持 `status/priority/assignee/epic/search/sortBy/sortOrder/page/pageSize`
- [x] 1.2 新增 `PATCH /api/features/:id`，支持局部更新
- [x] 1.3 新增 `POST /api/features/batch`，支持批量更新 `status/priority/assignee`
- [x] 1.4 补充后端路由测试，覆盖分页、PATCH、batch

## 2. Frontend Data Layer

- [x] 2.1 扩展 `api.ts` 查询参数与分页响应类型
- [x] 2.2 新增 `patchFeature` 与 `batchUpdateFeatures` API 方法
- [x] 2.3 修复请求层对 `204` 与空响应的兼容处理

## 3. Frontend Interaction Upgrade

- [x] 3.1 新建 `ToastProvider`，统一成功/失败反馈
- [x] 3.2 新建 `ConfirmDialog`，用于高影响操作确认
- [x] 3.3 重构 `Features` 页面，落地服务端分页、批量操作、内联编辑
- [x] 3.4 移除 `Features` 页面 `alert` 调用
- [x] 3.5 首页默认路由切换为 `Dashboard`

## 4. Validation

- [x] 4.1 运行后端测试：`npm --prefix web/backend test -- src/routes/features.test.ts`
- [x] 4.2 运行后端构建：`npm --prefix web/backend run build`
- [x] 4.3 运行前端构建：`npm --prefix web/frontend run build`
