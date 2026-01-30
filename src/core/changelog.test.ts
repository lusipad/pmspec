import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChangelogEntrySchema,
  ChangelogFileSchema,
  generateChangelogId,
  createChangelogEntry,
  createUpdateEntries,
  filterChangelogEntries,
  formatChangelogEntry,
  type ChangelogEntry,
} from './changelog.js';

describe('Changelog Model', () => {
  describe('generateChangelogId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateChangelogId();
      const id2 = generateChangelogId();
      
      expect(id1).toMatch(/^CHG-[a-z0-9]+-[a-z0-9]+$/);
      expect(id2).toMatch(/^CHG-[a-z0-9]+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createChangelogEntry', () => {
    it('should create a valid create entry', () => {
      const entry = createChangelogEntry('feature', 'FEAT-001', 'create');
      
      expect(entry.entityType).toBe('feature');
      expect(entry.entityId).toBe('FEAT-001');
      expect(entry.action).toBe('create');
      expect(entry.id).toMatch(/^CHG-/);
      expect(entry.timestamp).toBeTruthy();
    });

    it('should create an update entry with field info', () => {
      const entry = createChangelogEntry('epic', 'EPIC-001', 'update', {
        field: 'status',
        oldValue: 'planning',
        newValue: 'in-progress',
        user: 'testuser',
      });
      
      expect(entry.field).toBe('status');
      expect(entry.oldValue).toBe('planning');
      expect(entry.newValue).toBe('in-progress');
      expect(entry.user).toBe('testuser');
    });

    it('should create a delete entry', () => {
      const entry = createChangelogEntry('milestone', 'MILE-001', 'delete');
      
      expect(entry.action).toBe('delete');
      expect(entry.entityType).toBe('milestone');
    });
  });

  describe('createUpdateEntries', () => {
    it('should create entries for multiple field changes', () => {
      const changes = {
        status: { oldValue: 'todo', newValue: 'in-progress' },
        assignee: { oldValue: 'Alice', newValue: 'Bob' },
      };
      
      const entries = createUpdateEntries('feature', 'FEAT-001', changes, 'admin');
      
      expect(entries).toHaveLength(2);
      expect(entries[0].field).toBe('status');
      expect(entries[1].field).toBe('assignee');
      entries.forEach(entry => {
        expect(entry.user).toBe('admin');
        expect(entry.action).toBe('update');
      });
    });

    it('should skip unchanged fields', () => {
      const changes = {
        status: { oldValue: 'todo', newValue: 'todo' },
        assignee: { oldValue: 'Alice', newValue: 'Bob' },
      };
      
      const entries = createUpdateEntries('feature', 'FEAT-001', changes);
      
      expect(entries).toHaveLength(1);
      expect(entries[0].field).toBe('assignee');
    });

    it('should handle empty changes', () => {
      const entries = createUpdateEntries('feature', 'FEAT-001', {});
      expect(entries).toHaveLength(0);
    });
  });

  describe('filterChangelogEntries', () => {
    const sampleEntries: ChangelogEntry[] = [
      {
        id: 'CHG-1',
        timestamp: '2024-01-15T10:00:00Z',
        entityType: 'feature',
        entityId: 'FEAT-001',
        action: 'create',
      },
      {
        id: 'CHG-2',
        timestamp: '2024-01-16T11:00:00Z',
        entityType: 'feature',
        entityId: 'FEAT-001',
        action: 'update',
        field: 'status',
        oldValue: 'todo',
        newValue: 'in-progress',
      },
      {
        id: 'CHG-3',
        timestamp: '2024-01-17T12:00:00Z',
        entityType: 'epic',
        entityId: 'EPIC-001',
        action: 'create',
      },
      {
        id: 'CHG-4',
        timestamp: '2024-01-18T13:00:00Z',
        entityType: 'feature',
        entityId: 'FEAT-002',
        action: 'delete',
      },
    ];

    it('should filter by entityId', () => {
      const result = filterChangelogEntries(sampleEntries, { entityId: 'FEAT-001' });
      expect(result).toHaveLength(2);
      result.forEach(entry => expect(entry.entityId).toBe('FEAT-001'));
    });

    it('should filter by entityType', () => {
      const result = filterChangelogEntries(sampleEntries, { entityType: 'epic' });
      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('epic');
    });

    it('should filter by action', () => {
      const result = filterChangelogEntries(sampleEntries, { action: 'create' });
      expect(result).toHaveLength(2);
      result.forEach(entry => expect(entry.action).toBe('create'));
    });

    it('should filter by since date', () => {
      const result = filterChangelogEntries(sampleEntries, { since: '2024-01-17' });
      expect(result).toHaveLength(2);
    });

    it('should filter by until date', () => {
      const result = filterChangelogEntries(sampleEntries, { until: '2024-01-16T12:00:00Z' });
      expect(result).toHaveLength(2);
    });

    it('should apply pagination with limit', () => {
      const result = filterChangelogEntries(sampleEntries, { limit: 2 });
      expect(result).toHaveLength(2);
    });

    it('should apply pagination with offset', () => {
      const result = filterChangelogEntries(sampleEntries, { offset: 2 });
      expect(result).toHaveLength(2);
    });

    it('should sort by timestamp descending', () => {
      const result = filterChangelogEntries(sampleEntries, {});
      expect(result[0].id).toBe('CHG-4'); // Most recent
      expect(result[3].id).toBe('CHG-1'); // Oldest
    });

    it('should combine multiple filters', () => {
      const result = filterChangelogEntries(sampleEntries, {
        entityType: 'feature',
        action: 'create',
      });
      expect(result).toHaveLength(1);
      expect(result[0].entityId).toBe('FEAT-001');
    });
  });

  describe('formatChangelogEntry', () => {
    it('should format create entry', () => {
      const entry = createChangelogEntry('feature', 'FEAT-001', 'create');
      const formatted = formatChangelogEntry(entry);
      
      expect(formatted).toContain('Created');
      expect(formatted).toContain('feature');
      expect(formatted).toContain('FEAT-001');
    });

    it('should format update entry with field', () => {
      const entry = createChangelogEntry('epic', 'EPIC-001', 'update', {
        field: 'status',
        oldValue: 'planning',
        newValue: 'in-progress',
      });
      const formatted = formatChangelogEntry(entry);
      
      expect(formatted).toContain('Updated');
      expect(formatted).toContain('status');
      expect(formatted).toContain('planning');
      expect(formatted).toContain('in-progress');
    });

    it('should format delete entry', () => {
      const entry = createChangelogEntry('milestone', 'MILE-001', 'delete');
      const formatted = formatChangelogEntry(entry);
      
      expect(formatted).toContain('Deleted');
      expect(formatted).toContain('milestone');
      expect(formatted).toContain('MILE-001');
    });

    it('should include user when provided', () => {
      const entry = createChangelogEntry('feature', 'FEAT-001', 'create', {
        user: 'testuser',
      });
      const formatted = formatChangelogEntry(entry);
      
      expect(formatted).toContain('by testuser');
    });
  });

  describe('Schema Validation', () => {
    it('should validate a valid changelog entry', () => {
      const entry = {
        id: 'CHG-123',
        timestamp: '2024-01-15T10:00:00Z',
        entityType: 'feature',
        entityId: 'FEAT-001',
        action: 'create',
      };
      
      expect(() => ChangelogEntrySchema.parse(entry)).not.toThrow();
    });

    it('should reject invalid entity type', () => {
      const entry = {
        id: 'CHG-123',
        timestamp: '2024-01-15T10:00:00Z',
        entityType: 'invalid',
        entityId: 'FEAT-001',
        action: 'create',
      };
      
      expect(() => ChangelogEntrySchema.parse(entry)).toThrow();
    });

    it('should reject invalid action', () => {
      const entry = {
        id: 'CHG-123',
        timestamp: '2024-01-15T10:00:00Z',
        entityType: 'feature',
        entityId: 'FEAT-001',
        action: 'invalid',
      };
      
      expect(() => ChangelogEntrySchema.parse(entry)).toThrow();
    });

    it('should validate a changelog file', () => {
      const file = {
        version: '1.0',
        lastUpdated: '2024-01-15T10:00:00Z',
        entries: [
          {
            id: 'CHG-123',
            timestamp: '2024-01-15T10:00:00Z',
            entityType: 'feature',
            entityId: 'FEAT-001',
            action: 'create',
          },
        ],
      };
      
      expect(() => ChangelogFileSchema.parse(file)).not.toThrow();
    });
  });
});
