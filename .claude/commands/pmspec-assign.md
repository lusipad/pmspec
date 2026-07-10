# PMSpec Assign — 人员分配建议

按技能匹配与负载平衡给未分配的 Feature / Story 推荐负责人，经用户确认后**直接回写**。

## 流程

1. 读团队：`pmspace/team.md` 的 members（姓名、skills、capacity 每周小时）。若 members 为空，请用户先补充团队信息，不要凭空造人。
2. 读现状：
   - `pmspec stats --by-assignee --json` → 每人当前未完成负载与利用率
   - `pmspec list features --json` / `pmspec list stories --json` → 筛出 `assignee` 为空的条目
3. 逐条推荐，规则按优先级：
   - **技能匹配**：条目 `skills` ⊆ 成员 skills 的优先
   - **负载平衡**：在技能匹配的人里选当前 openHours/capacity 最低的
   - **上下文连续**：同一 Epic 下已有条目的负责人优先（减少切换成本）
4. 给用户一张推荐表（ID、推荐人、理由、分配后利用率），**等待确认**——分配涉及真人，不要不问就写。
5. 用户确认后执行：`pmspec update FEAT-001 --assignee alice`。

## 收尾（必须执行）

1. `pmspec validate` 通过（退出码 0）。
2. `pmspec stats --by-assignee` 展示分配后的负载，明确指出是否有人超载（utilization > 100%）。
