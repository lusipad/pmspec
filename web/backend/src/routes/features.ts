import { Router, Request, Response, NextFunction } from 'express';
import { getFeatures, getFeatureById } from '../services/dataService';
import { writeFeatureFile } from '../services/csvService';
import { wsService } from '../services/websocket';
import { unlink } from 'fs/promises';
import path from 'path';
import { createLogger } from '../utils/logger';
import { NotFoundError, ValidationError, ConflictError, InternalServerError } from '../utils/errors';

const logger = createLogger('features');

export const featureRoutes = Router();

const PMSPACE_DIR = path.join(process.cwd(), '..', '..', 'pmspace');

/**
 * @openapi
 * /api/features:
 *   get:
 *     summary: List all features
 *     description: Retrieve a list of all features in the project
 *     tags: [Features]
 *     responses:
 *       200:
 *         description: List of features
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Feature'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/features - List all features
featureRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const features = await getFeatures();
    res.json(features);
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to fetch features', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features/{id}:
 *   get:
 *     summary: Get a specific feature
 *     description: Retrieve details of a specific feature by its ID
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *         example: FEAT-001
 *     responses:
 *       200:
 *         description: Feature details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feature'
 *       404:
 *         description: Feature not found
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
// GET /api/features/:id - Get specific feature
featureRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const feature = await getFeatureById(id);

    if (!feature) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    res.json(feature);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to fetch feature', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features/{id}/dependencies:
 *   get:
 *     summary: Get feature dependency chain
 *     description: Retrieve the full dependency chain for a specific feature (both direct and transitive)
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *         example: FEAT-001
 *     responses:
 *       200:
 *         description: Dependency chain
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 featureId:
 *                   type: string
 *                 directDependencies:
 *                   type: array
 *                   items:
 *                     type: object
 *                 transitiveDependencies:
 *                   type: array
 *                   items:
 *                     type: string
 *                 dependents:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Feature not found
 *       500:
 *         description: Server error
 */
// GET /api/features/:id/dependencies - Get dependency chain for a feature
featureRoutes.get('/:id/dependencies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const feature = await getFeatureById(id);

    if (!feature) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    const allFeatures = await getFeatures();
    const featureMap = new Map(allFeatures.map(f => [f.id, f]));

    // Get transitive dependencies (all features this one depends on, directly or indirectly)
    const transitiveDeps = new Set<string>();
    const visited = new Set<string>();
    
    function collectDependencies(featId: string) {
      if (visited.has(featId)) return;
      visited.add(featId);
      
      const feat = featureMap.get(featId);
      if (feat?.dependencies) {
        for (const dep of feat.dependencies) {
          if (dep.type === 'blocks') {
            transitiveDeps.add(dep.featureId);
            collectDependencies(dep.featureId);
          }
        }
      }
    }
    
    collectDependencies(id);
    transitiveDeps.delete(id); // Remove self if present

    // Get dependents (features that depend on this one)
    const dependents: string[] = [];
    for (const f of allFeatures) {
      if (f.dependencies?.some(d => d.featureId === id && d.type === 'blocks')) {
        dependents.push(f.id);
      }
    }

    res.json({
      featureId: id,
      directDependencies: feature.dependencies || [],
      transitiveDependencies: Array.from(transitiveDeps),
      dependents,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to fetch dependencies', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features:
 *   post:
 *     summary: Create a new feature
 *     description: Create a new feature with the provided data
 *     tags: [Features]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FeatureInput'
 *     responses:
 *       201:
 *         description: Feature created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feature'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Feature already exists
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
// POST /api/features - Create new feature
featureRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feature = req.body;

    // Basic validation
    if (!feature.id || !feature.title || !feature.epic) {
      throw new ValidationError({
        detail: 'ID, title, and epic are required',
        instance: req.originalUrl,
        errors: [
          ...(!feature.id ? [{ field: 'id', message: 'ID is required' }] : []),
          ...(!feature.title ? [{ field: 'title', message: 'Title is required' }] : []),
          ...(!feature.epic ? [{ field: 'epic', message: 'Epic is required' }] : []),
        ],
      });
    }

    // Check if feature already exists
    const existing = await getFeatureById(feature.id);
    if (existing) {
      throw new ConflictError({ detail: `Feature ${feature.id} already exists`, instance: req.originalUrl });
    }

    // Write feature file
    await writeFeatureFile(feature);

    // Broadcast WebSocket notification
    wsService.broadcastFeatureUpdate(feature.id, 'created', feature);

    res.status(201).json(feature);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof ConflictError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to create feature', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features/{id}:
 *   put:
 *     summary: Update a feature
 *     description: Update an existing feature with the provided data
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FeatureInput'
 *     responses:
 *       200:
 *         description: Feature updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feature'
 *       404:
 *         description: Feature not found
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
// PUT /api/features/:id - Update existing feature
featureRoutes.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if feature exists
    const existing = await getFeatureById(id);
    if (!existing) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    // Merge updates
    const updatedFeature = { ...existing, ...updates, id }; // Keep original ID

    // Write updated feature
    await writeFeatureFile(updatedFeature);

    // Broadcast WebSocket notification
    wsService.broadcastFeatureUpdate(id, 'updated', updatedFeature);

    res.json(updatedFeature);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to update feature', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/features/{id}:
 *   delete:
 *     summary: Delete a feature
 *     description: Delete an existing feature by its ID
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *     responses:
 *       204:
 *         description: Feature deleted successfully
 *       404:
 *         description: Feature not found
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
// DELETE /api/features/:id - Delete feature
featureRoutes.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if feature exists
    const existing = await getFeatureById(id);
    if (!existing) {
      throw new NotFoundError({ detail: `Feature ${id} not found`, instance: req.originalUrl });
    }

    // Delete feature file
    const filename = `${id.toLowerCase()}.md`;
    const filepath = path.join(PMSPACE_DIR, 'features', filename);
    await unlink(filepath);

    // Broadcast WebSocket notification
    wsService.broadcastFeatureUpdate(id, 'deleted');

    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to delete feature', instance: req.originalUrl }));
  }
});
