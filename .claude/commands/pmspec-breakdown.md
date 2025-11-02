# PMSpec Breakdown

将需求描述分解为 Epic/Feature/Story 结构，输出结构化的 Markdown 格式。

## 使用方法

将需求描述替换下面的 [需求描述] 内容，然后运行此命令。

[需求描述]

## 输出格式

请按照以下格式输出：

```markdown
# Epic: [Epic 标题]

- **ID**: EPIC-XXX
- **Status**: planning
- **Owner**: [建议的负责人，可选]
- **Estimate**: [总工时估算] hours
- **Actual**: 0 hours

## Description
[详细的 Epic 描述]

## Features
- [ ] FEAT-XXX: [Feature 1 标题]
- [ ] FEAT-XXX: [Feature 2 标题]

---

# Feature: [Feature 1 标题]

- **ID**: FEAT-XXX
- **Epic**: EPIC-XXX
- **Status**: todo
- **Assignee**: [建议的负责人，可选]
- **Estimate**: [工时估算] hours
- **Actual**: 0 hours
- **Skills Required**: [技能1], [技能2]

## Description
[Feature 1 详细描述]

## User Stories
- [ ] STORY-XXX: As a [用户类型], I want to [功能描述] so that [价值描述] ([工时估算]h)
- [ ] STORY-XXX: As a [用户类型], I want to [功能描述] so that [价值描述] ([工时估算]h)

## Acceptance Criteria
- [ ] [验收条件 1]
- [ ] [验收条件 2]

---

# Feature: [Feature 2 标题]

[同上格式]
```

## 指导原则

1. **Epic**: 代表一个大的业务目标或里程碑，通常跨多个迭代
2. **Feature**: 可交付的功能单元，通常 1-2 周完成
3. **User Story**: 可独立实施的最小单元，通常 1-3 天完成
4. **工时估算**:
   - Epic: 20-500 小时
   - Feature: 4-80 小时
   - User Story: 1-24 小时
5. **技能匹配**: 根据项目团队的实际技能来分配
6. **用户价值**: 每个 User Story 都应该明确说明用户价值