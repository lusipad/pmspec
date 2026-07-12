# Proposal: PMSpec v2 重新设计

## Why

PMSpec 当前是一个无法闭环的产品。对代码库的全面诊断发现了五个致命问题（按严重程度排序）：

1. **数据模型分裂（架构级）**。实际发布的 CLI 使用扁平简单模型（`src/core/simple-model.ts`，CSV 存储），而 Web 后端读取的是 Epic→Feature→Story 富模型（`web/backend/src/services/dataService.ts` 解析 `pmspace/epics/*.md`）。CLI 生成的数据 Web 读不了，反之亦然。同一套领域类型在 4 处独立定义（`src/core/project.ts`、`src/core/simple-model.ts`、`web/shared/types.ts`、`web/frontend/src/services/api.ts`），其中 `web/shared` 建成后从未被任何一端 import。
2. **"AI 驱动"名不副实**。核心卖点 `pmspec breakdown` 只是把一段 prompt 打印到终端让用户手动粘贴进 Claude；`--apply` 与 AI 输出解析均为未实现的占位代码（`parseAIGeneratedContent()` 直接返回 "AI parsing not implemented yet"）。所谓 AI 集成是人肉搬运 prompt。
3. **表面积失控**。同时维护 CLI（~9.3k 行）、Web 前端（~7.8k 行）、Web 后端（~8.9k 行）、Electron 桌面壳、Helm/Docker、npm 包 6 种交付形态，而核心闭环没有一条能走通。可见 git 历史中最近 400+ 个 PR 全部是 dependabot 依赖升级——维护成本已完全吞噬产品演进。
4. **文档与产品双向失真**。README/QUICKSTART 教用户使用 `init`/`create`/`breakdown` 等命令，但这些命令挂在无人引用的死代码 `src/commands/index-legacy.ts` 上，实际 CLI 入口（`src/cli/index.ts`）只暴露 `simple/serve/history/search/import`。用户照文档操作会直接失败。
5. **仓库与流程失效**。根目录误提交 7 个一次性提交脚本（.ps1/.bat/.py）、`temp-cli.ts`（CLI 早期副本）、散落的测试数据；8 个 OpenSpec change 无一归档，Web 已实现但对应 change 显示 0/227，本应解决架构分裂的 `decouple-cli-web-offline` 完成度 0%。

根因不是执行力，而是定位错误：产品在核心闭环（AI 分解需求 → 落盘 → 人审查 → 跟踪）跑通之前，横向扩张到了 6 种交付形态；同时 AI 集成停留在 2024 年的"生成 prompt 给人搬运"范式，而 2026 年的 AI agent 已能直接操作文件系统与 CLI。

## What Changes

**重新定位**：PMSpec v2 = "长在 Git 仓库里的 AI 原生项目管理"。目标用户是使用 AI 编码助手的小团队与独立开发者。核心闭环：人用自然语言描述需求 → AI agent 通过 skills 直接分解并写入 `pmspace/` → 人在编辑器/PR 中审查 diff → CLI 提供查询、校验、统计 → 一切经 git 协作。PMSpec 之于项目计划，如同 OpenSpec 之于规范。

具体变更：

- **统一数据模型**（**BREAKING**）：确立 Epic→Feature→Story 三层模型（Story 可选）为唯一模型，单一 zod schema 收敛于 `src/core/`；存储统一为 Markdown + YAML frontmatter，每实体一文件；CSV 降级为纯导入/导出格式。删除 `simple-model.ts` 双轨与 `web/shared/types.ts`。
- **AI 集成改为 agent 原生**（**BREAKING**）：删除打印 prompt 的 `breakdown` 命令形态；重写 `.claude/skills/pmspec-*` 为直接读写 `pmspace/` 文件并调用 CLI 的 skills；所有 CLI 命令提供 `--json` 机器接口；AI 产出必须通过 `pmspec validate` 校验后才算落盘成功。
- **收缩表面积**（**BREAKING**）：v2 主干只保留 core + CLI + agent skills。删除 `desktop/`、`helm/`、`Dockerfile`、`docker-compose.yml`；`web/` 整体从主干移除（git 历史可恢复；阶段二如有真实需求，重建为基于统一模型直读 `pmspace/` 的本地只读看板 `pmspec serve`，不再维护独立后端 services 层）。
- **仓库清理**：删除 `index-legacy.ts`、`temp-cli.ts`、全部一次性提交脚本、根目录散落数据文件；重写 README/QUICKSTART 使之与实际命令一一对应；文档单一来源。
- **OpenSpec 流程复位**：归档已完成的 change（`add-npx-package-push` 等），将被本提案取代的 change（`decouple-cli-web-offline`、`add-commercial-roadmap`、`add-web-gui-with-feature-list` 等）标记废弃归档；以本提案的 spec delta 建立首批 `openspec/specs/`。
- **迁移路径**：`pmspec import` 支持从旧 `features.csv`（简单模型）与旧 `pmspace/` 富模型目录迁移到 v2 格式。

## Impact

- Affected specs: `project-data`（新建）、`cli-core`（新建）、`ai-integration`（新建）
- Affected code:
  - 删除：`web/`（全部）、`desktop/`、`helm/`、`Dockerfile`、`docker-compose.yml`、`src/core/simple-model.ts`、`src/commands/index-legacy.ts`、`src/commands/simple.ts`、`src/commands/serve.ts`、`temp-cli.ts`、根目录提交脚本与散落数据文件
  - 重写：`src/core/`（统一 schema/parser/storage）、`src/cli/index.ts` 与 `src/commands/*`、`.claude/skills/pmspec-*`、`README.md`、`QUICKSTART.md`、`AI_GUIDE.md`
  - 移除依赖：Express、ws、multer、React 全家桶、electron-builder 等（dependabot 噪音随之消失）
- 对现有用户（如有）：**BREAKING** — v1 CSV 数据需通过 `pmspec import` 迁移；Web/Desktop 界面在 v2 中不可用
- 风险与缓解见 `design.md`
