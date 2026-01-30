import Papa from 'papaparse';
import type { Feature } from '@pmspec/types';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';

const PMSPACE_DIR = path.join(process.cwd(), '..', '..', 'pmspace');

interface FeatureCSVRow {
  ID: string;
  Epic: string;
  Title: string;
  Status: string;
  Priority?: string;
  Assignee: string;
  Estimate: string;
  Actual: string;
  'Skills Required': string;
  Description?: string;
}

/**
 * Convert Feature to CSV row
 */
function featureToCSVRow(feature: Feature): FeatureCSVRow {
  return {
    ID: feature.id,
    Epic: feature.epic,
    Title: feature.title,
    Status: feature.status,
    Priority: feature.priority || 'medium',
    Assignee: feature.assignee || '',
    Estimate: feature.estimate.toString(),
    Actual: feature.actual.toString(),
    'Skills Required': feature.skillsRequired.join(', '),
    Description: feature.description || '',
  };
}

/**
 * Convert CSV row to Feature
 */
function csvRowToFeature(row: FeatureCSVRow): Feature {
  const skills = row['Skills Required']
    ? row['Skills Required'].split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const priority = row.Priority?.toLowerCase();
  const validPriority = ['critical', 'high', 'medium', 'low'].includes(priority || '')
    ? (priority as any)
    : 'medium';

  return {
    id: row.ID,
    epic: row.Epic,
    title: row.Title,
    description: row.Description || '',
    status: (row.Status as any) || 'todo',
    priority: validPriority,
    assignee: row.Assignee || '',
    estimate: parseInt(row.Estimate) || 0,
    actual: parseInt(row.Actual) || 0,
    skillsRequired: skills,
  };
}

/**
 * Validate CSV row
 */
interface ValidationError {
  row: number;
  field: string;
  message: string;
}

function validateFeatureRow(row: FeatureCSVRow, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!row.ID) {
    errors.push({ row: rowIndex, field: 'ID', message: 'ID is required' });
  } else if (!/^FEAT-\d+$/.test(row.ID)) {
    errors.push({ row: rowIndex, field: 'ID', message: 'ID must match format FEAT-XXX' });
  }

  if (!row.Epic) {
    errors.push({ row: rowIndex, field: 'Epic', message: 'Epic is required' });
  }

  if (!row.Title) {
    errors.push({ row: rowIndex, field: 'Title', message: 'Title is required' });
  }

  if (!row.Status) {
    errors.push({ row: rowIndex, field: 'Status', message: 'Status is required' });
  } else if (!['todo', 'in-progress', 'done'].includes(row.Status)) {
    errors.push({ row: rowIndex, field: 'Status', message: 'Status must be todo, in-progress, or done' });
  }

  // Priority validation (optional field)
  if (row.Priority && !['critical', 'high', 'medium', 'low'].includes(row.Priority.toLowerCase())) {
    errors.push({ row: rowIndex, field: 'Priority', message: 'Priority must be: critical, high, medium, or low' });
  }

  // Numeric fields
  if (row.Estimate && isNaN(parseInt(row.Estimate))) {
    errors.push({ row: rowIndex, field: 'Estimate', message: 'Estimate must be a number' });
  }

  if (row.Actual && isNaN(parseInt(row.Actual))) {
    errors.push({ row: rowIndex, field: 'Actual', message: 'Actual must be a number' });
  }

  return errors;
}

/**
 * Export features to CSV
 */
export function featuresToCSV(features: Feature[]): string {
  const rows = features.map(featureToCSVRow);
  return Papa.unparse(rows, {
    columns: ['ID', 'Epic', 'Title', 'Status', 'Priority', 'Assignee', 'Estimate', 'Actual', 'Skills Required', 'Description'],
  });
}

/**
 * Import features from CSV
 */
export function csvToFeatures(csvContent: string): {
  features: Feature[];
  errors: ValidationError[];
} {
  const parsed = Papa.parse<FeatureCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: ValidationError[] = [];
  const features: Feature[] = [];

  parsed.data.forEach((row, index) => {
    const rowErrors = validateFeatureRow(row, index + 2); // +2 because row 1 is header, index starts at 0
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      features.push(csvRowToFeature(row));
    }
  });

  return { features, errors };
}

/**
 * Generate feature markdown content
 */
function generateFeatureMarkdown(feature: Feature): string {
  return `# Feature: ${feature.title}

- **ID**: ${feature.id}
- **Epic**: ${feature.epic}
- **Status**: ${feature.status}
- **Priority**: ${feature.priority || 'medium'}
- **Assignee**: ${feature.assignee || ''}
- **Estimate**: ${feature.estimate} hours
- **Actual**: ${feature.actual} hours
- **Skills Required**: ${feature.skillsRequired.join(', ')}

## Description
${feature.description || ''}

## User Stories
(Add user stories here)

## Acceptance Criteria
(Add acceptance criteria here)
`;
}

/**
 * Write feature to markdown file
 */
export async function writeFeatureFile(feature: Feature): Promise<void> {
  const filename = `${feature.id.toLowerCase()}.md`;
  const filepath = path.join(PMSPACE_DIR, 'features', filename);
  const content = generateFeatureMarkdown(feature);
  await writeFile(filepath, content, 'utf-8');
}

/**
 * Get CSV template
 */
export function getCSVTemplate(): string {
  const template = [
    {
      ID: 'FEAT-001',
      Epic: 'EPIC-001',
      Title: 'Example Feature',
      Status: 'todo',
      Priority: 'high',
      Assignee: 'Alice',
      Estimate: '16',
      Actual: '0',
      'Skills Required': 'React, TypeScript',
      Description: 'This is an example feature description',
    },
    {
      ID: 'FEAT-002',
      Epic: 'EPIC-001',
      Title: 'Another Feature',
      Status: 'in-progress',
      Priority: 'medium',
      Assignee: 'Bob',
      Estimate: '24',
      Actual: '10',
      'Skills Required': 'Node.js, Express',
      Description: 'Another example feature',
    },
    {
      ID: 'FEAT-003',
      Epic: 'EPIC-002',
      Title: 'Critical Bug Fix',
      Status: 'todo',
      Priority: 'critical',
      Assignee: 'Charlie',
      Estimate: '8',
      Actual: '0',
      'Skills Required': 'Debugging, Testing',
      Description: 'Fix critical production issue',
    },
  ];

  return Papa.unparse(template, {
    columns: ['ID', 'Epic', 'Title', 'Status', 'Priority', 'Assignee', 'Estimate', 'Actual', 'Skills Required', 'Description'],
  });
}
