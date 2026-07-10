# ai-integration 规格增量

## ADDED Requirements

### Requirement: Agent 原生操作

AI 集成 MUST 以 agent 直接操作为形态：agent skills（`.claude/skills/pmspec-*`）直接读写 `pmspace/` 文件并调用 CLI 的 `--json` 接口完成需求分解、估算、细化与分配建议。产品的任何工作流 MUST NOT 要求用户在 AI 与工具之间手动复制粘贴 prompt 或输出。

#### Scenario: 需求分解直接落盘

- **WHEN** 用户在 Claude Code 中以一段自然语言需求触发 breakdown skill
- **THEN** agent 直接在 `pmspace/` 下创建对应的 Epic/Feature/Story 文件，用户通过 git diff 审查结果，全程无复制粘贴步骤

#### Scenario: 非 Claude agent 同等可用

- **WHEN** 其他 AI agent 阅读仓库根部的 `AGENTS.md`
- **THEN** 其获得与 Claude skills 等价的操作契约（文件格式、CLI 命令、校验要求），能完成同样闭环

### Requirement: AI 产出的校验闸门

任何由 agent 写入 `pmspace/` 的变更，skill 流程 MUST 以 `pmspec validate` 作为收尾步骤；校验失败时 agent MUST 修复后重新校验，不得以失败状态结束。

#### Scenario: 校验不通过则修复

- **WHEN** agent 分解需求后 `pmspec validate` 报出引用悬空
- **THEN** agent 修复该引用并重新运行校验，直至退出码为 0 才结束任务

### Requirement: 离线与密钥边界

PMSpec 自身 MUST NOT 内置在线 AI API 调用，MUST NOT 存储或要求任何 AI 服务密钥；AI 能力由用户侧的 agent 运行环境提供。

#### Scenario: 无网络环境

- **WHEN** 在无网络环境使用全部 CLI 功能
- **THEN** 所有命令正常工作，不出现任何网络请求或密钥缺失报错
