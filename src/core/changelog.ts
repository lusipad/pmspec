import { z } from 'zod';

/**
 * Entity types that can be tracked in the changelog
 */
export const ChangelogEntityType = z.enum(['epic', 'feature', 'milestone', 'story']);
export type ChangelogEntityType = z.infer<typeof ChangelogEntityType>;

/**
 * Action types for changelog entries
 */
export const ChangelogAction = z.enum(['create', 'update', 'delete']);
export type ChangelogAction = z.infer<typeof ChangelogAction>;

/**
 * Schema for a single changelog entry
 */
export const ChangelogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(), // ISO datetime
  entityType: ChangelogEntityType,
  entityId: z.string(),
  action: ChangelogAction,
  field: z.string().optional(),
  oldValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  user: z.string().optional(),
});

export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>;

/**
 * Schema for the changelog file structure
 */
export const ChangelogFileSchema = z.object({
  version: z.string().default('1.0'),
  lastUpdated: z.string().optional(),
  entries: z.array(ChangelogEntrySchema),
});

export type ChangelogFile = z.infer<typeof ChangelogFileSchema>;

/**
 * Options for querying changelog entries
 */
export interface ChangelogQueryOptions {
  entityId?: string;
  entityType?: ChangelogEntityType;
  action?: ChangelogAction;
  since?: string; // ISO date string
  until?: string; // ISO date string
  limit?: number;
  offset?: number;
}

/**
 * Generate a unique ID for a changelog entry
 */
export function generateChangelogId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `CHG-${timestamp}-${random}`;
}

/**
 * Create a new changelog entry
 */
export function createChangelogEntry(
  entityType: ChangelogEntityType,
  entityId: string,
  action: ChangelogAction,
  options?: {
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    user?: string;
  }
): ChangelogEntry {
  return ChangelogEntrySchema.parse({
    id: generateChangelogId(),
    timestamp: new Date().toISOString(),
    entityType,
    entityId,
    action,
    field: options?.field,
    oldValue: options?.oldValue,
    newValue: options?.newValue,
    user: options?.user,
  });
}

/**
 * Create multiple changelog entries for a batch of field updates
 */
export function createUpdateEntries(
  entityType: ChangelogEntityType,
  entityId: string,
  changes: Record<string, { oldValue: unknown; newValue: unknown }>,
  user?: string
): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const timestamp = new Date().toISOString();
  
  for (const [field, { oldValue, newValue }] of Object.entries(changes)) {
    // Only create entry if value actually changed
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      entries.push(ChangelogEntrySchema.parse({
        id: generateChangelogId(),
        timestamp,
        entityType,
        entityId,
        action: 'update',
        field,
        oldValue,
        newValue,
        user,
      }));
    }
  }
  
  return entries;
}

/**
 * Filter changelog entries based on query options
 */
export function filterChangelogEntries(
  entries: ChangelogEntry[],
  options: ChangelogQueryOptions
): ChangelogEntry[] {
  let filtered = [...entries];

  if (options.entityId) {
    filtered = filtered.filter(e => e.entityId === options.entityId);
  }

  if (options.entityType) {
    filtered = filtered.filter(e => e.entityType === options.entityType);
  }

  if (options.action) {
    filtered = filtered.filter(e => e.action === options.action);
  }

  if (options.since) {
    const sinceDate = new Date(options.since);
    filtered = filtered.filter(e => new Date(e.timestamp) >= sinceDate);
  }

  if (options.until) {
    const untilDate = new Date(options.until);
    filtered = filtered.filter(e => new Date(e.timestamp) <= untilDate);
  }

  // Sort by timestamp descending (newest first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  if (options.offset) {
    filtered = filtered.slice(options.offset);
  }

  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Format a changelog entry for display
 */
export function formatChangelogEntry(entry: ChangelogEntry): string {
  const timestamp = new Date(entry.timestamp).toLocaleString();
  const user = entry.user ? ` by ${entry.user}` : '';
  
  switch (entry.action) {
    case 'create':
      return `[${timestamp}] Created ${entry.entityType} ${entry.entityId}${user}`;
    case 'delete':
      return `[${timestamp}] Deleted ${entry.entityType} ${entry.entityId}${user}`;
    case 'update':
      if (entry.field) {
        const oldVal = formatValue(entry.oldValue);
        const newVal = formatValue(entry.newValue);
        return `[${timestamp}] Updated ${entry.entityType} ${entry.entityId} - ${entry.field}: ${oldVal} → ${newVal}${user}`;
      }
      return `[${timestamp}] Updated ${entry.entityType} ${entry.entityId}${user}`;
    default:
      return `[${timestamp}] ${entry.action} ${entry.entityType} ${entry.entityId}${user}`;
  }
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(empty)';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
