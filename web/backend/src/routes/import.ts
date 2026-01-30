import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createLogger } from '../utils/logger';
import { ValidationError, InternalServerError } from '../utils/errors';

// The importers will need to be copied or linked from the core package
// For now, we implement a simplified inline version for the web backend
import { z } from 'zod';

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
type ImportSource = 'jira' | 'linear' | 'github';

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
};

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
 *           enum: [jira, linear, github]
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
 *     description: Returns list of supported import sources (jira, linear, github)
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
 *                 enum: [jira, linear, github]
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
        detail: 'Invalid or missing source parameter. Must be one of: jira, linear, github', 
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

    logger.info({ 
      source, 
      success: result.success, 
      features: result.stats.featuresImported,
      errors: result.stats.errors 
    }, 'Import completed');

    res.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    logger.error({ error, source }, 'Import failed');
    next(new InternalServerError({ detail: 'Import failed', instance: req.originalUrl }));
  }
}
