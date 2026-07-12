import { Command } from 'commander';
import chalk from 'chalk';
import { searchWorkspace } from '../core/search.js';
import { printJson, requireWorkspace } from '../cli/output.js';

export const searchCommand = new Command('search')
  .description('全文检索标题与正文')
  .argument('<query>', '检索词')
  .option('--json', '以 JSON 输出')
  .action(async (query: string, options: { json?: boolean }) => {
    const ws = await requireWorkspace();
    const hits = searchWorkspace(ws, query);
    if (options.json) {
      printJson(hits);
      return;
    }
    if (hits.length === 0) {
      console.log(`没有匹配 "${query}" 的结果`);
      return;
    }
    for (const hit of hits) {
      console.log(
        `${chalk.bold(hit.id)} [${hit.kind}] ${hit.title} ${chalk.dim(`(score ${hit.score})`)}`
      );
      if (hit.snippet) console.log(`  ${chalk.dim(hit.snippet)}`);
    }
  });
