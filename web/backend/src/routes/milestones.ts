import { Router, Request, Response, NextFunction } from 'express';
import { getMilestones, getMilestoneById, createMilestone, updateMilestone } from '../services/dataService';
import { wsService } from '../services/websocket';
import { createLogger } from '../utils/logger';
import { NotFoundError, InternalServerError, BadRequestError } from '../utils/errors';

const logger = createLogger('milestones');

export const milestoneRoutes = Router();

/**
 * @openapi
 * /api/milestones:
 *   get:
 *     summary: List all milestones
 *     description: Retrieve a list of all milestones in the project
 *     tags: [Milestones]
 *     responses:
 *       200:
 *         description: List of milestones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Milestone'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
milestoneRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const milestones = await getMilestones();
    res.json(milestones);
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to fetch milestones', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/milestones/{id}:
 *   get:
 *     summary: Get a specific milestone
 *     description: Retrieve details of a specific milestone by its ID
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Milestone ID
 *         example: MILE-001
 *     responses:
 *       200:
 *         description: Milestone details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Milestone'
 *       404:
 *         description: Milestone not found
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
milestoneRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const milestone = await getMilestoneById(id);

    if (!milestone) {
      throw new NotFoundError({ detail: `Milestone ${id} not found`, instance: req.originalUrl });
    }

    res.json(milestone);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to fetch milestone', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/milestones:
 *   post:
 *     summary: Create a new milestone
 *     description: Create a new milestone in the project
 *     tags: [Milestones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - targetDate
 *               - status
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               targetDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [upcoming, active, completed, missed]
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Milestone created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Milestone'
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Server error
 */
milestoneRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, targetDate, status, features } = req.body;

    if (!title || !targetDate || !status) {
      throw new BadRequestError({ detail: 'title, targetDate, and status are required', instance: req.originalUrl });
    }

    const validStatuses = ['upcoming', 'active', 'completed', 'missed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError({ detail: `status must be one of: ${validStatuses.join(', ')}`, instance: req.originalUrl });
    }

    const milestone = await createMilestone({
      title,
      description,
      targetDate,
      status,
      features: features || [],
    });

    logger.info({ milestoneId: milestone.id }, 'Created new milestone');
    
    // Broadcast WebSocket notification
    wsService.broadcastMilestoneUpdate(milestone.id, 'created', milestone);
    
    res.status(201).json(milestone);
  } catch (error) {
    if (error instanceof BadRequestError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to create milestone', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/milestones/{id}:
 *   put:
 *     summary: Update a milestone
 *     description: Update an existing milestone
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Milestone ID
 *         example: MILE-001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               targetDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [upcoming, active, completed, missed]
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Milestone updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Milestone'
 *       404:
 *         description: Milestone not found
 *       500:
 *         description: Server error
 */
milestoneRoutes.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.status) {
      const validStatuses = ['upcoming', 'active', 'completed', 'missed'];
      if (!validStatuses.includes(updates.status)) {
        throw new BadRequestError({ detail: `status must be one of: ${validStatuses.join(', ')}`, instance: req.originalUrl });
      }
    }

    const milestone = await updateMilestone(id, updates);

    if (!milestone) {
      throw new NotFoundError({ detail: `Milestone ${id} not found`, instance: req.originalUrl });
    }

    logger.info({ milestoneId: milestone.id }, 'Updated milestone');
    
    // Broadcast WebSocket notification
    wsService.broadcastMilestoneUpdate(milestone.id, 'updated', milestone);
    
    res.json(milestone);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to update milestone', instance: req.originalUrl }));
  }
});
