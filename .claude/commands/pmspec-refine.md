# PMSpec Refine — 细化 Feature

把一个粗粒度的 Feature 细化到可开发状态：补全描述与验收标准、拆分 Story。**直接修改文件与调用 CLI**，不要生成需要用户搬运的文本。

## 流程

1. 定位目标：`$ARGUMENTS` 中的 FEAT-xxx，或让用户指定。`pmspec show FEAT-001 --json` 读取现状。
2. **补全正文**：直接编辑 `pmspace/features/FEAT-xxx.md` 的 Markdown 正文（保持 frontmatter 不动），补齐：
   ```markdown
   ## 目标
   一段话说明这个 Feature 解决什么问题。

   ## 验收标准
   - [ ] 可验证的标准 1
   - [ ] 可验证的标准 2

   ## 非目标
   - 明确不做什么（防止范围蔓延）
   ```
3. **拆分 Story**：`pmspec add story --title "As a ..., I want ..." --feature FEAT-001 --estimate 4`，每个验收标准至少被一个 Story 覆盖。
4. **修正字段**：细化后如发现 `skills`/`estimate`/`priority` 不准，用 `pmspec update` 修正。

## 收尾（必须执行）

1. `pmspec validate` 通过（退出码 0），有错误必须修复。
2. `pmspec show FEAT-xxx` 展示细化结果。
3. 提醒用户用 `git diff` 审查变更。
