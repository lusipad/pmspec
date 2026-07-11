import { Command } from 'commander';
import { writeFile } from 'fs/promises';
import { fail, ok, requireWorkspace } from '../cli/output.js';

function csvEscape(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export const exportCommand = new Command('export')
  .description('导出工作区数据（JSON 或 Feature 表 CSV）')
  .option('--format <format>', 'json | csv（默认 json）', 'json')
  .option('--json', '等同于 --format json（与其他命令保持一致）')
  .option('--out <file>', '输出到文件（默认打印到 stdout）')
  .action(async (options: { format: string; json?: boolean; out?: string }) => {
    if (options.json) options.format = 'json';
    const ws = await requireWorkspace();
    let output: string;

    if (options.format === 'json') {
      output = JSON.stringify(
        {
          project: ws.project?.data ?? null,
          team: ws.team?.data ?? { members: [] },
          epics: ws.epics.map((e) => e.entity),
          features: ws.features.map((f) => f.entity),
          stories: ws.stories.map((s) => s.entity),
        },
        null,
        2
      );
    } else if (options.format === 'csv') {
      const header = [
        'ID',
        'Title',
        'Epic',
        'Status',
        'Assignee',
        'Priority',
        'Estimate(h)',
        'Actual(h)',
        'Skills',
        'Tags',
      ];
      const lines = [header.join(',')];
      for (const { entity: f } of ws.features) {
        lines.push(
          [
            f.id,
            f.title,
            f.epic ?? '',
            f.status,
            f.assignee ?? '',
            f.priority,
            f.estimate ?? '',
            f.actual ?? '',
            f.skills.join(';'),
            f.tags.join(';'),
          ]
            .map(csvEscape)
            .join(',')
        );
      }
      output = lines.join('\n') + '\n';
    } else {
      return fail(`未知格式 "${options.format}"，可选: json | csv`);
    }

    if (options.out) {
      await writeFile(options.out, output, 'utf-8');
      ok(`已导出到 ${options.out}`);
    } else {
      console.log(output);
    }
  });
