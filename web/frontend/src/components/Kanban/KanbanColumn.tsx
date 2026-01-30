import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FeatureCard } from './FeatureCard';
import type { Feature } from '@pmspec/types';

interface KanbanColumnProps {
  title: string;
  status: string;
  features: Feature[];
  count: number;
}

const statusColors = {
  todo: 'bg-gray-100 border-gray-300',
  'in-progress': 'bg-yellow-50 border-yellow-300',
  done: 'bg-green-50 border-green-300',
};

const statusTextColors = {
  todo: 'text-gray-700',
  'in-progress': 'text-yellow-700',
  done: 'text-green-700',
};

export function KanbanColumn({ title, status, features, count }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const featureIds = features.map((f) => f.id);

  return (
    <div className="flex-1 min-w-[300px]">
      {/* Column Header */}
      <div
        className={`rounded-lg border-2 p-3 mb-4 ${
          statusColors[status as keyof typeof statusColors] || 'bg-gray-100 border-gray-300'
        }`}
      >
        <div className="flex justify-between items-center">
          <h3
            className={`font-semibold text-lg ${
              statusTextColors[status as keyof typeof statusTextColors] || 'text-gray-700'
            }`}
          >
            {title}
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusTextColors[status as keyof typeof statusTextColors] || 'text-gray-700'
            } bg-white`}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`min-h-[400px] rounded-lg p-3 transition-colors ${
          isOver ? 'bg-blue-50 border-2 border-dashed border-blue-400' : 'bg-gray-50'
        }`}
      >
        <SortableContext items={featureIds} strategy={verticalListSortingStrategy}>
          {features.length > 0 ? (
            features.map((feature) => <FeatureCard key={feature.id} feature={feature} />)
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <div>No features</div>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
