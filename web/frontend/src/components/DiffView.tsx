import React from 'react';
import type { ChangelogEntry } from './ChangeHistoryTimeline';

interface DiffViewProps {
  entry: ChangelogEntry;
}

function formatValue(value: unknown, multiline = false): string {
  if (value === undefined || value === null) {
    return '(empty)';
  }
  if (typeof value === 'object') {
    return multiline 
      ? JSON.stringify(value, null, 2)
      : JSON.stringify(value);
  }
  return String(value);
}

function isComplexValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

/**
 * DiffView component shows a detailed comparison of old and new values
 */
export function DiffView({ entry }: DiffViewProps) {
  if (entry.action !== 'update' || !entry.field) {
    return null;
  }

  const oldIsComplex = isComplexValue(entry.oldValue);
  const newIsComplex = isComplexValue(entry.newValue);
  const useCodeBlock = oldIsComplex || newIsComplex;

  if (useCodeBlock) {
    return (
      <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">{entry.field}</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          {/* Old value */}
          <div className="p-3 bg-red-50">
            <div className="text-xs text-red-600 mb-2 font-medium">- Removed</div>
            <pre className="text-xs text-red-800 whitespace-pre-wrap break-words font-mono">
              {formatValue(entry.oldValue, true)}
            </pre>
          </div>
          {/* New value */}
          <div className="p-3 bg-green-50">
            <div className="text-xs text-green-600 mb-2 font-medium">+ Added</div>
            <pre className="text-xs text-green-800 whitespace-pre-wrap break-words font-mono">
              {formatValue(entry.newValue, true)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Simple inline diff for primitive values
  return (
    <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
      <span className="text-gray-500 font-medium">{entry.field}:</span>
      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md line-through">
        {formatValue(entry.oldValue)}
      </span>
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">
        {formatValue(entry.newValue)}
      </span>
    </div>
  );
}

interface DiffModalProps {
  entry: ChangelogEntry;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component for displaying detailed diff view
 */
export function DiffModal({ entry, isOpen, onClose }: DiffModalProps) {
  if (!isOpen) return null;

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal content */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Change Details
              </h3>
              <p className="text-sm text-gray-500">
                {formatDateTime(entry.timestamp)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {/* Entry metadata */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Action</span>
                <p className="text-sm font-medium capitalize">{entry.action}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Entity</span>
                <p className="text-sm font-medium">{entry.entityType} - {entry.entityId}</p>
              </div>
              {entry.user && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">User</span>
                  <p className="text-sm font-medium">{entry.user}</p>
                </div>
              )}
              {entry.field && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Field</span>
                  <p className="text-sm font-medium">{entry.field}</p>
                </div>
              )}
            </div>

            {/* Diff view */}
            {entry.action === 'update' && entry.field && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Value Change</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-xs text-red-600 font-medium mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                      Old Value
                    </div>
                    <pre className="text-sm text-red-800 whitespace-pre-wrap break-words font-mono">
                      {formatValue(entry.oldValue, true)}
                    </pre>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-xs text-green-600 font-medium mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Value
                    </div>
                    <pre className="text-sm text-green-800 whitespace-pre-wrap break-words font-mono">
                      {formatValue(entry.newValue, true)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Create/Delete info */}
            {entry.action === 'create' && (
              <div className="border-t border-gray-200 pt-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-sm text-green-700">
                    Created new {entry.entityType}: <span className="font-mono font-bold">{entry.entityId}</span>
                  </div>
                </div>
              </div>
            )}

            {entry.action === 'delete' && (
              <div className="border-t border-gray-200 pt-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-sm text-red-700">
                    Deleted {entry.entityType}: <span className="font-mono font-bold">{entry.entityId}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiffView;
