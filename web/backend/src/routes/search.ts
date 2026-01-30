import { Router, Request, Response } from 'express';
import { searchService, type SearchOptions, type SearchableType } from '../services/searchService';
import { createLogger } from '../utils/logger';

const logger = createLogger('search-routes');
const router = Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search across all document types
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [epic, feature, story, milestone]
 *         description: Filter by document type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Maximum number of results
 *       - in: query
 *         name: fuzzy
 *         schema:
 *           type: number
 *           default: 0.2
 *         description: Fuzzy matching threshold (0-1)
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       score:
 *                         type: number
 *                       matches:
 *                         type: array
 *                       parentId:
 *                         type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                     count:
 *                       type: integer
 *                     searchTime:
 *                       type: string
 *       400:
 *         description: Bad request (missing query parameter)
 *       503:
 *         description: Search service not ready
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { q, type, limit, fuzzy } = req.query;

    // Validate query parameter
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter "q" is required',
      });
    }

    // Initialize search if not ready
    if (!searchService.isReady()) {
      await searchService.index();
    }

    // Build search options
    const options: SearchOptions = {
      limit: Math.min(parseInt(limit as string, 10) || 20, 100),
    };

    // Validate and set type filter
    if (type) {
      const validTypes: SearchableType[] = ['epic', 'feature', 'story', 'milestone'];
      const requestedType = (type as string).toLowerCase() as SearchableType;

      if (!validTypes.includes(requestedType)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid type "${type}". Valid types: ${validTypes.join(', ')}`,
        });
      }

      options.type = requestedType;
    }

    // Set fuzzy matching
    if (fuzzy) {
      const fuzzyValue = parseFloat(fuzzy as string);
      if (!isNaN(fuzzyValue) && fuzzyValue >= 0 && fuzzyValue <= 1) {
        options.fuzzy = fuzzyValue;
      }
    }

    // Perform search
    const results = searchService.search(q.trim(), options);
    const searchTime = Date.now() - startTime;

    logger.info({ 
      query: q, 
      type, 
      resultCount: results.length, 
      searchTime 
    }, 'Search performed');

    return res.json({
      results,
      meta: {
        query: q.trim(),
        count: results.length,
        searchTime: `${searchTime}ms`,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Search error');
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while searching',
    });
  }
});

/**
 * @swagger
 * /api/search/reindex:
 *   post:
 *     summary: Rebuild the search index
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Index rebuilt successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 documentCount:
 *                   type: integer
 *                 duration:
 *                   type: string
 */
router.post('/reindex', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    await searchService.index();
    const duration = Date.now() - startTime;

    logger.info({ duration, documentCount: searchService.getDocumentCount() }, 'Search index rebuilt');

    return res.json({
      message: 'Search index rebuilt successfully',
      documentCount: searchService.getDocumentCount(),
      duration: `${duration}ms`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to rebuild search index');
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to rebuild search index',
    });
  }
});

/**
 * @swagger
 * /api/search/status:
 *   get:
 *     summary: Get search service status
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Search service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 initialized:
 *                   type: boolean
 *                 documentCount:
 *                   type: integer
 *                 indexing:
 *                   type: boolean
 */
router.get('/status', (req: Request, res: Response) => {
  return res.json(searchService.getStatus());
});

export const searchRoutes = router;
