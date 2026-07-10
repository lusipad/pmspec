import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWorkspace, loadWorkspace, writeEntity, Workspace } from './workspace.js';
import { assigneeStats, epicStats, overallStats, workItems } from './stats.js';

let base: string;

async function seed(): Promise<Workspace> {
  let ws = await loadWorkspace(base);
  await writeEntity(ws, 'epic', { id: 'EPIC-001', title: '认证' }, '');
  // 有 stories 的 feature：负载按 story 计，避免双重计数
  await writeEntity(
    ws,
    'feature',
    { id: 'FEAT-001', title: '登录', epic: 'EPIC-001', assignee: 'alice', estimate: 16 },
    ''
  );
  await writeEntity(
    ws,
    'story',
    { id: 'STORY-001', title: '输入凭证', feature: 'FEAT-001', estimate: 6, status: 'done' },
    ''
  );
  await writeEntity(
    ws,
    'story',
    { id: 'STORY-002', title: '错误提示', feature: 'FEAT-001', estimate: 4 },
    ''
  );
  // 无 stories 的 feature：按自身计
  await writeEntity(
    ws,
    'feature',
    { id: 'FEAT-002', title: '注册', epic: 'EPIC-001', assignee: 'bob', estimate: 30 },
    ''
  );
  await writeFile(
    path.join(base, 'pmspace', 'team.md'),
    `---
members:
  - name: alice
    skills: [react]
    capacity: 40
  - name: bob
    skills: [python]
    capacity: 20
---
`,
    'utf-8'
  );
  return loadWorkspace(base);
}

beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'pmspec-stats-'));
  await createWorkspace(base, { name: 'demo' });
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

describe('workItems', () => {
  it('有 story 的 feature 以 story 计量，assignee 继承', async () => {
    const items = workItems(await seed());
    const ids = items.map((item) => item.id).sort();
    expect(ids).toEqual(['FEAT-002', 'STORY-001', 'STORY-002']);
    const story = items.find((item) => item.id === 'STORY-001');
    expect(story?.assignee).toBe('alice');
    expect(story?.epic).toBe('EPIC-001');
  });
});

describe('overallStats', () => {
  it('工时加权进度', async () => {
    const overall = overallStats(await seed());
    // 估算 6+4+30=40，完成 6 → 15%
    expect(overall.hours.estimated).toBe(40);
    expect(overall.hours.doneEstimated).toBe(6);
    expect(overall.progressPct).toBe(15);
    expect(overall.items.done).toBe(1);
    expect(overall.items.total).toBe(3);
  });

  it('空工作区为 0', async () => {
    const overall = overallStats(await loadWorkspace(base));
    expect(overall.progressPct).toBe(0);
    expect(overall.items.total).toBe(0);
  });
});

describe('assigneeStats', () => {
  it('计算未完成负载、容量与超载标记', async () => {
    const rows = assigneeStats(await seed());
    const bob = rows.find((row) => row.name === 'bob');
    expect(bob?.openHours).toBe(30);
    expect(bob?.capacity).toBe(20);
    expect(bob?.overloaded).toBe(true);
    const alice = rows.find((row) => row.name === 'alice');
    expect(alice?.openHours).toBe(4); // STORY-002 未完成
    expect(alice?.doneItems).toBe(1);
    expect(alice?.overloaded).toBe(false);
    // 超载的排前面
    expect(rows[0].name).toBe('bob');
  });
});

describe('epicStats', () => {
  it('按 Epic 汇总 features 与工时', async () => {
    const rows = epicStats(await seed());
    expect(rows).toHaveLength(1);
    expect(rows[0].features).toBe(2);
    expect(rows[0].doneFeatures).toBe(0);
    expect(rows[0].estimated).toBe(40);
    expect(rows[0].progressPct).toBe(15);
  });
});
