import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import type { Feature, FeatureStatus, Priority } from '@pmspec/types';
import { createLogger } from '../utils/logger';
import { ValidationError, InternalServerError } from '../utils/errors';
import { writeFeatureFile } from '../services/csvService';
import { getFeatures } from '../services/dataService';

const logger = createLogger('import');

export const importRoutes = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Type definitions for import functionality
type ImportSource = 'jira' | 'linear' | 'github' | 'azure-devops' | 'feishu' | 'tencent-docs';

interface ImportResult {
  success: boolean;
  source: ImportSource;
  features: any[];
  epics: any[];
  milestones: any[];
  errors: { field?: string; message: string }[];
  warnings: { field?: string; message: string }[];
  stats: {
    totalItems: number;
    featuresImported: number;
    epicsImported: number;
    milestonesImported: number;
    skipped: number;
    errors: number;
  };
}

interface Importer {
  source: ImportSource;
  name: string;
  description: string;
  validate(content: string): Promise<{ valid: boolean; errors: string[] }>;
  import(options: { content: string; dryRun?: boolean; merge?: boolean }): Promise<ImportResult>;
}

// Simplified importers for web backend
const importers: Record<ImportSource, Importer> = {
  jira: {
    source: 'jira',
    name: 'Jira Importer',
    description: 'Import issues from Jira JSON export file',
    async validate(content) {
      try {
        const data = JSON.parse(content);
        if (!data.issues || !Array.isArray(data.issues)) {
          return { valid: false, errors: ['Invalid format: missing issues array'] };
        }
        if (data.issues.length === 0) {
          return { valid: false, errors: ['No issues found'] };
        }
        return { valid: true, errors: [] };
      } catch {
        return { valid: false, errors: ['Invalid JSON'] };
      }
    },
    async import(options) {
      const data = JSON.parse(options.content);
      const features: any[] = [];
      const epics = new Map<string, any>();
      
      for (const issue of data.issues) {
        if (issue.fields?.issuetype?.name?.toLowerCase() === 'epic') {
          epics.set(issue.key, {
            id: issue.key.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: issue.fields.summary,
            description: issue.fields.description || '',
            originalId: issue.key,
          });
        }
      }
      
      let idx = 1;
      for (const issue of data.issues) {
        if (issue.fields?.issuetype?.name?.toLowerCase() === 'epic') continue;
        
        const epicKey = issue.fields?.parent?.key || issue.fields?.customfield_10014;
        const epic = epicKey ? epics.get(epicKey) : undefined;
        
        features.push({
          id: `feat-${String(idx++).padStart(3, '0')}`,
          name: issue.fields?.summary || '',
          description: issue.fields?.description || '',
          estimate: issue.fields?.timeoriginalestimate ? Math.ceil(issue.fields.timeoriginalestimate / 3600) : 8,
          assignee: issue.fields?.assignee?.displayName || 'Unassigned',
          priority: mapPriority(issue.fields?.priority?.name || 'medium'),
          status: mapStatus(issue.fields?.status?.name || 'To Do'),
          category: epic?.name || 'Uncategorized',
          tags: [`jira:${issue.key}`, ...(issue.fields?.labels || [])],
        });
      }
      
      return {
        success: true,
        source: 'jira',
        features,
        epics: Array.from(epics.values()),
        milestones: [],
        errors: [],
        warnings: [],
        stats: {
          totalItems: data.issues.length,
          featuresImported: features.length,
          epicsImported: epics.size,
          milestonesImported: 0,
          skipped: 0,
          errors: 0,
        },
      };
    },
  },
  linear: {
    source: 'linear',
    name: 'Linear Importer',
    description: 'Import issues from Linear JSON export file',
    async validate(content) {
      try {
        const data = JSON.parse(content);
        if (!data.issues || !Array.isArray(data.issues)) {
          return { valid: false, errors: ['Invalid format: missing issues array'] };
        }
        if (data.issues.length === 0) {
          return { valid: false, errors: ['No issues found'] };
        }
        return { valid: true, errors: [] };
      } catch {
        return { valid: false, errors: ['Invalid JSON'] };
      }
    },
    async import(options) {
      const data = JSON.parse(options.content);
      const features: any[] = [];
      const projects = new Map<string, any>();
      
      for (const issue of data.issues) {
        if (issue.project && !projects.has(issue.project.id)) {
          projects.set(issue.project.id, {
            id: issue.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: issue.project.name,
            description: issue.project.description || '',
            originalId: issue.project.id,
          });
        }
      }
      
      let idx = 1;
      for (const issue of data.issues) {
        const project = issue.project ? projects.get(issue.project.id) : undefined;
        const priorityMap: Record<number, string> = { 1: 'critical', 2: 'high', 3: 'medium', 4: 'low' };
        
        features.push({
          id: `feat-${String(idx++).padStart(3, '0')}`,
          name: issue.title || '',
          description: issue.description || '',
          estimate: issue.estimate ? issue.estimate * 4 : 8,
          assignee: issue.assignee?.name || 'Unassigned',
          priority: priorityMap[issue.priority] || 'medium',
          status: mapLinearState(issue.state?.type || 'unstarted'),
          category: project?.name || 'Uncategorized',
          tags: [`linear:${issue.identifier}`, ...(issue.labels?.nodes?.map((l: any) => l.name) || [])],
        });
      }
      
      return {
        success: true,
        source: 'linear',
        features,
        epics: Array.from(projects.values()),
        milestones: [],
        errors: [],
        warnings: [],
        stats: {
          totalItems: data.issues.length,
          featuresImported: features.length,
          epicsImported: projects.size,
          milestonesImported: 0,
          skipped: 0,
          errors: 0,
        },
      };
    },
  },
  github: {
    source: 'github',
    name: 'GitHub Issues Importer',
    description: 'Import issues from GitHub API export or JSON file',
    async validate(content) {
      try {
        const data = JSON.parse(content);
        const issues = Array.isArray(data) ? data : data.issues;
        if (!issues || !Array.isArray(issues)) {
          return { valid: false, errors: ['Invalid format: missing issues array'] };
        }
        if (issues.length === 0) {
          return { valid: false, errors: ['No issues found'] };
        }
        return { valid: true, errors: [] };
      } catch {
        return { valid: false, errors: ['Invalid JSON'] };
      }
    },
    async import(options) {
      const data = JSON.parse(options.content);
      const issues = Array.isArray(data) ? data : data.issues;
      const features: any[] = [];
      const milestones = new Map<number, any>();
      const epics = new Map<string, any>();
      
      for (const issue of issues) {
        if (issue.milestone && !milestones.has(issue.milestone.number)) {
          milestones.set(issue.milestone.number, {
            id: issue.milestone.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: issue.milestone.title,
            description: issue.milestone.description || '',
            dueDate: issue.milestone.due_on?.split('T')[0],
            originalId: String(issue.milestone.number),
          });
        }
        
        // Extract epic from labels
        for (const label of (issue.labels || [])) {
          const name = label.name?.toLowerCase() || '';
          if (name.startsWith('epic:') || name.startsWith('category:')) {
            const epicName = label.name.substring(label.name.indexOf(':') + 1).trim();
            if (!epics.has(epicName)) {
              epics.set(epicName, {
                id: epicName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                name: epicName,
                description: '',
                originalId: label.name,
              });
            }
          }
        }
      }
      
      let idx = 1;
      for (const issue of issues) {
        const labels = issue.labels || [];
        const labelNames = labels.map((l: any) => l.name?.toLowerCase() || '');
        
        // Extract category
        let category = 'Uncategorized';
        for (const label of labels) {
          const name = label.name?.toLowerCase() || '';
          if (name.startsWith('epic:') || name.startsWith('category:')) {
            category = label.name.substring(label.name.indexOf(':') + 1).trim();
            break;
          }
        }
        
        features.push({
          id: `feat-${String(idx++).padStart(3, '0')}`,
          name: issue.title || '',
          description: issue.body || '',
          estimate: extractEstimate(labelNames),
          assignee: issue.assignee?.login || issue.assignees?.[0]?.login || 'Unassigned',
          priority: extractPriority(labelNames),
          status: issue.state === 'closed' ? 'done' : 'todo',
          category,
          tags: [
            `github:#${issue.number}`,
            ...(issue.milestone ? [`milestone:${issue.milestone.title}`] : []),
            ...labels.map((l: any) => l.name).filter((n: string) => !n.toLowerCase().startsWith('epic:') && !n.toLowerCase().startsWith('category:')),
          ],
        });
      }
      
      return {
        success: true,
        source: 'github',
        features,
        epics: Array.from(epics.values()),
        milestones: Array.from(milestones.values()),
        errors: [],
        warnings: [],
        stats: {
          totalItems: issues.length,
          featuresImported: features.length,
          epicsImported: epics.size,
          milestonesImported: milestones.size,
          skipped: 0,
          errors: 0,
        },
      };
    },
  },
  'azure-devops': {
    source: 'azure-devops',
    name: 'Azure DevOps Importer',
    description: 'Import work items from Azure DevOps JSON export',
    async validate(content) {
      const items = parseJsonList(content, ['value', 'workItems', 'items']);
      if (!items) {
        return { valid: false, errors: ['Invalid JSON or missing work item array'] };
      }
      if (items.length === 0) {
        return { valid: false, errors: ['No work items found'] };
      }
      return { valid: true, errors: [] };
    },
    async import(options) {
      const items = parseJsonList(options.content, ['value', 'workItems', 'items']) ?? [];
      const features: any[] = [];
      const epics = new Map<string, any>();

      let idx = 1;
      for (const item of items) {
        const fields = item.fields || {};
        const epicName = fields['System.AreaPath'] || fields['System.IterationPath'] || 'General';
        if (!epics.has(epicName)) {
          epics.set(epicName, {
            id: String(epicName).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: epicName,
            description: '',
            originalId: epicName,
          });
        }

        features.push({
          id: `feat-${String(idx++).padStart(3, '0')}`,
          name: fields['System.Title'] || `Work Item ${item.id ?? idx}`,
          description: fields['System.Description'] || '',
          estimate: Math.max(4, Math.ceil((fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 2) * 4)),
          assignee: fields['System.AssignedTo']?.displayName || fields['System.AssignedTo'] || 'Unassigned',
          priority: mapPriority(String(fields['Microsoft.VSTS.Common.Priority'] || 'medium')),
          status: mapStatus(fields['System.State'] || 'New'),
          category: epicName,
          tags: [`azure-devops:${item.id ?? idx}`],
        });
      }

      return {
        success: true,
        source: 'azure-devops',
        features,
        epics: Array.from(epics.values()),
        milestones: [],
        errors: [],
        warnings: [],
        stats: {
          totalItems: items.length,
          featuresImported: features.length,
          epicsImported: epics.size,
          milestonesImported: 0,
          skipped: 0,
          errors: 0,
        },
      };
    },
  },
  feishu: {
    source: 'feishu',
    name: 'Feishu Importer',
    description: 'Import tasks from Feishu table JSON export',
    async validate(content) {
      const items = parseJsonList(content, ['items', 'records', 'data']);
      if (!items) {
        return { valid: false, errors: ['Invalid JSON or missing records array'] };
      }
      if (items.length === 0) {
        return { valid: false, errors: ['No records found'] };
      }
      return { valid: true, errors: [] };
    },
    async import(options) {
      const items = parseJsonList(options.content, ['items', 'records', 'data']) ?? [];
      const features: any[] = [];
      const epics = new Map<string, any>();

      let idx = 1;
      for (const row of items) {
        const category = row.group || row.epic || row.project || 'Feishu';
        if (!epics.has(category)) {
          epics.set(category, {
            id: String(category).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: category,
            description: '',
            originalId: category,
          });
        }

        features.push({
          id: `feat-${String(idx++).padStart(3, '0')}`,
          name: row.title || row.name || `Feishu Task ${idx}`,
          description: row.description || '',
          estimate: Number(row.estimateHours || row.estimate || 8),
          assignee: row.owner || row.assignee || 'Unassigned',
          priority: mapPriority(row.priority || 'medium'),
          status: mapStatus(row.status || 'todo'),
          category,
          tags: [`feishu:${row.id || idx}`],
        });
      }

      return {
        success: true,
        source: 'feishu',
        features,
        epics: Array.from(epics.values()),
        milestones: [],
        errors: [],
        warnings: [],
        stats: {
          totalItems: items.length,
          featuresImported: features.length,
          epicsImported: epics.size,
          milestonesImported: 0,
          skipped: 0,
          errors: 0,
        },
      };
    },
  },
  'tencent-docs': {
    source: 'tencent-docs',
    name: 'Tencent Docs Importer',
    description: 'Import tasks from Tencent Docs CSV or JSON export',
    async validate(content) {
      const jsonItems = parseJsonList(content, ['items', 'records', 'data']);
      if (jsonItems && jsonItems.length > 0) {
        return { valid: true, errors: [] };
      }

      const rows = parseCsvRows(content);
      if (rows.length < 2) {
        return { valid: false, errors: ['Invalid CSV format or empty data'] };
      }
      return { valid: true, errors: [] };
    },
    async import(options) {
      const jsonItems = parseJsonList(options.content, ['items', 'records', 'data']);
      let rows: Array<Record<string, string>> = [];

      if (jsonItems) {
        rows = jsonItems.map((item) => ({
          title: item.title || item.name || '',
          description: item.description || '',
          assignee: item.assignee || item.owner || '',
          status: item.status || '',
          priority: item.priority || '',
          estimate: String(item.estimate || item.estimateHours || 8),
          epic: item.epic || item.group || 'Tencent Docs',
          id: String(item.id || ''),
        }));
      } else {
        const csvRows = parseCsvRows(options.content);
        const headers = csvRows[0].map((header) => header.toLowerCase());
        rows = csvRows.slice(1).map((values) => {
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] ?? '';
          });
          return row;
        });
      }

      const features: any[] = [];
      const epics = new Map<string, any>();

      rows.forEach((row, index) => {
        const epic = row.epic || row.project || 'Tencent Docs';
        if (!epics.has(epic)) {
          epics.set(epic, {
            id: epic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: epic,
            description: '',
            originalId: epic,
          });
        }

        features.push({
          id: `feat-${String(index + 1).padStart(3, '0')}`,
          name: row.title || row.name || `Tencent Task ${index + 1}`,
          description: row.description || '',
          estimate: Number(row.estimate || 8),
          assignee: row.assignee || row.owner || 'Unassigned',
          priority: mapPriority(row.priority || 'medium'),
          status: mapStatus(row.status || 'todo'),
          category: epic,
          tags: [`tencent-docs:${row.id || index + 1}`],
        });
      });

      return {
        success: true,
        source: 'tencent-docs',
        features,
        epics: Array.from(epics.values()),
        milestones: [],
        errors: [],
        warnings: [],
        stats: {
          totalItems: rows.length,
          featuresImported: features.length,
          epicsImported: epics.size,
          milestonesImported: 0,
          skipped: 0,
          errors: 0,
        },
      };
    },
  },
};

