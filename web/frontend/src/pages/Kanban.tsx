import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Feature, Priority } from '@pmspec/types';
import { api } from '../services/api';
import { KanbanColumn } from '../components/Kanban/KanbanColumn';
import { FeatureCard } from '../components/Kanban/FeatureCard';
import { QueryErrorBoundary } from '../components/QueryErrorBoundary';
import { useToast } from '../components/ui/Toast';

type FeatureStatus = Feature['status'];

const FEATURE_STATUSES: FeatureStatus[] = ['todo', 'in-progress', 'done'];

const isFeatureStatus = (value: string): value is FeatureStatus =>
  FEATURE_STATUSES.includes(value as FeatureStatus);

const getMutationErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const maybeError = error as { detail?: unknown; message?: unknown; title?: unknown };
    if (typeof maybeError.detail === 'string' && maybeError.detail.trim()) {
      return maybeError.detail;
    }
    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message;
    }
    if (typeof maybeError.title === 'string' && maybeError.title.trim()) {
      return maybeError.title;
    }
  }

  return fallback;
};

export function Kanban() {
  return (
    <QueryErrorBoundary>
      <KanbanContent />
    </QueryErrorBoundary>
  );
}

function KanbanContent() {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [epicFilter, setEpicFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState({
    title: '',
    epic: 'EPIC-PLAN',
    assignee: '',
    estimate: 8,
    priority: 'medium' as Priority,
  });
  const lastOverStatusRef = useRef<FeatureStatus | null>(null);

  const { data: featuresData, isLoading, error } = useQuery<Feature[]>({
    queryKey: ['features'],
    queryFn: () => api.getFeatures<Feature[]>(),
  });

  const features = useMemo<Feature[]>(() => featuresData ?? [], [featuresData]);

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
      setBoardError(null);

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
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousFeatures) {
        queryClient.setQueryData(['features'], context.previousFeatures);
      }
      const message = getMutationErrorMessage(error, '更新功能状态失败。');
      setBoardError(message);
      toastError('拖拽更新失败', message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      success('状态已更新');
    },
  });

  const createMutation = useMutation<unknown, unknown, Feature>({
    mutationFn: (payload: Feature) => api.createFeature(payload),
    onMutate: () => {
      setCreateError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      setShowCreateForm(false);
      setNewFeature({
        title: '',
        epic: 'EPIC-PLAN',
        assignee: '',
        estimate: 8,
        priority: 'medium',
      });
      success('功能创建成功');
    },
    onError: (error) => {
      const message = getMutationErrorMessage(error, '创建功能失败。');
      setCreateError(message);
      toastError('创建失败', message);
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

    if (priorityFilter !== 'all') {
      result = result.filter((f) => (f.priority ?? 'medium') === priorityFilter);
    }

    return result;
  }, [features, searchTerm, epicFilter, assigneeFilter, priorityFilter]);

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

  const featureStatusMap = useMemo(() => {
    return new Map(features.map((feature) => [feature.id, feature.status]));
  }, [features]);

  const resolveTargetStatus = (overId?: string | null): FeatureStatus | null => {
    if (!overId) return null;
    if (isFeatureStatus(overId)) {
      return overId;
    }
    return featureStatusMap.get(overId) ?? null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    lastOverStatusRef.current = null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    const targetStatus = resolveTargetStatus(overId);
    if (targetStatus) {
      lastOverStatusRef.current = targetStatus;
    }
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveId(null);
    lastOverStatusRef.current = null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    const activeId = String(active.id);

    const draggedFeature = features.find((f) => f.id === activeId);
    if (!draggedFeature) return;

    const overStatus = resolveTargetStatus(over ? String(over.id) : null);
    const targetStatus = overStatus ?? lastOverStatusRef.current;
    lastOverStatusRef.current = null;

    if (targetStatus && draggedFeature.status !== targetStatus) {
      updateMutation.mutate({ id: activeId, status: targetStatus });
    }
  };

  const updateNewFeature = (updates: Partial<typeof newFeature>) => {
    setCreateError(null);
    setNewFeature((prev) => ({ ...prev, ...updates }));
  };

  const activeFeature = activeId
    ? filteredFeatures.find((f) => f.id === activeId)
    : null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">正在加载看板...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">加载功能列表失败：{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">看板视图</h2>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreateForm((prev) => !prev);
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showCreateForm ? '取消' : '新建功能'}
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            {createError && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                type="text"
                placeholder="功能标题"
                value={newFeature.title}
                onChange={(event) => updateNewFeature({ title: event.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Epic 编号"
                value={newFeature.epic}
                onChange={(event) => updateNewFeature({ epic: event.target.value || 'EPIC-PLAN' })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="负责人"
                value={newFeature.assignee}
                onChange={(event) => updateNewFeature({ assignee: event.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                value={newFeature.estimate}
                onChange={(event) =>
                  updateNewFeature({ estimate: Math.max(1, Number(event.target.value) || 8) })
                }
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={newFeature.priority}
                onChange={(event) => updateNewFeature({ priority: event.target.value as Priority })}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="critical">紧急</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                disabled={!newFeature.title.trim() || createMutation.isPending}
                onClick={() => {
                  const title = newFeature.title.trim();
                  if (!title) {
                    setCreateError('请填写功能标题。');
                    return;
                  }

                  const existingIds = features
                    .map((feature) => feature.id.match(/^FEAT-(\d+)$/))
                    .filter((match): match is RegExpMatchArray => Boolean(match))
                    .map((match) => Number(match[1]));
                  const next = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
                  const nextId = `FEAT-${String(next).padStart(3, '0')}`;

                  createMutation.mutate({
                    id: nextId,
                    epic: newFeature.epic || 'EPIC-PLAN',
                    title,
                    status: 'todo',
                    priority: newFeature.priority,
                    assignee: newFeature.assignee.trim(),
                    estimate: newFeature.estimate,
                    actual: 0,
                    skillsRequired: [],
                  });
                }}
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索功能..."
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
              <option value="all">全部 Epic</option>
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
              <option value="all">全部负责人</option>
              {assigneesList.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部优先级</option>
              <option value="critical">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          {(searchTerm || epicFilter !== 'all' || assigneeFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setEpicFilter('all');
                setAssigneeFilter('all');
                setPriorityFilter('all');
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              清空筛选
            </button>
          )}

          <div className="text-sm text-gray-600">
            显示 {filteredFeatures.length} / {features.length}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        {boardError && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {boardError}
          </div>
        )}
        <div className="flex gap-4 overflow-x-auto pb-4">
          <KanbanColumn
            title="📋 待办"
            status="todo"
            features={columns.todo}
            count={columns.todo.length}
          />
          <KanbanColumn
            title="🚧 进行中"
            status="in-progress"
            features={columns['in-progress']}
            count={columns['in-progress'].length}
          />
          <KanbanColumn
            title="✅ 已完成"
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
