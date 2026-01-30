import chokidar from 'chokidar';
import path from 'path';
import { wsService } from './websocket';
import { createLogger } from '../utils/logger';

const logger = createLogger('fileWatcher');

const PMSPACE_DIR = path.join(process.cwd(), '..', '..', 'pmspace');
const DEBOUNCE_MS = 300;

class FileWatcherService {
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized) {
      logger.warn('File watcher already initialized');
      return;
    }

    try {
      this.watcher = chokidar.watch(PMSPACE_DIR, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100,
        },
      });

      this.watcher
        .on('add', (filePath: string) => this.handleFileChange(filePath, 'created'))
        .on('change', (filePath: string) => this.handleFileChange(filePath, 'updated'))
        .on('unlink', (filePath: string) => this.handleFileChange(filePath, 'deleted'))
        .on('error', (error: unknown) => logger.error({ error }, 'File watcher error'))
        .on('ready', () => {
          this.isInitialized = true;
          logger.info({ path: PMSPACE_DIR }, 'File watcher ready');
        });

    } catch (error) {
      logger.error({ error }, 'Failed to initialize file watcher');
    }
  }

  private handleFileChange(filePath: string, action: 'created' | 'updated' | 'deleted'): void {
    // Only process markdown files
    if (!filePath.endsWith('.md')) {
      return;
    }

    // Debounce changes for the same file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.processFileChange(filePath, action);
    }, DEBOUNCE_MS);

    this.debounceTimers.set(filePath, timer);
  }

  private processFileChange(filePath: string, action: 'created' | 'updated' | 'deleted'): void {
    const relativePath = path.relative(PMSPACE_DIR, filePath);
    const parts = relativePath.split(path.sep);
    
    if (parts.length < 1) {
      return;
    }

    const folder = parts[0];
    const filename = parts[parts.length - 1];

    logger.info({ relativePath, action, folder }, 'File change detected');

    // Determine entity type and ID
    let entityType: 'feature' | 'epic' | 'milestone' | 'team' | null = null;
    let entityId: string | undefined;

    switch (folder) {
      case 'features':
        entityType = 'feature';
        // Extract ID from filename (e.g., feat-001.md -> FEAT-001)
        entityId = filename.replace('.md', '').toUpperCase();
        wsService.broadcastFeatureUpdate(entityId, action);
        break;
      case 'epics':
        entityType = 'epic';
        entityId = filename.replace('.md', '').toUpperCase();
        wsService.broadcastEpicUpdate(entityId, action);
        break;
      case 'milestones':
        entityType = 'milestone';
        entityId = filename.replace('.md', '').toUpperCase();
        wsService.broadcastMilestoneUpdate(entityId, action);
        break;
      default:
        // Handle root-level files like team.md
        if (filename === 'team.md') {
          entityType = 'team';
          wsService.broadcastFileChange('team');
        }
        break;
    }

    if (entityType) {
      logger.debug({ entityType, entityId, action }, 'Broadcasting file change');
    }
  }

  getStatus(): { initialized: boolean; watchPath: string } {
    return {
      initialized: this.isInitialized,
      watchPath: PMSPACE_DIR,
    };
  }

  shutdown(): void {
    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.isInitialized = false;
    logger.info('File watcher shutdown');
  }
}

// Export singleton instance
export const fileWatcher = new FileWatcherService();
