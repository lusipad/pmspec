import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * CLI 端到端测试：在临时目录里跑完整命令闭环。
 * 每次通过 vi.resetModules + 动态 import 重新执行 CLI 入口。
 */

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

interface CliResult {
  out: string;
  code: number;
}

async function runCli(...args: string[]): Promise<CliResult> {
  const lines: string[] = [];
  const collect = (...parts: unknown[]) => {
    lines.push(parts.map(String).join(' '));
  };
  const logSpy = vi.spyOn(console, 'log').mockImplementation(collect);
  const errSpy = vi.spyOn(console, 'error').mockImplementation(collect);
  let code = 0;
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((exitCode?: number) => {
    code = exitCode ?? 0;
    throw new ExitSignal(code);
  }) as never);
  const argvBackup = process.argv;
  process.argv = ['node', 'pmspec', ...args];
  vi.resetModules();
  try {
    await import('../cli/index.js');
  } catch (error) {
    if (!(error instanceof ExitSignal)) throw error;
  } finally {
    process.argv = argvBackup;
    logSpy.mockRestore();
    errSpy.mockRestore();
    exitSpy.mockRestore();
  }
  return { out: lines.join('\n'), code };
}

function parseJson<T>(result: CliResult): T {
  return JSON.parse(result.out) as T;
}

let base: string;
let cwdBackup: string;

beforeEach(async () => {
  cwdBackup = process.cwd();
  base = await mkdtemp(path.join(tmpdir(), 'pmspec-cli-'));
  process.chdir(base);
});

afterEach(async () => {
  process.chdir(cwdBackup);
  await rm(base, { recursive: true, force: true });
});

describe('pmspec init', () => {
  it('初始化后 validate 立即通过', async () => {
    const init = await runCli('init', '--name', 'demo');
    expect(init.code).toBe(0);
    expect(init.out).toContain('pmspace');

    const validate = await runCli('validate', '--json');
    expect(validate.code).toBe(0);
    const result = parseJson<{ errors: unknown[]; warnings: unknown[] }>(validate);
    expect(result.errors).toEqual([]);
  });

  it('重复 init 需要 --force', async () => {
    await runCli('init');
    const second = await runCli('init');
    expect(second.code).toBe(1);
    expect(second.out).toContain('--force');
  });
});

describe('add / list / show / update', () => {
  beforeEach(async () => {
    await runCli('init', '--name', 'demo');
  });

  it('创建三层实体并互相引用', async () => {
    const epic = await runCli('add', 'epic', '--title', '认证系统', '--json');
    expect(epic.code).toBe(0);
    expect(parseJson<{ id: string }>(epic).id).toBe('EPIC-001');

    const feature = await runCli(
      'add', 'feature',
      '--title', '登录表单',
      '--epic', 'EPIC-001',
      '--assignee', 'alice',
      '--estimate', '16h',
      '--priority', 'high',
      '--skills', 'react,typescript',
      '--description', '响应式登录表单',
      '--json'
    );
    const featureData = parseJson<{ id: string; estimate: number; skills: string[] }>(feature);
    expect(featureData.id).toBe('FEAT-001');
    expect(featureData.estimate).toBe(16);
    expect(featureData.skills).toEqual(['react', 'typescript']);

    const story = await runCli(
      'add', 'story', '--title', '输入凭证', '--feature', 'FEAT-001', '--estimate', '4', '--json'
    );
    expect(parseJson<{ id: string; feature: string }>(story).feature).toBe('FEAT-001');

    // ID 顺次分配
    const epic2 = await runCli('add', 'epic', '--title', '支付', '--json');
    expect(parseJson<{ id: string }>(epic2).id).toBe('EPIC-002');
  });

  it('story 缺 --feature 时失败并提示', async () => {
    const result = await runCli('add', 'story', '--title', 'x');
    expect(result.code).toBe(1);
    expect(result.out).toContain('--feature');
  });

  it('引用不存在的 Epic 时失败', async () => {
    const result = await runCli('add', 'feature', '--title', 'x', '--epic', 'EPIC-999');
    expect(result.code).toBe(1);
    expect(result.out).toContain('EPIC-999');
  });

  it('list 支持过滤与 --json', async () => {
    await runCli('add', 'epic', '--title', '认证');
    await runCli('add', 'feature', '--title', 'A', '--epic', 'EPIC-001', '--assignee', 'alice');
    await runCli('add', 'feature', '--title', 'B', '--assignee', 'bob');

    const all = parseJson<Array<{ id: string }>>(await runCli('list', 'features', '--json'));
    expect(all).toHaveLength(2);

    const alice = parseJson<Array<{ assignee: string }>>(
      await runCli('list', 'features', '--assignee', 'alice', '--json')
    );
    expect(alice).toHaveLength(1);

    const byEpic = parseJson<Array<{ id: string }>>(
      await runCli('list', 'features', '--epic', 'EPIC-001', '--json')
    );
    expect(byEpic).toHaveLength(1);
    expect(byEpic[0].id).toBe('FEAT-001');
  });

  it('show 汇总子项进度', async () => {
    await runCli('add', 'epic', '--title', '认证');
    await runCli('add', 'feature', '--title', 'A', '--epic', 'EPIC-001');
    await runCli('add', 'feature', '--title', 'B', '--epic', 'EPIC-001');
    await runCli('update', 'FEAT-001', '--status', 'done');

    const result = parseJson<{ progress: { done: number; total: number } }>(
      await runCli('show', 'EPIC-001', '--json')
    );
    expect(result.progress).toEqual({ done: 1, total: 2 });
  });

  it('update 修改字段并拒绝非法值', async () => {
    await runCli('add', 'feature', '--title', 'A');
    const updated = parseJson<{ status: string; estimate: number }>(
      await runCli('update', 'FEAT-001', '--status', 'in-progress', '--estimate', '8h', '--json')
    );
    expect(updated.status).toBe('in-progress');
    expect(updated.estimate).toBe(8);

    const bad = await runCli('update', 'FEAT-001', '--status', 'shipped');
    expect(bad.code).toBe(1);

    const noop = await runCli('update', 'FEAT-001');
    expect(noop.code).toBe(1);
  });
});

