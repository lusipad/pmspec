# Tasks: PMSpec v2 重新设计

## 1. 阶段 0：仓库清理

- [ ] 1.1 删除根目录一次性脚本：`commit-changes.ps1`、`commit-script.ps1`、`cleanup.ps1`、`git-check.ps1`、`do-commit.bat`、`execute-commit.bat`、`execute_commit.py`、`commit-message.txt`
- [ ] 1.2 删除 `temp-cli.ts`、根目录 `features.csv`、`features-md.md`
- [ ] 1.3 删除 `src/commands/index-legacy.ts` 及仅被其引用的死代码
- [ ] 1.4 删除 `web/`、`desktop/`、`helm/`、`Dockerfile`、`docker-compose.yml`、`.dockerignore` 及对应 CI workflow（desktop.yml、e2e.yml 等）
- [ ] 1.5 清理 `package.json` 中不再需要的依赖与 npm scripts，确保 `npm run build`、`npm test` 通过

## 2. 阶段 1：统一核心模型

- [ ] 2.1 定义 `src/core/schema.ts`：Epic/Feature/Story/Team/Project 的唯一 zod schema
- [ ] 2.2 实现 `src/core/storage.ts`：基于 gray-matter 的 frontmatter 读写，每实体一文件
- [ ] 2.3 实现 `src/core/workspace.ts`：`pmspace/` 目录的加载、索引、引用解析
- [ ] 2.4 删除 `src/core/simple-model.ts`、`src/core/changelog*.ts`、旧 `parser.ts` 中被替代的部分
- [ ] 2.5 核心模块单元测试（schema 校验、frontmatter 往返、引用完整性）

## 3. 阶段 2：CLI v2

- [ ] 3.1 `pmspec init`（含 `--minimal`）
- [ ] 3.2 `pmspec add epic|feature|story`（交互式 + 参数式）
- [ ] 3.3 `pmspec list` / `pmspec show`（含子项进度汇总）
- [ ] 3.4 `pmspec update`
- [ ] 3.5 `pmspec validate`（ID 唯一、引用完整、状态/工时合法、技能存在性）
- [ ] 3.6 `pmspec stats`（进度、按人负载、按 Epic 汇总）
- [ ] 3.7 `pmspec import`（v1 简单模型 CSV、v1 富模型 pmspace/、通用 CSV）+ `pmspec export`
- [ ] 3.8 `pmspec search`
- [ ] 3.9 所有命令支持 `--json`；退出码约定（validate 失败非零）
- [ ] 3.10 命令级集成测试

## 4. 阶段 3：AI 集成与文档

- [ ] 4.1 重写 `.claude/skills/pmspec-breakdown`：读取需求 → 直接写入 pmspace/ → 强制 `pmspec validate`
- [ ] 4.2 重写 `.claude/skills/pmspec-estimate`、`pmspec-refine`，新增 `pmspec-assign`（技能/负载匹配建议）
- [ ] 4.3 重写 `AGENTS.md` 为通用 agent 操作契约（文件格式 + CLI JSON 接口）
- [ ] 4.4 重写 `README.md`/`README.zh.md`/`QUICKSTART.md`，命令与实际实现一一对应；修正 clone 地址
- [ ] 4.5 合并 `AI_GUIDE.md` 进 README 或删除；去重 `demo/` 与 `examples/`（保留一份）
- [ ] 4.6 端到端验证：真实需求 → agent 分解 → validate 通过 → git diff 审查闭环

## 5. 阶段 4：流程复位与发布

- [ ] 5.1 归档已完成的 change：`add-npx-package-push`、`update-commercial-ui-interactions`、`add-electron-desktop-client`
- [ ] 5.2 废弃归档被取代的 change：`add-web-gui-with-feature-list`、`decouple-cli-web-offline`、`add-commercial-roadmap`、`enhance-ui-visual-priority`、`add-pmspec-core-mvp`
- [ ] 5.3 以本提案 delta 建立 `openspec/specs/`，`openspec validate --strict` 通过
- [ ] 5.4 更新 `openspec/project.md` 技术栈（移除 React/Express 条目）
- [ ] 5.5 版本号升至 2.0.0，更新 CHANGELOG，发布 npm（明示 BREAKING 与迁移指南）
