#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

// Import legacy commands for compatibility
import { initCommand } from '../commands/init.js';
import { listCommand } from '../commands/list.js';
import { showCommand } from '../commands/show.js';
import { validateCommand } from '../commands/validate.js';
import { createCommand } from '../commands/create.js';
import { updateCommand } from '../commands/update.js';
import { breakdownCommand } from '../commands/breakdown.js';
import { analyzeCommand } from '../commands/analyze.js';

export const legacyCommands = new Command('legacy')
  .description('传统命令兼容模式 - 使用完整功能')
  .description('所有原始命令的兼容版本，支持完整的项目管理功能')
  .version('0.1.0');

// Add all legacy commands
legacyCommands.addCommand(initCommand);
legacyCommands.addCommand(listCommand);
legacyCommands.addCommand(showCommand);
legacyCommands.addCommand(validateCommand);
legacyCommands.addCommand(createCommand);
legacyCommands.addCommand(updateCommand);
legacyCommands.addCommand(breakdownCommand);
legacyCommands.addCommand(analyzeCommand);

// Error handling
legacyCommands.exitOverride();
