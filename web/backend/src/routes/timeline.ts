import { Router, Request, Response } from 'express';
import { getEpics, getFeatures } from '../services/dataService';
import { calculateTimeline, calculateCriticalPath } from '../services/timelineService';

export const timelineRoutes = Router();

// GET /api/timeline/gantt - Get gantt chart data
timelineRoutes.get('/gantt', async (req: Request, res: Response) => {
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
    console.error('Error generating gantt data:', error);
    res.status(500).json({ error: 'Failed to generate gantt chart' });
  }
});
