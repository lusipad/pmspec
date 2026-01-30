import { readFile } from 'fs/promises';
import type { Epic, Feature, UserStory, Project, Milestone, Dependency } from './project.js';
import type { Team, TeamMember } from './team.js';

/**
 * Parse metadata from markdown frontmatter-style format
 * Example:
 * - **ID**: EPIC-001
 * - **Status**: planning
 */
export function parseMetadata(content: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const metadataRegex = /^-\s+\*\*(.+?)\*\*:\s*(.+)$/gm;

  let match;
  while ((match = metadataRegex.exec(content)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    metadata[key] = value;
  }

  return metadata;
}

/**
 * Parse Epic from markdown file content
 */
export function parseEpic(content: string): Epic {
  const metadata = parseMetadata(content);

  // Parse Features list
  const featuresSection = content.match(/## Features\n([\s\S]*?)(?=\n##|$)/);
  const features: string[] = [];

  if (featuresSection) {
    const featureRegex = /-\s+\[[x ]\]\s+(FEAT-\d+)/g;
    let match;
    while ((match = featureRegex.exec(featuresSection[1])) !== null) {
      features.push(match[1]);
    }
  }

  // Parse Description
  const descSection = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
  const description = descSection ? descSection[1].trim() : undefined;

  // Parse title from header
  const titleMatch = content.match(/^#\s+Epic:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : metadata['Title'] || 'Untitled';

  return {
    id: metadata['ID'],
    title,
    status: metadata['Status'] as any,
    owner: metadata['Owner'],
    estimate: parseFloat(metadata['Estimate']) || 0,
    actual: parseFloat(metadata['Actual']) || 0,
    description,
    features,
  };
}

/**
 * Parse Feature from markdown file content
 */
export function parseFeature(content: string): Feature {
  const metadata = parseMetadata(content);

  // Parse UserStories
  const storiesSection = content.match(/## User Stories\n([\s\S]*?)(?=\n##|$)/);
  const userStories: UserStory[] = [];

  if (storiesSection) {
    const storyRegex = /-\s+\[[x ]\]\s+(STORY-\d+):\s+(.+?)\s+\((\d+)h\)/g;
    let match;
    while ((match = storyRegex.exec(storiesSection[1])) !== null) {
      userStories.push({
        id: match[1],
        title: match[2].trim(),
        estimate: parseInt(match[3], 10),
        status: 'todo',
        featureId: metadata['ID'],
      });
    }
  }

  // Parse Acceptance Criteria
  const criteriaSection = content.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n##|$)/);
  const acceptanceCriteria: string[] = [];

  if (criteriaSection) {
    const criteriaRegex = /-\s+\[[x ]\]\s+(.+)$/gm;
    let match;
    while ((match = criteriaRegex.exec(criteriaSection[1])) !== null) {
      acceptanceCriteria.push(match[1].trim());
    }
  }

  // Parse Description
  const descSection = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
  const description = descSection ? descSection[1].trim() : undefined;

  // Parse title from header
  const titleMatch = content.match(/^#\s+Feature:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : metadata['Title'] || 'Untitled';

  // Parse skills required
  const skillsStr = metadata['Skills Required'] || '';
  const skillsRequired = skillsStr ? skillsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

  // Parse Dependencies
  const depsSection = content.match(/## Dependencies\n([\s\S]*?)(?=\n##|$)/);
  const dependencies: Dependency[] = [];

  if (depsSection) {
    // Parse blocks: FEAT-002, FEAT-003
    const blocksMatch = depsSection[1].match(/-\s+blocks:\s+(.+)/i);
    if (blocksMatch) {
      const blockIds = blocksMatch[1].split(',').map(s => s.trim()).filter(s => /^FEAT-\d+$/.test(s));
      blockIds.forEach(id => dependencies.push({ featureId: id, type: 'blocks' }));
    }

    // Parse relates-to: FEAT-005
    const relatesToMatch = depsSection[1].match(/-\s+relates-to:\s+(.+)/i);
    if (relatesToMatch) {
      const relatedIds = relatesToMatch[1].split(',').map(s => s.trim()).filter(s => /^FEAT-\d+$/.test(s));
      relatedIds.forEach(id => dependencies.push({ featureId: id, type: 'relates-to' }));
    }
  }

  return {
    id: metadata['ID'],
    title,
    epicId: metadata['Epic'],
    status: metadata['Status'] as any,
    assignee: metadata['Assignee'],
    estimate: parseFloat(metadata['Estimate']) || 0,
    actual: parseFloat(metadata['Actual']) || 0,
    skillsRequired,
    description,
    userStories,
    acceptanceCriteria,
    dependencies,
  };
}

/**
 * Parse Project from project.md content
 */
export function parseProject(content: string): Project {
  // Parse title from header
  const titleMatch = content.match(/^#\s+Project:\s+(.+)$/m);
  const name = titleMatch ? titleMatch[1].trim() : 'Untitled Project';

  // Parse Overview
  const overviewSection = content.match(/## Overview\n([\s\S]*?)(?=\n##|$)/);
  const overview = overviewSection ? overviewSection[1].trim() : undefined;

  // Parse Timeline
  const timelineMatch = content.match(/## Timeline\n-\s+Start:\s+(.+)\n-\s+End:\s+(.+)/);
  const timeline = timelineMatch ? {
    start: timelineMatch[1].trim(),
    end: timelineMatch[2].trim(),
  } : undefined;

  // Parse Team Capacity
  const capacityMatch = content.match(/## Team Capacity\n-\s+Total:\s+(\d+)[^\n]*\n-\s+Available:\s+(\d+)/);
  const teamCapacity = capacityMatch ? {
    total: parseInt(capacityMatch[1], 10),
    available: parseInt(capacityMatch[2], 10),
  } : undefined;

  return {
    name,
    overview,
    timeline,
    teamCapacity,
  };
}

/**
 * Parse Team from team.md content
 */
export function parseTeam(content: string): Team {
  const members: TeamMember[] = [];

  // Match each member section (### [Name])
  const memberRegex = /###\s+(.+?)\n([\s\S]*?)(?=\n###|$)/g;
  let match;

  while ((match = memberRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const memberContent = match[2];

    // Parse skills
    const skillsMatch = memberContent.match(/-\s+\*\*Skills\*\*:\s+(.+)/);
    const skills = skillsMatch ? skillsMatch[1].split(',').map(s => s.trim()) : [];

    // Parse capacity
    const capacityMatch = memberContent.match(/-\s+\*\*Capacity\*\*:\s+(\d+)\s+hours?\/week/);
    const capacity = capacityMatch ? parseInt(capacityMatch[1], 10) : 40;

    // Parse current load
    const loadMatch = memberContent.match(/-\s+\*\*Current Load\*\*:\s+(\d+)\s+hours?\/week/);
    const currentLoad = loadMatch ? parseInt(loadMatch[1], 10) : 0;

    members.push({
      name,
      skills,
      capacity,
      currentLoad,
    });
  }

  return { members };
}

/**
 * Parse Milestone from markdown file content
 */
export function parseMilestone(content: string): Milestone {
  const metadata = parseMetadata(content);

  // Parse title from header
  const titleMatch = content.match(/^#\s+Milestone:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : metadata['Title'] || 'Untitled';

  // Parse Description
  const descSection = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
  const description = descSection ? descSection[1].trim() : undefined;

  // Parse Features list (with checkboxes)
  const featuresSection = content.match(/## Features\n([\s\S]*?)(?=\n##|$)/);
  const features: string[] = [];

  if (featuresSection) {
    const featureRegex = /-\s+\[[x ]\]\s+(FEAT-\d+)/g;
    let match;
    while ((match = featureRegex.exec(featuresSection[1])) !== null) {
      features.push(match[1]);
    }
  }

  return {
    id: metadata['ID'],
    title,
    description,
    targetDate: metadata['Target Date'],
    status: metadata['Status'] as any,
    features,
  };
}

/**
 * Read and parse Epic file
 */
export async function readEpicFile(filePath: string): Promise<Epic> {
  const content = await readFile(filePath, 'utf-8');
  return parseEpic(content);
}

/**
 * Read and parse Feature file
 */
export async function readFeatureFile(filePath: string): Promise<Feature> {
  const content = await readFile(filePath, 'utf-8');
  return parseFeature(content);
}

/**
 * Read and parse Project file
 */
export async function readProjectFile(filePath: string): Promise<Project> {
  const content = await readFile(filePath, 'utf-8');
  return parseProject(content);
}

/**
 * Read and parse Team file
 */
export async function readTeamFile(filePath: string): Promise<Team> {
  const content = await readFile(filePath, 'utf-8');
  return parseTeam(content);
}

/**
 * Read and parse Milestone file
 */
export async function readMilestoneFile(filePath: string): Promise<Milestone> {
  const content = await readFile(filePath, 'utf-8');
  return parseMilestone(content);
}
