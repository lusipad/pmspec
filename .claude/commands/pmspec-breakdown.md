# PMSpec Breakdown — 需求分解

把一段自然语言需求分解为 Epic / Feature / Story 并**直接写入工作区**。不要生成让用户复制粘贴的内容——你自己动手创建实体。

## 前置检查

1. 确认工作区存在：运行 `pmspec list --json`。若报错未初始化，先运行 `pmspec init`（询问用户项目名，或从需求推断）。
2. 了解现状，避免重复创建：检查现有 Epic/Feature 是否已覆盖部分需求。

## 分解流程

1. **通读需求**（来自 `$ARGUMENTS` 或对话上下文），识别 1~3 个 Epic 级别的主题。范围小的需求可以不建 Epic，直接建 Feature。
2. **创建 Epic**：`pmspec add epic --title "<标题>" --description "<一句话目标>" --json`。ID 自动分配，记下返回的 ID。
3. **创建 Feature**：每个 Epic 拆 2~6 个可独立交付的 Feature：
   ```bash
   pmspec add feature --title "<标题>" --epic EPIC-001 \
     --skills "react,typescript" --description "<做什么、边界在哪>" --json
   ```
   - `--skills` 按实现所需技术栈填写
   - 拿得准就加 `--estimate <小时>h`，拿不准留空（之后用 /pmspec-estimate 补）
4. **创建 Story**（可选层）：对复杂 Feature 拆 2~5 个用户故事：
   ```bash
   pmspec add story --title "As a user, I want ..." --feature FEAT-001 --estimate 4 --json
   ```
5. **补充正文**：验收标准等较长内容直接编辑 `pmspace/features/FEAT-xxx.md` 的 Markdown 正文（frontmatter 之后的部分），用 `## 验收标准` + checklist 格式。

## 收尾（必须执行）

1. 运行 `pmspec validate`。**如有错误必须修复后重新校验，直到退出码为 0 才算完成**。
2. 运行 `pmspec stats` 给用户看分解结果概览。
3. 提醒用户：所有变更都是 `pmspace/` 下的 Markdown 文件，可用 `git diff` 审查后提交。

## 分解质量标准

- Feature 粒度：一人 1~5 天能完成；超过就继续拆
- 每个 Feature 的标题能独立看懂，不依赖上下文
- Story 用 "As a ..., I want ..." 句式
- 状态一律从 `todo` 开始，不要替用户预设进度
