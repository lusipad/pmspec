import { Router, Request, Response, NextFunction } from 'express';
import { getEpics, getFeatures, getTeam } from '../services/dataService.js';
import { createLogger } from '../utils/logger.js';
import { InternalServerError } from '../utils/errors.js';

const logger = createLogger('stats');

const router = Router();

/**
 * @openapi
 * /api/stats/overview:
 *   get:
 *     summary: Get project overview statistics
 *     description: Retrieve comprehensive statistics about features, hours, epics, and team
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Project overview statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OverviewStats'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [epics, features, team] = await Promise.all([
      getEpics(),
      getFeatures(),
      getTeam(),
    ]);

    // Feature statistics
    const totalFeatures = features.length;
    const featuresByStatus = {
      todo: features.filter((f) => f.status === 'todo').length,
      'in-progress': features.filter((f) => f.status === 'in-progress').length,
      done: features.filter((f) => f.status === 'done').length,
    };

    // Hours statistics
    const totalEstimatedHours = features.reduce((sum, f) => sum + f.estimate, 0);
    const totalActualHours = features.reduce((sum, f) => sum + f.actual, 0);
    const completedFeatures = features.filter((f) => f.status === 'done');
    const completedEstimatedHours = completedFeatures.reduce(
      (sum, f) => sum + f.estimate,
      0
    );
    const completionRate =
      totalEstimatedHours > 0
        ? (completedEstimatedHours / totalEstimatedHours) * 100
        : 0;

    // Epic statistics
    const totalEpics = epics.length;
    const epicsByStatus = {
      planning: epics.filter((e) => e.status === 'planning').length,
      'in-progress': epics.filter((e) => e.status === 'in-progress').length,
      completed: epics.filter((e) => e.status === 'completed').length,
    };

    // Team statistics
    const totalMembers = team.members.length;
    const totalCapacity = team.members.reduce(
      (sum: number, m: any) => sum + m.capacity,
      0
    );
    const totalLoad = team.members.reduce(
      (sum: number, m: any) => sum + m.currentLoad,
      0
    );
    const averageUtilization =
      totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0;

    res.json({
      features: {
        total: totalFeatures,
        byStatus: featuresByStatus,
      },
      hours: {
        estimated: totalEstimatedHours,
        actual: totalActualHours,
        completed: completedEstimatedHours,
        completionRate: Math.round(completionRate * 10) / 10,
      },
      epics: {
        total: totalEpics,
        byStatus: epicsByStatus,
      },
      team: {
        totalMembers,
        totalCapacity,
        totalLoad,
        averageUtilization: Math.round(averageUtilization * 10) / 10,
      },
    });
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to get overview statistics', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/stats/trends:
 *   get:
 *     summary: Get trend data for charts
 *     description: Retrieve trend data showing feature progress over time
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Trend data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrendData'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Placeholder for trend data
    // In a real implementation, this would query historical data
    const features = await getFeatures();

    // Generate sample trend data based on current state
    const today = new Date();
    const trends = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Simulate progress over time
      const progress = ((7 - i) / 7) * 100;
      const doneCount = Math.floor(
        (features.filter((f) => f.status === 'done').length * (7 - i)) / 7
      );

      trends.push({
        date: date.toISOString().split('T')[0],
        completed: doneCount,
        inProgress: i === 0 ? features.filter((f) => f.status === 'in-progress').length : Math.max(1, Math.floor(features.length * 0.3)),
        todo: features.length - doneCount - (i === 0 ? features.filter((f) => f.status === 'in-progress').length : Math.max(1, Math.floor(features.length * 0.3))),
      });
    }

    res.json({ trends });
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to get trend data', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/stats/team-workload:
 *   get:
 *     summary: Get team member workload distribution
 *     description: Retrieve workload statistics for each team member
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Team workload data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamWorkload'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/team-workload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [features, team] = await Promise.all([getFeatures(), getTeam()]);

    // Calculate workload per team member
    const workloadByMember = team.members.map((member: any) => {
      const assignedFeatures = features.filter(
        (f) => f.assignee === member.name
      );
      const totalEstimate = assignedFeatures.reduce(
        (sum, f) => sum + f.estimate,
        0
      );
      const completedEstimate = assignedFeatures
        .filter((f) => f.status === 'done')
        .reduce((sum, f) => sum + f.estimate, 0);

      return {
        name: member.name,
        capacity: member.capacity,
        assigned: totalEstimate,
        completed: completedEstimate,
        remaining: totalEstimate - completedEstimate,
        utilization:
          member.capacity > 0
            ? Math.round((totalEstimate / member.capacity) * 100)
            : 0,
        featureCount: assignedFeatures.length,
      };
    });

    res.json({ workload: workloadByMember });
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to get team workload data', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/stats/epic-progress:
 *   get:
 *     summary: Get progress for each epic
 *     description: Retrieve progress statistics for all epics
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Epic progress data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EpicProgress'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/epic-progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [epics, features] = await Promise.all([getEpics(), getFeatures()]);

    const epicProgress = epics.map((epic) => {
      const epicFeatures = features.filter((f) => f.epic === epic.id);
      const totalFeatures = epicFeatures.length;
      const completedFeatures = epicFeatures.filter(
        (f) => f.status === 'done'
      ).length;
      const inProgressFeatures = epicFeatures.filter(
        (f) => f.status === 'in-progress'
      ).length;

      const totalEstimate = epicFeatures.reduce((sum, f) => sum + f.estimate, 0);
      const completedEstimate = epicFeatures
        .filter((f) => f.status === 'done')
        .reduce((sum, f) => sum + f.estimate, 0);

      return {
        id: epic.id,
        title: epic.title,
        status: epic.status,
        totalFeatures,
        completedFeatures,
        inProgressFeatures,
        progressPercent:
          totalFeatures > 0
            ? Math.round((completedFeatures / totalFeatures) * 100)
            : 0,
        hoursProgress:
          totalEstimate > 0
            ? Math.round((completedEstimate / totalEstimate) * 100)
            : 0,
        estimate: epic.estimate,
        actual: epic.actual,
      };
    });

    res.json({ epics: epicProgress });
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to get epic progress data', instance: req.originalUrl }));
  }
});

export default router;
