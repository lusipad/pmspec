import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { timelineRoutes } from './timeline';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Mock dataService
vi.mock('../services/dataService', () => ({
  getEpics: vi.fn(),
  getFeatures: vi.fn(),
}));

// Mock timelineService
vi.mock('../services/timelineService', () => ({
  calculateTimeline: vi.fn(),
  calculateCriticalPath: vi.fn(),
}));

import { getEpics, getFeatures } from '../services/dataService';
import { calculateTimeline, calculateCriticalPath } from '../services/timelineService';

const mockGetEpics = vi.mocked(getEpics);
const mockGetFeatures = vi.mocked(getFeatures);
const mockCalculateTimeline = vi.mocked(calculateTimeline);
const mockCalculateCriticalPath = vi.mocked(calculateCriticalPath);

// Create test app with error handler
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/timeline', timelineRoutes);
  app.use(errorHandler);
  app.use(notFoundHandler);
  return app;
}

describe('Timeline Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/timeline/gantt', () => {
    it('should return gantt data with 200 status', async () => {
      const mockEpics = [
        { id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: 'Alice', estimate: 40, actual: 0, features: [] },
      ];
      const mockFeatures = [
        { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: [] },
      ];
      const mockTasks = [
        { id: 'FEAT-001', name: 'Feature 1', start: '2025-01-01', end: '2025-01-05', progress: 0, dependencies: [] },
      ];
      const mockCriticalPath = ['FEAT-001'];

      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockCalculateTimeline.mockReturnValue(mockTasks);
      mockCalculateCriticalPath.mockReturnValue(mockCriticalPath);

      const app = createApp();
      const response = await request(app).get('/api/timeline/gantt');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('criticalPath');
    });

    it('should return tasks array in response', async () => {
      const mockEpics = [{ id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: 'Alice', estimate: 40, actual: 0, features: [] }];
      const mockFeatures = [
        { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: [] },
        { id: 'FEAT-002', epic: 'EPIC-001', title: 'Feature 2', status: 'in-progress', priority: 'medium', assignee: 'Bob', estimate: 16, actual: 4, skillsRequired: [] },
      ];
      const mockTasks = [
        { id: 'FEAT-001', name: 'Feature 1', start: '2025-01-01', end: '2025-01-05', progress: 0, dependencies: [] },
        { id: 'FEAT-002', name: 'Feature 2', start: '2025-01-06', end: '2025-01-15', progress: 25, dependencies: ['FEAT-001'] },
      ];

      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockCalculateTimeline.mockReturnValue(mockTasks);
      mockCalculateCriticalPath.mockReturnValue(['FEAT-001', 'FEAT-002']);

      const app = createApp();
      const response = await request(app).get('/api/timeline/gantt');

      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.tasks[0].id).toBe('FEAT-001');
      expect(response.body.tasks[1].id).toBe('FEAT-002');
    });

    it('should return critical path in response', async () => {
      const mockEpics = [{ id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: 'Alice', estimate: 40, actual: 0, features: [] }];
      const mockFeatures = [
        { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: [] },
      ];
      const mockTasks = [{ id: 'FEAT-001', name: 'Feature 1', start: '2025-01-01', end: '2025-01-05', progress: 0, dependencies: [] }];
      const mockCriticalPath = ['FEAT-001'];

      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockCalculateTimeline.mockReturnValue(mockTasks);
      mockCalculateCriticalPath.mockReturnValue(mockCriticalPath);

      const app = createApp();
      const response = await request(app).get('/api/timeline/gantt');

      expect(Array.isArray(response.body.criticalPath)).toBe(true);
      expect(response.body.criticalPath).toContain('FEAT-001');
    });

    it('should call dataService and timelineService functions', async () => {
      const mockEpics = [{ id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: 'Alice', estimate: 40, actual: 0, features: [] }];
      const mockFeatures = [{ id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: [] }];
      const mockTasks = [{ id: 'FEAT-001', name: 'Feature 1', start: '2025-01-01', end: '2025-01-05', progress: 0, dependencies: [] }];

      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockCalculateTimeline.mockReturnValue(mockTasks);
      mockCalculateCriticalPath.mockReturnValue(['FEAT-001']);

      const app = createApp();
      await request(app).get('/api/timeline/gantt');

      expect(mockGetEpics).toHaveBeenCalledTimes(1);
      expect(mockGetFeatures).toHaveBeenCalledTimes(1);
      expect(mockCalculateTimeline).toHaveBeenCalledWith(mockEpics, mockFeatures);
      expect(mockCalculateCriticalPath).toHaveBeenCalledWith(mockTasks);
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetEpics.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/timeline/gantt');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.detail).toBe('Failed to generate gantt chart');
    });

    it('should return 500 when timelineService throws error', async () => {
      const mockEpics = [{ id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: 'Alice', estimate: 40, actual: 0, features: [] }];
      const mockFeatures = [{ id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: [] }];

      mockGetEpics.mockResolvedValue(mockEpics);
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockCalculateTimeline.mockImplementation(() => {
        throw new Error('Timeline calculation error');
      });

      const app = createApp();
      const response = await request(app).get('/api/timeline/gantt');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.detail).toBe('Failed to generate gantt chart');
    });

    it('should return empty arrays when no data exists', async () => {
      mockGetEpics.mockResolvedValue([]);
      mockGetFeatures.mockResolvedValue([]);
      mockCalculateTimeline.mockReturnValue([]);
      mockCalculateCriticalPath.mockReturnValue([]);

      const app = createApp();
      const response = await request(app).get('/api/timeline/gantt');

      expect(response.status).toBe(200);
      expect(response.body.tasks).toEqual([]);
      expect(response.body.criticalPath).toEqual([]);
    });
  });
});
