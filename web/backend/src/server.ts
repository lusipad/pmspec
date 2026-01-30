import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { epicRoutes } from './routes/epics';
import { featureRoutes } from './routes/features';
import { teamRoutes } from './routes/team';
import { csvRoutes } from './routes/csv';
import { timelineRoutes } from './routes/timeline';
import { milestoneRoutes } from './routes/milestones';
import { changelogRoutes } from './routes/changelog';
import statsRoutes from './routes/stats.js';
import { importRoutes } from './routes/import';
import { authRoutes } from './auth';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { wsService } from './services/websocket';
import { fileWatcher } from './services/fileWatcher';

const app: Express = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Structured logging middleware
app.use(requestLogger);

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'PMSpec API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// OpenAPI JSON endpoint
app.get('/api/openapi.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/epics', epicRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/import', importRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  const wsStatus = wsService.getStatus();
  const fileWatcherStatus = fileWatcher.getStatus();
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    websocket: wsStatus,
    fileWatcher: fileWatcherStatus,
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handling middleware (RFC 7807)
app.use(errorHandler);

// 404 handler for unmatched routes
app.use(notFoundHandler);

export function startServer(port: number = PORT): Promise<any> {
  return new Promise((resolve) => {
    const httpServer = createServer(app);
    
    // Initialize WebSocket on HTTP server
    wsService.initialize(httpServer);
    
    // Initialize file watcher
    fileWatcher.initialize();
    
    httpServer.listen(port, () => {
      logger.info({ port, url: `http://localhost:${port}` }, '🚀 PMSpec Web Server running');
      logger.info({ 
        api: `http://localhost:${port}/api`, 
        health: `http://localhost:${port}/api/health`,
        docs: `http://localhost:${port}/api/docs`,
        openapi: `http://localhost:${port}/api/openapi.json`,
        websocket: `ws://localhost:${port}/ws`
      }, 'Available endpoints');
      resolve(httpServer);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Shutting down gracefully...');
      wsService.shutdown();
      fileWatcher.shutdown();
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down...');
      wsService.shutdown();
      fileWatcher.shutdown();
      httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  });
}

// Start server if run directly
if (require.main === module) {
  startServer();
}

export default app;
