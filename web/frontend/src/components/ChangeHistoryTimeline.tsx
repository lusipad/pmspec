import React from 'react';

export interface ChangelogEntry {
  id: string;
  timestamp: string;
  entityType: 'epic' | 'feature' | 'milestone' | 'story';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  user?: string;
}

interface ChangeHistoryTimelineProps {
  entries: ChangelogEntry[];
  showEntityId?: boolean;
  onEntityClick?: (entityId: string, entityType: string) => void;
}

const actionIcons: Record<string, string> = {
  create: '✨',
  update: '📝',
  delete: '🗑️',
};

const actionColors: Record<string, string> = {
  create: 'text-green-600 bg-green-50',
  update: 'text-blue-600 bg-blue-50',
  delete: 'text-red-600 bg-red-50',
};

const entityTypeColors: Record<string, string> = {
  epic: 'bg-purple-100 text-purple-800',
  feature: 'bg-blue-100 text-blue-800',
  milestone: 'bg-orange-100 text-orange-800',
  story: 'bg-teal-100 text-teal-800',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(empty)';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function groupEntriesByDate(entries: ChangelogEntry[]): Map<string, ChangelogEntry[]> {
  const grouped = new Map<string, ChangelogEntry[]>();
  
  for (const entry of entries) {
    const date = entry.timestamp.split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(entry);
  }
  
  return grouped;
}

export function ChangeHistoryTimeline({ entries, showEntityId = true, onEntityClick }: ChangeHistoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No change history available</p>
      </div>
    );
  }

  const groupedEntries = groupEntriesByDate(entries);

  return (
    <div className="space-y-6">
      {Array.from(groupedEntries.entries()).map(([date, dateEntries]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">{formatDate(date)}</h3>
          <div className="space-y-3">
            {dateEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* Action icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${actionColors[entry.action]}`}>
                  <span className="text-lg">{actionIcons[entry.action]}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium capitalize">{entry.action}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${entityTypeColors[entry.entityType]}`}>
                      {entry.entityType}
                    </span>
                    {showEntityId && (
                      <button
                        onClick={() => onEntityClick?.(entry.entityId, entry.entityType)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-sm"
                      >
                        {entry.entityId}
                      </button>
                    )}
                    {entry.user && (
                      <span className="text-gray-400 text-sm">by {entry.user}</span>
                    )}
                  </div>

                  {/* Field change details */}
                  {entry.action === 'update' && entry.field && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">{entry.field}:</span>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded line-through">
                          {formatValue(entry.oldValue)}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                          {formatValue(entry.newValue)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0 text-xs text-gray-400">
                  {formatTime(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChangeHistoryTimeline;
