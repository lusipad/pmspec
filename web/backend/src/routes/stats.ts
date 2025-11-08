import { Router } from 'express';
import { getEpics, getFeatures, getTeam } from '../services/dataService.js';

const router = Router();

/**
 * GET /api/stats/overview
 * Get project overview statistics
 */
router.get('/overview', async (req, res) => {
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
    console.error('Error getting overview stats:', error);
    res.status(500).json({ error: 'Failed to get overview statistics' });
  }
});

/**
 * GET /api/stats/trends
 * Get trend data for charts (placeholder - needs historical data)
 */
router.get('/trends', async (req, res) => {
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
    console.error('Error getting trends:', error);
    res.status(500).json({ error: 'Failed to get trend data' });
  }
});

/**
 * GET /api/stats/team-workload
 * Get team member workload distribution
 */
router.get('/team-workload', async (req, res) => {
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
    console.error('Error getting team workload:', error);
    res.status(500).json({ error: 'Failed to get team workload data' });
  }
});

/**
 * GET /api/stats/epic-progress
 * Get progress for each epic
 */
router.get('/epic-progress', async (req, res) => {
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
    console.error('Error getting epic progress:', error);
    res.status(500).json({ error: 'Failed to get epic progress data' });
  }
});

export default router;
