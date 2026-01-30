import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { Epic, Feature, UserStory, Project, Milestone } from '../core/project.js';
import type { Team } from '../core/team.js';

/**
 * Generate Epic markdown content
 */
export function generateEpicMarkdown(epic: Epic): string {
  const lines: string[] = [];

  lines.push(`# Epic: ${epic.title}`);
  lines.push('');
  lines.push(`- **ID**: ${epic.id}`);
  lines.push(`- **Status**: ${epic.status}`);
  if (epic.owner) {
    lines.push(`- **Owner**: ${epic.owner}`);
  }
  lines.push(`- **Estimate**: ${epic.estimate} hours`);
  lines.push(`- **Actual**: ${epic.actual} hours`);
  lines.push('');

  if (epic.description) {
    lines.push('## Description');
    lines.push(epic.description);
    lines.push('');
  }

  if (epic.features.length > 0) {
    lines.push('## Features');
    for (const featureId of epic.features) {
      lines.push(`- [ ] ${featureId}: [Feature title]`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate Feature markdown content
 */
export function generateFeatureMarkdown(feature: Feature): string {
  const lines: string[] = [];

  lines.push(`# Feature: ${feature.title}`);
  lines.push('');
  lines.push(`- **ID**: ${feature.id}`);
  lines.push(`- **Epic**: ${feature.epicId}`);
  lines.push(`- **Status**: ${feature.status}`);
  if (feature.assignee) {
    lines.push(`- **Assignee**: ${feature.assignee}`);
  }
  lines.push(`- **Estimate**: ${feature.estimate} hours`);
  lines.push(`- **Actual**: ${feature.actual} hours`);
  if (feature.skillsRequired.length > 0) {
    lines.push(`- **Skills Required**: ${feature.skillsRequired.join(', ')}`);
  }
  lines.push('');

  if (feature.description) {
    lines.push('## Description');
    lines.push(feature.description);
    lines.push('');
  }

  if (feature.userStories.length > 0) {
    lines.push('## User Stories');
    for (const story of feature.userStories) {
      const checkbox = story.status === 'done' ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${story.id}: ${story.title} (${story.estimate}h)`);
    }
    lines.push('');
  }

  if (feature.acceptanceCriteria.length > 0) {
    lines.push('## Acceptance Criteria');
    for (const criterion of feature.acceptanceCriteria) {
      lines.push(`- [ ] ${criterion}`);
    }
    lines.push('');
  }

  if (feature.dependencies && feature.dependencies.length > 0) {
    lines.push('## Dependencies');
    const blocks = feature.dependencies.filter(d => d.type === 'blocks').map(d => d.featureId);
    const relatesTo = feature.dependencies.filter(d => d.type === 'relates-to').map(d => d.featureId);
    
    if (blocks.length > 0) {
      lines.push(`- blocks: ${blocks.join(', ')}`);
    }
    if (relatesTo.length > 0) {
      lines.push(`- relates-to: ${relatesTo.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate Project markdown content
 */
export function generateProjectMarkdown(project: Project): string {
  const lines: string[] = [];

  lines.push(`# Project: ${project.name}`);
  lines.push('');

  if (project.overview) {
    lines.push('## Overview');
    lines.push(project.overview);
    lines.push('');
  }

  if (project.timeline) {
    lines.push('## Timeline');
    if (project.timeline.start) {
      lines.push(`- Start: ${project.timeline.start}`);
    }
    if (project.timeline.end) {
      lines.push(`- End: ${project.timeline.end}`);
    }
    lines.push('');
  }

  if (project.teamCapacity) {
    lines.push('## Team Capacity');
    if (project.teamCapacity.total !== undefined) {
      lines.push(`- Total: ${project.teamCapacity.total} person-weeks`);
    }
    if (project.teamCapacity.available !== undefined) {
      lines.push(`- Available: ${project.teamCapacity.available} person-weeks`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate Team markdown content
 */
export function generateTeamMarkdown(team: Team): string {
  const lines: string[] = [];

  lines.push('# Team');
  lines.push('');
  lines.push('## Members');
  lines.push('');

  for (const member of team.members) {
    lines.push(`### ${member.name}`);
    lines.push(`- **Skills**: ${member.skills.join(', ')}`);
    lines.push(`- **Capacity**: ${member.capacity} hours/week`);
    lines.push(`- **Current Load**: ${member.currentLoad} hours/week`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate Milestone markdown content
 */
export function generateMilestoneMarkdown(milestone: Milestone): string {
  const lines: string[] = [];

  lines.push(`# Milestone: ${milestone.title}`);
  lines.push('');
  lines.push(`- **ID**: ${milestone.id}`);
  lines.push(`- **Target Date**: ${milestone.targetDate}`);
  lines.push(`- **Status**: ${milestone.status}`);
  lines.push('');

  if (milestone.description) {
    lines.push('## Description');
    lines.push(milestone.description);
    lines.push('');
  }

  if (milestone.features.length > 0) {
    lines.push('## Features');
    for (const featureId of milestone.features) {
      lines.push(`- [ ] ${featureId}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Write Epic to file
 */
export async function writeEpicFile(filePath: string, epic: Epic): Promise<void> {
  const content = generateEpicMarkdown(epic);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Write Feature to file
 */
export async function writeFeatureFile(filePath: string, feature: Feature): Promise<void> {
  const content = generateFeatureMarkdown(feature);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Write Project to file
 */
export async function writeProjectFile(filePath: string, project: Project): Promise<void> {
  const content = generateProjectMarkdown(project);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Write Team to file
 */
export async function writeTeamFile(filePath: string, team: Team): Promise<void> {
  const content = generateTeamMarkdown(team);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Write Milestone to file
 */
export async function writeMilestoneFile(filePath: string, milestone: Milestone): Promise<void> {
  const content = generateMilestoneMarkdown(milestone);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}
