import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ValidationError, InternalServerError, NotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('integrations');
const upload = multer({ storage: multer.memoryStorage() });

export const integrationRoutes = Router();

type ConnectorId = 'azure-devops' | 'jira' | 'linear' | 'github' | 'feishu' | 'tencent-docs';

interface ConnectorInfo {
  id: ConnectorId;
  name: string;
  category: 'engineering' | 'collaboration';
  connected: boolean;
  capabilities: Array<'import' | 'export'>;
}

interface SyncJob {
  id: string;
  connectorId: ConnectorId;
  direction: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  message?: string;
}

interface ConflictRecord {
  id: string;
  connectorId: ConnectorId;
  featureId: string;
  field: 'status' | 'assignee' | 'start' | 'end';
  pmspecValue: string;
  remoteValue: string;
  resolution: 'pmspec' | 'remote' | 'manual';
  createdAt: string;
}

const connectorCatalog: ConnectorInfo[] = [
  { id: 'azure-devops', name: 'Azure DevOps', category: 'engineering', connected: false, capabilities: ['import', 'export'] },
  { id: 'jira', name: 'Jira', category: 'engineering', connected: false, capabilities: ['import', 'export'] },
  { id: 'linear', name: 'Linear', category: 'engineering', connected: false, capabilities: ['import', 'export'] },
  { id: 'github', name: 'GitHub Issues', category: 'engineering', connected: false, capabilities: ['import', 'export'] },
  { id: 'feishu', name: 'Feishu', category: 'collaboration', connected: false, capabilities: ['import', 'export'] },
  { id: 'tencent-docs', name: 'Tencent Docs', category: 'collaboration', connected: false, capabilities: ['import', 'export'] },
];

const connectorState = new Map<ConnectorId, ConnectorInfo>(
  connectorCatalog.map((connector) => [connector.id, { ...connector }])
);
const syncJobs: SyncJob[] = [];
const conflictRecords: ConflictRecord[] = [];

function isConnectorId(value: string): value is ConnectorId {
  return connectorState.has(value as ConnectorId);
}

function nextJobId(): string {
  return `sync-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

integrationRoutes.get('/connectors', (req: Request, res: Response) => {
  res.json({ connectors: [...connectorState.values()] });
});

integrationRoutes.post('/:connector/connect', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { connector } = req.params;
    if (!isConnectorId(connector)) {
      throw new ValidationError({
        detail: `Unsupported connector: ${connector}`,
        instance: req.originalUrl,
      });
    }

    const existing = connectorState.get(connector)!;
    const updated: ConnectorInfo = { ...existing, connected: true };
    connectorState.set(connector, updated);
    res.json({ connector: updated });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    next(new InternalServerError({ detail: 'Failed to connect connector', instance: req.originalUrl }));
  }
});

integrationRoutes.post(
  '/:connector/import',
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { connector } = req.params;
      if (!isConnectorId(connector)) {
        throw new ValidationError({
          detail: `Unsupported connector: ${connector}`,
          instance: req.originalUrl,
        });
      }

      const job: SyncJob = {
        id: nextJobId(),
        connectorId: connector,
        direction: 'import',
        status: 'completed',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        message: req.file
          ? `Imported ${req.file.originalname} (${Math.round(req.file.size / 1024)} KB)`
          : 'Import requested without file payload',
      };

      syncJobs.unshift(job);
      res.status(202).json({ job });
    } catch (error) {
      if (error instanceof ValidationError) {
        return next(error);
      }
      logger.error({ error }, 'Failed to enqueue import job');
      next(new InternalServerError({ detail: 'Failed to enqueue import job', instance: req.originalUrl }));
    }
  }
);

integrationRoutes.post('/:connector/export', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { connector } = req.params;
    if (!isConnectorId(connector)) {
      throw new ValidationError({
        detail: `Unsupported connector: ${connector}`,
        instance: req.originalUrl,
      });
    }

    const job: SyncJob = {
      id: nextJobId(),
      connectorId: connector,
      direction: 'export',
      status: 'completed',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      message: 'Exported status/assignee/schedule payload',
    };

    syncJobs.unshift(job);
    res.status(202).json({ job });
  } catch (error) {
    if (error instanceof ValidationError) {
      return next(error);
    }
    logger.error({ error }, 'Failed to enqueue export job');
    next(new InternalServerError({ detail: 'Failed to enqueue export job', instance: req.originalUrl }));
  }
});

integrationRoutes.get('/sync-log', (req: Request, res: Response) => {
  res.json({ jobs: syncJobs.slice(0, 100) });
});

integrationRoutes.get('/conflicts', (req: Request, res: Response) => {
  res.json({ conflicts: conflictRecords });
});

integrationRoutes.post('/conflicts/:id/resolve', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const resolution = req.body?.resolution as ConflictRecord['resolution'] | undefined;

    if (!resolution || !['pmspec', 'remote', 'manual'].includes(resolution)) {
      throw new ValidationError({
        detail: 'resolution must be one of: pmspec, remote, manual',
        instance: req.originalUrl,
      });
    }

    const index = conflictRecords.findIndex((conflict) => conflict.id === id);
    if (index === -1) {
      throw new NotFoundError({ detail: `Conflict ${id} not found`, instance: req.originalUrl });
    }

    conflictRecords[index] = { ...conflictRecords[index], resolution };
    res.json({ conflict: conflictRecords[index] });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return next(error);
    }
    logger.error({ error }, 'Failed to resolve conflict');
    next(new InternalServerError({ detail: 'Failed to resolve conflict', instance: req.originalUrl }));
  }
});
