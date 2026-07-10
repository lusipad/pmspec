import { Command } from 'commander';
import chalk from 'chalk';
import { validateWorkspace } from '../core/validate.js';
import { ok, printJson, requireWorkspace } from '../cli/output.js';

export const validateCommand = new Command('validate')
  .description('校验工作区数据完整性（错误时以非零退出码结束）')
  .option('--json', '以 JSON 输出校验结果')
  .action(async (options: { json?: boolean }) => {
    const ws = await requireWorkspace();
    const result = validateWorkspace(ws);

    if (options.json) {
      printJson(result);
      if (result.errors.length > 0) process.exit(1);
      return;
    }

    for (const issue of result.errors) {
      const where = issue.file ? chalk.dim(` (${issue.file})`) : '';
      console.log(`${chalk.red('✗')} [${issue.code}] ${issue.message}${where}`);
    }
    for (const issue of result.warnings) {
      const where = issue.file ? chalk.dim(` (${issue.file})`) : '';
      console.log(`${chalk.yellow('⚠')} [${issue.code}] ${issue.message}${where}`);
    }

    if (result.errors.length > 0) {
      console.log(
        chalk.red(`\n${result.errors.length} 个错误`) +
          (result.warnings.length > 0 ? chalk.yellow(`，${result.warnings.length} 个警告`) : '')
      );
      process.exit(1);
    }
    if (result.warnings.length > 0) {
      console.log(chalk.yellow(`\n${result.warnings.length} 个警告，无错误`));
      return;
    }
    ok('校验通过，无错误无警告');
  });
