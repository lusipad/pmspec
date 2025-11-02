import { z } from 'zod';

export const SimpleFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  estimate: z.number().positive(),
  assignee: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['todo', 'in-progress', 'done', 'blocked']),
  category: z.string().optional(), // 用于分组，相当于 Epic
  tags: z.array(z.string()).default([]),
  createdDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export type SimpleFeature = z.infer<typeof SimpleFeatureSchema>;

export const FeaturesTableSchema = z.object({
  features: z.array(SimpleFeatureSchema),
  lastUpdated: z.string().optional(),
  version: z.string().default('1.0'),
});

export type FeaturesTable = z.infer<typeof FeaturesTableSchema>;