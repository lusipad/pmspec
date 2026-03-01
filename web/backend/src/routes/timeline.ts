import { Router, Request, Response, NextFunction } from 'express';
import { getEpics, getFeatures } from '../services/dataService';
import { calculateTimeline, calculateCriticalPath } from '../services/timelineService';
import { createLogger } from '../utils/logger';
import { InternalServerError, ValidationError } from '../utils/errors';
import type { FeatureStatus } from '@pmspec/types';

const logger = createLogger('timeline');

export const timelineRoutes = Router();
const VALID_FEATURE_STATUSES: FeatureStatus[] = ['todo', 'in-progress', 'done'];

/**
 * @openapi
 * /api/timeline/gantt:
 *   get:
 *     summary: Get Gantt chart data
 *     description: Retrieve timeline data for Gantt chart visualization including tasks and critical path
 *     tags: [Timeline]
 *     responses:
 *       200:
 *         description: Gantt chart data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GanttData'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/timeline/gantt - Get gantt chart data
timelineRoutes.get('/gantt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const epicFilter = typeof req.query.epic === 'string' ? req.query.epic.trim() : '';
    const assigneeFilter = typeof req.query.assignee === 'string' ? req.query.assignee.trim() : '';
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    if (statusFilter && !VALID_FEATURE_STATUSES.includes(statusFilter as FeatureStatus)) {
      throw new ValidationError({
        detail: 'status must be one of: todo, in-progress, done',
        instance: req.originalUrl,
        errors: [{ field: 'status', message: 'Allowed values: todo, in-progress, done' }],
      });
    }

    const epics = await getEpics();
    const allFeatures = await getFeatures();
    const filteredFeatures = allFeatures.filter((feature) => {
      if (epicFilter && feature.epic !== epicFilter) {
        return false;
      }
      if (assigneeFilter && feature.assignee !== assigneeFilter) {
        return false;
      }
      if (statusFilter && feature.status !== statusFilter) {
        return false;
      }
      return true;
    });

    const filteredEpicIds = new Set(filteredFeatures.map((feature) => feature.epic));
    const filteredEpics = epics.filter((epic) => {
      if (epicFilter) {
        return epic.id === epicFilter;
      }
      if (filteredFeatures.length > 0) {
        return filteredEpicIds.has(epic.id);
      }
      return false;
    });

    const timelineEpics = filteredFeatures.length === 0 && !epicFilter && !assigneeFilter && !statusFilter
      ? epics
      : filteredEpics;

    const tasks = calculateTimeline(timelineEpics, filteredFeatures);
    const criticalPath = calculateCriticalPath(tasks);

    res.json({
      tasks,
      criticalPath,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to generate gantt chart', instance: req.originalUrl }));
  }
});
