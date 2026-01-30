import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { ChangeHistoryTimeline, type ChangelogEntry } from './ChangeHistoryTimeline';
import { DiffModal } from './DiffView';

interface EntityChangeHistoryProps {
  entityId: string;
  title?: string;
}

/**
 * Component to display change history for a specific entity
 * Use this in Feature/Epic detail pages
 */
export function EntityChangeHistory({ entityId, title = 'Change History' }: EntityChangeHistoryProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getEntityChangelog(entityId) as { entries: ChangelogEntry[] };
        setEntries(data.entries || []);
      } catch (err) {
        setError('Failed to load change history');
        console.error('Error fetching changelog:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [entityId]);

  const handleEntryClick = useCallback((entry: ChangelogEntry) => {
    if (entry.action === 'update' && entry.field) {
      setSelectedEntry(entry);
    }
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {title}
      </h3>
      
      <ChangeHistoryTimeline 
        entries={entries} 
        showEntityId={false}
        onEntityClick={() => {}}
      />

      {/* Show entry count */}
      {entries.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          {entries.length} change{entries.length !== 1 ? 's' : ''} recorded
        </div>
      )}

      {/* Diff modal */}
      {selectedEntry && (
        <DiffModal
          entry={selectedEntry}
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

/**
 * Collapsible change history panel for embedding in detail pages
 */
export function CollapsibleChangeHistory({ entityId }: { entityId: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Change History
        </span>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          <EntityChangeHistory entityId={entityId} title="" />
        </div>
      )}
    </div>
  );
}

export default EntityChangeHistory;
