import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
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
import statsRoutes from './routes/stats';
import { importRoutes } from './routes/import';
import { workflowRoutes } from './routes/workflows';
import { integrationRoutes } from './routes/integrations';
import { authRoutes } from './auth';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { wsService } from './services/websocket';
import { fileWatcher } from './services/fileWatcher';

const app: Express = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST;

function resolveFrontendDistPath(): string | null {
  const candidates = [
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../../../../frontend/dist'),
    path.resolve(process.cwd(), 'web/frontend/dist'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  return null;
}

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
app.use('/api/workflows', workflowRoutes);
app.use('/api/integrations', integrationRoutes);

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
  const frontendPath = resolveFrontendDistPath();

  if (frontendPath) {
    app.use(express.static(frontendPath));

    app.get(/.*/, (req: Request, res: Response) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    logger.warn('Frontend dist directory not found; static hosting disabled');
  }
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
    
    httpServer.listen(port, HOST, () => {
      const hostForLog = HOST || 'localhost';
      logger.info({ port, host: hostForLog, url: `http://${hostForLog}:${port}` }, '🚀 PMSpec Web Server running');
      logger.info({ 
        api: `http://localhost:${port}/api`, 
        health: `http://localhost:${port}/api/health`,
        docs: `http://localhost:${port}/api/docs`,
        openapi: `http://localhost:${port}/api/openapi.json`,
        websocket: `ws://localhost:${port}/ws`
      }, 'Available endpoints');
      resolve(httpServer);
    });
  });
}

export function stopServer(httpServer: any): Promise<void> {
  return new Promise((resolve) => {
    wsService.shutdown();
    fileWatcher.shutdown();
    httpServer.close(() => {
      logger.info('Server closed');
      resolve();
    });
  });
}

// Start server if run directly
if (require.main === module) {
  startServer().then((httpServer) => {
    const shutdown = (signal: 'SIGINT' | 'SIGTERM') => {
      logger.info({ signal }, 'Shutting down gracefully...');
      stopServer(httpServer).finally(() => process.exit(0));
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  });
}

export default app;
