import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { assigneeStats, epicStats, overallStats } from '../core/stats.js';
import { printJson, requireWorkspace } from '../cli/output.js';

interface StatsOptions {
  byAssignee?: boolean;
  byEpic?: boolean;
  json?: boolean;
}

export const statsCommand = new Command('stats')
  .description('进度与负载统计')
  .option('--by-assignee', '按负责人显示负载（未完成估算 vs 每周容量）')
  .option('--by-epic', '按 Epic 显示进度汇总')
  .option('--json', '以 JSON 输出')
  .action(async (options: StatsOptions) => {
    const ws = await requireWorkspace();
    const showAll = !options.byAssignee && !options.byEpic;

    if (options.json) {
      printJson({
        overall: showAll ? overallStats(ws) : undefined,
        byAssignee: options.byAssignee || showAll ? assigneeStats(ws) : undefined,
        byEpic: options.byEpic || showAll ? epicStats(ws) : undefined,
      });
      return;
    }

    if (showAll || (!options.byAssignee && !options.byEpic)) {
      const overall = overallStats(ws);
      console.log(chalk.bold('\n总体进度'));
      console.log(
        `  实体: ${overall.entities.epics} epics / ${overall.entities.features} features / ${overall.entities.stories} stories`
      );
      console.log(
        `  条目: todo ${overall.items.todo} · in-progress ${overall.items['in-progress']} · done ${overall.items.done} · blocked ${overall.items.blocked}`
      );
      console.log(
        `  工时: 估算 ${overall.hours.estimated}h，已完成估算 ${overall.hours.doneEstimated}h，实际记录 ${overall.hours.actual}h`
      );
      console.log(`  进度: ${overall.progressPct}%`);
    }

    if (options.byAssignee || showAll) {
      const rows = assigneeStats(ws);
      console.log(chalk.bold('\n按负责人负载（未完成估算工时 vs 每周容量）'));
      if (rows.length === 0) {
        console.log('  （无已分配条目，team.md 也没有成员）');
      } else {
        const table = new Table({
          head: ['负责人', '未完成(h)', '未完成条目', '已完成条目', '容量(h/周)', '利用率'],
        });
        for (const row of rows) {
          const utilization =
            row.utilization === undefined
              ? '-'
              : `${Math.round(row.utilization * 100)}%`;
          table.push([
            row.overloaded ? chalk.red(`${row.name} ⚠`) : row.name,
            row.openHours,
            row.openItems,
            row.doneItems,
            row.capacity ?? '-',
            row.overloaded ? chalk.red(utilization) : utilization,
          ]);
        }
        console.log(table.toString());
      }
    }

    if (options.byEpic || showAll) {
      const rows = epicStats(ws);
      console.log(chalk.bold('\n按 Epic 进度'));
      if (rows.length === 0) {
        console.log('  （无 Epic）');
      } else {
        const table = new Table({
          head: ['Epic', '标题', '状态', 'Features(完成/总数)', '估算(h)', '进度'],
        });
        for (const row of rows) {
          table.push([
            row.id,
            row.title,
            row.status,
            `${row.doneFeatures}/${row.features}`,
            row.estimated,
            `${row.progressPct}%`,
          ]);
        }
        console.log(table.toString());
      }
    }
    console.log();
  });
