import { Command } from 'commander';
import chalk from 'chalk';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { EpicSchema, FeatureSchema, UserStorySchema } from '../core/project.js';
import { writeEpicFile, writeFeatureFile } from '../utils/markdown.js';
import { readEpicFile, readFeatureFile } from '../core/parser.js';

const breakdownCommand = new Command('breakdown')
  .description('AI-driven breakdown of requirements into Epic/Feature/Story structure')
  .argument('[id]', 'Epic ID to expand (optional)')
  .option('--from <text>', 'Create new epic from requirement description')
  .option('--apply', 'Apply AI-generated changes automatically')
  .action(async (id, options, command) => {
    try {
      if (options.from) {
        await breakdownFromDescription(options.from, options.apply);
      } else if (id) {
        await breakdownEpic(id, options.apply);
      } else {
        console.error(chalk.red('Error: Either provide an Epic ID or use --from option'));
        console.log(chalk.yellow('Usage:'));
        console.log('  pmspec breakdown EPIC-001     # Expand existing epic');
        console.log('  pmspec breakdown --from "description"  # Create new epic from description');
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

async function breakdownFromDescription(description: string, applyChanges: boolean) {
  console.log(chalk.blue('🤖 AI Breakdown from Description'));
  console.log(chalk.gray('Description:'), description);
  console.log();

  // Generate AI prompt
  const prompt = generateBreakdownPrompt(description);

  console.log(chalk.yellow('📝 Please run the following prompt in Claude:'));
  console.log(chalk.cyan('─'.repeat(50)));
  console.log(prompt);
  console.log(chalk.cyan('─'.repeat(50)));
  console.log();

  if (!applyChanges) {
    console.log(chalk.yellow('💡 After getting the AI output, run:'));
    console.log(chalk.cyan('pmspec breakdown --apply --from "description"'));
    console.log();
    console.log(chalk.gray('Or manually create the files and use pmspec validate to check'));
    return;
  }

  console.log(chalk.yellow('⚠️  Auto-apply mode requires AI output to be available.'));
  console.log(chalk.gray('This feature would be implemented with AI API integration.'));
}

async function breakdownEpic(epicId: string, applyChanges: boolean) {
  console.log(chalk.blue(`🤖 AI Breakdown for Epic ${epicId}`));

  // Validate epic exists
  let epic;
  try {
    epic = await readEpicFile(`pmspace/epics/${epicId.toLowerCase()}.md`);
  } catch {
    console.error(chalk.red(`Error: Epic ${epicId} not found`));
    process.exit(1);
  }

  console.log(chalk.gray('Current Epic:'), epic.title);
  console.log(chalk.gray('Description:'), epic.description || 'No description');
  console.log();

  // Generate AI prompt for expanding epic
  const prompt = generateExpansionPrompt(epic);

  console.log(chalk.yellow('📝 Please run the following prompt in Claude:'));
  console.log(chalk.cyan('─'.repeat(50)));
  console.log(prompt);
  console.log(chalk.cyan('─'.repeat(50)));
  console.log();

  if (!applyChanges) {
    console.log(chalk.yellow('💡 After getting the AI output, run:'));
    console.log(chalk.cyan(`pmspec breakdown ${epicId} --apply`));
    return;
  }

  console.log(chalk.yellow('⚠️  Auto-apply mode requires AI output to be available.'));
  console.log(chalk.gray('This feature would be implemented with AI API integration.'));
}

function generateBreakdownPrompt(description: string): string {
  return `# PMSpec Breakdown

将以下需求描述分解为 Epic/Feature/Story 结构：

需求描述：${description}

请按照以下格式输出结构化的 Markdown：

\`\`\`markdown
# Epic: [Epic 标题]

- **ID**: EPIC-001
- **Status**: planning
- **Owner**: [建议负责人]
- **Estimate**: [总工时] hours
- **Actual**: 0 hours

## Description
[详细描述]

## Features
- [ ] FEAT-001: [Feature 1 标题]
- [ ] FEAT-002: [Feature 2 标题]

---

# Feature: [Feature 1 标题]

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: todo
- **Assignee**: [建议负责人]
- **Estimate**: [工时] hours
- **Skills Required**: [技能1], [技能2]

## Description
[详细描述]

## User Stories
- [ ] STORY-001: As a [用户类型], I want to [功能] so that [价值] ([工时]h)
- [ ] STORY-002: As a [用户类型], I want to [功能] so that [价值] ([工时]h)

## Acceptance Criteria
- [ ] [验收条件1]
- [ ] [验收条件2]
\`\`\`

指导原则：
- Epic: 大的业务目标 (20-500h)
- Feature: 可交付功能单元 (4-80h)
- User Story: 最小可实施单元 (1-24h)
- 每个 Story 都要体现用户价值`;
}

function generateExpansionPrompt(epic: any): string {
  return `# PMSpec Epic Expansion

扩展现有的 Epic，添加更详细的 Feature 和 User Story：

## 当前 Epic

**标题**: ${epic.title}
**ID**: ${epic.id}
**描述**: ${epic.description || '无描述'}
**当前估算**: ${epic.estimate}h
**当前 Features**: ${epic.features.length > 0 ? epic.features.join(', ') : '无'}

## 扩展要求

1. 为现有 Epic 添加更多详细的 Features
2. 为每个 Feature 添加完��的 User Stories
3. 优化工时估算
4. 添加所需的技能要求
5. 设置合理的验收标准

## 输出格式

请按照 PMSpec 格式输出新增的 Features 和完整的更新结构，包括：

- 新增的 Feature 文件内容
- 更新的 Epic 文件内容（包含新的 Features 列表）
- 每个新增 Feature 的 User Stories

确保工时估算合理，Story 粒度适中（1-3天可完成）。`;
}

// Helper function to parse AI-generated markdown (placeholder for future AI integration)
async function parseAIGeneratedContent(content: string) {
  // This would parse the AI-generated markdown and extract epic/features/stories
  // For now, return empty structure
  return {
    epic: null,
    features: [],
    errors: ['AI parsing not implemented yet']
  };
}

// Helper function to validate AI-generated structure
function validateAIStructure(epic: any, features: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate epic
  if (!epic || !epic.id || !epic.title) {
    errors.push('Invalid epic structure: missing id or title');
  }

  // Validate features
  features.forEach((feature, index) => {
    if (!feature.id || !feature.title) {
      errors.push(`Invalid feature ${index + 1}: missing id or title`);
    }
    if (!feature.userStories || feature.userStories.length === 0) {
      errors.push(`Feature ${feature.id}: no user stories defined`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export { breakdownCommand };