import { Router, Request, Response } from 'express';
import { getFeatures, getFeatureById } from '../services/dataService';
import { writeFeatureFile } from '../services/csvService';
import { unlink } from 'fs/promises';
import path from 'path';

export const featureRoutes = Router();

const PMSPACE_DIR = path.join(process.cwd(), 'pmspace');

// GET /api/features - List all features
featureRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const features = await getFeatures();
    res.json(features);
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// GET /api/features/:id - Get specific feature
featureRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feature = await getFeatureById(id);

    if (!feature) {
      return res.status(404).json({ error: `Feature ${id} not found` });
    }

    res.json(feature);
  } catch (error) {
    console.error('Error fetching feature:', error);
    res.status(500).json({ error: 'Failed to fetch feature' });
  }
});

// POST /api/features - Create new feature
featureRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const feature = req.body;

    // Basic validation
    if (!feature.id || !feature.title || !feature.epic) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'ID, title, and epic are required',
      });
    }

    // Check if feature already exists
    const existing = await getFeatureById(feature.id);
    if (existing) {
      return res.status(409).json({ error: `Feature ${feature.id} already exists` });
    }

    // Write feature file
    await writeFeatureFile(feature);

    res.status(201).json(feature);
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({ error: 'Failed to create feature' });
  }
});

// PUT /api/features/:id - Update existing feature
featureRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if feature exists
    const existing = await getFeatureById(id);
    if (!existing) {
      return res.status(404).json({ error: `Feature ${id} not found` });
    }

    // Merge updates
    const updatedFeature = { ...existing, ...updates, id }; // Keep original ID

    // Write updated feature
    await writeFeatureFile(updatedFeature);

    res.json(updatedFeature);
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// DELETE /api/features/:id - Delete feature
featureRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if feature exists
    const existing = await getFeatureById(id);
    if (!existing) {
      return res.status(404).json({ error: `Feature ${id} not found` });
    }

    // Delete feature file
    const filename = `${id.toLowerCase()}.md`;
    const filepath = path.join(PMSPACE_DIR, 'features', filename);
    await unlink(filepath);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting feature:', error);
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});
