# Changelog

## 2.0.0 (2026-07-10)

**产品重新设计（BREAKING）**。定位收敛为"长在 Git 仓库里的 AI 原生项目管理"：
core + CLI + agent skills，细节见 `openspec/changes/archive/2026-07-10-redesign-pmspec-v2/`。

### BREAKING

- 移除 Web 界面、Electron 桌面客户端、Helm/Docker 部署（git 历史可恢复）
- 移除 `simple`、`serve`、`history` 命令；历史追溯改用 `git log -- pmspace/`
- 数据模型统一为 Epic → Feature → Story（Story 可选），存储统一为
  `pmspace/` 下 Markdown + YAML frontmatter，每实体一文件；CSV 降级为导入/导出格式
- 状态枚举统一为 `todo | in-progress | done | blocked`（v1 的 `planning/completed` 在导入时自动映射）

### 新增

- CLI v2：`init / add / list / show / update / validate / stats / import / export / search`，
  查询类命令全部支持 `--json`；`validate` 失败返回非零退出码（CI 友好）
- `pmspec import`：从 v1 简单模型 CSV、v1 富模型目录、通用 CSV（中英文表头别名）单向迁移，
  ID 冲突自动重分配，源数据不动
- Agent 原生 AI 集成：`/pmspec-breakdown`、`/pmspec-estimate`、`/pmspec-refine`、`/pmspec-assign`
  直接读写文件并强制 `pmspec validate` 收尾；`AGENTS.md` 提供工具无关的操作契约
- 全文检索支持中文（CJK 逐字分词）
- frontmatter 自定义键在 CLI 更新时完整保留

### 迁移

```bash
pmspec init
pmspec import <旧 features.csv 或旧 pmspace 目录>
pmspec validate
```
