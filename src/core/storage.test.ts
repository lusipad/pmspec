import { describe, expect, it } from 'vitest';
import { parseEntityFile, serializeEntityFile } from './storage.js';

describe('storage 往返', () => {
  it('解析 frontmatter 与正文', () => {
    const content = `---
id: FEAT-001
title: 登录表单
estimate: 16
---

响应式登录表单。

## 验收标准
- 邮箱格式校验
`;
    const { data, body } = parseEntityFile(content);
    expect(data.id).toBe('FEAT-001');
    expect(data.estimate).toBe(16);
    expect(body).toContain('响应式登录表单');
    expect(body).toContain('## 验收标准');
  });

  it('序列化-解析保真（含自定义字段）', () => {
    const data = {
      id: 'FEAT-001',
      title: '登录表单',
      status: 'todo',
      customField: 'user-added',
      tags: ['auth', 'ui'],
    };
    const body = '正文描述';
    const roundTrip = parseEntityFile(serializeEntityFile(data, body));
    expect(roundTrip.data).toEqual(data);
    expect(roundTrip.body).toBe(body);
  });

  it('剔除 undefined 值的键', () => {
    const text = serializeEntityFile({ id: 'EPIC-001', owner: undefined }, '');
    expect(text).not.toContain('owner');
  });

  it('空正文不产生多余空行', () => {
    const text = serializeEntityFile({ id: 'EPIC-001' }, '');
    expect(text.endsWith('---\n')).toBe(true);
  });

  it('无 frontmatter 的文件解析为空对象', () => {
    const { data, body } = parseEntityFile('纯正文');
    expect(data).toEqual({});
    expect(body).toBe('纯正文');
  });
});
