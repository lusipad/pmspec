import type { Epic, Feature } from '../core/project.js';
import type { Team } from '../core/team.js';
import { validateReferences, checkDuplicateIds } from '../core/project.js';

export interface ValidationIssue {
  level: 'ERROR' | 'WARNING';
  message: string;
  location?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validate entire project structure
 */
export function validateProject(
  epics: Epic[],
  features: Feature[],
  team?: Team
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check duplicate IDs
  const duplicateCheck = checkDuplicateIds(epics, features);
  if (!duplicateCheck.valid) {
    duplicateCheck.errors.forEach(err => {
      issues.push({ level: 'ERROR', message: err });
    });
  }

  // Check references
  const refCheck = validateReferences(epics, features);
  if (!refCheck.valid) {
    refCheck.errors.forEach(err => {
      issues.push({ level: 'ERROR', message: err });
    });
  }

  // Validate positive estimates
  for (const epic of epics) {
    if (epic.estimate <= 0) {
      issues.push({
        level: 'ERROR',
        message: `Epic ${epic.id} has invalid estimate: ${epic.estimate}`,
        location: epic.id,
      });
    }
    if (epic.actual < 0) {
      issues.push({
        level: 'ERROR',
        message: `Epic ${epic.id} has negative actual hours: ${epic.actual}`,
        location: epic.id,
      });
    }
  }

  for (const feature of features) {
    if (feature.estimate <= 0) {
      issues.push({
        level: 'ERROR',
        message: `Feature ${feature.id} has invalid estimate: ${feature.estimate}`,
        location: feature.id,
      });
    }
    if (feature.actual < 0) {
      issues.push({
        level: 'ERROR',
        message: `Feature ${feature.id} has negative actual hours: ${feature.actual}`,
        location: feature.id,
      });
    }
  }

  // Validate skill consistency with team (if team provided)
  if (team) {
    const teamSkills = new Set(
      team.members.flatMap(m => m.skills.map(s => s.toLowerCase()))
    );

    for (const feature of features) {
      const missingSkills = feature.skillsRequired.filter(
        skill => !teamSkills.has(skill.toLowerCase())
      );

      if (missingSkills.length > 0) {
        issues.push({
          level: 'WARNING',
          message: `Feature ${feature.id} requires skills not in team: ${missingSkills.join(', ')}`,
          location: feature.id,
        });
      }
    }
  }

  return {
    valid: issues.filter(i => i.level === 'ERROR').length === 0,
    issues,
  };
}

/**
 * Format validation issues for display
 */
export function formatValidationIssues(result: ValidationResult): string {
  if (result.valid && result.issues.length === 0) {
    return 'All validations passed ✓';
  }

  const lines: string[] = [];

  const errors = result.issues.filter(i => i.level === 'ERROR');
  const warnings = result.issues.filter(i => i.level === 'WARNING');

  if (errors.length > 0) {
    lines.push(`\n✗ ${errors.length} ERROR(S):`);
    errors.forEach(issue => {
      const location = issue.location ? ` [${issue.location}]` : '';
      lines.push(`  - ${issue.message}${location}`);
    });
  }

  if (warnings.length > 0) {
    lines.push(`\n⚠ ${warnings.length} WARNING(S):`);
    warnings.forEach(issue => {
      const location = issue.location ? ` [${issue.location}]` : '';
      lines.push(`  - ${issue.message}${location}`);
    });
  }

  return lines.join('\n');
}
