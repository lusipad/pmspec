import { Router, Request, Response } from 'express';
import { getTeam } from '../services/dataService';

export const teamRoutes = Router();

// GET /api/team - Get team data
teamRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const team = await getTeam();
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team data' });
  }
});
