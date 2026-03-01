import { Router, Request, Response, NextFunction } from 'express';
import { getFeatures, getFeatureById } from '../services/dataService';
import { writeFeatureFile } from '../services/csvService';
import { wsService } from '../services/websocket';
import { unlink } from 'fs/promises';
import path from 'path';
import { createLogger } from '../utils/logger';
import { NotFoundError, ValidationError, ConflictError, InternalServerError } from '../utils/errors';
import { getPmspaceDir } from '../config/paths';
import type { Feature, FeatureStatus, Priority } from '@pmspec/types';

const logger = createLogger('features');

export const featureRoutes = Router();

const PMSPACE_DIR = getPmspaceDir();
const VALID_FEATURE_STATUSES: FeatureStatus[] = ['todo', 'in-progress', 'done'];
const VALID_PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
const ALLOWED_SORT_FIELDS = ['id', 'title', 'epic', 'priority', 'status', 'assignee', 'estimate', 'actual'] as const;
type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

function normalizeFeatureStatus(rawStatus: unknown): FeatureStatus | null {
  if (typeof rawStatus !== 'string') {
    return null;
  }

  const normalized = rawStatus
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  const canonical = normalized === 'inprogress'
    ? 'in-progress'
    : normalized === 'to-do'
      ? 'todo'
      : normalized;

  return VALID_FEATURE_STATUSES.includes(canonical as FeatureStatus)
    ? (canonical as FeatureStatus)
    : null;
}

function normalizePriority(rawPriority: unknown): Priority | null {
  if (typeof rawPriority !== 'string') {
    return null;
  }

  const normalized = rawPriority.trim().toLowerCase();
  const mapped: Record<string, Priority> = {
    p0: 'critical',
    p1: 'high',
    p2: 'medium',
    p3: 'low',
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
  };

  return mapped[normalized] ?? null;
}

function parseNonNegativeNumber(rawValue: unknown, fallback = 0): number {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return Math.max(0, rawValue);
  }

  if (typeof rawValue === 'string' && rawValue.trim()) {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return fallback;
}

function buildStatusValidationError(instance: string): ValidationError {
  return new ValidationError({
    detail: 'Status must be one of: todo, in-progress, done',
    instance,
    errors: [{ field: 'status', message: 'Allowed values: todo, in-progress, done' }],
  });
}

function buildPriorityValidationError(instance: string): ValidationError {
  return new ValidationError({
    detail: 'Priority must be one of: critical, high, medium, low',
    instance,
    errors: [{ field: 'priority', message: 'Allowed values: critical, high, medium, low' }],
  });
}

function parsePositiveInt(rawValue: unknown, fallback: number): number {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return fallback;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function isSortField(value: string): value is SortField {
  return ALLOWED_SORT_FIELDS.includes(value as SortField);
}

function compareStringValue(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function sortFeatures(features: Feature[], sortBy: SortField, sortOrder: 'asc' | 'desc'): Feature[] {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sorted = [...features].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityDiff = (PRIORITY_ORDER[a.priority ?? 'medium'] - PRIORITY_ORDER[b.priority ?? 'medium']) * direction;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return compareStringValue(a.id, b.id) * direction;
    }

    if (sortBy === 'estimate' || sortBy === 'actual') {
      const diff = (a[sortBy] - b[sortBy]) * direction;
      if (diff !== 0) {
        return diff;
      }
      return compareStringValue(a.id, b.id) * direction;
    }

    const left = String(a[sortBy] ?? '');
    const right = String(b[sortBy] ?? '');
    const diff = compareStringValue(left, right) * direction;
    if (diff !== 0) {
      return diff;
    }

    return compareStringValue(a.id, b.id) * direction;
  });

  return sorted;
}