function parseJsonList(content: string, candidates: string[]): any[] | null {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }

    for (const candidate of candidates) {
      const value = (data as Record<string, unknown>)[candidate];
      if (Array.isArray(value)) {
        return value as any[];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function parseCsvRows(content: string): string[][] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((part) => part.trim().replace(/^"|"$/g, '')));
}

function toFeatureStatus(status: string): FeatureStatus {
  const normalized = mapStatus(status);
  if (normalized === 'in-progress') return 'in-progress';
  if (normalized === 'done') return 'done';
  return 'todo';
}

function toPriority(priority: string): Priority {
  const normalized = mapPriority(priority);
  if (normalized === 'critical' || normalized === 'high' || normalized === 'low') {
    return normalized;
  }
  return 'medium';
}

function toEpicId(raw: string): string {
  if (/^EPIC-\d+$/i.test(raw)) {
    return raw.toUpperCase();
  }
  return 'EPIC-PLAN';
}

function toSkills(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag).trim())
    .filter((tag) => tag.length > 0 && !tag.includes(':'))
    .slice(0, 5);
}

function allocateFeatureId(usedIds: Set<string>): string {
  let counter = 1;
  while (usedIds.has(`FEAT-${String(counter).padStart(3, '0')}`)) {
    counter += 1;
  }
  const id = `FEAT-${String(counter).padStart(3, '0')}`;
  usedIds.add(id);
  return id;
}

