import { describe, expect, it } from 'vitest';
import {
  ActualSchema,
  EpicFrontmatterSchema,
  EstimateSchema,
  FeatureFrontmatterSchema,
  StoryFrontmatterSchema,
  TeamSchema,
  kindOfId,
} from './schema.js';

describe('EstimateSchema / ActualSchema（工时解析）', () => {
  it('接受数字', () => {
    expect(EstimateSchema.parse(16)).toBe(16);
  });
  it('接受 "16h" / "16" / "16.5h" 字符串', () => {
    expect(EstimateSchema.parse('16h')).toBe(16);
    expect(EstimateSchema.parse('16')).toBe(16);
    expect(EstimateSchema.parse('16.5h')).toBe(16.5);
  });
  it('estimate 必须为正数', () => {
    expect(EstimateSchema.safeParse(0).success).toBe(false);
    expect(EstimateSchema.safeParse(-1).success).toBe(false);
  });
  it('actual 允许 0', () => {
    expect(ActualSchema.parse(0)).toBe(0);
  });
  it('拒绝非法字符串', () => {
    expect(EstimateSchema.safeParse('两天').success).toBe(false);
  });
});

describe('EpicFrontmatterSchema', () => {
  it('校验合法 Epic 并填充默认值', () => {
    const epic = EpicFrontmatterSchema.parse({ id: 'EPIC-001', title: '登录系统' });
    expect(epic.status).toBe('todo');
    expect(epic.tags).toEqual([]);
  });
  it('拒绝非法 ID', () => {
    expect(
      EpicFrontmatterSchema.safeParse({ id: 'EPIC-1', title: 'x' }).success
    ).toBe(false);
    expect(
      EpicFrontmatterSchema.safeParse({ id: 'FEAT-001', title: 'x' }).success
    ).toBe(false);
  });
  it('拒绝非法状态', () => {
    expect(
      EpicFrontmatterSchema.safeParse({
        id: 'EPIC-001',
        title: 'x',
        status: 'planning',
      }).success
    ).toBe(false);
  });
});

describe('FeatureFrontmatterSchema', () => {
  it('epic 引用可选（minimal 模式）', () => {
    const feature = FeatureFrontmatterSchema.parse({ id: 'FEAT-001', title: '登录表单' });
    expect(feature.epic).toBeUndefined();
    expect(feature.priority).toBe('medium');
  });
  it('estimate 字符串被归一为数字', () => {
    const feature = FeatureFrontmatterSchema.parse({
      id: 'FEAT-001',
      title: 'x',
      estimate: '8h',
    });
    expect(feature.estimate).toBe(8);
  });
});

describe('StoryFrontmatterSchema', () => {
  it('feature 引用必填', () => {
    expect(
      StoryFrontmatterSchema.safeParse({ id: 'STORY-001', title: 'x' }).success
    ).toBe(false);
    expect(
      StoryFrontmatterSchema.safeParse({
        id: 'STORY-001',
        feature: 'FEAT-001',
        title: 'x',
      }).success
    ).toBe(true);
  });
});

describe('TeamSchema', () => {
  it('容量支持 "40h" 形式', () => {
    const team = TeamSchema.parse({
      members: [{ name: 'alice', skills: ['react'], capacity: '40h' }],
    });
    expect(team.members[0].capacity).toBe(40);
  });
  it('members 缺省为空数组', () => {
    expect(TeamSchema.parse({}).members).toEqual([]);
  });
});

describe('kindOfId', () => {
  it('识别三种 ID', () => {
    expect(kindOfId('EPIC-001')).toBe('epic');
    expect(kindOfId('FEAT-012')).toBe('feature');
    expect(kindOfId('STORY-100')).toBe('story');
    expect(kindOfId('TASK-001')).toBeNull();
  });
});