/**
 * @openapi
 * /api/features:
 *   get:
 *     summary: List all features
 *     description: Retrieve a list of all features in the project
 *     tags: [Features]
 *     responses:
 *       200:
 *         description: List of features
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Feature'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/features - List all features
featureRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusFilter = typeof req.query.status === 'string' ? normalizeFeatureStatus(req.query.status) : null;
    if (typeof req.query.status === 'string' && req.query.status !== 'all' && !statusFilter) {
      throw buildStatusValidationError(req.originalUrl);
    }

    const priorityFilter = typeof req.query.priority === 'string' ? normalizePriority(req.query.priority) : null;
    if (typeof req.query.priority === 'string' && req.query.priority !== 'all' && !priorityFilter) {
      throw buildPriorityValidationError(req.originalUrl);
    }

    const assigneeFilter = typeof req.query.assignee === 'string' ? req.query.assignee.trim() : '';
    const epicFilter = typeof req.query.epic === 'string' ? req.query.epic.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const rawSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'id';
    const sortBy: SortField = isSortField(rawSortBy) ? rawSortBy : 'id';
    const sortOrder: 'asc' | 'desc' =
      typeof req.query.sortOrder === 'string' && req.query.sortOrder.toLowerCase() === 'desc'
        ? 'desc'
        : 'asc';

    const shouldPaginate = req.query.page !== undefined || req.query.pageSize !== undefined;
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = Math.min(200, parsePositiveInt(req.query.pageSize, 25));

    const features = await getFeatures();
    const filtered = features.filter((feature) => {
      if (statusFilter && feature.status !== statusFilter) {
        return false;
      }
      if (priorityFilter && (feature.priority ?? 'medium') !== priorityFilter) {
        return false;
      }
      if (epicFilter && feature.epic !== epicFilter) {
        return false;
      }
      if (assigneeFilter && feature.assignee !== assigneeFilter) {
        return false;
      }
      if (search) {
        const searchable = `${feature.id} ${feature.title} ${feature.description ?? ''}`.toLowerCase();
        if (!searchable.includes(search)) {
          return false;
        }
      }
      return true;
    });

    const sorted = sortFeatures(filtered, sortBy, sortOrder);
    if (!shouldPaginate) {
      res.json(sorted);
      return;
    }

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const data = sorted.slice(start, start + pageSize);

    res.json({
      data,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to fetch features', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features/{id}:
 *   get:
 *     summary: Get a specific feature
 *     description: Retrieve details of a specific feature by its ID
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *         example: FEAT-001
 *     responses:
 *       200:
 *         description: Feature details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feature'
 *       404:
 *         description: Feature not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/features/:id - Get specific feature
featureRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const feature = await getFeatureById(id);

    if (!feature) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    res.json(feature);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to fetch feature', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features/{id}/dependencies:
 *   get:
 *     summary: Get feature dependency chain
 *     description: Retrieve the full dependency chain for a specific feature (both direct and transitive)
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *         example: FEAT-001
 *     responses:
 *       200:
 *         description: Dependency chain
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 featureId:
 *                   type: string
 *                 directDependencies:
 *                   type: array
 *                   items:
 *                     type: object
 *                 transitiveDependencies:
 *                   type: array
 *                   items:
 *                     type: string
 *                 dependents:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Feature not found
 *       500:
 *         description: Server error
 */
