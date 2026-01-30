import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { api } from '../services/api';
import { KanbanColumn } from '../components/Kanban/KanbanColumn';
import { FeatureCard } from '../components/Kanban/FeatureCard';
import { QueryErrorBoundary } from '../components/QueryErrorBoundary';

interface Feature {
  id: string;
  epic: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  assignee: string;
  estimate: number;
  actual: number;
  skillsRequired: string[];
}

export function Kanban() {
  return (
    <QueryErrorBoundary>
      <KanbanContent />
    </QueryErrorBoundary>
  );
}

function KanbanContent() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [epicFilter, setEpicFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: featuresData, isLoading, error } = useQuery<Feature[]>({
    queryKey: ['features'],
    queryFn: () => api.getFeatures<Feature[]>(),
  });

  const features = useMemo<Feature[]>(() => featuresData ?? [], [featuresData]);

  type FeatureStatus = Feature['status'];

  const isFeatureStatus = (value: string): value is FeatureStatus =>
    value === 'todo' || value === 'in-progress' || value === 'done';

  // Update feature status mutation
  const updateMutation = useMutation<
    unknown,
    unknown,
    { id: string; status: Feature['status'] },
    { previousFeatures?: Feature[] }
  >({
    mutationFn: ({ id, status }) =>
      api.updateFeature(id, { status }),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['features'] });

      // Snapshot the previous value
      const previousFeatures = queryClient.getQueryData<Feature[]>(['features']);

      // Optimistically update
      queryClient.setQueryData<Feature[]>(['features'], (old = []) =>
        old.map((feature) => (feature.id === id ? { ...feature, status } : feature))
      );

      return { previousFeatures };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousFeatures) {
        queryClient.setQueryData(['features'], context.previousFeatures);
      }
      alert('Failed to update feature status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get unique values for filters
  const { epicsList, assigneesList } = useMemo(() => {
    if (features.length === 0) return { epicsList: [], assigneesList: [] };

    const epicsSet = new Set(features.map((feature) => feature.epic));
    const assigneesSet = new Set(
      features.map((feature) => feature.assignee).filter(Boolean)
    );

    return {
      epicsList: Array.from(epicsSet).sort(),
      assigneesList: Array.from(assigneesSet).sort(),
    };
  }, [features]);

  // Filter features
  const filteredFeatures = useMemo(() => {
    let result = [...features];

    if (searchTerm) {
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (epicFilter !== 'all') {
      result = result.filter((f) => f.epic === epicFilter);
    }

    if (assigneeFilter !== 'all') {
      result = result.filter((f) => f.assignee === assigneeFilter);
    }

    return result;
  }, [features, searchTerm, epicFilter, assigneeFilter]);

  // Group features by status
  const columns = useMemo(() => {
    const todo = filteredFeatures.filter((f) => f.status === 'todo');
    const inProgress = filteredFeatures.filter((f) => f.status === 'in-progress');
    const done = filteredFeatures.filter((f) => f.status === 'done');

    return {
      todo,
      'in-progress': inProgress,
      done,
    };
  }, [filteredFeatures]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Find which column the item is being dragged over
    const activeFeature = filteredFeatures.find((f) => f.id === activeId);
    if (!activeFeature) return;

    // Check if overId is a column (status)
    if (isFeatureStatus(overId)) {
      if (activeFeature.status !== overId) {
        updateMutation.mutate({ id: activeId, status: overId });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeFeature = filteredFeatures.find((f) => f.id === activeId);
    if (!activeFeature) return;

    // If dropped on a column
    if (isFeatureStatus(overId)) {
      if (activeFeature.status !== overId) {
        updateMutation.mutate({ id: activeId, status: overId });
      }
    }
  };

  const activeFeature = activeId
    ? filteredFeatures.find((f) => f.id === activeId)
    : null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading kanban board...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading features: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Kanban Board</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={epicFilter}
              onChange={(e) => setEpicFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Epics</option>
              {epicsList.map((epic) => (
                <option key={epic} value={epic}>
                  {epic}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Assignees</option>
              {assigneesList.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || epicFilter !== 'all' || assigneeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setEpicFilter('all');
                setAssigneeFilter('all');
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Filters
            </button>
          )}

          <div className="text-sm text-gray-600">
            {filteredFeatures.length} of {features.length} features
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <KanbanColumn
            title="📋 To Do"
            status="todo"
            features={columns.todo}
            count={columns.todo.length}
          />
          <KanbanColumn
            title="🚧 In Progress"
            status="in-progress"
            features={columns['in-progress']}
            count={columns['in-progress'].length}
          />
          <KanbanColumn
            title="✅ Done"
            status="done"
            features={columns.done}
            count={columns.done.length}
          />
        </div>

        <DragOverlay>
          {activeFeature ? (
            <div className="rotate-3 scale-105">
              <FeatureCard feature={activeFeature} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
