import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChangelogService, resetChangelogService } from './changelog-service.js';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ChangelogService', () => {
  let service: ChangelogService;
  let testDir: string;

  beforeEach(async () => {
    // Create a temp directory for testing
    testDir = join(tmpdir(), `pmspec-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    service = new ChangelogService(testDir);
    resetChangelogService();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create changelog file if it does not exist', async () => {
      await service.initialize();
      
      const data = await service.read();
      expect(data.version).toBe('1.0');
      expect(data.entries).toEqual([]);
    });

    it('should not overwrite existing changelog file', async () => {
      // Create initial file
      await service.initialize();
      await service.recordCreate('feature', 'FEAT-001');
      
      // Re-initialize
      await service.initialize();
      
      const data = await service.read();
      expect(data.entries).toHaveLength(1);
    });
  });

  describe('recordCreate', () => {
    it('should record a create action', async () => {
      const entry = await service.recordCreate('feature', 'FEAT-001', 'testuser');
      
      expect(entry.action).toBe('create');
      expect(entry.entityType).toBe('feature');
      expect(entry.entityId).toBe('FEAT-001');
      expect(entry.user).toBe('testuser');
      
      const data = await service.read();
      expect(data.entries).toHaveLength(1);
    });
  });

  describe('recordDelete', () => {
    it('should record a delete action', async () => {
      const entry = await service.recordDelete('epic', 'EPIC-001');
      
      expect(entry.action).toBe('delete');
      expect(entry.entityType).toBe('epic');
      expect(entry.entityId).toBe('EPIC-001');
    });
  });

  describe('recordUpdate', () => {
    it('should record an update action', async () => {
      const entry = await service.recordUpdate(
        'feature',
        'FEAT-001',
        'status',
        'todo',
        'in-progress'
      );
      
      expect(entry).not.toBeNull();
      expect(entry!.action).toBe('update');
      expect(entry!.field).toBe('status');
      expect(entry!.oldValue).toBe('todo');
      expect(entry!.newValue).toBe('in-progress');
    });

    it('should not record if value unchanged', async () => {
      const entry = await service.recordUpdate(
        'feature',
        'FEAT-001',
        'status',
        'todo',
        'todo'
      );
      
      expect(entry).toBeNull();
      
      const data = await service.read();
      expect(data.entries).toHaveLength(0);
    });
  });

  describe('recordUpdates', () => {
    it('should record multiple field updates', async () => {
      const entries = await service.recordUpdates('feature', 'FEAT-001', {
        status: { oldValue: 'todo', newValue: 'in-progress' },
        assignee: { oldValue: 'Alice', newValue: 'Bob' },
      });
      
      expect(entries).toHaveLength(2);
      
      const data = await service.read();
      expect(data.entries).toHaveLength(2);
    });

    it('should skip unchanged fields', async () => {
      const entries = await service.recordUpdates('feature', 'FEAT-001', {
        status: { oldValue: 'todo', newValue: 'todo' },
        assignee: { oldValue: 'Alice', newValue: 'Bob' },
      });
      
      expect(entries).toHaveLength(1);
      expect(entries[0].field).toBe('assignee');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Add some test entries
      await service.recordCreate('feature', 'FEAT-001');
      await service.recordCreate('epic', 'EPIC-001');
      await service.recordUpdate('feature', 'FEAT-001', 'status', 'todo', 'in-progress');
      await service.recordDelete('feature', 'FEAT-002');
    });

    it('should query by entityId', async () => {
      const entries = await service.query({ entityId: 'FEAT-001' });
      expect(entries).toHaveLength(2);
    });

    it('should query by entityType', async () => {
      const entries = await service.query({ entityType: 'feature' });
      expect(entries).toHaveLength(3);
    });

    it('should query by action', async () => {
      const entries = await service.query({ action: 'create' });
      expect(entries).toHaveLength(2);
    });

    it('should apply limit', async () => {
      const entries = await service.query({ limit: 2 });
      expect(entries).toHaveLength(2);
    });
  });

  describe('getEntityHistory', () => {
    it('should return history for specific entity', async () => {
      await service.recordCreate('feature', 'FEAT-001');
      await service.recordCreate('feature', 'FEAT-002');
      await service.recordUpdate('feature', 'FEAT-001', 'status', 'todo', 'done');
      
      const history = await service.getEntityHistory('FEAT-001');
      expect(history).toHaveLength(2);
      history.forEach(entry => expect(entry.entityId).toBe('FEAT-001'));
    });
  });

  describe('getAll', () => {
    it('should return all entries with total count', async () => {
      await service.recordCreate('feature', 'FEAT-001');
      await service.recordCreate('feature', 'FEAT-002');
      await service.recordCreate('feature', 'FEAT-003');
      
      const result = await service.getAll(2, 0);
      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should return changelog statistics', async () => {
      await service.recordCreate('feature', 'FEAT-001');
      await service.recordCreate('epic', 'EPIC-001');
      await service.recordUpdate('feature', 'FEAT-001', 'status', 'todo', 'done');
      
      const stats = await service.getStats();
      
      expect(stats.totalEntries).toBe(3);
      expect(stats.byEntityType.feature).toBe(2);
      expect(stats.byEntityType.epic).toBe(1);
      expect(stats.byAction.create).toBe(2);
      expect(stats.byAction.update).toBe(1);
      expect(stats.recentActivity.last24h).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await service.recordCreate('feature', 'FEAT-001');
      await service.recordCreate('feature', 'FEAT-002');
      
      await service.clear();
      
      const data = await service.read();
      expect(data.entries).toHaveLength(0);
    });
  });
});
