# PMSpec Estimate — 工时估算

为缺少估算的 Feature / Story 补齐工时，**直接回写数据**，不要输出让用户手工填写的表格。

## 流程

1. 找出缺口：`pmspec list features --json` 与 `pmspec list stories --json`，筛出 `estimate` 为空的条目；`$ARGUMENTS` 指定了 ID 时只处理指定条目。
2. 逐条估算。依据：
   - 标题与正文描述的范围（读 `pmspace/features/FEAT-xxx.md` 全文）
   - 同工作区内已有估算的类似条目（保持口径一致）
   - 涉及的技能栈复杂度（`skills` 字段）
3. 回写：`pmspec update FEAT-001 --estimate 16` （单位小时，Story 一般 2~8h，Feature 一般 8~40h）。
4. 有 Story 的 Feature 不需要重复估算自身——统计口径以 Story 为准；若 Feature 与其 Story 的估算和差距悬殊，以 Story 之和为准修正 Feature 或说明原因。

## 收尾（必须执行）

1. `pmspec validate` 通过（退出码 0）。
2. `pmspec stats --by-assignee` 检查是否有人因新估算而超载，超载时向用户提出调整建议。
3. 输出估算摘要：每条 ID、估算值、一句话依据，供用户经 `git diff` 复核。
