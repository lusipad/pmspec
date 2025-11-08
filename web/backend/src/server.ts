import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { epicRoutes } from './routes/epics';
import { featureRoutes } from './routes/features';
import { teamRoutes } from './routes/team';
import { csvRoutes } from './routes/csv';
import { timelineRoutes } from './routes/timeline';
import { aiRoutes } from './routes/ai';
import statsRoutes from './routes/stats.js';

const app: Express = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/epics', epicRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

export function startServer(port: number = PORT): Promise<any> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`\n🚀 PMSpec Web Server running at http://localhost:${port}`);
      console.log(`   - API: http://localhost:${port}/api`);
      console.log(`   - Health: http://localhost:${port}/api/health\n`);
      resolve(server);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n⏹  Shutting down gracefully...');
      server.close(() => {
        console.log('✓ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n\n⏹  SIGTERM received, shutting down...');
      server.close(() => {
        console.log('✓ Server closed');
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