describe('数据安全（审查回归）', () => {
  beforeEach(async () => {
    await runCli('init', '--name', 'demo');
  });

  it('add 不会覆盖解析失败但存在的实体文件', async () => {
    await runCli('add', 'feature', '--title', 'A'); // FEAT-001
    // 手写坏文件占用 FEAT-002（estimate 为空 → schema 拒绝）
    const badFile = path.join(base, 'pmspace', 'features', 'FEAT-002.md');
    await writeFile(badFile, `---\nid: FEAT-002\ntitle: 手写\nestimate:\n---\n珍贵正文\n`, 'utf-8');

    const result = await runCli('add', 'feature', '--title', 'B', '--json');
    expect(result.code).toBe(0);
    // 新实体拿到 FEAT-003，坏文件原样保留
    expect(result.out).toContain('FEAT-003');
    const { readFile } = await import('fs/promises');
    expect(await readFile(badFile, 'utf-8')).toContain('珍贵正文');
  });

  it('update 写回原文件：文件名与 ID 不一致时不产生同 ID 双文件', async () => {
    await runCli('add', 'feature', '--title', 'A'); // FEAT-001
    const { rename, readdir } = await import('fs/promises');
    const dir = path.join(base, 'pmspace', 'features');
    await rename(path.join(dir, 'FEAT-001.md'), path.join(dir, 'login-feature.md'));

    const result = await runCli('update', 'FEAT-001', '--status', 'done');
    expect(result.code).toBe(0);
    const files = await readdir(dir);
    expect(files.filter((f) => f.endsWith('.md'))).toEqual(['login-feature.md']);

    const list = parseJson<Array<{ id: string; status: string }>>(
      await runCli('list', 'features', '--json')
    );
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('done');
  });

  it('update 拒绝不适用于该实体类型的字段', async () => {
    await runCli('add', 'epic', '--title', 'E');
    const result = await runCli('update', 'EPIC-001', '--assignee', 'bob');
    expect(result.code).toBe(1);
    expect(result.out).toContain('--assignee');
  });

  it('原地导入被拒绝（不覆盖源数据）', async () => {
    const result = await runCli('import', path.join(base, 'pmspace'));
    expect(result.code).toBe(1);
    expect(result.out).toContain('原地导入');
  });

  it('存在解析失败文件时命令在 stderr 提示而不是无声排除', async () => {
    await writeFile(
      path.join(base, 'pmspace', 'features', 'FEAT-001.md'),
      `---\nid: FEAT-001\n---\n`,
      'utf-8'
    );
    const result = await runCli('list', 'features');
    expect(result.out).toContain('解析失败');
  });
});

describe('CLI 一致性（审查回归）', () => {
  beforeEach(async () => {
    await runCli('init', '--name', 'demo');
    await runCli('add', 'epic', '--title', '认证');
    await runCli('add', 'feature', '--title', 'A', '--epic', 'EPIC-001', '--assignee', 'alice');
    await runCli('add', 'feature', '--title', 'B', '--assignee', 'bob');
  });

  it('list all --json 同样应用过滤器', async () => {
    const result = parseJson<{ features: Array<{ id: string }> }>(
      await runCli('list', 'all', '--assignee', 'alice', '--json')
    );
    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('FEAT-001');
  });

  it('list --status 非法值报错而不是静默空结果', async () => {
    const result = await runCli('list', 'features', '--status', 'shipped');
    expect(result.code).toBe(1);
    expect(result.out).toContain('shipped');
  });

  it('list epics --assignee 按 owner 匹配', async () => {
    await runCli('update', 'EPIC-001', '--owner', 'alice');
    const rows = parseJson<Array<{ id: string }>>(
      await runCli('list', 'epics', '--assignee', 'alice', '--json')
    );
    expect(rows).toHaveLength(1);
  });

  it('export --json 与其他命令保持一致', async () => {
    const result = await runCli('export', '--json');
    expect(result.code).toBe(0);
    const data = JSON.parse(result.out) as { features: unknown[] };
    expect(data.features).toHaveLength(2);
  });
});

