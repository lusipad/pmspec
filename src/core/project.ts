import { z } from 'zod';

// Status enums
export const EpicStatus = z.enum(['planning', 'in-progress', 'completed']);
export type EpicStatus = z.infer<typeof EpicStatus>;

export const MilestoneStatus = z.enum(['upcoming', 'active', 'completed', 'missed']);
export type MilestoneStatus = z.infer<typeof MilestoneStatus>;

export const FeatureStatus = z.enum(['todo', 'in-progress', 'done']);
export type FeatureStatus = z.infer<typeof FeatureStatus>;

export const StoryStatus = z.enum(['todo', 'in-progress', 'done']);
export type StoryStatus = z.infer<typeof StoryStatus>;

// UserStory schema
export const UserStorySchema = z.object({
  id: z.string().regex(/^STORY-\d+$/),
  title: z.string().min(1),
  description: z.string().optional(),
  estimate: z.number().positive(),
  status: StoryStatus,
  featureId: z.string().regex(/^FEAT-\d+$/),
});

export type UserStory = z.infer<typeof UserStorySchema>;

// Dependency type enum
export const DependencyType = z.enum(['blocks', 'relates-to']);
export type DependencyType = z.infer<typeof DependencyType>;

// Dependency schema
export const DependencySchema = z.object({
  featureId: z.string().regex(/^FEAT-\d+$/),
  type: DependencyType,
});

export type Dependency = z.infer<typeof DependencySchema>;

// Feature schema
export const FeatureSchema = z.object({
  id: z.string().regex(/^FEAT-\d+$/),
  title: z.string().min(1),
  epicId: z.string().regex(/^EPIC-\d+$/),
  status: FeatureStatus,
  assignee: z.string().optional(),
  estimate: z.number().positive(),
  actual: z.number().nonnegative().default(0),
  skillsRequired: z.array(z.string()).default([]),
  description: z.string().optional(),
  userStories: z.array(UserStorySchema).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  dependencies: z.array(DependencySchema).default([]),
});

export type Feature = z.infer<typeof FeatureSchema>;

// Epic schema
export const EpicSchema = z.object({
  id: z.string().regex(/^EPIC-\d+$/),
  title: z.string().min(1),
  status: EpicStatus,
  owner: z.string().optional(),
  estimate: z.number().positive(),
  actual: z.number().nonnegative().default(0),
  description: z.string().optional(),
  features: z.array(z.string().regex(/^FEAT-\d+$/)).default([]), // Feature IDs
});

export type Epic = z.infer<typeof EpicSchema>;

// Milestone schema
export const MilestoneSchema = z.object({
  id: z.string().regex(/^MILE-\d{3}$/),
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string(), // ISO date YYYY-MM-DD
  status: MilestoneStatus,
  features: z.array(z.string().regex(/^FEAT-\d+$/)).default([]), // Feature IDs
});

export type Milestone = z.infer<typeof MilestoneSchema>;

// Project schema
export const ProjectSchema = z.object({
  name: z.string().min(1),
  overview: z.string().optional(),
  timeline: z.object({
    start: z.string().optional(), // YYYY-MM-DD
    end: z.string().optional(),
  }).optional(),
  teamCapacity: z.object({
    total: z.number().optional(),
    available: z.number().optional(),
  }).optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Parse ID number from Epic/Feature/Story ID string
 * @example parseIdNumber('EPIC-001') => 1
 */
export function parseIdNumber(id: string): number {
  const match = id.match(/-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid ID format: ${id}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Generate next available ID based on existing IDs
 * @example generateNextId('EPIC', ['EPIC-001', 'EPIC-003']) => 'EPIC-004'
 */
export function generateNextId(prefix: 'EPIC' | 'FEAT' | 'STORY' | 'MILE', existingIds: string[]): string {
  if (existingIds.length === 0) {
    return `${prefix}-001`;
  }

  const numbers = existingIds.map(id => parseIdNumber(id));
  const maxNumber = Math.max(...numbers);
  const nextNumber = maxNumber + 1;

  return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
}

/**
 * Validate that all referenced IDs exist
 */
export function validateReferences(
  epics: Epic[],
  features: Feature[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const epicIds = new Set(epics.map(e => e.id));
  const featureIds = new Set(features.map(f => f.id));

  // Check that Features reference existing Epics
  for (const feature of features) {
    if (!epicIds.has(feature.epicId)) {
      errors.push(`Feature ${feature.id} references non-existent Epic ${feature.epicId}`);
    }
  }

  // Check that Epics reference existing Features
  for (const epic of epics) {
    for (const featureId of epic.features) {
      if (!featureIds.has(featureId)) {
        errors.push(`Epic ${epic.id} references non-existent Feature ${featureId}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check for duplicate IDs
 */
export function checkDuplicateIds(
  epics: Epic[],
  features: Feature[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allIds: string[] = [];

  epics.forEach(e => allIds.push(e.id));
  features.forEach(f => {
    allIds.push(f.id);
    f.userStories.forEach(s => allIds.push(s.id));
  });

  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) {
      errors.push(`Duplicate ID found: ${id}`);
    }
    seen.add(id);
  }

  return { valid: errors.length === 0, errors };
}
