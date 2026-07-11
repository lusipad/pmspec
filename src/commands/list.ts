import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Status } from '../core/schema.js';
import { Workspace } from '../core/workspace.js';
import { fail, printJson, requireWorkspace } from '../cli/output.js';

interface ListOptions {
  status?: string;
  assignee?: string;
  epic?: string;
  json?: boolean;
}

const STATUS_COLORS: Record<Status, (text: string) => string> = {
  todo: chalk.gray,
  'in-progress': chalk.blue,
  done: chalk.green,
  blocked: chalk.red,
};

function colorStatus(status: Status): string {
  return STATUS_COLORS[status](status);
}

function filterRows<T extends { status: Status; assignee?: string; epic?: string }>(
  rows: T[],
  options: ListOptions
): T[] {
  return rows.filter((row) => {
    if (options.status && row.status !== options.status) return false;
    if (
      options.assignee &&
      row.assignee?.toLowerCase() !== options.assignee.toLowerCase()
    )
      return false;
    if (options.epic && row.epic !== options.epic.toUpperCase()) return false;
    return true;
  });
}

function listEpics(ws: Workspace, options: ListOptions): void {
  // Epic 没有 assignee 字段，--assignee 按 owner 匹配
  const rows = filterRows(
    ws.epics.map((e) => ({ ...e.entity, assignee: e.entity.owner })),
    options
  ).map(({ assignee: _assignee, ...rest }) => rest);
  if (options.json) return printJson(rows.map(({ body: _body, ...rest }) => rest));
  if (rows.length === 0) return console.log('（无 Epic）');
  const table = new Table({ head: ['ID', '标题', '状态', 'Owner', '估算(h)'] });
  for (const e of rows) {
    table.push([e.id, e.title, colorStatus(e.status), e.owner ?? '-', e.estimate ?? '-']);
  }
  console.log(table.toString());
}

function listFeatures(ws: Workspace, options: ListOptions): void {
  const rows = filterRows(
    ws.features.map((f) => ({ ...f.entity })),
    options
  );
  if (options.json) return printJson(rows.map(({ body: _body, ...rest }) => rest));
  if (rows.length === 0) return console.log('（无 Feature）');
  const table = new Table({
    head: ['ID', '标题', 'Epic', '状态', '负责人', '优先级', '估算(h)'],
  });
  for (const f of rows) {
    table.push([
      f.id,
      f.title,
      f.epic ?? '-',
      colorStatus(f.status),
      f.assignee ?? '-',
      f.priority,
      f.estimate ?? '-',
    ]);
  }
  console.log(table.toString());
}

function listStories(ws: Workspace, options: ListOptions): void {
  const featureEpic = new Map(ws.features.map((f) => [f.entity.id, f.entity.epic]));
  const rows = filterRows(
    ws.stories.map((s) => ({ ...s.entity, epic: featureEpic.get(s.entity.feature) })),
    options
  );
  if (options.json) return printJson(rows.map(({ body: _body, ...rest }) => rest));
  if (rows.length === 0) return console.log('（无 Story）');
  const table = new Table({ head: ['ID', '标题', 'Feature', '状态', '负责人', '估算(h)'] });
  for (const s of rows) {
    table.push([
      s.id,
      s.title,
      s.feature,
      colorStatus(s.status),
      s.assignee ?? '-',
      s.estimate ?? '-',
    ]);
  }
  console.log(table.toString());
}

export const listCommand = new Command('list')
  .description('列出 Epics / Features / Stories')
  .argument('[kind]', 'epics | features | stories | all（默认 all）', 'all')
  .option('--status <status>', '按状态过滤: todo | in-progress | done | blocked')
  .option('--assignee <name>', '按负责人过滤')
  .option('--epic <id>', '按所属 Epic 过滤')
  .option('--json', '以 JSON 输出')
  .action(async (kindArg: string, options: ListOptions) => {
    if (options.status) {
      options.status = options.status.toLowerCase();
      const valid = ['todo', 'in-progress', 'done', 'blocked'];
      if (!valid.includes(options.status)) {
        fail(`非法状态 "${options.status}"，可选: ${valid.join(' | ')}`);
      }
    }
    const ws = await requireWorkspace();
    const kind = kindArg.toLowerCase();
    switch (kind) {
      case 'epic':
      case 'epics':
        return listEpics(ws, options);
      case 'feature':
      case 'features':
        return listFeatures(ws, options);
      case 'story':
      case 'stories':
        return listStories(ws, options);
      case 'all': {
        if (options.json) {
          // 与表格输出同样应用过滤器
          const featureEpic = new Map(
            ws.features.map((f) => [f.entity.id, f.entity.epic])
          );
          const strip = <T extends { body?: string; assignee?: string }>(rows: T[]) =>
            rows.map(({ body: _body, ...rest }) => rest);
          return printJson({
            epics: strip(
              filterRows(
                ws.epics.map((e) => ({ ...e.entity, assignee: e.entity.owner })),
                options
              ).map(({ assignee: _assignee, ...rest }) => rest)
            ),
            features: strip(filterRows(ws.features.map((f) => ({ ...f.entity })), options)),
            stories: strip(
              filterRows(
                ws.stories.map((s) => ({
                  ...s.entity,
                  epic: featureEpic.get(s.entity.feature),
                })),
                options
              )
            ),
          });
        }
        console.log(chalk.bold('\nEpics'));
        listEpics(ws, options);
        console.log(chalk.bold('\nFeatures'));
        listFeatures(ws, options);
        console.log(chalk.bold('\nStories'));
        listStories(ws, options);
        return;
      }
      default:
        fail(`未知类型 "${kindArg}"，可选: epics | features | stories | all`);
    }
  });
