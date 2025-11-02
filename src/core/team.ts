import { z } from 'zod';

// TeamMember schema
export const TeamMemberSchema = z.object({
  name: z.string().min(1),
  skills: z.array(z.string()).default([]),
  capacity: z.number().positive(), // hours per week
  currentLoad: z.number().nonnegative().default(0), // hours currently assigned
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

// Team schema
export const TeamSchema = z.object({
  members: z.array(TeamMemberSchema).default([]),
});

export type Team = z.infer<typeof TeamSchema>;

/**
 * Calculate skill match score between member skills and required skills
 * Uses Jaccard similarity: |intersection| / |union|
 * @returns score between 0 and 1
 */
export function calculateSkillMatch(
  memberSkills: string[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) {
    return 1.0; // No skill requirements = perfect match
  }

  const memberSet = new Set(memberSkills.map(s => s.toLowerCase()));
  const requiredSet = new Set(requiredSkills.map(s => s.toLowerCase()));

  const intersection = new Set([...memberSet].filter(s => requiredSet.has(s)));
  const union = new Set([...memberSet, ...requiredSet]);

  return intersection.size / union.size;
}

/**
 * Get missing skills (required but not possessed by member)
 */
export function getMissingSkills(
  memberSkills: string[],
  requiredSkills: string[]
): string[] {
  const memberSet = new Set(memberSkills.map(s => s.toLowerCase()));
  return requiredSkills.filter(skill => !memberSet.has(skill.toLowerCase()));
}

/**
 * Calculate current load percentage
 * @returns percentage between 0 and 100+
 */
export function calculateLoadPercentage(
  currentLoad: number,
  capacity: number
): number {
  if (capacity === 0) {
    return 0;
  }
  return (currentLoad / capacity) * 100;
}

/**
 * Check if member is overallocated
 */
export function isOverallocated(member: TeamMember): boolean {
  return member.currentLoad > member.capacity;
}

/**
 * Get available hours for a team member
 */
export function getAvailableHours(member: TeamMember): number {
  return Math.max(0, member.capacity - member.currentLoad);
}
