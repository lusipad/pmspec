import type { Priority, WorkloadSize } from '@pmspec/types';

/**
 * Get color code for a priority level
 */
export function getPriorityColor(priority: Priority = 'medium'): {
  border: string;
  bg: string;
  text: string;
  badgeBg: string;
  badgeText: string;
} {
  const colors = {
    critical: {
      border: '#DC2626',
      bg: '#FEE2E2',
      text: '#991B1B',
      badgeBg: '#DC2626',
      badgeText: '#FFFFFF',
    },
    high: {
      border: '#F59E0B',
      bg: '#FEF3C7',
      text: '#D97706',
      badgeBg: '#F59E0B',
      badgeText: '#FFFFFF',
    },
    medium: {
      border: '#3B82F6',
      bg: '#FFFFFF',
      text: '#2563EB',
      badgeBg: '#3B82F6',
      badgeText: '#FFFFFF',
    },
    low: {
      border: '#6B7280',
      bg: '#FFFFFF',
      text: '#4B5563',
      badgeBg: '#6B7280',
      badgeText: '#FFFFFF',
    },
  };

  return colors[priority];
}

/**
 * Get border width for a priority level
 */
export function getPriorityBorderWidth(priority: Priority = 'medium'): string {
  const widths = {
    critical: '3px',
    high: '2px',
    medium: '1px',
    low: '1px',
  };

  return widths[priority];
}

/**
 * Get opacity for a priority level
 */
export function getPriorityOpacity(priority: Priority = 'medium'): number {
  return priority === 'low' ? 0.85 : 1;
}

/**
 * Get shadow style for a priority level
 */
export function getPriorityShadow(priority: Priority = 'medium'): string {
  return priority === 'critical' ? '0 4px 6px -1px rgba(220, 38, 38, 0.3)' : '';
}

/**
 * Calculate workload size from estimate hours
 */
export function getWorkloadSize(estimate: number): WorkloadSize {
  if (estimate <= 8) return 'S';
  if (estimate <= 40) return 'M';
  if (estimate <= 80) return 'L';
  return 'XL';
}

/**
 * Get color for workload size
 */
export function getWorkloadColor(size: WorkloadSize): {
  bg: string;
  text: string;
} {
  const colors = {
    S: { bg: '#10B981', text: '#FFFFFF' },
    M: { bg: '#3B82F6', text: '#FFFFFF' },
    L: { bg: '#F59E0B', text: '#FFFFFF' },
    XL: { bg: '#EF4444', text: '#FFFFFF' },
  };

  return colors[size];
}

/**
 * Get minimum card height based on estimate
 */
export function getCardMinHeight(estimate: number): string {
  const size = getWorkloadSize(estimate);
  const heights = {
    S: '120px',
    M: '160px',
    L: '200px',
    XL: '240px',
  };

  return heights[size];
}

/**
 * Get Tailwind CSS classes for priority styling
 */
export function getPriorityClasses(priority: Priority = 'medium'): string {
  const classes = {
    critical: 'border-red-600 bg-red-50',
    high: 'border-orange-500 bg-yellow-50',
    medium: 'border-blue-500 bg-white',
    low: 'border-gray-500 bg-white',
  };

  return classes[priority];
}

/**
 * Get workload size label
 */
export function getWorkloadLabel(estimate: number): string {
  const size = getWorkloadSize(estimate);
  const labels = {
    S: 'Small',
    M: 'Medium',
    L: 'Large',
    XL: 'Extra Large',
  };

  return labels[size];
}

/**
 * Get priority label with proper casing
 */
export function getPriorityLabel(priority: Priority = 'medium'): string {
  const labels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  return labels[priority];
}

/**
 * Check if task should show "break down" warning
 */
export function shouldShowBreakdownWarning(estimate: number): boolean {
  return estimate >= 80;
}
