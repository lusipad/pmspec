import { Router, Request, Response, NextFunction } from 'express';
import { getEpics, getFeatures } from '../services/dataService';
import { calculateTimeline, calculateCriticalPath } from '../services/timelineService';
import { createLogger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';

const logger = createLogger('timeline');

export const timelineRoutes = Router();

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
    const epics = await getEpics();
    const features = await getFeatures();

    const tasks = calculateTimeline(epics, features);
    const criticalPath = calculateCriticalPath(tasks);

    res.json({
      tasks,
      criticalPath,
    });
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to generate gantt chart', instance: req.originalUrl }));
  }
});