function mapPriority(p: string): string {
  const lower = p.toLowerCase();
  if (['critical', 'blocker', 'highest', 'urgent'].includes(lower)) return 'critical';
  if (['high'].includes(lower)) return 'high';
  if (['low', 'lowest', 'trivial'].includes(lower)) return 'low';
  return 'medium';
}

function mapStatus(s: string): string {
  const lower = s.toLowerCase();
  if (['done', 'closed', 'completed', 'resolved'].includes(lower)) return 'done';
  if (['in progress', 'in-progress', 'started', 'active'].includes(lower)) return 'in-progress';
  if (['blocked', 'on hold', 'waiting'].includes(lower)) return 'blocked';
  return 'todo';
}

function mapLinearState(type: string): string {
  const lower = type.toLowerCase();
  if (['completed', 'done'].includes(lower)) return 'done';
  if (['started', 'inprogress'].includes(lower)) return 'in-progress';
  if (['canceled', 'cancelled'].includes(lower)) return 'blocked';
  return 'todo';
}

function extractPriority(labels: string[]): string {
  for (const l of labels) {
    if (l.startsWith('priority:') || l.startsWith('p:')) return mapPriority(l.split(':')[1]);
    if (['critical', 'blocker', 'urgent'].includes(l)) return 'critical';
    if (['high', 'important'].includes(l)) return 'high';
    if (['low', 'minor'].includes(l)) return 'low';
  }
  return 'medium';
}

