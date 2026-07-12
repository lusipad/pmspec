import { Command } from 'commander';
import path from 'path';
import { createWorkspace, WORKSPACE_DIR } from '../core/workspace.js';
import { fail, ok, printJson } from '../cli/output.js';

export const initCommand = new Command('init')
  .description(`初始化 ${WORKSPACE_DIR}/ 工作区`)
  .option('--name <name>', '项目名称（默认取当前目录名）')
  .option('--minimal', '极简模式：只创建 features/，不建 epics/stories/team')
  .option('--force', '覆盖已存在的工作区文件')
  .option('--json', '以 JSON 输出结果')
  .action(async (options: { name?: string; minimal?: boolean; force?: boolean; json?: boolean }) => {
    try {
      const created = await createWorkspace(process.cwd(), options);
      if (options.json) {
        printJson({ created: created.map((p) => path.relative(process.cwd(), p)) });
        return;
      }
      ok(`已初始化 ${WORKSPACE_DIR}/ 工作区:`);
      for (const item of created) {
        console.log(`  ${path.relative(process.cwd(), item)}`);
      }
      console.log('\n下一步: pmspec add epic --title "你的第一个 Epic"');
    } catch (error) {
      fail((error as Error).message);
    }
  });
