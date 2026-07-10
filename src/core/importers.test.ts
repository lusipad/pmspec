import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectFormat,
  importGenericCsv,
  importV1Csv,
  importV1Pmspace,
  mapPriority,
  mapStatus,
  parseCsv,
  parseHours,
} from './importers.js';

describe('parseCsv', () => {
  it('处理引号包裹的逗号与转义引号', () => {
    const rows = parseCsv('a,"b,c","say ""hi"""\n1,2,3');
    expect(rows[0]).toEqual(['a', 'b,c', 'say "hi"']);
    expect(rows[1]).toEqual(['1', '2', '3']);
  });
  it('处理 CRLF 与空行', () => {
    const rows = parseCsv('a,b\r\n\r\n1,2\r\n');
    expect(rows).toHaveLength(2);
  });
});

describe('字段映射', () => {
  it('mapStatus 覆盖中英文与 v1 值', () => {
    expect(mapStatus('planning')).toBe('todo');
    expect(mapStatus('进行中')).toBe('in-progress');
    expect(mapStatus('completed')).toBe('done');
    expect(mapStatus('阻塞')).toBe('blocked');
    expect(mapStatus('未知值')).toBe('todo');
  });
  it('mapPriority 覆盖中英文', () => {
    expect(mapPriority('高')).toBe('high');
    expect(mapPriority('紧急')).toBe('critical');
    expect(mapPriority(undefined)).toBe('medium');
  });
  it('parseHours 接受 80 / 80h / 80 hours / 80小时', () => {
    expect(parseHours('80')).toBe(80);
    expect(parseHours('80h')).toBe(80);
    expect(parseHours('80 hours')).toBe(80);
    expect(parseHours('80小时')).toBe(80);
    expect(parseHours('N/A')).toBeUndefined();
  });
});

describe('importV1Csv（v1 简单模型）', () => {
  const csv = [
    'ID,功能名称,描述,预估工作量(h),分配给,优先级,状态,分组,标签,创建日期,截止日期',
    'FEAT-001,登录表单,响应式登录,16,alice,高,进行中,认证,auth;ui,2024-01-01,',
    'F2,注册表单,,8,bob,低,待办,认证,,,',
    'FEAT-003,看板,拖拽看板,24,carol,中,完成,,,,',
  ].join('\n');

  it('迁移功能行并从分组生成 Epic', () => {
    const result = importV1Csv(csv);
    expect(result.features).toHaveLength(3);
    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].fm.title).toBe('认证');

    const login = result.features[0];
    expect(login.fm.id).toBe('FEAT-001');
    expect(login.fm.status).toBe('in-progress');
    expect(login.fm.priority).toBe('high');
    expect(login.fm.estimate).toBe(16);
    expect(login.fm.tags).toEqual(['auth', 'ui']);
    expect(login.body).toBe('响应式登录');
    expect(login.epicRef).toBe('认证');

    // 非 FEAT-xxx 的旧 ID 丢弃，等待重新分配
    expect(result.features[1].fm.id).toBeUndefined();
    // 无分组的 feature 不挂 Epic
    expect(result.features[2].epicRef).toBeUndefined();
  });
});

describe('importGenericCsv（通用表头别名）', () => {
  it('识别英文表头', () => {
    const result = importGenericCsv(
      'Title,Estimate,Assignee,Status,Priority,Epic\nLogin,8h,alice,done,high,Auth'
    );
    expect(result.features[0].fm.title).toBe('Login');
    expect(result.features[0].fm.estimate).toBe(8);
    expect(result.features[0].fm.status).toBe('done');
    expect(result.epics[0].fm.title).toBe('Auth');
  });
  it('缺少标题列时报错', () => {
    expect(() => importGenericCsv('foo,bar\n1,2')).toThrow('标题列');
  });
});

describe('importV1Pmspace（v1 富模型目录）', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'pmspec-v1-'));
    await mkdir(path.join(dir, 'epics'), { recursive: true });
    await mkdir(path.join(dir, 'features'), { recursive: true });
    await writeFile(
      path.join(dir, 'epics', 'epic-001.md'),
      `# Epic: User Authentication System

- **ID**: EPIC-001
- **Status**: planning
- **Owner**: Alice
- **Estimate**: 80 hours
- **Actual**: 0 hours

## Description
Build a complete user authentication system.

## Features
- [ ] FEAT-001: Login form
`,
      'utf-8'
    );
    await writeFile(
      path.join(dir, 'features', 'feat-001.md'),
      `# Feature: Login Form

- **ID**: FEAT-001
- **Epic**: EPIC-001
- **Status**: in-progress
- **Assignee**: Alice
- **Estimate**: 16 hours
- **Skills Required**: React, TypeScript

## Description
Responsive login form.

## User Stories
- [x] STORY-001: As a user, I want to enter credentials (4h)
- [ ] STORY-002: As a user, I want to see validation errors (3h)

## Acceptance Criteria
- [ ] Form validates email format
`,
      'utf-8'
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('迁移 Epic/Feature/Story 三层', async () => {
    const result = await importV1Pmspace(dir);

    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].fm.id).toBe('EPIC-001');
    expect(result.epics[0].fm.status).toBe('todo'); // planning → todo
    expect(result.epics[0].fm.estimate).toBe(80);
    expect(result.epics[0].body).toContain('authentication system');

    expect(result.features).toHaveLength(1);
    const feature = result.features[0];
    expect(feature.fm.id).toBe('FEAT-001');
    expect(feature.epicRef).toBe('EPIC-001');
    expect(feature.fm.skills).toEqual(['React', 'TypeScript']);
    expect(feature.body).toContain('验收标准');

    expect(result.stories).toHaveLength(2);
    expect(result.stories[0].fm.id).toBe('STORY-001');
    expect(result.stories[0].fm.status).toBe('done'); // [x]
    expect(result.stories[0].fm.estimate).toBe(4);
    expect(result.stories[0].featureRef).toBe('FEAT-001');
    expect(result.stories[1].fm.status).toBe('todo');
  });

  it('detectFormat: 目录 → v1-pmspace, v1 表头 → v1-csv, 其他 → csv', async () => {
    expect(await detectFormat(dir)).toBe('v1-pmspace');
    const v1csv = path.join(dir, 'features.csv');
    await writeFile(v1csv, 'ID,功能名称,描述\n', 'utf-8');
    expect(await detectFormat(v1csv)).toBe('v1-csv');
    const generic = path.join(dir, 'generic.csv');
    await writeFile(generic, 'Title,Status\n', 'utf-8');
    expect(await detectFormat(generic)).toBe('csv');
  });
});
