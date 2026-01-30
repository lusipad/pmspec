import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Feature } from '@pmspec/types';
import { PriorityBadge } from '../PriorityBadge';
import { WorkloadIndicator } from '../WorkloadIndicator';
import {
  getPriorityColor,
  getPriorityBorderWidth,
  getPriorityOpacity,
  getPriorityShadow,
  getCardMinHeight,
  shouldShowBreakdownWarning,
} from '../../utils/visualHelpers';

interface FeatureCardProps {
  feature: Feature;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

  const progress = feature.estimate > 0 ? (feature.actual / feature.estimate) * 100 : 0;
  const isOverBudget = feature.actual > feature.estimate;

  // Get priority-based styling
  const priorityColors = getPriorityColor(feature.priority);
  const borderWidth = getPriorityBorderWidth(feature.priority);
  const opacity = getPriorityOpacity(feature.priority);
  const shadow = getPriorityShadow(feature.priority);
  const minHeight = getCardMinHeight(feature.estimate);
  const showBreakdown = shouldShowBreakdownWarning(feature.estimate);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : opacity,
    borderColor: priorityColors.border,
    borderWidth,
    backgroundColor: priorityColors.bg,
    boxShadow: shadow,
    minHeight,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg shadow-sm border p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative"
    >
      {/* Priority Badge - Top Right */}
      <div className="absolute top-2 right-2">
        <PriorityBadge priority={feature.priority} size="small" />
      </div>

      {/* Workload Indicator - Top Left */}
      <div className="absolute top-2 left-2">
        <WorkloadIndicator estimate={feature.estimate} />
      </div>

      {/* Header with spacing for badges */}
      <div className="flex justify-between items-start mb-2 mt-8">
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-500 mb-1">{feature.id}</div>
          <div className="font-semibold text-gray-900 text-sm leading-tight">
            {feature.title}
          </div>
        </div>
      </div>

      {/* Epic Badge */}
      <div className="mb-3">
        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
          {feature.epic}
        </span>
      </div>

      {/* Assignee and Hours */}
      <div className="flex items-center justify-between mb-3 text-sm">
        <div className="flex items-center text-gray-700">
          <span className="mr-1">👤</span>
          <span>{feature.assignee || 'Unassigned'}</span>
        </div>
        <div className="text-gray-600">
          <span className={isOverBudget ? 'text-red-600 font-semibold' : ''}>
            {feature.actual}h
          </span>
          <span className="text-gray-400"> / {feature.estimate}h</span>
        </div>
      </div>

      {/* Progress Bar */}
      {feature.estimate > 0 && (
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isOverBudget ? 'bg-red-500' : progress === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {isOverBudget && (
            <div className="text-xs text-red-600 mt-1">
              Over budget: +{feature.actual - feature.estimate}h
            </div>
          )}
        </div>
      )}

      {/* Breakdown Warning for XL tasks */}
      {showBreakdown && (
        <div className="mb-3 bg-orange-50 border border-orange-200 rounded p-2">
          <div className="text-xs text-orange-800 font-medium">
            ⚠️ Consider breaking down this large task
          </div>
        </div>
      )}

      {/* Skills */}
      {feature.skillsRequired.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {feature.skillsRequired.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {skill}
            </span>
          ))}
          {feature.skillsRequired.length > 3 && (
            <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
              +{feature.skillsRequired.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
