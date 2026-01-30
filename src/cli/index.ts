#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

// Import only simple mode commands
import { simpleCommand, generateCommand as simpleGenerateCommand, listCommand as simpleListCommand, statsCommand } from '../commands/simple.js';
import { serveCommand } from '../commands/serve.js';
import { historyCommand } from '../commands/history.js';
import { searchCommand } from '../commands/search.js';
import { importCommand } from '../commands/import.js';

const program = new Command();

program
  .name('pmspec')
  .description('简化的项目管理工具 - 只需维护一个功能表')
  .version('1.0.0');

// Add simple commands to main program
program.addCommand(simpleCommand);
simpleCommand.addCommand(simpleGenerateCommand);
simpleCommand.addCommand(simpleListCommand);
simpleCommand.addCommand(statsCommand);

// Add serve command (Web UI)
program.addCommand(serveCommand);

// Add history command (changelog)
program.addCommand(historyCommand);

// Add search command
program.addCommand(searchCommand);

// Add import command
program.addCommand(importCommand);

// Error handling
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error: any) {
  if (error.code !== 'commander.help' && error.code !== 'commander.version') {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}