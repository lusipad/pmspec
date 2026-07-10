import chalk from 'chalk';
import { Workspace, loadWorkspace } from '../core/workspace.js';

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function fail(message: string): never {
  console.error(chalk.red('✗ ') + message);
  process.exit(1);
}

export function ok(message: string): void {
  console.log(chalk.green('✓ ') + message);
}

export function warn(message: string): void {
  console.log(chalk.yellow('⚠ ') + message);
}

/** 加载工作区，找不到时以友好错误退出 */
export async function requireWorkspace(): Promise<Workspace> {
  try {
    return await loadWorkspace();
  } catch (error) {
    return fail((error as Error).message);
  }
}
