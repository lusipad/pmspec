import { Router, Request, Response, NextFunction } from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { createLogger } from '../utils/logger';
import { NotFoundError, ValidationError, InternalServerError } from '../utils/errors';

const logger = createLogger('changelog');

export const changelogRoutes = Router();

const PMSPACE_DIR = path.join(process.cwd(), '..', '..', 'pmspace');
const CHANGELOG_FILE = path.join(PMSPACE_DIR, 'changelog.json');

interface ChangelogEntry {
  id: string;
  timestamp: string;
  entityType: 'epic' | 'feature' | 'milestone' | 'story';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  user?: string;
}

interface ChangelogFile {
  version: string;
  lastUpdated: string;
  entries: ChangelogEntry[];
}

/**
 * Read changelog file
 */
async function readChangelog(): Promise<ChangelogFile> {
  try {
    const content = await readFile(CHANGELOG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        entries: [],
      };
    }
    throw error;
  }
}

/**
 * Write changelog file
 */
async function writeChangelog(data: ChangelogFile): Promise<void> {
  await mkdir(path.dirname(CHANGELOG_FILE), { recursive: true });
  data.lastUpdated = new Date().toISOString();
  await writeFile(CHANGELOG_FILE, JSON.stringify(data, null, 2));
}

/**
 * Generate a unique changelog entry ID
 */
function generateChangelogId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `CHG-${timestamp}-${random}`;
}

/**
 * @openapi
 * /api/changelog:
 *   get:
 *     summary: List changelog entries
 *     description: Retrieve changelog entries with optional filtering and pagination
 *     tags: [Changelog]
 *     parameters:
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter by entity ID
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [epic, feature, milestone, story]
 *         description: Filter by entity type
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [create, update, delete]
 *         description: Filter by action type
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter entries since date (YYYY-MM-DD)
 *       - in: query
 *         name: until
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter entries until date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of entries to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of entries to skip
 *     responses:
 *       200:
 *         description: List of changelog entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChangelogEntry'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       500:
 *         description: Server error
 */
changelogRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      entityId,
      entityType,
      action,
      since,
      until,
      limit = '50',
      offset = '0',
    } = req.query;

    const changelog = await readChangelog();
    let entries = [...changelog.entries];

    // Apply filters
    if (entityId) {
      entries = entries.filter(e => e.entityId.toUpperCase() === String(entityId).toUpperCase());
    }

    if (entityType) {
      entries = entries.filter(e => e.entityType === entityType);
    }

    if (action) {
      entries = entries.filter(e => e.action === action);
    }

    if (since) {
      const sinceDate = new Date(String(since));
      entries = entries.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    if (until) {
      const untilDate = new Date(String(until));
      untilDate.setHours(23, 59, 59, 999); // End of day
      entries = entries.filter(e => new Date(e.timestamp) <= untilDate);
    }

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = entries.length;
    const limitNum = parseInt(String(limit));
    const offsetNum = parseInt(String(offset));

    // Apply pagination
    entries = entries.slice(offsetNum, offsetNum + limitNum);

    res.json({
      entries,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch changelog');
    next(new InternalServerError({ detail: 'Failed to fetch changelog', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/changelog/{entityId}:
 *   get:
 *     summary: Get changelog for a specific entity
 *     description: Retrieve all changelog entries for a specific entity
 *     tags: [Changelog]
 *     parameters:
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity ID (e.g., FEAT-001, EPIC-001)
 *     responses:
 *       200:
 *         description: Changelog entries for the entity
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entityId:
 *                   type: string
 *                 entries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChangelogEntry'
 *       500:
 *         description: Server error
 */
changelogRoutes.get('/:entityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    const changelog = await readChangelog();

    const entries = changelog.entries
      .filter(e => e.entityId.toUpperCase() === entityId.toUpperCase())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      entityId: entityId.toUpperCase(),
      entries,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch entity changelog');
    next(new InternalServerError({ detail: 'Failed to fetch entity changelog', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/changelog/stats:
 *   get:
 *     summary: Get changelog statistics
 *     description: Retrieve statistics about changelog entries
 *     tags: [Changelog]
 *     responses:
 *       200:
 *         description: Changelog statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEntries:
 *                   type: integer
 *                 byEntityType:
 *                   type: object
 *                 byAction:
 *                   type: object
 *                 recentActivity:
 *                   type: object
 *       500:
 *         description: Server error
 */
changelogRoutes.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const changelog = await readChangelog();
    const entries = changelog.entries;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const byEntityType: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    let last24h = 0;
    let last7d = 0;
    let last30d = 0;

    for (const entry of entries) {
      byEntityType[entry.entityType] = (byEntityType[entry.entityType] || 0) + 1;
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;

      const entryDate = new Date(entry.timestamp);
      if (entryDate >= oneDayAgo) last24h++;
      if (entryDate >= oneWeekAgo) last7d++;
      if (entryDate >= oneMonthAgo) last30d++;
    }

    res.json({
      totalEntries: entries.length,
      byEntityType,
      byAction,
      recentActivity: { last24h, last7d, last30d },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch changelog stats');
    next(new InternalServerError({ detail: 'Failed to fetch changelog stats', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/changelog:
 *   post:
 *     summary: Add a changelog entry
 *     description: Add a new entry to the changelog
 *     tags: [Changelog]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *               - entityId
 *               - action
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [epic, feature, milestone, story]
 *               entityId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [create, update, delete]
 *               field:
 *                 type: string
 *               oldValue:
 *                 type: any
 *               newValue:
 *                 type: any
 *               user:
 *                 type: string
 *     responses:
 *       201:
 *         description: Changelog entry created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChangelogEntry'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
changelogRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId, action, field, oldValue, newValue, user } = req.body;

    // Validate required fields
    if (!entityType || !entityId || !action) {
      throw new ValidationError({
        detail: 'entityType, entityId, and action are required',
        instance: req.originalUrl,
        errors: [
          ...(!entityType ? [{ field: 'entityType', message: 'entityType is required' }] : []),
          ...(!entityId ? [{ field: 'entityId', message: 'entityId is required' }] : []),
          ...(!action ? [{ field: 'action', message: 'action is required' }] : []),
        ],
      });
    }

    // Validate entityType
    if (!['epic', 'feature', 'milestone', 'story'].includes(entityType)) {
      throw new ValidationError({
        detail: 'Invalid entityType',
        instance: req.originalUrl,
        errors: [{ field: 'entityType', message: 'Must be epic, feature, milestone, or story' }],
      });
    }

    // Validate action
    if (!['create', 'update', 'delete'].includes(action)) {
      throw new ValidationError({
        detail: 'Invalid action',
        instance: req.originalUrl,
        errors: [{ field: 'action', message: 'Must be create, update, or delete' }],
      });
    }

    const entry: ChangelogEntry = {
      id: generateChangelogId(),
      timestamp: new Date().toISOString(),
      entityType,
      entityId: entityId.toUpperCase(),
      action,
      field,
      oldValue,
      newValue,
      user,
    };

    const changelog = await readChangelog();
    changelog.entries.push(entry);
    await writeChangelog(changelog);

    logger.info({ entry }, 'Changelog entry created');
    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    logger.error({ error }, 'Failed to create changelog entry');
    next(new InternalServerError({ detail: 'Failed to create changelog entry', instance: req.originalUrl }));
  }
});
