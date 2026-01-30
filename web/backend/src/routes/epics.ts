import { Router, Request, Response, NextFunction } from 'express';
import { getEpics, getEpicById } from '../services/dataService';
import { createLogger } from '../utils/logger';
import { NotFoundError, InternalServerError } from '../utils/errors';

const logger = createLogger('epics');

export const epicRoutes = Router();

/**
 * @openapi
 * /api/epics:
 *   get:
 *     summary: List all epics
 *     description: Retrieve a list of all epics in the project
 *     tags: [Epics]
 *     responses:
 *       200:
 *         description: List of epics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Epic'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/epics - List all epics
epicRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const epics = await getEpics();
    res.json(epics);
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to fetch epics', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/epics/{id}:
 *   get:
 *     summary: Get a specific epic
 *     description: Retrieve details of a specific epic by its ID
 *     tags: [Epics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Epic ID
 *         example: EPIC-001
 *     responses:
 *       200:
 *         description: Epic details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Epic'
 *       404:
 *         description: Epic not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
epicRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const epic = await getEpicById(id);

    if (!epic) {
      throw new NotFoundError({ detail: `Epic ${id} not found`, instance: req.originalUrl });
    }

    res.json(epic);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to fetch epic', instance: req.originalUrl }));
  }
});
