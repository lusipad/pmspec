import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { Epic, Feature, Story } from '../core/schema.js';
import {
  featuresOfEpic,
  findById,
  storiesOfFeature,
} from '../core/workspace.js';
import { fail, printJson, requireWorkspace } from '../cli/output.js';

function progressLine(done: number, total: number): string {
  if (total === 0) return '无子项';
  const pct = Math.round((done / total) * 100);
  return `${done}/${total} 完成 (${pct}%)`;
}

export const showCommand = new Command('show')
  .description('查看实体详情与子项进度')
  .argument('<id>', 'EPIC-xxx | FEAT-xxx | STORY-xxx')
  .option('--json', '以 JSON 输出')
  .action(async (idArg: string, options: { json?: boolean }) => {
    const ws = await requireWorkspace();
    const found = findById(ws, idArg);
    if (!found) fail(`找不到实体 ${idArg.toUpperCase()}`);
    const { kind, loaded } = found;
    const entity = loaded.entity;

    let children: Array<Epic | Feature | Story> = [];
    if (kind === 'epic') {
      children = featuresOfEpic(ws, entity.id).map((f) => f.entity);
    } else if (kind === 'feature') {
      children = storiesOfFeature(ws, entity.id).map((s) => s.entity);
    }
    const doneChildren = children.filter((c) => c.status === 'done').length;

    if (options.json) {
      const { body, ...frontmatter } = entity;
      printJson({
        kind,
        ...frontmatter,
        body,
        file: path.relative(ws.root, loaded.file),
        children: children.map(({ body: _body, ...rest }) => rest),
        progress:
          children.length > 0
            ? { done: doneChildren, total: children.length }
            : undefined,
      });
      return;
    }

    console.log(chalk.bold(`\n${entity.id}: ${entity.title}`));
    console.log(chalk.dim(path.relative(process.cwd(), loaded.file)));
    const { body, id: _id, title: _title, ...fields } = entity;
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || (Array.isArray(value) && value.length === 0)) continue;
      console.log(`  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
    }
    if (children.length > 0) {
      console.log(chalk.bold(`\n子项 ${progressLine(doneChildren, children.length)}`));
      for (const child of children) {
        const mark = child.status === 'done' ? chalk.green('✓') : chalk.gray('·');
        console.log(`  ${mark} ${child.id} [${child.status}] ${child.title}`);
      }
    }
    if (body) {
      console.log(chalk.bold('\n描述'));
      console.log(body);
    }
    console.log();
  });
