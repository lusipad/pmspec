import { z } from 'zod';

/**
 * PMSpec v2 唯一数据模型。
 * 全仓库任何模块需要 Epic/Feature/Story/Team/Project 类型时，
 * 一律从本文件 import，不得另行定义。
 */

export const EPIC_ID_RE = /^EPIC-\d{3,}$/;
export const FEATURE_ID_RE = /^FEAT-\d{3,}$/;
export const STORY_ID_RE = /^STORY-\d{3,}$/;

export const StatusSchema = z.enum(['todo', 'in-progress', 'done', 'blocked']);
export type Status = z.infer<typeof StatusSchema>;

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type Priority = z.infer<typeof PrioritySchema>;

/** 工时：接受 16 / "16" / "16h" / "16.5h"，统一为小时数字 */
const hoursValue = z.preprocess((value) => {
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*h?$/i);
    if (match) return Number(match[1]);
  }
  return value;
}, z.number().finite());

export const EstimateSchema = hoursValue.pipe(z.number().positive());
export const ActualSchema = hoursValue.pipe(z.number().nonnegative());

const idOf = (re: RegExp, label: string) =>
  z
    .string()
    .trim()
    .regex(re, `${label} ID 格式不合法（期望 ${label}-001 形式）`);

export const EpicFrontmatterSchema = z.object({
  id: idOf(EPIC_ID_RE, 'EPIC'),
  title: z.string().trim().min(1, 'title 不能为空'),
  status: StatusSchema.default('todo'),
  owner: z.string().trim().min(1).optional(),
  estimate: EstimateSchema.optional(),
  actual: ActualSchema.optional(),
  tags: z.array(z.string()).default([]),
});
export type EpicFrontmatter = z.infer<typeof EpicFrontmatterSchema>;

export const FeatureFrontmatterSchema = z.object({
  id: idOf(FEATURE_ID_RE, 'FEAT'),
  epic: idOf(EPIC_ID_RE, 'EPIC').optional(),
  title: z.string().trim().min(1, 'title 不能为空'),
  status: StatusSchema.default('todo'),
  assignee: z.string().trim().min(1).optional(),
  priority: PrioritySchema.default('medium'),
  estimate: EstimateSchema.optional(),
  actual: ActualSchema.optional(),
  skills: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});
export type FeatureFrontmatter = z.infer<typeof FeatureFrontmatterSchema>;

export const StoryFrontmatterSchema = z.object({
  id: idOf(STORY_ID_RE, 'STORY'),
  feature: idOf(FEATURE_ID_RE, 'FEAT'),
  title: z.string().trim().min(1, 'title 不能为空'),
  status: StatusSchema.default('todo'),
  assignee: z.string().trim().min(1).optional(),
  estimate: EstimateSchema.optional(),
  actual: ActualSchema.optional(),
});
export type StoryFrontmatter = z.infer<typeof StoryFrontmatterSchema>;

export const TeamMemberSchema = z.object({
  name: z.string().trim().min(1),
  skills: z.array(z.string()).default([]),
  /** 每周可用工时 */
  capacity: hoursValue.pipe(z.number().nonnegative()).optional(),
  notes: z.string().optional(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamSchema = z.object({
  members: z.array(TeamMemberSchema).default([]),
});
export type Team = z.infer<typeof TeamSchema>;

export const ProjectSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export type EntityKind = 'epic' | 'feature' | 'story';

/** 实体 = 结构化 frontmatter + 自由 Markdown 正文（描述、验收标准等） */
export interface Epic extends EpicFrontmatter {
  body: string;
}
export interface Feature extends FeatureFrontmatter {
  body: string;
}
export interface Story extends StoryFrontmatter {
  body: string;
}
export type Entity = Epic | Feature | Story;

export const ID_PREFIX: Record<EntityKind, string> = {
  epic: 'EPIC',
  feature: 'FEAT',
  story: 'STORY',
};

export function kindOfId(id: string): EntityKind | null {
  if (EPIC_ID_RE.test(id)) return 'epic';
  if (FEATURE_ID_RE.test(id)) return 'feature';
  if (STORY_ID_RE.test(id)) return 'story';
  return null;
}

export const FRONTMATTER_SCHEMAS = {
  epic: EpicFrontmatterSchema,
  feature: FeatureFrontmatterSchema,
  story: StoryFrontmatterSchema,
} as const;
