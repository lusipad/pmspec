import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { epicRoutes } from './epics';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Mock dataService
vi.mock('../services/dataService', () => ({
  getEpics: vi.fn(),
  getEpicById: vi.fn(),
}));

import { getEpics, getEpicById } from '../services/dataService';

const mockGetEpics = vi.mocked(getEpics);
const mockGetEpicById = vi.mocked(getEpicById);

// Create test app with error handler
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/epics', epicRoutes);
  app.use(errorHandler);
  app.use(notFoundHandler);
  return app;
}

describe('Epic Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/epics', () => {
    it('should return all epics with 200 status', async () => {
      const mockEpics = [
        { id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: 'Alice', estimate: 40, actual: 0, features: [] },
        { id: 'EPIC-002', title: 'Epic 2', status: 'in-progress', owner: 'Bob', estimate: 80, actual: 20, features: [] },
      ];
      mockGetEpics.mockResolvedValue(mockEpics);

      const app = createApp();
      const response = await request(app).get('/api/epics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEpics);
      expect(mockGetEpics).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no epics exist', async () => {
      mockGetEpics.mockResolvedValue([]);

      const app = createApp();
      const response = await request(app).get('/api/epics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetEpics.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/epics');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.status).toBe(500);
      expect(response.body.detail).toBe('Failed to fetch epics');
    });
  });

  describe('GET /api/epics/:id', () => {
    it('should return specific epic with 200 status', async () => {
      const mockEpic = {
        id: 'EPIC-001',
        title: 'Epic 1',
        description: 'Test description',
        status: 'planning',
        owner: 'Alice',
        estimate: 40,
        actual: 0,
        features: ['FEAT-001', 'FEAT-002'],
      };
      mockGetEpicById.mockResolvedValue(mockEpic);

      const app = createApp();
      const response = await request(app).get('/api/epics/EPIC-001');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEpic);
      expect(mockGetEpicById).toHaveBeenCalledWith('EPIC-001');
    });

    it('should return 404 when epic not found', async () => {
      mockGetEpicById.mockResolvedValue(null);

      const app = createApp();
      const response = await request(app).get('/api/epics/EPIC-999');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('https://pmspec.io/errors/not-found');
      expect(response.body.title).toBe('Resource Not Found');
      expect(response.body.status).toBe(404);
      expect(response.body.detail).toBe('Epic EPIC-999 not found');
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetEpicById.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/epics/EPIC-001');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.status).toBe(500);
      expect(response.body.detail).toBe('Failed to fetch epic');
    });
  });
});
