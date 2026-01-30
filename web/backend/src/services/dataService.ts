import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { Epic, Feature, Milestone, Dependency } from '@pmspec/types';

const PMSPACE_DIR = path.join(process.cwd(), '..', '..', 'pmspace');

/**
 * Parse metadata from markdown frontmatter-style format
 */
function parseMetadata(content: string): Record<string, string> {
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
 * Parse Epic from markdown content
 */
function parseEpicContent(content: string): Epic {
  const metadata = parseMetadata(content);

  // Parse title
  const titleMatch = content.match(/^#\s+Epic:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

  // Parse description
  const descSection = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
  const description = descSection ? descSection[1].trim() : '';

  // Parse features list
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
    id: metadata['ID'] || '',
    title,
    description,
    status: (metadata['Status'] as any) || 'planning',
    owner: metadata['Owner'] || '',
    estimate: parseInt(metadata['Estimate']) || 0,
    actual: parseInt(metadata['Actual']) || 0,
    features,
  };
}

/**
 * Parse Feature from markdown content
 */
function parseFeatureContent(content: string): Feature {
  const metadata = parseMetadata(content);

  // Parse title
  const titleMatch = content.match(/^#\s+Feature:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

  // Parse description
  const descSection = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
  const description = descSection ? descSection[1].trim() : '';

  // Parse skills
  const skillsStr = metadata['Skills Required'] || '';
  const skillsRequired = skillsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Parse priority (with validation and default)
  const priority = metadata['Priority']?.toLowerCase();
  const validPriority = ['critical', 'high', 'medium', 'low'].includes(priority || '')
    ? (priority as any)
    : 'medium';

  // Parse Dependencies
  const depsSection = content.match(/## Dependencies\n([\s\S]*?)(?=\n##|$)/);
  const dependencies: Dependency[] = [];

  if (depsSection) {
    // Parse blocks: FEAT-002, FEAT-003
    const blocksMatch = depsSection[1].match(/-\s+blocks:\s+(.+)/i);
    if (blocksMatch) {
      const blockIds = blocksMatch[1].split(',').map((s: string) => s.trim()).filter((s: string) => /^FEAT-\d+$/.test(s));
      blockIds.forEach((id: string) => dependencies.push({ featureId: id, type: 'blocks' }));
    }

    // Parse relates-to: FEAT-005
    const relatesToMatch = depsSection[1].match(/-\s+relates-to:\s+(.+)/i);
    if (relatesToMatch) {
      const relatedIds = relatesToMatch[1].split(',').map((s: string) => s.trim()).filter((s: string) => /^FEAT-\d+$/.test(s));
      relatedIds.forEach((id: string) => dependencies.push({ featureId: id, type: 'relates-to' }));
    }
  }

  return {
    id: metadata['ID'] || '',
    epic: metadata['Epic'] || '',
    title,
    description,
    status: (metadata['Status'] as any) || 'todo',
    priority: validPriority,
    assignee: metadata['Assignee'] || '',
    estimate: parseInt(metadata['Estimate']) || 0,
    actual: parseInt(metadata['Actual']) || 0,
    skillsRequired,
    dependencies,
  };
}

/**
 * Get all epics
 */
export async function getEpics(): Promise<Epic[]> {
  try {
    const epicsDir = path.join(PMSPACE_DIR, 'epics');
    const files = await readdir(epicsDir);

    const epicFiles = files.filter((f) => f.endsWith('.md'));
    const epics: Epic[] = [];

    for (const file of epicFiles) {
      try {
        const content = await readFile(path.join(epicsDir, file), 'utf-8');
        const epic = parseEpicContent(content);
        epics.push(epic);
      } catch (err) {
        console.error(`Error parsing epic file ${file}:`, err);
      }
    }

    return epics.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Error reading epics:', error);
    return [];
  }
}

/**
 * Get epic by ID
 */
export async function getEpicById(id: string): Promise<Epic | null> {
  try {
    const epicsDir = path.join(PMSPACE_DIR, 'epics');
    const files = await readdir(epicsDir);

    for (const file of files) {
      const content = await readFile(path.join(epicsDir, file), 'utf-8');
      const epic = parseEpicContent(content);

      if (epic.id === id) {
        return epic;
      }
    }

    return null;
  } catch (error) {
    console.error('Error reading epic:', error);
    return null;
  }
}

/**
 * Get all features
 */
export async function getFeatures(): Promise<Feature[]> {
  try {
    const featuresDir = path.join(PMSPACE_DIR, 'features');
    const files = await readdir(featuresDir);

    const featureFiles = files.filter((f) => f.endsWith('.md'));
    const features: Feature[] = [];

    for (const file of featureFiles) {
      try {
        const content = await readFile(path.join(featuresDir, file), 'utf-8');
        const feature = parseFeatureContent(content);
        features.push(feature);
      } catch (err) {
        console.error(`Error parsing feature file ${file}:`, err);
      }
    }

    return features.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Error reading features:', error);
    return [];
  }
}

/**
 * Get feature by ID
 */
export async function getFeatureById(id: string): Promise<Feature | null> {
  try {
    const featuresDir = path.join(PMSPACE_DIR, 'features');
    const files = await readdir(featuresDir);

    for (const file of files) {
      const content = await readFile(path.join(featuresDir, file), 'utf-8');
      const feature = parseFeatureContent(content);

      if (feature.id === id) {
        return feature;
      }
    }

    return null;
  } catch (error) {
    console.error('Error reading feature:', error);
    return null;
  }
}

/**
 * Get team data
 */
export async function getTeam(): Promise<any> {
  try {
    const teamFile = path.join(PMSPACE_DIR, 'team.md');
    const content = await readFile(teamFile, 'utf-8');

    // Simple parsing - extract member sections
    const memberSections = content.split(/###\s+/).slice(1);
    const members = memberSections.map((section) => {
      const lines = section.split('\n');
      const name = lines[0].trim();
      const metadata = parseMetadata(section);

      const skillsStr = metadata['Skills'] || '';
      const skills = skillsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const capacityMatch = metadata['Capacity']?.match(/(\d+)/);
      const loadMatch = metadata['Current Load']?.match(/(\d+)/);

      return {
        name,
        skills,
        capacity: capacityMatch ? parseInt(capacityMatch[1]) : 40,
        currentLoad: loadMatch ? parseInt(loadMatch[1]) : 0,
      };
    });

    return { members };
  } catch (error) {
    console.error('Error reading team:', error);
    return { members: [] };
  }
}

/**
 * Parse Milestone from markdown content
 */
function parseMilestoneContent(content: string): Milestone {
  const metadata = parseMetadata(content);

  // Parse title
  const titleMatch = content.match(/^#\s+Milestone:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

  // Parse description
  const descSection = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
  const description = descSection ? descSection[1].trim() : undefined;

  // Parse features list (with checkboxes)
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
    id: metadata['ID'] || '',
    title,
    description,
    targetDate: metadata['Target Date'] || '',
    status: (metadata['Status'] as any) || 'upcoming',
    features,
  };
}

/**
 * Generate Milestone markdown content
 */
function generateMilestoneMarkdown(milestone: Milestone): string {
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
 * Get all milestones
 */
export async function getMilestones(): Promise<Milestone[]> {
  try {
    const milestonesDir = path.join(PMSPACE_DIR, 'milestones');
    let files: string[];
    try {
      files = await readdir(milestonesDir);
    } catch {
      return [];
    }

    const milestoneFiles = files.filter((f) => f.endsWith('.md'));
    const milestones: Milestone[] = [];

    for (const file of milestoneFiles) {
      try {
        const content = await readFile(path.join(milestonesDir, file), 'utf-8');
        const milestone = parseMilestoneContent(content);
        milestones.push(milestone);
      } catch (err) {
        console.error(`Error parsing milestone file ${file}:`, err);
      }
    }

    return milestones.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  } catch (error) {
    console.error('Error reading milestones:', error);
    return [];
  }
}

/**
 * Get milestone by ID
 */
export async function getMilestoneById(id: string): Promise<Milestone | null> {
  try {
    const milestonesDir = path.join(PMSPACE_DIR, 'milestones');
    let files: string[];
    try {
      files = await readdir(milestonesDir);
    } catch {
      return null;
    }

    for (const file of files) {
      const content = await readFile(path.join(milestonesDir, file), 'utf-8');
      const milestone = parseMilestoneContent(content);

      if (milestone.id === id) {
        return milestone;
      }
    }

    return null;
  } catch (error) {
    console.error('Error reading milestone:', error);
    return null;
  }
}

/**
 * Create a new milestone
 */
export async function createMilestone(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
  const milestonesDir = path.join(PMSPACE_DIR, 'milestones');
  
  // Ensure directory exists
  await mkdir(milestonesDir, { recursive: true });

  // Get existing milestones to determine next ID
  const existingMilestones = await getMilestones();
  const existingIds = existingMilestones.map(m => m.id);
  
  // Generate next ID
  let nextNum = 1;
  if (existingIds.length > 0) {
    const numbers = existingIds.map(id => parseInt(id.replace('MILE-', ''), 10));
    nextNum = Math.max(...numbers) + 1;
  }
  const newId = `MILE-${nextNum.toString().padStart(3, '0')}`;

  const newMilestone: Milestone = {
    id: newId,
    ...milestone,
  };

  const content = generateMilestoneMarkdown(newMilestone);
  await writeFile(path.join(milestonesDir, `${newId.toLowerCase()}.md`), content, 'utf-8');

  return newMilestone;
}

/**
 * Update an existing milestone
 */
export async function updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone | null> {
  const milestonesDir = path.join(PMSPACE_DIR, 'milestones');
  const existing = await getMilestoneById(id);
  
  if (!existing) {
    return null;
  }

  const updated: Milestone = {
    ...existing,
    ...updates,
    id, // Ensure ID is not changed
  };

  const content = generateMilestoneMarkdown(updated);
  await writeFile(path.join(milestonesDir, `${id.toLowerCase()}.md`), content, 'utf-8');

  return updated;
}
