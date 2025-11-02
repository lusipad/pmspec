# PMSpec Demo 项目

这是一个演示 PMSpec 功能的示例项目：**电商平台后端系统**

## 项目结构

```
demo/
├── pmspace/
│   ├── project.md          # 项目概览
│   ├── team.md             # 团队信息
│   ├── epics/              # Epics
│   │   ├── epic-001.md     # 用户管理
│   │   ├── epic-002.md     # 商品管理
│   │   └── epic-003.md     # 订单处理
│   └── features/           # Features
│       ├── feat-001.md     # 用户注册
│       ├── feat-002.md     # 用户登录
│       ├── feat-003.md     # 商品CRUD
│       ├── feat-004.md     # 商品搜索
│       ├── feat-005.md     # 订单创建
│       └── feat-006.md     # 订单状态更新
```

## 运行 Demo

```bash
cd demo
npm run dev:cli init          # 初始化项目结构已存在
npm run dev:cli list epics     # 查看所有 Epics
npm run dev:cli list features  # 查看所有 Features
npm run dev:cli show EPIC-001  # 查看用户管理 Epic
npm run dev:cli validate        # 验证项目数据
```

## 功能演示

1. **三层层次结构**: Epic → Feature → UserStory
2. **团队技能管理**: 展示不同技能的团队成员
3. **工时估算**: 每个任务都有估算和实际工时
4. **状态跟踪**: 展示不同阶段的完成状态
5. **数据验证**: 确保引用完整性和数据一致性