describe('validate 退出码', () => {
  it('引用悬空时非零退出并指明实体', async () => {
    await runCli('init');
    // 绕过 add 的引用检查，手工写坏文件
    await writeFile(
      path.join(base, 'pmspace', 'features', 'FEAT-002.md'),
      `---\nid: FEAT-002\ntitle: x\nepic: EPIC-999\n---\n`,
      'utf-8'
    );
    const result = await runCli('validate');
    expect(result.code).toBe(1);
    expect(result.out).toContain('FEAT-002');
    expect(result.out).toContain('EPIC-999');
  });
});

describe('stats / export / search', () => {
  beforeEach(async () => {
    await runCli('init', '--name', 'demo');
    await runCli('add', 'epic', '--title', '认证');
    await runCli(
      'add', 'feature',
      '--title', '登录表单', '--epic', 'EPIC-001',
      '--assignee', 'alice', '--estimate', '16',
      '--description', '支持邮箱与密码登录'
    );
    await runCli('update', 'FEAT-001', '--status', 'done', '--actual', '12');
  });

  it('stats --json 输出总体/负载/Epic 三块', async () => {
    const stats = parseJson<{
      overall: { progressPct: number; hours: { estimated: number; actual: number } };
      byAssignee: Array<{ name: string; openHours: number }>;
      byEpic: Array<{ id: string; progressPct: number }>;
    }>(await runCli('stats', '--json'));
    expect(stats.overall.progressPct).toBe(100);
    expect(stats.overall.hours.actual).toBe(12);
    expect(stats.byAssignee[0].name).toBe('alice');
    expect(stats.byEpic[0].progressPct).toBe(100);
  });

  it('export csv 输出功能表', async () => {
    const result = await runCli('export', '--format', 'csv');
    expect(result.out).toContain('ID,Title,Epic');
    expect(result.out).toContain('FEAT-001,登录表单,EPIC-001,done,alice');
  });

  it('search 命中标题与正文', async () => {
    const byTitle = parseJson<Array<{ id: string }>>(await runCli('search', '登录', '--json'));
    expect(byTitle.some((hit) => hit.id === 'FEAT-001')).toBe(true);
    const byBody = parseJson<Array<{ id: string }>>(await runCli('search', '邮箱', '--json'));
    expect(byBody.some((hit) => hit.id === 'FEAT-001')).toBe(true);
  });
});

describe('import', () => {
  beforeEach(async () => {
    await runCli('init', '--name', 'demo');
  });

  it('v1 CSV 导入并生成分组 Epic；已占用 ID 重新分配', async () => {
    // 先占用 FEAT-001
    await runCli('add', 'feature', '--title', '已存在');

    const csv = [
      'ID,功能名称,描述,预估工作量(h),分配给,优先级,状态,分组,标签,创建日期,截止日期',
      'FEAT-001,登录表单,响应式登录,16,alice,高,进行中,认证,auth;ui,,',
      ',注册表单,,8,bob,低,待办,认证,,,',
    ].join('\n');
    const file = path.join(base, 'features.csv');
    await writeFile(file, csv, 'utf-8');

    const dry = await runCli('import', file, '--dry-run', '--json');
    const dryData = parseJson<{ dryRun: boolean; entities: Array<{ id: string }> }>(dry);
    expect(dryData.dryRun).toBe(true);
    expect(dryData.entities).toHaveLength(3); // 1 epic + 2 features

    const real = parseJson<{ written: string[]; warnings: string[] }>(
      await runCli('import', file, '--json')
    );
    expect(real.written).toHaveLength(3);
    expect(real.warnings.some((w) => w.includes('FEAT-001'))).toBe(true);

    const features = parseJson<Array<{ id: string; title: string; epic?: string }>>(
      await runCli('list', 'features', '--json')
    );
    expect(features).toHaveLength(3);
    const login = features.find((f) => f.title === '登录表单');
    expect(login?.id).not.toBe('FEAT-001'); // 冲突已重新分配
    expect(login?.epic).toBe('EPIC-001'); // 分组 → Epic

    const validate = await runCli('validate', '--json');
    expect(validate.code).toBe(0);
  });

  it('v1 富模型目录导入三层实体', async () => {
    const { mkdir } = await import('fs/promises');
    const v1 = path.join(base, 'old-pmspace');
    await mkdir(path.join(v1, 'features'), { recursive: true });
    await writeFile(
      path.join(v1, 'features', 'feat-001.md'),
      `# Feature: Login Form

- **ID**: FEAT-001
- **Status**: in-progress
- **Estimate**: 16 hours

## User Stories
- [x] STORY-001: enter credentials (4h)
`,
      'utf-8'
    );
    const result = parseJson<{ written: string[] }>(
      await runCli('import', v1, '--json')
    );
    expect(result.written).toHaveLength(2); // feature + story

    const stories = parseJson<Array<{ id: string; status: string }>>(
      await runCli('list', 'stories', '--json')
    );
    expect(stories).toHaveLength(1);
    expect(stories[0].status).toBe('done');
  });

  it('路径不存在时报错', async () => {
    const result = await runCli('import', 'no-such-file.csv');
    expect(result.code).toBe(1);
  });
});
