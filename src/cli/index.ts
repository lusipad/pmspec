#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

import { initCommand } from '../commands/init.js';
import { addCommand } from '../commands/add.js';
import { listCommand } from '../commands/list.js';
import { showCommand } from '../commands/show.js';
import { updateCommand } from '../commands/update.js';
import { validateCommand } from '../commands/validate.js';
import { statsCommand } from '../commands/stats.js';
import { importCommand } from '../commands/import.js';
import { exportCommand } from '../commands/export.js';
import { searchCommand } from '../commands/search.js';

export const VERSION = '2.0.0';

const program = new Command();

program
  .name('pmspec')
  .description(
    'AI 原生的轻量项目管理：数据是 git 仓库里的 Markdown，AI agent 与人共同维护'
  )
  .version(VERSION);

program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(updateCommand);
program.addCommand(validateCommand);
program.addCommand(statsCommand);
program.addCommand(importCommand);
program.addCommand(exportCommand);
program.addCommand(searchCommand);

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const err = error as { code?: string; message?: string };
  if (
    err.code !== 'commander.help' &&
    err.code !== 'commander.version' &&
    err.code !== 'commander.helpDisplayed'
  ) {
    console.error(chalk.red('Error:'), err.message ?? String(error));
    process.exit(1);
  }
}