function extractEstimate(labels: string[]): number {
  for (const l of labels) {
    if (l.startsWith('estimate:') || l.startsWith('size:') || l.startsWith('points:')) {
      const val = parseInt(l.split(':')[1], 10);
      if (!isNaN(val)) return val * 4;
    }
    if (['xs', 'extra-small'].includes(l)) return 2;
    if (['s', 'small'].includes(l)) return 4;
    if (['m', 'medium'].includes(l)) return 8;
    if (['l', 'large'].includes(l)) return 16;
    if (['xl', 'extra-large'].includes(l)) return 32;
  }
  return 8;
}

function getImporter(source: ImportSource): Importer {
  const importer = importers[source];
  if (!importer) throw new Error(`Unknown import source: ${source}`);
  return importer;
}

function getAllImporters(): Importer[] {
  return Object.values(importers);
}

function isValidSource(source: string): source is ImportSource {
  return source in importers;
}

/**
 * @openapi
 * components:
 *   schemas:
 *     ImportPreviewResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         source:
 *           type: string
 *           enum: [jira, linear, github, azure-devops, feishu, tencent-docs]
 *         stats:
 *           type: object
 *           properties:
 *             totalItems:
 *               type: number
 *             featuresImported:
 *               type: number
 *             epicsImported:
 *               type: number
 *             milestonesImported:
 *               type: number
 *             skipped:
 *               type: number
 *             errors:
 *               type: number
 *         features:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Feature'
 *         epics:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               originalId:
 *                 type: string
 *         milestones:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 *         warnings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 */

