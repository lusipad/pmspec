# Commercial Roadmap Proposal

## Why
PMSpec 目前处于 MVP 阶段（完成度约 75%），要达到商业软件级别，需要在质量保证、用户体验、安全性、可扩展性和运维能力等方面进行全面提升。

## What Changes

### Phase 1: 质量基础 (Quality Foundation)
- 提升测试覆盖率至 80%+
- 添加 E2E 测试框架
- 完善 TypeScript 类型定义
- 添加 API 文档（OpenAPI/Swagger）
- 实现错误追踪和日志系统

### Phase 2: 核心功能完善 (Core Features)
- **BREAKING**: 数据模型增强（依赖关系、里程碑）
- 实现历史追踪和变更日志
- 添加数据导入导出（Jira, Linear, GitHub Issues）
- 实现实时协作基础（WebSocket）
- 添加搜索和高级过滤

### Phase 3: 用户体验 (User Experience)
- 响应式设计优化（移动端支持）
- 深色模式支持
- 国际化（i18n）框架
- 键盘快捷键系统
- 离线模式增强（PWA）

### Phase 4: 安全与合规 (Security & Compliance)
- 用户认证系统（JWT/OAuth）
- 基于角色的权限控制（RBAC）
- 审计日志
- 数据加密（静态/传输）
- GDPR 合规工具

### Phase 5: 可扩展性 (Scalability)
- 插件系统架构
- Webhook 集成
- REST API 完善 + GraphQL 支持
- 多项目/工作区支持
- 自定义字段系统

### Phase 6: 运维与部署 (Operations)
- Docker 容器化
- Kubernetes Helm Charts
- 健康检查和监控指标
- 自动备份和恢复
- CI/CD 流水线完善

## Impact
- Affected specs: core, cli, web-frontend, web-backend, api (新建)
- Affected code: 全部模块
- Timeline: 6-9 个月（分阶段交付）
- Breaking changes: Phase 2 数据模型变更需要迁移脚本
