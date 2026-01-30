import type { Priority } from '@pmspec/types';
import { getPriorityColor, getPriorityLabel } from '../utils/visualHelpers';

interface PriorityBadgeProps {
  priority?: Priority | string;
  size?: 'small' | 'medium' | 'large';
}

// Map P0/P1/P2/P3 format to Priority
function normalizePriority(p: Priority | string | undefined): Priority {
  if (!p) return 'medium';
  const mapping: Record<string, Priority> = {
    'P0': 'critical',
    'P1': 'high',
    'P2': 'medium',
    'P3': 'low',
    'critical': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
  };
  return mapping[p] || 'medium';
}

export function PriorityBadge({ priority = 'medium', size = 'medium' }: PriorityBadgeProps) {
  const normalized = normalizePriority(priority);
  const colors = getPriorityColor(normalized);
  const label = getPriorityLabel(normalized);

  const sizeClasses = {
    small: 'px-1.5 py-0.5 text-xs',
    medium: 'px-2 py-1 text-xs',
    large: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded uppercase ${sizeClasses[size]}`}
      style={{
        backgroundColor: colors.badgeBg,
        color: colors.badgeText,
      }}
      title={`Priority: ${label}`}
    >
      {label}
    </span>
  );
}