/**
 * @openapi
 * /api/import/sources:
 *   get:
 *     summary: List available import sources
 *     description: Returns list of supported import sources
 *     tags: [Import]
 *     responses:
 *       200:
 *         description: List of import sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       source:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 */
importRoutes.get('/sources', async (req: Request, res: Response) => {
  try {
    const importers = getAllImporters();
    const sources = importers.map((i) => ({
      source: i.source,
      name: i.name,
      description: i.description,
    }));
    res.json({ sources });
  } catch (error) {
    logger.error({ error }, 'Failed to get import sources');
    res.status(500).json({ error: 'Failed to get import sources' });
  }
});

/**
 * @openapi
 * /api/import/jira:
 *   post:
 *     summary: Import from Jira
 *     description: Import issues from Jira JSON export file
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Jira JSON export file
 *               dryRun:
 *                 type: boolean
 *                 description: Preview import without writing files
 *               merge:
 *                 type: boolean
 *                 description: Merge with existing features
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: Import result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportPreviewResult'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
importRoutes.post('/jira', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  await handleImport('jira', req, res, next);
});

/**
 * @openapi
 * /api/import/linear:
 *   post:
 *     summary: Import from Linear
 *     description: Import issues from Linear JSON export file
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Linear JSON export file
 *               dryRun:
 *                 type: boolean
 *                 description: Preview import without writing files
 *               merge:
 *                 type: boolean
 *                 description: Merge with existing features
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: Import result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportPreviewResult'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
importRoutes.post('/linear', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  await handleImport('linear', req, res, next);
});

/**
 * @openapi
 * /api/import/github:
 *   post:
 *     summary: Import from GitHub
 *     description: Import issues from GitHub JSON export file
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: GitHub issues JSON file
 *               dryRun:
 *                 type: boolean
 *                 description: Preview import without writing files
 *               merge:
 *                 type: boolean
 *                 description: Merge with existing features
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: Import result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportPreviewResult'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
importRoutes.post('/github', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  await handleImport('github', req, res, next);
});

importRoutes.post('/azure-devops', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  await handleImport('azure-devops', req, res, next);
});

importRoutes.post('/feishu', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  await handleImport('feishu', req, res, next);
});

importRoutes.post('/tencent-docs', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  await handleImport('tencent-docs', req, res, next);
});

/**
 * @openapi
 * /api/import/validate:
 *   post:
 *     summary: Validate import file
 *     description: Validate an import file without importing
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               source:
 *                 type: string
 *                 enum: [jira, linear, github, azure-devops, feishu, tencent-docs]
 *             required:
 *               - file
 *               - source
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
importRoutes.post('/validate', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ValidationError({ detail: 'No file uploaded', instance: req.originalUrl });
    }

    const source = req.body.source;
    if (!source || !isValidSource(source)) {
      throw new ValidationError({ 
        detail: 'Invalid or missing source parameter. Must be one of: jira, linear, github, azure-devops, feishu, tencent-docs',
        instance: req.originalUrl 
      });
    }

    const content = req.file.buffer.toString('utf-8');
    const importer = getImporter(source as ImportSource);
    const result = await importer.validate(content);

    res.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    logger.error({ error }, 'Validation failed');
    next(new InternalServerError({ detail: 'Validation failed', instance: req.originalUrl }));
  }
});

async function handleImport(source: ImportSource, req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ValidationError({ detail: 'No file uploaded', instance: req.originalUrl });
    }

    const content = req.file.buffer.toString('utf-8');
    const dryRun = req.body.dryRun === 'true' || req.body.dryRun === true;
    const merge = req.body.merge === 'true' || req.body.merge === true;

    logger.info({ source, dryRun, merge, fileSize: req.file.size }, 'Starting import');

    const importer = getImporter(source);
    
    // First validate
    const validation = await importer.validate(content);
    if (!validation.valid) {
      throw new ValidationError({
        detail: 'Invalid import file format',
        instance: req.originalUrl,
        errors: validation.errors.map((e) => ({ field: 'file', message: e })),
      });
    }

    // Perform import
    const result = await importer.import({
      content,
      dryRun,
      merge,
    });

    let persisted = { created: 0, updated: 0 };
    if (!dryRun) {
      const existingFeatures = await getFeatures();
      const usedIds = new Set(existingFeatures.map((feature) => feature.id.toUpperCase()));
      const existingByTitle = new Map(existingFeatures.map((feature) => [feature.title.trim().toLowerCase(), feature]));

      for (const row of result.features) {
        const rowTitle = String(row.name || row.title || '').trim();
        const matched = merge ? existingByTitle.get(rowTitle.toLowerCase()) : undefined;
        const featureId = matched?.id ?? (/^FEAT-\d+$/i.test(String(row.id || '')) ? String(row.id).toUpperCase() : allocateFeatureId(usedIds));
        usedIds.add(featureId);

        const feature: Feature = {
          id: featureId,
          epic: toEpicId(String(row.category || row.epic || 'EPIC-PLAN')),
          title: rowTitle || featureId,
          description: String(row.description || ''),
          status: toFeatureStatus(String(row.status || 'todo')),
          priority: toPriority(String(row.priority || 'medium')),
          assignee: String(row.assignee || ''),
          estimate: Number(row.estimate || 8),
          actual: Number(row.actual || 0),
          skillsRequired: toSkills(row.tags),
          dependencies: [],
        };

        await writeFeatureFile(feature);
        if (matched) {
          persisted.updated += 1;
        } else {
          persisted.created += 1;
        }
      }
    }

    logger.info({ 
      source, 
      success: result.success, 
      features: result.stats.featuresImported,
      errors: result.stats.errors,
      dryRun,
      persisted,
    }, 'Import completed');

    res.json({
      ...result,
      persisted,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    logger.error({ error, source }, 'Import failed');
    next(new InternalServerError({ detail: 'Import failed', instance: req.originalUrl }));
  }
}
