import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getFeatures, getEpics } from '../services/dataService';
import {
  featuresToCSV,
  csvToFeatures,
  writeFeatureFile,
  getCSVTemplate,
} from '../services/csvService';

export const csvRoutes = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// GET /api/csv/export - Export features to CSV
csvRoutes.get('/export', async (req: Request, res: Response) => {
  try {
    const features = await getFeatures();
    const csv = featuresToCSV(features);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `pmspec-features-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// GET /api/csv/template - Download CSV template
csvRoutes.get('/template', async (req: Request, res: Response) => {
  try {
    const template = getCSVTemplate();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pmspec-template.csv"');
    res.send(template);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// POST /api/csv/import - Import features from CSV
csvRoutes.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const { features, errors } = csvToFeatures(csvContent);

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation errors in CSV',
        errors,
        created: 0,
        updated: 0,
      });
    }

    // Validate Epic references
    const epics = await getEpics();
    const epicIds = new Set(epics.map((e) => e.id));

    const epicErrors = features
      .map((f, i) => {
        if (!epicIds.has(f.epic)) {
          return {
            row: i + 2,
            field: 'Epic',
            message: `Epic ${f.epic} not found. Available: ${Array.from(epicIds).join(', ')}`,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (epicErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid Epic references',
        errors: epicErrors,
        created: 0,
        updated: 0,
      });
    }

    // Check for duplicate IDs in CSV
    const ids = features.map((f) => f.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    if (duplicates.length > 0) {
      return res.status(400).json({
        error: 'Duplicate IDs found in CSV',
        errors: [
          {
            row: 0,
            field: 'ID',
            message: `Duplicate IDs: ${[...new Set(duplicates)].join(', ')}`,
          },
        ],
        created: 0,
        updated: 0,
      });
    }

    // Check which features already exist
    const existingFeatures = await getFeatures();
    const existingIds = new Set(existingFeatures.map((f) => f.id));

    let created = 0;
    let updated = 0;

    // Write all features to files
    for (const feature of features) {
      await writeFeatureFile(feature);
      if (existingIds.has(feature.id)) {
        updated++;
      } else {
        created++;
      }
    }

    res.json({
      message: 'Import successful',
      created,
      updated,
      total: features.length,
      errors: [],
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});
