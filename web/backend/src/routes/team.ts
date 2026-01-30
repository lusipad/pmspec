import { Router, Request, Response, NextFunction } from 'express';
import { getTeam } from '../services/dataService';
import { createLogger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';

const logger = createLogger('team');

export const teamRoutes = Router();

/**
 * @openapi
 * /api/team:
 *   get:
 *     summary: Get team data
 *     description: Retrieve team information including all team members
 *     tags: [Team]
 *     responses:
 *       200:
 *         description: Team data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/team - Get team data
teamRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = await getTeam();
    res.json(team);
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to fetch team data', instance: req.originalUrl }));
  }
});
