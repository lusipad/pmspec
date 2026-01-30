import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { getFeatures, getEpics } from '../services/dataService';
import {
  featuresToCSV,
  csvToFeatures,
  writeFeatureFile,
  getCSVTemplate,
} from '../services/csvService';
import { createLogger } from '../utils/logger';
import { ValidationError, InternalServerError } from '../utils/errors';

const logger = createLogger('csv');

export const csvRoutes = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * @openapi
 * /api/csv/export:
 *   get:
 *     summary: Export features to CSV
 *     description: Download all features as a CSV file
 *     tags: [CSV]
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/csv/export - Export features to CSV
csvRoutes.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const features = await getFeatures();
    const csv = featuresToCSV(features);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `pmspec-features-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to export CSV', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/csv/template:
 *   get:
 *     summary: Download CSV template
 *     description: Download a blank CSV template for feature import
 *     tags: [CSV]
 *     responses:
 *       200:
 *         description: CSV template file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/csv/template - Download CSV template
csvRoutes.get('/template', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const template = getCSVTemplate();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pmspec-template.csv"');
    res.send(template);
  } catch (error) {
    next(new InternalServerError({ detail: 'Failed to generate template', instance: req.originalUrl }));
  }
});

/**
 * @openapi
 * /api/csv/import:
 *   post:
 *     summary: Import features from CSV
 *     description: Upload a CSV file to import or update features
 *     tags: [CSV]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file to import
 *             required:
 *               - file
 *     responses:
 *       200:
 *         description: Import successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CSVImportResult'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/csv/import - Import features from CSV
csvRoutes.post('/import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ValidationError({ detail: 'No file uploaded', instance: req.originalUrl });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const { features, errors } = csvToFeatures(csvContent);

    if (errors.length > 0) {
      throw new ValidationError({
        detail: 'Validation errors in CSV',
        instance: req.originalUrl,
        errors: errors.map((e) => ({ field: e.field, message: `Row ${e.row}: ${e.message}` })),
      });
    }

    // Validate Epic references
    const epics = await getEpics();
    const epicIds = new Set(epics.map((e) => e.id));

    const epicErrors = features
      .map((f, i) => {
        if (!epicIds.has(f.epic)) {
          return {
            field: 'Epic',
            message: `Row ${i + 2}: Epic ${f.epic} not found. Available: ${Array.from(epicIds).join(', ')}`,
          };
        }
        return null;
      })
      .filter((e): e is { field: string; message: string } => e !== null);

    if (epicErrors.length > 0) {
      throw new ValidationError({
        detail: 'Invalid Epic references',
        instance: req.originalUrl,
        errors: epicErrors,
      });
    }

    // Check for duplicate IDs in CSV
    const ids = features.map((f) => f.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    if (duplicates.length > 0) {
      throw new ValidationError({
        detail: 'Duplicate IDs found in CSV',
        instance: req.originalUrl,
        errors: [{ field: 'ID', message: `Duplicate IDs: ${[...new Set(duplicates)].join(', ')}` }],
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
    if (error instanceof ValidationError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to import CSV', instance: req.originalUrl }));
  }
});
