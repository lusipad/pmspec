import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { featureRoutes } from './features';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Mock dataService
vi.mock('../services/dataService', () => ({
  getFeatures: vi.fn(),
  getFeatureById: vi.fn(),
}));

// Mock csvService
vi.mock('../services/csvService', () => ({
  writeFeatureFile: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  unlink: vi.fn(),
}));

import { getFeatures, getFeatureById } from '../services/dataService';
import { writeFeatureFile } from '../services/csvService';
import { unlink } from 'fs/promises';

const mockGetFeatures = vi.mocked(getFeatures);
const mockGetFeatureById = vi.mocked(getFeatureById);
const mockWriteFeatureFile = vi.mocked(writeFeatureFile);
const mockUnlink = vi.mocked(unlink);

// Create test app with error handler
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/features', featureRoutes);
  app.use(errorHandler);
  app.use(notFoundHandler);
  return app;
}

describe('Feature Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/features', () => {
    it('should return all features with 200 status', async () => {
      const mockFeatures = [
        { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: ['TypeScript'] },
        { id: 'FEAT-002', epic: 'EPIC-001', title: 'Feature 2', status: 'in-progress', priority: 'medium', assignee: 'Bob', estimate: 16, actual: 8, skillsRequired: ['React'] },
      ];
      mockGetFeatures.mockResolvedValue(mockFeatures);

      const app = createApp();
      const response = await request(app).get('/api/features');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFeatures);
      expect(mockGetFeatures).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no features exist', async () => {
      mockGetFeatures.mockResolvedValue([]);

      const app = createApp();
      const response = await request(app).get('/api/features');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetFeatures.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/features');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.status).toBe(500);
      expect(response.body.detail).toBe('Failed to fetch features');
    });

    it('should support filter, sort, and pagination', async () => {
      mockGetFeatures.mockResolvedValue([
        { id: 'FEAT-001', epic: 'EPIC-001', title: 'A', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: [] },
        { id: 'FEAT-002', epic: 'EPIC-001', title: 'B', status: 'todo', priority: 'critical', assignee: 'Alice', estimate: 12, actual: 0, skillsRequired: [] },
        { id: 'FEAT-003', epic: 'EPIC-002', title: 'C', status: 'done', priority: 'low', assignee: 'Bob', estimate: 4, actual: 4, skillsRequired: [] },
      ] as any);

      const app = createApp();
      const response = await request(app)
        .get('/api/features')
        .query({ status: 'todo', sortBy: 'priority', sortOrder: 'asc', page: 1, pageSize: 1 });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(1);
      expect(response.body.totalPages).toBe(2);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('FEAT-002');
    });
  });

  describe('GET /api/features/:id', () => {
    it('should return specific feature with 200 status', async () => {
      const mockFeature = {
        id: 'FEAT-001',
        epic: 'EPIC-001',
        title: 'Feature 1',
        description: 'Test description',
        status: 'todo',
        priority: 'high',
        assignee: 'Alice',
        estimate: 8,
        actual: 0,
        skillsRequired: ['TypeScript'],
      };
      mockGetFeatureById.mockResolvedValue(mockFeature);

      const app = createApp();
      const response = await request(app).get('/api/features/FEAT-001');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFeature);
      expect(mockGetFeatureById).toHaveBeenCalledWith('FEAT-001');
    });

    it('should return 404 when feature not found', async () => {
      mockGetFeatureById.mockResolvedValue(null);

      const app = createApp();
      const response = await request(app).get('/api/features/FEAT-999');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('https://pmspec.io/errors/not-found');
      expect(response.body.title).toBe('Resource Not Found');
      expect(response.body.status).toBe(404);
      expect(response.body.detail).toBe('Feature FEAT-999 not found');
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetFeatureById.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/features/FEAT-001');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.status).toBe(500);
      expect(response.body.detail).toBe('Failed to fetch feature');
    });
  });

  describe('POST /api/features', () => {
    it('should create feature and return 201 status', async () => {
      const newFeature = {
        id: 'FEAT-003',
        epic: 'EPIC-001',
        title: 'New Feature',
        status: 'todo',
        priority: 'medium',
        assignee: 'Alice',
        estimate: 8,
        actual: 0,
      };
      mockGetFeatureById.mockResolvedValue(null);
      mockWriteFeatureFile.mockResolvedValue(undefined);

      const app = createApp();
      const response = await request(app)
        .post('/api/features')
        .send(newFeature);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject(newFeature);
      expect(mockWriteFeatureFile).toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      const invalidFeature = { title: 'Missing ID and epic' };

      const app = createApp();
      const response = await request(app)
        .post('/api/features')
        .send(invalidFeature);

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('https://pmspec.io/errors/validation-error');
      expect(response.body.title).toBe('Validation Error');
      expect(response.body.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 409 when feature already exists', async () => {
      const existingFeature = {
        id: 'FEAT-001',
        epic: 'EPIC-001',
        title: 'Existing Feature',
      };
      mockGetFeatureById.mockResolvedValue(existingFeature as any);

      const app = createApp();
      const response = await request(app)
        .post('/api/features')
        .send(existingFeature);

      expect(response.status).toBe(409);
      expect(response.body.type).toBe('https://pmspec.io/errors/conflict');
      expect(response.body.title).toBe('Conflict');
      expect(response.body.status).toBe(409);
      expect(response.body.detail).toContain('already exists');
    });

    it('should return 500 when write fails', async () => {
      const newFeature = {
        id: 'FEAT-003',
        epic: 'EPIC-001',
        title: 'New Feature',
      };
      mockGetFeatureById.mockResolvedValue(null);
      mockWriteFeatureFile.mockRejectedValue(new Error('Write error'));

      const app = createApp();
      const response = await request(app)
        .post('/api/features')
        .send(newFeature);

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.status).toBe(500);
      expect(response.body.detail).toBe('Failed to create feature');
    });
  });

  describe('PUT /api/features/:id', () => {
    it('should update feature and return 200 status', async () => {
      const existingFeature = {
        id: 'FEAT-001',
        epic: 'EPIC-001',
        title: 'Feature 1',
        status: 'todo',
        priority: 'high',
        assignee: 'Alice',
        estimate: 8,
        actual: 0,
        skillsRequired: [],
      };
      mockGetFeatureById.mockResolvedValue(existingFeature);
      mockWriteFeatureFile.mockResolvedValue(undefined);

      const app = createApp();
      const response = await request(app)
        .put('/api/features/FEAT-001')
        .send({ status: 'in-progress', actual: 4 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('in-progress');
      expect(response.body.actual).toBe(4);
      expect(response.body.id).toBe('FEAT-001');
    });

    it('should return 404 when feature not found', async () => {
      mockGetFeatureById.mockResolvedValue(null);

      const app = createApp();
      const response = await request(app)
        .put('/api/features/FEAT-999')
        .send({ status: 'done' });

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('https://pmspec.io/errors/not-found');
      expect(response.body.title).toBe('Resource Not Found');
      expect(response.body.detail).toContain('not found');
    });
  });

  describe('PATCH /api/features/:id', () => {
    it('should patch feature and return 200 status', async () => {
      const existingFeature = {
        id: 'FEAT-001',
        epic: 'EPIC-001',
        title: 'Feature 1',
        status: 'todo',
        priority: 'medium',
        assignee: 'Alice',
        estimate: 8,
        actual: 0,
        skillsRequired: [],
      };
      mockGetFeatureById.mockResolvedValue(existingFeature as any);
      mockWriteFeatureFile.mockResolvedValue(undefined);

      const app = createApp();
      const response = await request(app)
        .patch('/api/features/FEAT-001')
        .send({ priority: 'high', assignee: 'Bob' });

      expect(response.status).toBe(200);
      expect(response.body.priority).toBe('high');
      expect(response.body.assignee).toBe('Bob');
      expect(mockWriteFeatureFile).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid patch payload', async () => {
      const existingFeature = {
        id: 'FEAT-001',
        epic: 'EPIC-001',
        title: 'Feature 1',
        status: 'todo',
        priority: 'medium',
        assignee: 'Alice',
        estimate: 8,
        actual: 0,
        skillsRequired: [],
      };
      mockGetFeatureById.mockResolvedValue(existingFeature as any);

      const app = createApp();
      const response = await request(app)
        .patch('/api/features/FEAT-001')
        .send({ priority: 'urgent' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('https://pmspec.io/errors/validation-error');
    });
  });

  describe('POST /api/features/batch', () => {
    it('should batch update features and return summary', async () => {
      const featureA = {
        id: 'FEAT-001',
        epic: 'EPIC-001',
        title: 'Feature 1',
        status: 'todo',
        priority: 'medium',
        assignee: 'Alice',
        estimate: 8,
        actual: 0,
        skillsRequired: [],
      };
      const featureB = {
        id: 'FEAT-002',
        epic: 'EPIC-001',
        title: 'Feature 2',
        status: 'todo',
        priority: 'medium',
        assignee: 'Alice',
        estimate: 8,
        actual: 0,
        skillsRequired: [],
      };
      mockGetFeatureById.mockResolvedValueOnce(featureA as any).mockResolvedValueOnce(featureB as any);
      mockWriteFeatureFile.mockResolvedValue(undefined);

      const app = createApp();
      const response = await request(app)
        .post('/api/features/batch')
        .send({ ids: ['FEAT-001', 'FEAT-002'], updates: { status: 'in-progress' } });

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(2);
      expect(response.body.failed).toEqual([]);
      expect(mockWriteFeatureFile).toHaveBeenCalledTimes(2);
    });

    it('should reject empty batch request', async () => {
      const app = createApp();
      const response = await request(app)
        .post('/api/features/batch')
        .send({ ids: [], updates: {} });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('https://pmspec.io/errors/validation-error');
    });
  });

  describe('DELETE /api/features/:id', () => {
    it('should delete feature and return 204 status', async () => {
      const existingFeature = { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1' };
      mockGetFeatureById.mockResolvedValue(existingFeature as any);
      mockUnlink.mockResolvedValue(undefined);

      const app = createApp();
      const response = await request(app).delete('/api/features/FEAT-001');

      expect(response.status).toBe(204);
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should return 404 when feature not found', async () => {
      mockGetFeatureById.mockResolvedValue(null);

      const app = createApp();
      const response = await request(app).delete('/api/features/FEAT-999');

      expect(response.status).toBe(404);
      expect(response.body.type).toBe('https://pmspec.io/errors/not-found');
      expect(response.body.title).toBe('Resource Not Found');
      expect(response.body.detail).toContain('not found');
    });

    it('should return 500 when delete fails', async () => {
      const existingFeature = { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1' };
      mockGetFeatureById.mockResolvedValue(existingFeature as any);
      mockUnlink.mockRejectedValue(new Error('Delete error'));

      const app = createApp();
      const response = await request(app).delete('/api/features/FEAT-001');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.detail).toBe('Failed to delete feature');
    });
  });
});
