# 贡献指南

感谢关注 PMSpec！欢迎代码、文档、问题反馈和功能建议。

## 开发环境

- Node.js >= 20，npm >= 10

```bash
git clone https://github.com/lusipad/pmspec.git
cd pmspec
npm install
npm test            # vitest：单元 + CLI 集成测试
npm run build       # tsc
npm run dev:cli -- list   # 本地运行 CLI
```

## 项目结构

```
pmspec/
├── bin/pmspec.js         # CLI 可执行入口（加载 dist/cli）
├── src/
│   ├── core/             # 唯一数据模型与核心逻辑
│   │   ├── schema.ts     # zod schema —— 全仓库唯一类型来源
│   │   ├── storage.ts    # Markdown + frontmatter 读写
│   │   ├── workspace.ts  # pmspace/ 加载、ID 分配、写入
│   │   ├── validate.ts   # 完整性校验
│   │   ├── stats.ts      # 进度与负载统计
│   │   ├── importers.ts  # v1 / CSV 迁移
│   │   └── search.ts     # 全文检索（CJK 分词）
│   ├── commands/         # CLI 命令（每命令一文件 + 集成测试）
│   ├── cli/              # 程序入口与输出工具
│   └── index.ts          # 库导出
├── .claude/commands/     # AI slash commands（breakdown/estimate/refine/assign）
├── openspec/             # 规范与变更提案（spec 驱动开发）
├── AGENTS.md             # AI agent 操作契约
└── examples/             # 示例工作区
```

## 开发约定

- **spec 优先**：新功能、破坏性变更、架构调整先在 `openspec/changes/` 提提案（见 `openspec/AGENTS.md`），bug 修复与文档可直接改
- **唯一模型**：任何领域类型只能 import `src/core/schema.ts`，禁止另行定义
- TypeScript strict，禁止 `any`
- 每个 CLI 命令：查询类必须支持 `--json`；错误退出码为 1
- 提交信息用 conventional commits（`feat:` / `fix:` / `docs:` / `chore:`）
- 分支：`feature/*`、`fix/*`、`docs/*`、`chore/*`，PR 合入 `main`

## 测试要求

- 核心逻辑改动必须带单元测试（`src/core/*.test.ts`）
- CLI 行为改动更新集成测试（`src/commands/cli.test.ts`，通过临时目录跑真实命令闭环）
- 提交前本地 `npm test` 与 `npx tsc --noEmit` 全绿

## 提交 Issue / PR

- Issue 请附复现步骤与 `pmspec --version`
- PR 保持单一主题，描述里说明动机与行为变化；涉及 spec 的引用对应 change-id
