# PMSpec 项目指引

- 领域类型只从 `src/core/schema.ts` import，禁止在任何地方另行定义 Epic/Feature/Story 类型
- 改核心逻辑必须带测试；提交前 `npm test` 与 `npx tsc --noEmit` 全绿
- 操作 `pmspace/` 数据（作为使用者而非开发者）时遵循 `AGENTS.md` 的 agent 契约：
  查询走 CLI `--json`，写入后必须 `pmspec validate` 通过

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