// GET /api/features/:id/dependencies - Get dependency chain for a feature
featureRoutes.get('/:id/dependencies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const feature = await getFeatureById(id);

    if (!feature) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    const allFeatures = await getFeatures();
    const featureMap = new Map(allFeatures.map(f => [f.id, f]));

    // Get transitive dependencies (all features this one depends on, directly or indirectly)
    const transitiveDeps = new Set<string>();
    const visited = new Set<string>();
    
    function collectDependencies(featId: string) {
      if (visited.has(featId)) return;
      visited.add(featId);
      
      const feat = featureMap.get(featId);
      if (feat?.dependencies) {
        for (const dep of feat.dependencies) {
          if (dep.type === 'blocks') {
            transitiveDeps.add(dep.featureId);
            collectDependencies(dep.featureId);
          }
        }
      }
    }
    
    collectDependencies(id);
    transitiveDeps.delete(id); // Remove self if present

    // Get dependents (features that depend on this one)
    const dependents: string[] = [];
    for (const f of allFeatures) {
      if (f.dependencies?.some(d => d.featureId === id && d.type === 'blocks')) {
        dependents.push(f.id);
      }
    }

    res.json({
      featureId: id,
      directDependencies: feature.dependencies || [],
      transitiveDependencies: Array.from(transitiveDeps),
      dependents,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to fetch dependencies', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features:
 *   post:
 *     summary: Create a new feature
 *     description: Create a new feature with the provided data
 *     tags: [Features]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FeatureInput'
 *     responses:
 *       201:
 *         description: Feature created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feature'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Feature already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/features - Create new feature
featureRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feature = req.body as Record<string, unknown>;
    const id = typeof feature.id === 'string' ? feature.id.trim() : '';
    const title = typeof feature.title === 'string' ? feature.title.trim() : '';
    const epic = typeof feature.epic === 'string' ? feature.epic.trim() : '';

    // Basic validation
    if (!id || !title || !epic) {
      throw new ValidationError({
        detail: 'ID, title, and epic are required',
        instance: req.originalUrl,
        errors: [
          ...(!id ? [{ field: 'id', message: 'ID is required' }] : []),
          ...(!title ? [{ field: 'title', message: 'Title is required' }] : []),
          ...(!epic ? [{ field: 'epic', message: 'Epic is required' }] : []),
        ],
      });
    }

    const normalizedStatus = feature.status == null
      ? 'todo'
      : normalizeFeatureStatus(feature.status);
    if (!normalizedStatus) {
      throw buildStatusValidationError(req.originalUrl);
    }

    const normalizedFeature = {
      ...feature,
      id,
      title,
      epic,
      status: normalizedStatus,
      assignee: typeof feature.assignee === 'string' ? feature.assignee.trim() : '',
      estimate: parseNonNegativeNumber(feature.estimate, 0),
      actual: parseNonNegativeNumber(feature.actual, 0),
      skillsRequired: Array.isArray(feature.skillsRequired)
        ? feature.skillsRequired
            .filter((skill): skill is string => typeof skill === 'string')
            .map((skill) => skill.trim())
            .filter(Boolean)
        : [],
    };

    // Check if feature already exists
    const existing = await getFeatureById(id);
    if (existing) {
      throw new ConflictError({ detail: `Feature ${id} already exists`, instance: req.originalUrl });
    }

    // Write feature file
    await writeFeatureFile(normalizedFeature);

    // Broadcast WebSocket notification
    wsService.broadcastFeatureUpdate(id, 'created', normalizedFeature);

    res.status(201).json(normalizedFeature);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to create feature', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features/{id}:
 *   put:
 *     summary: Update a feature
 *     description: Update an existing feature with the provided data
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FeatureInput'
 *     responses:
 *       200:
 *         description: Feature updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feature'
 *       404:
 *         description: Feature not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PUT /api/features/:id - Update existing feature
featureRoutes.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body as Record<string, unknown>;

    // Check if feature exists
    const existing = await getFeatureById(id);
    if (!existing) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    const normalizedStatus = updates.status == null
      ? normalizeFeatureStatus(existing.status)
      : normalizeFeatureStatus(updates.status);
    if (!normalizedStatus) {
      throw buildStatusValidationError(req.originalUrl);
    }

    const normalizedPriority = updates.priority == null
      ? normalizePriority(existing.priority ?? 'medium')
      : normalizePriority(updates.priority);
    if (!normalizedPriority) {
      throw buildPriorityValidationError(req.originalUrl);
    }

    // Merge updates
    const updatedFeature = {
      ...existing,
      ...updates,
      id,
      status: normalizedStatus,
      priority: normalizedPriority,
      title: typeof updates.title === 'string' ? updates.title.trim() : existing.title,
      epic: typeof updates.epic === 'string' ? updates.epic.trim() : existing.epic,
      assignee: typeof updates.assignee === 'string' ? updates.assignee.trim() : existing.assignee,
      estimate: updates.estimate == null ? existing.estimate : parseNonNegativeNumber(updates.estimate, existing.estimate),
      actual: updates.actual == null ? existing.actual : parseNonNegativeNumber(updates.actual, existing.actual),
      skillsRequired: Array.isArray(updates.skillsRequired)
        ? updates.skillsRequired
            .filter((skill): skill is string => typeof skill === 'string')
            .map((skill) => skill.trim())
            .filter(Boolean)
        : existing.skillsRequired,
      description: typeof updates.description === 'string' ? updates.description : existing.description,
    }; // Keep original ID

    // Write updated feature
    await writeFeatureFile(updatedFeature);

    // Broadcast WebSocket notification
    wsService.broadcastFeatureUpdate(id, 'updated', updatedFeature);

    res.json(updatedFeature);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to update feature', instance: req.originalUrl }));
  }
});

