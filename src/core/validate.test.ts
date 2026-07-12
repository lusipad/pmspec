import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWorkspace, loadWorkspace, writeEntity } from './workspace.js';
import { validateWorkspace } from './validate.js';

let base: string;

beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'pmspec-validate-'));
  await createWorkspace(base, { name: 'demo' });
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

const codes = (issues: Array<{ code: string }>) => issues.map((issue) => issue.code);

describe('validateWorkspace', () => {
  it('init 后立即通过（无错误无警告）', async () => {
    const result = validateWorkspace(await loadWorkspace(base));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('引用悬空是 error', async () => {
    let ws = await loadWorkspace(base);
    await writeEntity(ws, 'feature', { id: 'FEAT-002', title: 'x', epic: 'EPIC-999' }, '');
    await writeEntity(ws, 'story', { id: 'STORY-001', title: 'y', feature: 'FEAT-777' }, '');
    ws = await loadWorkspace(base);
    const result = validateWorkspace(ws);
    expect(codes(result.errors)).toContain('missing-epic');
    expect(codes(result.errors)).toContain('missing-feature');
    expect(result.errors.find((e) => e.code === 'missing-epic')?.message).toContain(
      'EPIC-999'
    );
  });

  it('重复 ID 是 error（不同目录文件名规避不了）', async () => {
    let ws = await loadWorkspace(base);
    await writeEntity(ws, 'epic', { id: 'EPIC-001', title: 'a' }, '');
    // 手工制造同 ID 的第二个文件
    await writeFile(
      path.join(base, 'pmspace', 'epics', 'EPIC-001-copy.md'),
      `---\nid: EPIC-001\ntitle: b\n---\n`,
      'utf-8'
    );
    ws = await loadWorkspace(base);
    const result = validateWorkspace(ws);
    expect(codes(result.errors)).toContain('duplicate-id');
    expect(codes(result.warnings)).toContain('filename-mismatch');
  });

  it('技能缺口与未知负责人是 warning（仅当 team 有成员）', async () => {
    await writeFile(
      path.join(base, 'pmspace', 'team.md'),
      `---\nmembers:\n  - name: alice\n    skills: [react]\n    capacity: 40\n---\n`,
      'utf-8'
    );
    let ws = await loadWorkspace(base);
    await writeEntity(
      ws,
      'feature',
      { id: 'FEAT-001', title: 'x', skills: ['rust'], assignee: 'mallory' },
      ''
    );
    ws = await loadWorkspace(base);
    const result = validateWorkspace(ws);
    expect(result.errors).toEqual([]);
    expect(codes(result.warnings)).toContain('unknown-skill');
    expect(codes(result.warnings)).toContain('unknown-assignee');
  });

  it('team 为空时不产生团队相关警告', async () => {
    let ws = await loadWorkspace(base);
    await writeEntity(
      ws,
      'feature',
      { id: 'FEAT-001', title: 'x', skills: ['rust'], assignee: 'mallory' },
      ''
    );
    ws = await loadWorkspace(base);
    const result = validateWorkspace(ws);
    expect(result.warnings).toEqual([]);
  });

  it('解析失败的文件是 error 并带相对路径', async () => {
    await writeFile(
      path.join(base, 'pmspace', 'features', 'FEAT-001.md'),
      `---\nid: FEAT-001\n---\n`,
      'utf-8'
    );
    const result = validateWorkspace(await loadWorkspace(base));
    expect(codes(result.errors)).toContain('parse-error');
    expect(result.errors[0].file).toBe(path.join('pmspace', 'features', 'FEAT-001.md'));
  });
});
