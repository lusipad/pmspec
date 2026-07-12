import { Status } from './schema.js';
import { Workspace, storiesOfFeature } from './workspace.js';

/**
 * 进度与负载统计（对应 spec：cli-core / 进度与负载统计）。
 *
 * 工时口径：
 * - 无 Story 的 Feature 以自身为计量单元
 * - 有 Story 的 Feature 以其 Story 为计量单元（负责人缺省继承 Feature），
 *   避免 Feature 与 Story 估算双重计数
 * - Feature 估算超出其 Story 估算之和的部分计为"剩余工作量"条目
 *   （kind: 'feature-remainder'，随 Feature 自身状态计），保证部分拆解
 *   时总量不跳变——否则给 100h 的 Feature 拆出第一个 2h Story 会让
 *   总估算从 100 骤降为 2
 */

export interface WorkItem {
  id: string;
  kind: 'feature' | 'story' | 'feature-remainder';
  epic?: string;
  assignee?: string;
  status: Status;
  estimate?: number;
  actual?: number;
}

export function workItems(ws: Workspace): WorkItem[] {
  const items: WorkItem[] = [];
  for (const f of ws.features) {
    const stories = storiesOfFeature(ws, f.entity.id);
    if (stories.length === 0) {
      items.push({
        id: f.entity.id,
        kind: 'feature',
        epic: f.entity.epic,
        assignee: f.entity.assignee,
        status: f.entity.status,
        estimate: f.entity.estimate,
        actual: f.entity.actual,
      });
      continue;
    }
    let storyEstimateSum = 0;
    for (const s of stories) {
      storyEstimateSum += s.entity.estimate ?? 0;
      items.push({
        id: s.entity.id,
        kind: 'story',
        epic: f.entity.epic,
        assignee: s.entity.assignee ?? f.entity.assignee,
        status: s.entity.status,
        estimate: s.entity.estimate,
        actual: s.entity.actual,
      });
    }
    // actual 记在 feature 上时仍然要计入（story 上的 actual 各自计）
    const remainder = (f.entity.estimate ?? 0) - storyEstimateSum;
    if (remainder > 0 || (f.entity.actual ?? 0) > 0) {
      items.push({
        id: f.entity.id,
        kind: 'feature-remainder',
        epic: f.entity.epic,
        assignee: f.entity.assignee,
        status: f.entity.status,
        estimate: remainder > 0 ? remainder : undefined,
        actual: f.entity.actual,
      });
    }
  }
  return items;
}

export interface StatusBreakdown {
  todo: number;
  'in-progress': number;
  done: number;
  blocked: number;
}

const emptyBreakdown = (): StatusBreakdown => ({
  todo: 0,
  'in-progress': 0,
  done: 0,
  blocked: 0,
});

export interface OverallStats {
  entities: { epics: number; features: number; stories: number };
  items: StatusBreakdown & { total: number };
  hours: { estimated: number; doneEstimated: number; actual: number };
  /** 0-100；有估算时按工时加权，否则按条目数 */
  progressPct: number;
}

export function overallStats(ws: Workspace): OverallStats {
  const items = workItems(ws);
  const breakdown = emptyBreakdown();
  let countable = 0;
  let estimated = 0;
  let doneEstimated = 0;
  let actual = 0;
  for (const item of items) {
    // remainder 是 feature 的未拆解切片：计工时，不虚增条目数
    if (item.kind !== 'feature-remainder') {
      breakdown[item.status] += 1;
      countable += 1;
    }
    estimated += item.estimate ?? 0;
    actual += item.actual ?? 0;
    if (item.status === 'done') doneEstimated += item.estimate ?? 0;
  }
  const progressPct =
    estimated > 0
      ? Math.round((doneEstimated / estimated) * 100)
      : countable > 0
        ? Math.round((breakdown.done / countable) * 100)
        : 0;
  return {
    entities: {
      epics: ws.epics.length,
      features: ws.features.length,
      stories: ws.stories.length,
    },
    items: { ...breakdown, total: countable },
    hours: { estimated, doneEstimated, actual },
    progressPct,
  };
}

export interface AssigneeStats {
  name: string;
  /** 未完成条目的估算工时之和 */
  openHours: number;
  openItems: number;
  doneItems: number;
  /** 每周容量（来自 team.md，可能缺省） */
  capacity?: number;
  /** openHours / capacity；>1 表示按周容量已排满 */
  utilization?: number;
  overloaded: boolean;
}

export function assigneeStats(ws: Workspace): AssigneeStats[] {
  const byName = new Map<string, AssigneeStats>();
  const ensure = (name: string): AssigneeStats => {
    const key = name.toLowerCase();
    let stats = byName.get(key);
    if (!stats) {
      stats = { name, openHours: 0, openItems: 0, doneItems: 0, overloaded: false };
      byName.set(key, stats);
    }
    return stats;
  };

  for (const member of ws.team?.data.members ?? []) {
    const stats = ensure(member.name);
    stats.capacity = member.capacity;
  }

  for (const item of workItems(ws)) {
    if (!item.assignee) continue;
    const stats = ensure(item.assignee);
    const countable = item.kind !== 'feature-remainder';
    if (item.status === 'done') {
      if (countable) stats.doneItems += 1;
    } else {
      if (countable) stats.openItems += 1;
      stats.openHours += item.estimate ?? 0;
    }
  }

  for (const stats of byName.values()) {
    if (stats.capacity && stats.capacity > 0) {
      stats.utilization = Number((stats.openHours / stats.capacity).toFixed(2));
      stats.overloaded = stats.openHours > stats.capacity;
    }
  }

  return [...byName.values()].sort((a, b) => b.openHours - a.openHours);
}

export interface EpicStats {
  id: string;
  title: string;
  status: Status;
  features: number;
  doneFeatures: number;
  estimated: number;
  doneEstimated: number;
  progressPct: number;
}

export function epicStats(ws: Workspace): EpicStats[] {
  const items = workItems(ws);
  return ws.epics.map((e) => {
    const features = ws.features.filter((f) => f.entity.epic === e.entity.id);
    const doneFeatures = features.filter((f) => f.entity.status === 'done').length;
    const epicItems = items.filter((item) => item.epic === e.entity.id);
    const estimated = epicItems.reduce((sum, item) => sum + (item.estimate ?? 0), 0);
    const doneEstimated = epicItems
      .filter((item) => item.status === 'done')
      .reduce((sum, item) => sum + (item.estimate ?? 0), 0);
    const progressPct =
      estimated > 0
        ? Math.round((doneEstimated / estimated) * 100)
        : features.length > 0
          ? Math.round((doneFeatures / features.length) * 100)
          : 0;
    return {
      id: e.entity.id,
      title: e.entity.title,
      status: e.entity.status,
      features: features.length,
      doneFeatures,
      estimated,
      doneEstimated,
      progressPct,
    };
  });
}
