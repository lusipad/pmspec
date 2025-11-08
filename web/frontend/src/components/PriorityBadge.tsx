import type { Priority } from '../../../shared/types';
import { getPriorityColor, getPriorityLabel } from '../utils/visualHelpers';

interface PriorityBadgeProps {
  priority?: Priority;
  size?: 'small' | 'medium' | 'large';
}

export function PriorityBadge({ priority = 'medium', size = 'medium' }: PriorityBadgeProps) {
  const colors = getPriorityColor(priority);
  const label = getPriorityLabel(priority);

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
