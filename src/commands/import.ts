import { Command } from 'commander';
import chalk from 'chalk';
import {
  getImporter,
  getAllImporters,
  isValidSource,
  type ImportSource,
  type ImportResult,
} from '../core/importers.js';

const importCommand = new Command('import')
  .description('从外部工具导入功能数据')
  .argument('<source>', '导入源: jira, linear, github')
  .option('--file <path>', '导入文件路径')
  .option('--output <file>', '输出文件路径', 'features.csv')
  .option('--dry-run', '预览导入结果，不实际写入文件')
  .option('--merge', '合并到现有项目而不是覆盖')
  .action(async (source: string, options) => {
    try {
      // Validate source
      if (!isValidSource(source)) {
        const availableSources = getAllImporters().map(i => i.source).join(', ');
        console.error(chalk.red(`错误: 不支持的导入源 "${source}"`));
        console.error(chalk.yellow(`可用的导入源: ${availableSources}`));
        process.exit(1);
      }

      // Validate file option
      if (!options.file) {
        console.error(chalk.red('错误: 必须指定 --file 参数'));
        process.exit(1);
      }

      const importer = getImporter(source as ImportSource);
      console.log(chalk.blue(`\n📥 ${importer.name}`));
      console.log(chalk.gray(`${importer.description}\n`));

      // Perform import
      const result = await importer.import({
        file: options.file,
        dryRun: options.dryRun || false,
        merge: options.merge || false,
        outputFile: options.output,
      });

      // Display results
      displayImportResult(result, options.dryRun);

    } catch (error: any) {
      console.error(chalk.red('导入失败:'), error.message);
      process.exit(1);
    }
  });

// Jira subcommand
const jiraCommand = new Command('jira')
  .description('从 Jira JSON 导出文件导入')
  .option('--file <path>', 'Jira 导出文件路径 (必需)')
  .option('--output <file>', '输出文件路径', 'features.csv')
  .option('--dry-run', '预览导入结果')
  .option('--merge', '合并到现有项目')
  .action(async (options) => {
    await runImport('jira', options);
  });

// Linear subcommand
const linearCommand = new Command('linear')
  .description('从 Linear JSON 导出文件导入')
  .option('--file <path>', 'Linear 导出文件路径 (必需)')
  .option('--output <file>', '输出文件路径', 'features.csv')
  .option('--dry-run', '预览导入结果')
  .option('--merge', '合并到现有项目')
  .action(async (options) => {
    await runImport('linear', options);
  });

// GitHub subcommand
const githubCommand = new Command('github')
  .description('从 GitHub Issues JSON 文件导入')
  .option('--file <path>', 'GitHub 导出文件路径 (必需)')
  .option('--output <file>', '输出文件路径', 'features.csv')
  .option('--dry-run', '预览导入结果')
  .option('--merge', '合并到现有项目')
  .action(async (options) => {
    await runImport('github', options);
  });

// Add subcommands
importCommand.addCommand(jiraCommand);
importCommand.addCommand(linearCommand);
importCommand.addCommand(githubCommand);

async function runImport(source: ImportSource, options: any) {
  try {
    if (!options.file) {
      console.error(chalk.red('错误: 必须指定 --file 参数'));
      process.exit(1);
    }

    const importer = getImporter(source);
    console.log(chalk.blue(`\n📥 ${importer.name}`));
    console.log(chalk.gray(`${importer.description}\n`));

    const result = await importer.import({
      file: options.file,
      dryRun: options.dryRun || false,
      merge: options.merge || false,
      outputFile: options.output,
    });

    displayImportResult(result, options.dryRun);

  } catch (error: any) {
    console.error(chalk.red('导入失败:'), error.message);
    process.exit(1);
  }
}

function displayImportResult(result: ImportResult, dryRun: boolean) {
  const { stats, errors, warnings, features, epics, milestones } = result;

  // Header
  if (dryRun) {
    console.log(chalk.yellow('🔍 预览模式 - 不会写入任何文件\n'));
  }

  // Statistics
  console.log(chalk.blue.bold('📊 导入统计'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`总项目数:       ${stats.totalItems}`);
  console.log(`导入功能:       ${chalk.green(stats.featuresImported)}`);
  console.log(`导入 Epic:      ${chalk.cyan(stats.epicsImported)}`);
  console.log(`导入 Milestone: ${chalk.cyan(stats.milestonesImported)}`);
  console.log(`跳过:           ${stats.skipped}`);
  console.log(`错误:           ${stats.errors > 0 ? chalk.red(stats.errors) : stats.errors}`);
  console.log(chalk.gray('─'.repeat(40)));

  // Epics summary
  if (epics.length > 0) {
    console.log(chalk.cyan.bold('\n📁 Epic/分类'));
    for (const epic of epics) {
      console.log(`  • ${epic.name} ${chalk.gray(`(${epic.originalId})`)}`);
    }
  }

  // Milestones summary
  if (milestones.length > 0) {
    console.log(chalk.cyan.bold('\n🎯 Milestones'));
    for (const milestone of milestones) {
      const dueInfo = milestone.dueDate ? chalk.gray(` 截止: ${milestone.dueDate}`) : '';
      console.log(`  • ${milestone.name}${dueInfo}`);
    }
  }

  // Features preview (first 5)
  if (features.length > 0) {
    console.log(chalk.green.bold('\n✨ 功能预览 (前5项)'));
    const previewFeatures = features.slice(0, 5);
    for (const feature of previewFeatures) {
      const priorityColor = getPriorityColor(feature.priority);
      const statusColor = getStatusColor(feature.status);
      console.log(`  ${chalk.gray(feature.id)} ${feature.name}`);
      console.log(`    ${priorityColor(feature.priority)} | ${statusColor(feature.status)} | ${feature.assignee} | ${feature.estimate}h`);
      if (feature.category) {
        console.log(`    ${chalk.gray('分类:')} ${feature.category}`);
      }
    }
    if (features.length > 5) {
      console.log(chalk.gray(`  ... 还有 ${features.length - 5} 个功能`));
    }
  }

  // Errors
  if (errors.length > 0) {
    console.log(chalk.red.bold('\n❌ 错误'));
    for (const error of errors) {
      const location = error.field ? `[${error.field}] ` : '';
      console.log(`  • ${location}${error.message}`);
    }
  }

  // Warnings
  if (warnings.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️ 警告'));
    for (const warning of warnings) {
      const location = warning.field ? `[${warning.field}] ` : '';
      console.log(`  • ${location}${warning.message}`);
    }
  }

  // Final status
  console.log();
  if (result.success) {
    if (dryRun) {
      console.log(chalk.green('✓ 预览完成 - 移除 --dry-run 以执行实际导入'));
    } else {
      console.log(chalk.green(`✓ 导入成功 - 已保存到 features.csv`));
    }
  } else {
    console.log(chalk.red('✗ 导入存在错误，请检查并修复'));
  }
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

export { importCommand };
