import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import {
  ChangelogEntry,
  ChangelogFile,
  ChangelogFileSchema,
  ChangelogQueryOptions,
  ChangelogEntityType,
  ChangelogAction,
  createChangelogEntry,
  createUpdateEntries,
  filterChangelogEntries,
} from './changelog.js';

const CHANGELOG_FILE = 'pmspace/changelog.json';

/**
 * Service for managing changelog operations
 */
export class ChangelogService {
  private filePath: string;

  constructor(basePath: string = process.cwd()) {
    this.filePath = join(basePath, CHANGELOG_FILE);
  }

  /**
   * Initialize the changelog file if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      await readFile(this.filePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Create directory and file
        await mkdir(dirname(this.filePath), { recursive: true });
        const initialData: ChangelogFile = {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          entries: [],
        };
        await writeFile(this.filePath, JSON.stringify(initialData, null, 2));
      } else {
        throw error;
      }
    }
  }

  /**
   * Read the changelog file
   */
  async read(): Promise<ChangelogFile> {
    try {
      const content = await readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      return ChangelogFileSchema.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Return empty changelog if file doesn't exist
        return {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          entries: [],
        };
      }
      throw error;
    }
  }

  /**
   * Write the changelog file
   */
  async write(data: ChangelogFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    data.lastUpdated = new Date().toISOString();
    await writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Add entries to the changelog
   */
  async addEntries(entries: ChangelogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const data = await this.read();
    data.entries.push(...entries);
    await this.write(data);
  }

  /**
   * Record a create action
   */
  async recordCreate(
    entityType: ChangelogEntityType,
    entityId: string,
    user?: string
  ): Promise<ChangelogEntry> {
    const entry = createChangelogEntry(entityType, entityId, 'create', { user });
    await this.addEntries([entry]);
    return entry;
  }

  /**
   * Record a delete action
   */
  async recordDelete(
    entityType: ChangelogEntityType,
    entityId: string,
    user?: string
  ): Promise<ChangelogEntry> {
    const entry = createChangelogEntry(entityType, entityId, 'delete', { user });
    await this.addEntries([entry]);
    return entry;
  }

  /**
   * Record an update action for a single field
   */
  async recordUpdate(
    entityType: ChangelogEntityType,
    entityId: string,
    field: string,
    oldValue: unknown,
    newValue: unknown,
    user?: string
  ): Promise<ChangelogEntry | null> {
    // Don't record if value didn't change
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      return null;
    }

    const entry = createChangelogEntry(entityType, entityId, 'update', {
      field,
      oldValue,
      newValue,
      user,
    });
    await this.addEntries([entry]);
    return entry;
  }

  /**
   * Record multiple field updates at once
   */
  async recordUpdates(
    entityType: ChangelogEntityType,
    entityId: string,
    changes: Record<string, { oldValue: unknown; newValue: unknown }>,
    user?: string
  ): Promise<ChangelogEntry[]> {
    const entries = createUpdateEntries(entityType, entityId, changes, user);
    await this.addEntries(entries);
    return entries;
  }

  /**
   * Query changelog entries
   */
  async query(options: ChangelogQueryOptions = {}): Promise<ChangelogEntry[]> {
    const data = await this.read();
    return filterChangelogEntries(data.entries, options);
  }

  /**
   * Get history for a specific entity
   */
  async getEntityHistory(entityId: string): Promise<ChangelogEntry[]> {
    return this.query({ entityId });
  }

  /**
   * Get all entries (with optional pagination)
   */
  async getAll(limit?: number, offset?: number): Promise<{
    entries: ChangelogEntry[];
    total: number;
  }> {
    const data = await this.read();
    const total = data.entries.length;
    const entries = filterChangelogEntries(data.entries, { limit, offset });
    return { entries, total };
  }

  /**
   * Get entries since a specific date
   */
  async getSince(since: string): Promise<ChangelogEntry[]> {
    return this.query({ since });
  }

  /**
   * Get changelog summary statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    byEntityType: Record<string, number>;
    byAction: Record<string, number>;
    recentActivity: {
      last24h: number;
      last7d: number;
      last30d: number;
    };
  }> {
    const data = await this.read();
    const entries = data.entries;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const byEntityType: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    let last24h = 0;
    let last7d = 0;
    let last30d = 0;

    for (const entry of entries) {
      // Count by entity type
      byEntityType[entry.entityType] = (byEntityType[entry.entityType] || 0) + 1;

      // Count by action
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;

      // Count recent activity
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= oneDayAgo) last24h++;
      if (entryDate >= oneWeekAgo) last7d++;
      if (entryDate >= oneMonthAgo) last30d++;
    }

    return {
      totalEntries: entries.length,
      byEntityType,
      byAction,
      recentActivity: { last24h, last7d, last30d },
    };
  }

  /**
   * Clear all changelog entries (use with caution)
   */
  async clear(): Promise<void> {
    await this.write({
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      entries: [],
    });
  }
}

// Singleton instance for convenience
let defaultService: ChangelogService | null = null;

/**
 * Get the default changelog service instance
 */
export function getChangelogService(): ChangelogService {
  if (!defaultService) {
    defaultService = new ChangelogService();
  }
  return defaultService;
}

/**
 * Reset the default service (mainly for testing)
 */
export function resetChangelogService(): void {
  defaultService = null;
}
