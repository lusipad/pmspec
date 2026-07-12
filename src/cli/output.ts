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
    const ws = await loadWorkspace();
    // 解析失败的实体不能无声消失：提示到 stderr（不污染 --json 的 stdout）
    if (ws.issues.length > 0) {
      console.error(
        chalk.yellow(
          `⚠ ${ws.issues.length} 个文件解析失败，已从本次结果中排除（运行 pmspec validate 查看详情）`
        )
      );
    }
    return ws;
  } catch (error) {
    return fail((error as Error).message);
  }
}
