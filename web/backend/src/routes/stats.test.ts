import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import statsRoutes from './stats';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Mock dataService
vi.mock('../services/dataService.js', () => ({
  getEpics: vi.fn(),
  getFeatures: vi.fn(),
  getTeam: vi.fn(),
}));

import { getEpics, getFeatures, getTeam } from '../services/dataService.js';

const mockGetEpics = vi.mocked(getEpics);
const mockGetFeatures = vi.mocked(getFeatures);
const mockGetTeam = vi.mocked(getTeam);

// Create test app with error handler
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/stats', statsRoutes);
  app.use(errorHandler);
  app.use(notFoundHandler);
  return app;
}

// Mock data
const mockEpics = [
  { id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: 'Alice', estimate: 40, actual: 0, features: [] },
  { id: 'EPIC-002', title: 'Epic 2', status: 'in-progress', owner: 'Bob', estimate: 80, actual: 40, features: [] },
  { id: 'EPIC-003', title: 'Epic 3', status: 'completed', owner: 'Charlie', estimate: 20, actual: 22, features: [] },
];

const mockFeatures = [
  { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: [] },
  { id: 'FEAT-002', epic: 'EPIC-001', title: 'Feature 2', status: 'in-progress', priority: 'medium', assignee: 'Bob', estimate: 16, actual: 8, skillsRequired: [] },
  { id: 'FEAT-003', epic: 'EPIC-002', title: 'Feature 3', status: 'done', priority: 'low', assignee: 'Alice', estimate: 8, actual: 10, skillsRequired: [] },
  { id: 'FEAT-004', epic: 'EPIC-002', title: 'Feature 4', status: 'done', priority: 'critical', assignee: 'Bob', estimate: 24, actual: 20, skillsRequired: [] },
];

const mockTeam = {
  members: [
    { name: 'Alice', skills: ['TypeScript', 'React'], capacity: 40, currentLoad: 20 },
    { name: 'Bob', skills: ['Node.js', 'Express'], capacity: 40, currentLoad: 30 },
  ],
};

describe('Stats Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/stats/overview', () => {
    it('should return overview statistics with 200 status', async () => {
      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/stats/overview');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('features');
      expect(response.body).toHaveProperty('hours');
      expect(response.body).toHaveProperty('epics');
      expect(response.body).toHaveProperty('team');
      expect(response.body.features.total).toBe(4);
      expect(response.body.epics.total).toBe(3);
    });

    it('should calculate feature status counts correctly', async () => {
      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/stats/overview');

      expect(response.body.features.byStatus.todo).toBe(1);
      expect(response.body.features.byStatus['in-progress']).toBe(1);
      expect(response.body.features.byStatus.done).toBe(2);
    });

    it('should calculate hours statistics correctly', async () => {
      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/stats/overview');

      expect(response.body.hours.estimated).toBe(56); // 8+16+8+24
      expect(response.body.hours.actual).toBe(38); // 0+8+10+20
    });

    it('should calculate team statistics correctly', async () => {
      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/stats/overview');

      expect(response.body.team.totalMembers).toBe(2);
      expect(response.body.team.totalCapacity).toBe(80);
      expect(response.body.team.totalLoad).toBe(50);
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetEpics.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/stats/overview');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.detail).toBe('Failed to get overview statistics');
    });
  });

  describe('GET /api/stats/trends', () => {
    it('should return trends data with 200 status', async () => {
      mockGetFeatures.mockResolvedValue(mockFeatures);

      const app = createApp();
      const response = await request(app).get('/api/stats/trends');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('trends');
      expect(Array.isArray(response.body.trends)).toBe(true);
      expect(response.body.trends.length).toBe(7);
    });

    it('should include date and status counts in trend data', async () => {
      mockGetFeatures.mockResolvedValue(mockFeatures);

      const app = createApp();
      const response = await request(app).get('/api/stats/trends');

      const firstTrend = response.body.trends[0];
      expect(firstTrend).toHaveProperty('date');
      expect(firstTrend).toHaveProperty('completed');
      expect(firstTrend).toHaveProperty('inProgress');
      expect(firstTrend).toHaveProperty('todo');
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetFeatures.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/stats/trends');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.detail).toBe('Failed to get trend data');
    });
  });

  describe('GET /api/stats/team-workload', () => {
    it('should return team workload data with 200 status', async () => {
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/stats/team-workload');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('workload');
      expect(Array.isArray(response.body.workload)).toBe(true);
    });

    it('should calculate workload per team member', async () => {
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/stats/team-workload');

      const aliceWorkload = response.body.workload.find((w: any) => w.name === 'Alice');
      expect(aliceWorkload).toBeDefined();
      expect(aliceWorkload.capacity).toBe(40);
      expect(aliceWorkload.featureCount).toBe(2);
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetFeatures.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/stats/team-workload');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.detail).toBe('Failed to get team workload data');
    });
  });

  describe('GET /api/stats/epic-progress', () => {
    it('should return epic progress data with 200 status', async () => {
      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);

      const app = createApp();
      const response = await request(app).get('/api/stats/epic-progress');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('epics');
      expect(Array.isArray(response.body.epics)).toBe(true);
    });

    it('should calculate progress for each epic', async () => {
      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);

      const app = createApp();
      const response = await request(app).get('/api/stats/epic-progress');

      const epic1Progress = response.body.epics.find((e: any) => e.id === 'EPIC-001');
      expect(epic1Progress.totalFeatures).toBe(2);
      expect(epic1Progress.completedFeatures).toBe(0);
      expect(epic1Progress.inProgressFeatures).toBe(1);
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetEpics.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/stats/epic-progress');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.detail).toBe('Failed to get epic progress data');
    });
  });
});
