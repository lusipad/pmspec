import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { csvRoutes } from './csv';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Mock dataService
vi.mock('../services/dataService', () => ({
  getFeatures: vi.fn(),
  getEpics: vi.fn(),
}));

// Mock csvService
vi.mock('../services/csvService', () => ({
  featuresToCSV: vi.fn(),
  csvToFeatures: vi.fn(),
  writeFeatureFile: vi.fn(),
  getCSVTemplate: vi.fn(),
}));

import { getFeatures, getEpics } from '../services/dataService';
import { featuresToCSV, csvToFeatures, writeFeatureFile, getCSVTemplate } from '../services/csvService';

const mockGetFeatures = vi.mocked(getFeatures);
const mockGetEpics = vi.mocked(getEpics);
const mockFeaturesToCSV = vi.mocked(featuresToCSV);
const mockCsvToFeatures = vi.mocked(csvToFeatures);
const mockWriteFeatureFile = vi.mocked(writeFeatureFile);
const mockGetCSVTemplate = vi.mocked(getCSVTemplate);

// Create test app with error handler
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/csv', csvRoutes);
  app.use(errorHandler);
  app.use(notFoundHandler);
  return app;
}

describe('CSV Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/csv/export', () => {
    it('should export features as CSV with 200 status', async () => {
      const mockFeatures = [
        { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'high', assignee: 'Alice', estimate: 8, actual: 0, skillsRequired: [] },
      ];
      mockGetFeatures.mockResolvedValue(mockFeatures);
      mockFeaturesToCSV.mockReturnValue('ID,Epic,Title,Status\nFEAT-001,EPIC-001,Feature 1,todo');

      const app = createApp();
      const response = await request(app).get('/api/csv/export');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('pmspec-features');
    });

    it('should include date in export filename', async () => {
      mockGetFeatures.mockResolvedValue([]);
      mockFeaturesToCSV.mockReturnValue('ID,Epic,Title,Status');

      const app = createApp();
      const response = await request(app).get('/api/csv/export');

      expect(response.headers['content-disposition']).toMatch(/pmspec-features-\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should return 500 when export fails', async () => {
      mockGetFeatures.mockRejectedValue(new Error('Database error'));

      const app = createApp();
      const response = await request(app).get('/api/csv/export');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.status).toBe(500);
      expect(response.body.detail).toBe('Failed to export CSV');
    });
  });

  describe('GET /api/csv/template', () => {
    it('should return CSV template with 200 status', async () => {
      mockGetCSVTemplate.mockReturnValue('ID,Epic,Title,Status,Priority,Assignee,Estimate,Actual,Skills');

      const app = createApp();
      const response = await request(app).get('/api/csv/template');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('pmspec-template.csv');
    });

    it('should return template with correct filename', async () => {
      mockGetCSVTemplate.mockReturnValue('ID,Epic,Title');

      const app = createApp();
      const response = await request(app).get('/api/csv/template');

      expect(response.headers['content-disposition']).toBe('attachment; filename="pmspec-template.csv"');
    });

    it('should return 500 when template generation fails', async () => {
      mockGetCSVTemplate.mockImplementation(() => {
        throw new Error('Template error');
      });

      const app = createApp();
      const response = await request(app).get('/api/csv/template');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.status).toBe(500);
      expect(response.body.detail).toBe('Failed to generate template');
    });
  });

  describe('POST /api/csv/import', () => {
    it('should return 400 when no file uploaded', async () => {
      const app = createApp();
      const response = await request(app)
        .post('/api/csv/import');

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('https://pmspec.io/errors/validation-error');
      expect(response.body.title).toBe('Validation Error');
      expect(response.body.status).toBe(400);
      expect(response.body.detail).toBe('No file uploaded');
    });

    it('should import valid CSV file and return success', async () => {
      const csvContent = 'ID,Epic,Title,Status\nFEAT-003,EPIC-001,New Feature,todo';
      const parsedFeatures = [
        { id: 'FEAT-003', epic: 'EPIC-001', title: 'New Feature', status: 'todo', priority: 'medium', assignee: '', estimate: 0, actual: 0, skillsRequired: [] },
      ];

      mockCsvToFeatures.mockReturnValue({ features: parsedFeatures, errors: [] });
      mockGetEpics.mockResolvedValue([{ id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: '', estimate: 0, actual: 0, features: [] }]);
      mockGetFeatures.mockResolvedValue([]);
      mockWriteFeatureFile.mockResolvedValue(undefined);

      const app = createApp();
      const response = await request(app)
        .post('/api/csv/import')
        .attach('file', Buffer.from(csvContent), 'features.csv');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Import successful');
      expect(response.body.created).toBe(1);
      expect(response.body.updated).toBe(0);
    });

    it('should return 400 when CSV has validation errors', async () => {
      const csvContent = 'ID,Epic,Title,Status\n,EPIC-001,Missing ID,todo';

      mockCsvToFeatures.mockReturnValue({
        features: [],
        errors: [{ row: 2, field: 'ID', message: 'ID is required' }],
      });

      const app = createApp();
      const response = await request(app)
        .post('/api/csv/import')
        .attach('file', Buffer.from(csvContent), 'features.csv');

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('https://pmspec.io/errors/validation-error');
      expect(response.body.title).toBe('Validation Error');
      expect(response.body.detail).toBe('Validation errors in CSV');
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 when CSV has invalid epic reference', async () => {
      const csvContent = 'ID,Epic,Title,Status\nFEAT-003,EPIC-999,Feature,todo';
      const parsedFeatures = [
        { id: 'FEAT-003', epic: 'EPIC-999', title: 'Feature', status: 'todo', priority: 'medium', assignee: '', estimate: 0, actual: 0, skillsRequired: [] },
      ];

      mockCsvToFeatures.mockReturnValue({ features: parsedFeatures, errors: [] });
      mockGetEpics.mockResolvedValue([{ id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: '', estimate: 0, actual: 0, features: [] }]);

      const app = createApp();
      const response = await request(app)
        .post('/api/csv/import')
        .attach('file', Buffer.from(csvContent), 'features.csv');

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('https://pmspec.io/errors/validation-error');
      expect(response.body.title).toBe('Validation Error');
      expect(response.body.detail).toBe('Invalid Epic references');
    });

    it('should return 400 when CSV has duplicate IDs', async () => {
      const csvContent = 'ID,Epic,Title,Status\nFEAT-001,EPIC-001,Feature 1,todo\nFEAT-001,EPIC-001,Feature 2,todo';
      const parsedFeatures = [
        { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 1', status: 'todo', priority: 'medium', assignee: '', estimate: 0, actual: 0, skillsRequired: [] },
        { id: 'FEAT-001', epic: 'EPIC-001', title: 'Feature 2', status: 'todo', priority: 'medium', assignee: '', estimate: 0, actual: 0, skillsRequired: [] },
      ];

      mockCsvToFeatures.mockReturnValue({ features: parsedFeatures, errors: [] });
      mockGetEpics.mockResolvedValue([{ id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: '', estimate: 0, actual: 0, features: [] }]);

      const app = createApp();
      const response = await request(app)
        .post('/api/csv/import')
        .attach('file', Buffer.from(csvContent), 'features.csv');

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('https://pmspec.io/errors/validation-error');
      expect(response.body.title).toBe('Validation Error');
      expect(response.body.detail).toBe('Duplicate IDs found in CSV');
    });

    it('should return 500 when import fails', async () => {
      const csvContent = 'ID,Epic,Title,Status\nFEAT-003,EPIC-001,New Feature,todo';
      const parsedFeatures = [
        { id: 'FEAT-003', epic: 'EPIC-001', title: 'New Feature', status: 'todo', priority: 'medium', assignee: '', estimate: 0, actual: 0, skillsRequired: [] },
      ];

      mockCsvToFeatures.mockReturnValue({ features: parsedFeatures, errors: [] });
      mockGetEpics.mockResolvedValue([{ id: 'EPIC-001', title: 'Epic 1', status: 'planning', owner: '', estimate: 0, actual: 0, features: [] }]);
      mockGetFeatures.mockResolvedValue([]);
      mockWriteFeatureFile.mockRejectedValue(new Error('Write error'));

      const app = createApp();
      const response = await request(app)
        .post('/api/csv/import')
        .attach('file', Buffer.from(csvContent), 'features.csv');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.status).toBe(500);
      expect(response.body.detail).toBe('Failed to import CSV');
    });
  });
});