// PATCH /api/features/:id - Partially update feature
featureRoutes.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body as Record<string, unknown>;

    const existing = await getFeatureById(id);
    if (!existing) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      throw new ValidationError({
        detail: 'At least one field must be provided',
        instance: req.originalUrl,
        errors: [{ field: 'updates', message: 'Request body cannot be empty' }],
      });
    }

    const normalizedStatus = updates.status == null
      ? normalizeFeatureStatus(existing.status)
      : normalizeFeatureStatus(updates.status);
    if (!normalizedStatus) {
      throw buildStatusValidationError(req.originalUrl);
    }

    const normalizedPriority = updates.priority == null
      ? normalizePriority(existing.priority ?? 'medium')
      : normalizePriority(updates.priority);
    if (!normalizedPriority) {
      throw buildPriorityValidationError(req.originalUrl);
    }

    const nextFeature: Feature = {
      ...existing,
      ...updates,
      id,
      status: normalizedStatus,
      priority: normalizedPriority,
      title: typeof updates.title === 'string' ? updates.title.trim() : existing.title,
      epic: typeof updates.epic === 'string' ? updates.epic.trim() : existing.epic,
      assignee: typeof updates.assignee === 'string' ? updates.assignee.trim() : existing.assignee,
      estimate: updates.estimate == null ? existing.estimate : parseNonNegativeNumber(updates.estimate, existing.estimate),
      actual: updates.actual == null ? existing.actual : parseNonNegativeNumber(updates.actual, existing.actual),
      skillsRequired: Array.isArray(updates.skillsRequired)
        ? updates.skillsRequired
            .filter((skill): skill is string => typeof skill === 'string')
            .map((skill) => skill.trim())
            .filter(Boolean)
        : existing.skillsRequired,
      description: typeof updates.description === 'string' ? updates.description : existing.description,
    };

    await writeFeatureFile(nextFeature);
    wsService.broadcastFeatureUpdate(id, 'updated', nextFeature);
    res.json(nextFeature);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to update feature', instance: req.originalUrl }));
  }
});

interface BatchFeatureUpdateRequest {
  ids?: string[];
  updates?: {
    status?: FeatureStatus;
    priority?: Priority;
    assignee?: string;
  };
}

// POST /api/features/batch - Batch update features
featureRoutes.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as BatchFeatureUpdateRequest;
    const ids = Array.isArray(body.ids)
      ? body.ids.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean)
      : [];
    const updates = body.updates ?? {};

    if (ids.length === 0) {
      throw new ValidationError({
        detail: 'ids must contain at least one feature id',
        instance: req.originalUrl,
        errors: [{ field: 'ids', message: 'At least one feature id is required' }],
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new ValidationError({
        detail: 'updates cannot be empty',
        instance: req.originalUrl,
        errors: [{ field: 'updates', message: 'Provide at least one update field' }],
      });
    }

    const normalizedStatus = updates.status == null ? null : normalizeFeatureStatus(updates.status);
    if (updates.status != null && !normalizedStatus) {
      throw buildStatusValidationError(req.originalUrl);
    }

    const normalizedPriority = updates.priority == null ? null : normalizePriority(updates.priority);
    if (updates.priority != null && !normalizedPriority) {
      throw buildPriorityValidationError(req.originalUrl);
    }

    const failed: Array<{ id: string; message: string }> = [];
    const updatedItems: Feature[] = [];

    for (const id of ids) {
      try {
        const existing = await getFeatureById(id);
        if (!existing) {
          failed.push({ id, message: 'Feature not found' });
          continue;
        }

        const nextFeature: Feature = {
          ...existing,
          status: normalizedStatus ?? existing.status,
          priority: normalizedPriority ?? (existing.priority ?? 'medium'),
          assignee: updates.assignee == null ? existing.assignee : updates.assignee.trim(),
        };

        await writeFeatureFile(nextFeature);
        wsService.broadcastFeatureUpdate(id, 'updated', nextFeature);
        updatedItems.push(nextFeature);
      } catch (error) {
        logger.error({ error, featureId: id }, 'Failed to batch update feature');
        failed.push({ id, message: 'Write failed' });
      }
    }

    res.json({
      updated: updatedItems.length,
      failed,
      items: updatedItems,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to batch update features', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features/{id}:
 *   delete:
 *     summary: Delete a feature
 *     description: Delete an existing feature by its ID
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *     responses:
 *       204:
 *         description: Feature deleted successfully
 *       404:
 *         description: Feature not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DELETE /api/features/:id - Delete feature
featureRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if feature exists
    const existing = await getFeatureById(id);
    if (!existing) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    // Delete feature file
    const filename = `${id.toLowerCase()}.md`;
    const filepath = path.join(PMSPACE_DIR, 'features', filename);
    await unlink(filepath);

    // Broadcast WebSocket notification
    wsService.broadcastFeatureUpdate(id, 'deleted');

    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to delete feature', instance: req.originalUrl }));
  }
});
