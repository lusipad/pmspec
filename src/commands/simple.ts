import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { CSVHandler } from '../utils/csv-handler.js';
import type { SimpleFeature } from '../core/simple-model.js';

const simpleCommand = new Command('simple')
  .description('简化的项目管理 - 只维护一个功能表')
  .option('--format <format>', '输出格式: csv, md', 'csv')
  .option('--output <file>', '输出文件路径', 'features')
  .action(async (options, command) => {
    try {
      const filePath = `${options.output}.${options.format}`;

      if (options.format === 'csv') {
        await createCSVTemplate(filePath);
      } else if (options.format === 'md') {
        await createMarkdownTemplate(filePath);
      } else {
        console.error(chalk.red('错误: 格式必须是 csv 或 md'));
        process.exit(1);
      }

      console.log(chalk.green(`✓ 已创建模板文件: ${filePath}`));
      console.log(chalk.yellow('请编辑文件添加功能，然后使用 AI 生成项目结构'));

    } catch (error: any) {
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
  });

// 生成命令
const generateCommand = new Command('generate')
  .description('从功能表生成项目结构')
  .option('--input <file>', '功能表文件路径', 'features.csv')
  .option('--output <dir>', '输出目录', 'generated')
  .option('--interactive', '交互式 AI 生成')
  .action(async (options, command) => {
    try {
      const features = await CSVHandler.readFeatures(options.input);

      if (features.length === 0) {
        console.log(chalk.yellow('警告: 没有找到功能数据'));
        return;
      }

      console.log(chalk.blue(`📊 读取到 ${features.length} 个功能`));

      // 显示功能统计
      displayFeaturesSummary(features);

      if (options.interactive) {
        // 生成 AI prompt
        await generateAIPrompt(features, options.input);
      } else {
        // 简单的本地生成（不使用 AI）
        await generateProjectStructure(features, options.output);
      }

    } catch (error: any) {
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
  });

// 列表命令
const listCommand = new Command('list')
  .description('显示功能列表')
  .option('--input <file>', '功能表文件路径', 'features.csv')
  .option('--assignee <name>', '按分配人筛选')
  .option('--status <status>', '按状态筛选')
  .option('--priority <priority>', '按优先级筛选')
  .action(async (options, command) => {
    try {
      const features = await CSVHandler.readFeatures(options.input);

      let filteredFeatures = features;

      if (options.assignee) {
        filteredFeatures = filteredFeatures.filter(f =>
          f.assignee.toLowerCase().includes(options.assignee.toLowerCase())
        );
      }

      if (options.status) {
        filteredFeatures = filteredFeatures.filter(f =>
          f.status === options.status
        );
      }

      if (options.priority) {
        filteredFeatures = filteredFeatures.filter(f =>
          f.priority === options.priority
        );
      }

      if (filteredFeatures.length === 0) {
        console.log(chalk.yellow('没有找到匹配的功能'));
        return;
      }

      displayFeaturesTable(filteredFeatures);

    } catch (error: any) {
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
  });

// 统计命令
const statsCommand = new Command('stats')
  .description('显示项目统计信息')
  .option('--input <file>', '功能表文件路径', 'features.csv')
  .action(async (options, command) => {
    try {
      const features = await CSVHandler.readFeatures(options.input);

      if (features.length === 0) {
        console.log(chalk.yellow('没有功能数据'));
        return;
      }

      displayStatistics(features);

    } catch (error: any) {
      console.error(chalk.red('错误:'), error.message);
      process.exit(1);
    }
  });

function displayFeaturesTable(features: SimpleFeature[]) {
  console.log(chalk.blue.bold('\n📋 功能列表\n'));

  // 计算列宽
  const maxWidths = {
    id: Math.max(8, ...features.map(f => f.id.length)),
    name: Math.max(8, ...features.map(f => f.name.length)),
    assignee: Math.max(6, ...features.map(f => f.assignee.length)),
    priority: 8,
    status: 8,
    estimate: 8
  };

  // 表头
  const header = `│ ${pad('ID', maxWidths.id)} │ ${pad('功能名称', maxWidths.name)} │ ${pad('分配给', maxWidths.assignee)} │ ${pad('优先级', maxWidths.priority)} │ ${pad('状态', maxWidths.status)} │ ${pad('工时', maxWidths.estimate)} │`;
  const separator = `├${pad('', maxWidths.id + 2, '─')}┼${pad('', maxWidths.name + 2, '─')}┼${pad('', maxWidths.assignee + 2, '─')}┼${pad('', maxWidths.priority + 2, '─')}┼${pad('', maxWidths.status + 2, '─')}┼${pad('', maxWidths.estimate + 2, '─')}┤`;

  console.log(header);
  console.log(separator);

  // 数据行
  for (const feature of features) {
    const priorityColor = getPriorityColor(feature.priority);
    const statusColor = getStatusColor(feature.status);

    const row = `│ ${pad(feature.id, maxWidths.id)} │ ${pad(feature.name, maxWidths.name)} │ ${pad(feature.assignee, maxWidths.assignee)} │ ${priorityColor(pad(feature.priority, maxWidths.priority))} │ ${statusColor(pad(feature.status, maxWidths.status))} │ ${pad(feature.estimate + 'h', maxWidths.estimate)} │`;
    console.log(row);
  }

  console.log(`\n总计: ${features.length} 个功能`);
}

function displayStatistics(features: SimpleFeature[]) {
  console.log(chalk.blue.bold('\n📊 项目统计\n'));

  // 基础统计
  const totalFeatures = features.length;
  const totalHours = features.reduce((sum, f) => sum + f.estimate, 0);
  const completedFeatures = features.filter(f => f.status === 'done').length;
  const completionRate = ((completedFeatures / totalFeatures) * 100).toFixed(1);

  console.log(`总功能数: ${totalFeatures}`);
  console.log(`预估总工时: ${totalHours}h`);
  console.log(`已完成: ${completedFeatures} (${completionRate}%)`);

  // 按状态统计
  console.log(chalk.yellow('\n按状态统计:'));
  const statusStats = new Map<string, number>();
  features.forEach(f => {
    statusStats.set(f.status, (statusStats.get(f.status) || 0) + 1);
  });

  for (const [status, count] of statusStats) {
    const color = getStatusColor(status);
    console.log(`${color(status)}: ${count}`);
  }

  // 按优先级统计
  console.log(chalk.yellow('\n按优先级统计:'));
  const priorityStats = new Map<string, number>();
  features.forEach(f => {
    priorityStats.set(f.priority, (priorityStats.get(f.priority) || 0) + 1);
  });

  for (const [priority, count] of priorityStats) {
    const color = getPriorityColor(priority);
    console.log(`${color(priority)}: ${count}`);
  }

  // 按人员统计
  console.log(chalk.yellow('\n按人员统计:'));
  const assigneeStats = new Map<string, { count: number; hours: number }>();
  features.forEach(f => {
    const current = assigneeStats.get(f.assignee) || { count: 0, hours: 0 };
    assigneeStats.set(f.assignee, {
      count: current.count + 1,
      hours: current.hours + f.estimate
    });
  });

  for (const [assignee, stats] of assigneeStats) {
    console.log(`${assignee}: ${stats.count} 个功能, ${stats.hours}h`);
  }
}

function pad(text: string, width: number, fillChar: string = ' '): string {
  return (text + fillChar.repeat(width)).slice(0, width);
}

function getPriorityColor(priority: string): (text: string) => string {
  switch (priority) {
    case 'critical': return (text: string) => chalk.red(text);
    case 'high': return (text: string) => chalk.yellow(text);
    case 'medium': return (text: string) => chalk.blue(text);
    case 'low': return (text: string) => chalk.gray(text);
    default: return (text: string) => text;
  }
}

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'done': return (text: string) => chalk.green(text);
    case 'in-progress': return (text: string) => chalk.blue(text);
    case 'blocked': return (text: string) => chalk.red(text);
    case 'todo': return (text: string) => chalk.gray(text);
    default: return (text: string) => text;
  }
}

async function createCSVTemplate(filePath: string) {
  const template = `ID,功能名称,描述,预估工作量(h),分配给,优先级,状态,分组,标签,创建日期,截止日期
feat-001,用户登录功能,实现用户登录、注册和密码重置功能,16,Alice,high,todo,认证,React;Node.js,2024-01-01,2024-01-15
feat-002,商品展示功能,展示商品列表、详情和搜索功能,20,Bob,medium,todo,电商,React;CSS,2024-01-01,2024-01-20`;

  await CSVHandler.writeFeatures(filePath, CSVHandler.parseCSV(template));
}

async function createMarkdownTemplate(filePath: string) {
  const template = `# 功能列表

# Feature: 用户登录功能
- **ID**: feat-001
- **描述**: 实现用户登录、注册和密码重置功能
- **预估工作量**: 16h
- **分配给**: Alice
- **优先级**: high
- **状态**: todo
- **分组**: 认证
- **标签**: React, Node.js
- **创建日期**: 2024-01-01
- **截止日期**: 2024-01-15

---

# Feature: 商品展示功能
- **ID**: feat-002
- **描述**: 展示商品列表、详情和搜索功能
- **预估工作量**: 20h
- **分配给**: Bob
- **优先级**: medium
- **状态**: todo
- **分组**: 电商
- **标签**: React, CSS
- **创建��期**: 2024-01-01
- **截止日期**: 2024-01-20`;

  await CSVHandler.writeFeatures(filePath, CSVHandler.parseMarkdown(template));
}

function displayFeaturesSummary(features: SimpleFeature[]) {
  console.log(chalk.blue('\n📋 功能概览\n'));

  // 基础统计
  const totalHours = features.reduce((sum, f) => sum + f.estimate, 0);
  const categories = new Set(features.map(f => f.category).filter(Boolean));
  const assignees = new Set(features.map(f => f.assignee));

  console.log(`总功能数: ${features.length}`);
  console.log(`总预估工时: ${totalHours}h`);
  console.log(`涉及领域: ${categories.size} 个`);
  console.log(`涉及人员: ${assignees.size} 个`);

  // 按分组显示
  console.log(chalk.yellow('\n按分组统计:'));
  const categoryStats = new Map<string, SimpleFeature[]>();
  features.forEach(f => {
    if (f.category) {
      if (!categoryStats.has(f.category)) {
        categoryStats.set(f.category, []);
      }
      categoryStats.get(f.category)!.push(f);
    }
  });

  for (const [category, categoryFeatures] of categoryStats) {
    const categoryHours = categoryFeatures.reduce((sum, f) => sum + f.estimate, 0);
    console.log(`${category}: ${categoryFeatures.length} 个功能, ${categoryHours}h`);
  }

  // 未分类的功能
  const uncategorized = features.filter(f => !f.category);
  if (uncategorized.length > 0) {
    const uncategorizedHours = uncategorized.reduce((sum, f) => sum + f.estimate, 0);
    console.log(`未分类: ${uncategorized.length} 个功能, ${uncategorizedHours}h`);
  }
}

async function generateAIPrompt(features: SimpleFeature[], inputFile: string) {
  const featuresData = features.map(f =>
    `${f.id},${f.name},${f.description},${f.estimate}h,${f.assignee},${f.priority},${f.status},${f.category || ''},${f.tags.join(';')},${f.createdDate || ''},${f.dueDate || ''}`
  ).join('\n');

  const prompt = `# PMSpec 项目结构生成

根据功能表自动生成完整的项目结构，包括 Epic 分组、User Stories、技术文档等。

## 功能表数据

${featuresData}

## 输出格式

请根据功能表生成以下内容：

### 1. Epic 分组
将相关功能分组为 Epic，每组功能形成一个 Epic 文件。

### 2. User Stories
为每个 Feature 生成详细的 User Stories。

### 3. 项目文档
- 项目概览
- 团队结构
- 时间线规划

## 生成指导原则

1. **Epic 分组原则**：
   - 按业务领域或功能模块分组
   - 每个 Epic 包含 2-5 个相关 Feature
   - Epic 名称要体现业务价值

2. **User Story 原则**：
   - 每个 Feature 生成 2-4 个 User Stories
   - Story 要体现用户价值
   - 估算工时要合理（1-8 小时）

3. **技术文档原则**：
   - 基于功能的技术要求生成技能列表
   - 考虑依赖关系和实施顺序
   - 提供清晰的验收标准

请按照以下格式输出：

\`\`\`markdown
## Epic 分组结果

### Epic: [Epic 名称]
- **包含功能**: [功能1, 功能2]
- **预估工时**: [总工时]h
- **业务价值**: [描述]

## 详细 User Stories

### [Feature 名称]
- **Epic**: [所属 Epic]
- **User Stories**:
  - STORY-XXX: As [用户], I want [功能] so that [价值] ([工时]h)
  - STORY-XXX: As [用户], I want [功能] so that [价值] ([工时]h)

## 技术分析

### 技能需求
- [技能1]: [需要的人数]
- [技能2]: [需要的人数]

### 实施建议
1. [实施步骤1]
2. [实施步骤2]
3. [实施步骤3]

### 风险提示
- [风险1]: [影响]
- [风险2]: [影响]
\`\`\``;

  console.log(chalk.yellow('\n🤖 AI 生成提示已准备'));
  console.log(chalk.cyan('─'.repeat(50)));
  console.log(chalk.blue('请在 Claude 中运行以下命令：'));
  console.log(chalk.cyan('/pmspec-generate'));
  console.log(chalk.cyan('然后将上面的提示内容粘贴到 Claude 中'));
  console.log(chalk.cyan('─'.repeat(50)));

  console.log(chalk.yellow('\n💡 提示：'));
  console.log(chalk.gray('1. 你可以将上面的提示内容保存到文件中'));
  console.log(chalk.gray('2. AI 生成完成后，可以手动或使用脚本创建文件'));
  console.log(chalk.gray('3. 建议先在小范围内测试生成的结构'));
}

async function generateProjectStructure(features: SimpleFeature[], outputDir: string) {
  // 简单的本地生成逻辑（不使用 AI）
  console.log(chalk.yellow('\n📝 本地生成模式（非 AI）'));

  // 这里可以实现简单的规则生成逻辑
  // 但主要还是推荐使用 AI 生成

  console.log(chalk.gray('提示：使用 --interactive 选项可以获得更好的 AI 生成结果'));
}

export { simpleCommand, generateCommand, listCommand, statsCommand };