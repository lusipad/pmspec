import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createWorkspace,
  findById,
  findWorkspaceRoot,
  loadWorkspace,
  nextId,
  writeEntity,
} from './workspace.js';

let base: string;

beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'pmspec-ws-'));
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

describe('createWorkspace', () => {
  it('标准初始化创建完整骨架', async () => {
    await createWorkspace(base, { name: 'demo' });
    const ws = await loadWorkspace(base);
    expect(ws.project?.data.name).toBe('demo');
    expect(ws.team?.data.members).toEqual([]);
    expect(ws.issues).toEqual([]);
  });

  it('minimal 模式只建 features/', async () => {
    await createWorkspace(base, { minimal: true });
    const ws = await loadWorkspace(base);
    expect(ws.team).toBeNull();
    expect(ws.project).not.toBeNull();
  });

  it('已存在时拒绝，--force 覆盖', async () => {
    await createWorkspace(base, {});
    await expect(createWorkspace(base, {})).rejects.toThrow('--force');
    await expect(createWorkspace(base, { force: true })).resolves.toBeTruthy();
  });
});

describe('findWorkspaceRoot', () => {
  it('从子目录向上定位', async () => {
    await createWorkspace(base, {});
    const nested = path.join(base, 'pmspace', 'features');
    expect(findWorkspaceRoot(nested)).toBe(base);
  });
  it('找不到时返回 null', () => {
    expect(findWorkspaceRoot(tmpdir())).toBeNull();
  });
});

describe('实体读写', () => {
  beforeEach(async () => {
    await createWorkspace(base, {});
  });

  it('writeEntity 后可加载并查询', async () => {
    let ws = await loadWorkspace(base);
    await writeEntity(
      ws,
      'epic',
      { id: 'EPIC-001', title: '认证系统', status: 'todo' },
      '完整认证。'
    );
    ws = await loadWorkspace(base);
    expect(ws.epics).toHaveLength(1);
    const found = findById(ws, 'epic-001');
    expect(found?.kind).toBe('epic');
    expect(found?.loaded.entity.title).toBe('认证系统');
  });

  it('nextId 递增且补零', async () => {
    let ws = await loadWorkspace(base);
    expect(nextId(ws, 'epic')).toBe('EPIC-001');
    await writeEntity(ws, 'epic', { id: 'EPIC-007', title: 'x' }, '');
    ws = await loadWorkspace(base);
    expect(nextId(ws, 'epic')).toBe('EPIC-008');
    expect(nextId(ws, 'feature')).toBe('FEAT-001');
  });

  it('保留 schema 之外的自定义 frontmatter 键', async () => {
    let ws = await loadWorkspace(base);
    await writeEntity(
      ws,
      'feature',
      { id: 'FEAT-001', title: 'x', jiraKey: 'PROJ-42' },
      ''
    );
    ws = await loadWorkspace(base);
    const loaded = ws.features[0];
    expect(loaded.raw.jiraKey).toBe('PROJ-42');
    // 模拟 update：合并变更后回写
    await writeEntity(ws, 'feature', { ...loaded.raw, status: 'done' }, loaded.entity.body);
    const content = await readFile(loaded.file, 'utf-8');
    expect(content).toContain('jiraKey: PROJ-42');
    expect(content).toContain('status: done');
  });

  it('坏文件进 issues 而不是炸掉加载', async () => {
    const badFile = path.join(base, 'pmspace', 'features', 'FEAT-BAD.md');
    await writeFile(badFile, `---\nid: FEAT-001\n---\n`, 'utf-8'); // 缺 title
    const ws = await loadWorkspace(base);
    expect(ws.features).toHaveLength(0);
    expect(ws.issues).toHaveLength(1);
    expect(ws.issues[0].file).toBe(badFile);
    expect(ws.issues[0].message).toContain('title');
  });

  it('非法状态值被拦截并报文件级错误', async () => {
    const file = path.join(base, 'pmspace', 'epics', 'EPIC-001.md');
    await writeFile(file, `---\nid: EPIC-001\ntitle: x\nstatus: shipped\n---\n`, 'utf-8');
    const ws = await loadWorkspace(base);
    expect(ws.epics).toHaveLength(0);
    expect(ws.issues[0].message).toContain('status');
  });
});
