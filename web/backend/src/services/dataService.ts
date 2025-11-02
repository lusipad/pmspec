import { readdir, readFile } from 'fs/promises';
import path from 'path';
import type { Epic, Feature } from '../../../shared/types';

const PMSPACE_DIR = path.join(process.cwd(), 'pmspace');

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

  return {
    id: metadata['ID'] || '',
    epic: metadata['Epic'] || '',
    title,
    description,
    status: (metadata['Status'] as any) || 'todo',
    assignee: metadata['Assignee'] || '',
    estimate: parseInt(metadata['Estimate']) || 0,
    actual: parseInt(metadata['Actual']) || 0,
    skillsRequired,
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
