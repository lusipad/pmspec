import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger';
import { InternalServerError, NotFoundError, ValidationError } from '../utils/errors';
import {
  batchUpdatePlanFeatures,
  calculatePlanImpact,
  confirmPlan,
  generatePlanDraft,
  rebalancePlan,
  updatePlanFeature,
} from '../services/workflowService';

const logger = createLogger('workflows');

export const workflowRoutes = Router();

const briefSchema = z.object({
  goal: z.string().min(3),
  startDate: z.string().min(10),
  targetDate: z.string().min(10),
  teamCapacityHoursPerDay: z.number().int().positive().max(24).default(8),
  constraints: z.array(z.string()).default([]),
});

const featurePatchSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  assignee: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
});

const batchSchema = z.object({
  featureIds: z.array(z.string().min(1)).min(1),
  updates: z
    .object({
      assignee: z.string().optional(),
      status: z.enum(['todo', 'in-progress', 'done']).optional(),
    })
    .refine((value) => Boolean(value.assignee || value.status), 'updates cannot be empty'),
});

const rebalanceSchema = z.object({
  strategy: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
});

workflowRoutes.post('/plans/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = briefSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError({
        detail: 'Invalid planning brief',
        instance: req.originalUrl,
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'brief',
          message: issue.message,
        })),
      });
    }

    const plan = await generatePlanDraft(parsed.data);
    res.status(201).json(plan);
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    logger.error({ error }, 'Failed to generate plan');
    next(new InternalServerError({ detail: 'Failed to generate plan', instance: req.originalUrl }));
  }
});

workflowRoutes.post('/plans/:planId/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await confirmPlan(req.params.planId);
    if (!plan) {
      throw new NotFoundError({ detail: `Plan ${req.params.planId} not found`, instance: req.originalUrl });
    }
    res.json({ message: 'Plan confirmed', plan });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    logger.error({ error, planId: req.params.planId }, 'Failed to confirm plan');
    next(new InternalServerError({ detail: 'Failed to confirm plan', instance: req.originalUrl }));
  }
});

workflowRoutes.post('/plans/:planId/rebalance', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = rebalanceSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError({
        detail: 'Invalid rebalance strategy',
        instance: req.originalUrl,
      });
    }

    const plan = rebalancePlan(req.params.planId, parsed.data.strategy);
    if (!plan) {
      throw new NotFoundError({ detail: `Plan ${req.params.planId} not found`, instance: req.originalUrl });
    }
    res.json(plan);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return next(error);
    }
    logger.error({ error, planId: req.params.planId }, 'Failed to rebalance plan');
    next(new InternalServerError({ detail: 'Failed to rebalance plan', instance: req.originalUrl }));
  }
});

workflowRoutes.patch('/plans/:planId/features/:featureId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = featurePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError({
        detail: 'Invalid feature updates',
        instance: req.originalUrl,
      });
    }

    const plan = updatePlanFeature(req.params.planId, req.params.featureId, parsed.data);
    if (!plan) {
      throw new NotFoundError({ detail: `Plan ${req.params.planId} not found`, instance: req.originalUrl });
    }
    res.json(plan);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return next(error);
    }
    logger.error(
      { error, planId: req.params.planId, featureId: req.params.featureId },
      'Failed to update plan feature'
    );
    next(new InternalServerError({ detail: 'Failed to update plan feature', instance: req.originalUrl }));
  }
});

workflowRoutes.post('/plans/:planId/batch', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = batchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError({
        detail: 'Invalid batch update request',
        instance: req.originalUrl,
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'batch',
          message: issue.message,
        })),
      });
    }

    const plan = batchUpdatePlanFeatures(req.params.planId, parsed.data.featureIds, parsed.data.updates);
    if (!plan) {
      throw new NotFoundError({ detail: `Plan ${req.params.planId} not found`, instance: req.originalUrl });
    }
    res.json(plan);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return next(error);
    }
    logger.error({ error, planId: req.params.planId }, 'Failed to batch update plan');
    next(new InternalServerError({ detail: 'Failed to batch update plan', instance: req.originalUrl }));
  }
});

workflowRoutes.get('/plans/:planId/impact', (req: Request, res: Response, next: NextFunction) => {
  try {
    const impact = calculatePlanImpact(req.params.planId);
    if (!impact) {
      throw new NotFoundError({ detail: `Plan ${req.params.planId} not found`, instance: req.originalUrl });
    }
    res.json(impact);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return next(error);
    }
    logger.error({ error, planId: req.params.planId }, 'Failed to calculate impact');
    next(new InternalServerError({ detail: 'Failed to calculate impact', instance: req.originalUrl }));
  }
});
