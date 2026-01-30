import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { teamRoutes } from './team';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Mock dataService
vi.mock('../services/dataService', () => ({
  getTeam: vi.fn(),
}));

import { getTeam } from '../services/dataService';

const mockGetTeam = vi.mocked(getTeam);

// Create test app with error handler
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/team', teamRoutes);
  app.use(errorHandler);
  app.use(notFoundHandler);
  return app;
}

describe('Team Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/team', () => {
    it('should return team data with 200 status', async () => {
      const mockTeam = {
        members: [
          { name: 'Alice', skills: ['TypeScript', 'React'], capacity: 40, currentLoad: 20 },
          { name: 'Bob', skills: ['Node.js', 'Express'], capacity: 40, currentLoad: 30 },
        ],
      };
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/team');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeam);
      expect(mockGetTeam).toHaveBeenCalledTimes(1);
    });

    it('should return empty members array when no team exists', async () => {
      mockGetTeam.mockResolvedValue({ members: [] });

      const app = createApp();
      const response = await request(app).get('/api/team');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ members: [] });
    });

    it('should return team with multiple members', async () => {
      const mockTeam = {
        members: [
          { name: 'Alice', skills: ['TypeScript'], capacity: 40, currentLoad: 10 },
          { name: 'Bob', skills: ['Node.js'], capacity: 40, currentLoad: 20 },
          { name: 'Charlie', skills: ['React'], capacity: 30, currentLoad: 25 },
          { name: 'Diana', skills: ['Python'], capacity: 40, currentLoad: 15 },
        ],
      };
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/team');

      expect(response.status).toBe(200);
      expect(response.body.members).toHaveLength(4);
      expect(response.body.members[2].name).toBe('Charlie');
    });

    it('should return team member with all properties', async () => {
      const mockTeam = {
        members: [
          { name: 'Alice', skills: ['TypeScript', 'React', 'Node.js'], capacity: 40, currentLoad: 35 },
        ],
      };
      mockGetTeam.mockResolvedValue(mockTeam);

      const app = createApp();
      const response = await request(app).get('/api/team');

      expect(response.status).toBe(200);
      const member = response.body.members[0];
      expect(member).toHaveProperty('name');
      expect(member).toHaveProperty('skills');
      expect(member).toHaveProperty('capacity');
      expect(member).toHaveProperty('currentLoad');
      expect(member.skills).toHaveLength(3);
    });

    it('should return 500 when dataService throws error', async () => {
      mockGetTeam.mockRejectedValue(new Error('Failed to read team file'));

      const app = createApp();
      const response = await request(app).get('/api/team');

      expect(response.status).toBe(500);
      expect(response.body.type).toBe('https://pmspec.io/errors/internal-error');
      expect(response.body.title).toBe('Internal Server Error');
      expect(response.body.detail).toBe('Failed to fetch team data');
    });
  });
});
