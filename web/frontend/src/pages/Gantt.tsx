import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Feature, FeatureStatus } from '@pmspec/types';
import { QueryErrorBoundary } from '../components/QueryErrorBoundary';
import { api, type GanttQuery } from '../services/api';

interface GanttTask {
  id: string;
  name: string;
  type: 'epic' | 'feature';
  start: string;
  end: string;
  progress: number;
  dependencies: string[];
  assignee?: string;
  status: string;
}

interface GanttApiResponse {
  tasks: GanttTask[];
  criticalPath: string[];
}

interface DependencyLine {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface TimelineScale {
  start: Date;
  units: Date[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date): Date {
  const normalized = toDayStart(date);
  const day = normalized.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + offset);
  return normalized;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addWeeks(date: Date, weeks: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthDiff(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export function Gantt() {
  return (
    <QueryErrorBoundary>
      <GanttContent />
    </QueryErrorBoundary>
  );
}

function GanttContent() {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [showDependencies, setShowDependencies] = useState(true);
  const [dependencyLines, setDependencyLines] = useState<DependencyLine[]>([]);
  const [epicFilter, setEpicFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FeatureStatus>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<string, HTMLElement>>(new Map());

  const query = useMemo<GanttQuery>(
    () => ({
      epic: epicFilter === 'all' ? undefined : epicFilter,
      assignee: assigneeFilter === 'all' ? undefined : assigneeFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [assigneeFilter, epicFilter, statusFilter]
  );

  const { data, isLoading, error } = useQuery<GanttApiResponse>({
    queryKey: ['gantt', query],
    queryFn: () => api.getGanttData<GanttApiResponse>(query),
  });

  const { data: allFeatures = [] } = useQuery<Feature[]>({
    queryKey: ['features', 'gantt-options'],
    queryFn: () => api.getFeatures<Feature[]>(),
    staleTime: 30000,
  });

  const epicOptions = useMemo(() => {
    const set = new Set(allFeatures.map((feature) => feature.epic).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allFeatures]);

  const assigneeOptions = useMemo(() => {
    const set = new Set(allFeatures.map((feature) => feature.assignee).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allFeatures]);

  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const criticalPath = useMemo(() => data?.criticalPath ?? [], [data?.criticalPath]);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks]
  );
  const statusLabelMap: Record<string, string> = {
    todo: '待办',
    'in-progress': '进行中',
    done: '已完成',
  };

  useEffect(() => {
    if (selectedTaskId && !tasks.some((task) => task.id === selectedTaskId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cleanup stale selection when tasks change
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, tasks]);

  const timelineScale = useMemo((): TimelineScale => {
    const now = new Date();
    const fallbackStart = viewMode === 'week' ? startOfWeek(now) : startOfMonth(now);

    if (tasks.length === 0) {
      return {
        start: fallbackStart,
        units: [fallbackStart],
      };
    }

    const allDates: Date[] = tasks.flatMap((task) => [new Date(task.start), new Date(task.end)]);
    const minDate = toDayStart(new Date(Math.min(...allDates.map((date) => date.getTime()))));
    const maxDate = toDayStart(new Date(Math.max(...allDates.map((date) => date.getTime()))));
    const start = viewMode === 'week' ? startOfWeek(minDate) : startOfMonth(minDate);
    const endBase = viewMode === 'week' ? startOfWeek(maxDate) : startOfMonth(maxDate);
    const endExclusive = viewMode === 'week' ? addWeeks(endBase, 1) : addMonths(endBase, 1);

    const units: Date[] = [];
    let cursor = new Date(start);
    while (cursor < endExclusive) {
      units.push(new Date(cursor));
      cursor = viewMode === 'week' ? addWeeks(cursor, 1) : addMonths(cursor, 1);
    }

    return { start, units };
  }, [tasks, viewMode]);

  const calculatePosition = useCallback(
    (taskStart: string, taskEnd: string) => {
      const start = new Date(taskStart);
      const end = new Date(taskEnd);
      const totalUnits = Math.max(1, timelineScale.units.length);

      let startUnit = 0;
      let endUnit = 1;

      if (viewMode === 'week') {
        startUnit = Math.floor((startOfWeek(start).getTime() - timelineScale.start.getTime()) / MS_PER_WEEK);
        endUnit = Math.floor((startOfWeek(end).getTime() - timelineScale.start.getTime()) / MS_PER_WEEK) + 1;
      } else {
        startUnit = monthDiff(timelineScale.start, startOfMonth(start));
        endUnit = monthDiff(timelineScale.start, startOfMonth(end)) + 1;
      }

      const boundedStart = Math.min(Math.max(startUnit, 0), totalUnits - 1);
      const boundedEnd = Math.min(Math.max(endUnit, boundedStart + 1), totalUnits);
      const widthUnits = Math.max(1, boundedEnd - boundedStart);

      const left = (boundedStart / totalUnits) * 100;
      const width = (widthUnits / totalUnits) * 100;

      return { left: `${left}%`, width: `${Math.max(width, 1)}%` };
    },
    [timelineScale.start, timelineScale.units.length, viewMode]
  );

  const formatHeaderLabel = useCallback(
    (unitStart: Date) => {
      if (viewMode === 'week') {
        const unitEnd = addWeeks(unitStart, 1);
        const from = unitStart.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        const to = unitEnd.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        return `${from} - ${to}`;
      }

      return unitStart.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
    },
    [viewMode]
  );

  const recalculateDependencyLines = useCallback(() => {
    if (!showDependencies || !containerRef.current || tasks.length === 0) {
      setDependencyLines([]);
      return;
    }

    const lines: DependencyLine[] = [];
    const containerRect = containerRef.current.getBoundingClientRect();

    for (const task of tasks) {
      if (!task.dependencies || task.dependencies.length === 0) {
        continue;
      }

      const toElement = taskRefs.current.get(task.id);
      if (!toElement) {
        continue;
      }

      const toRect = toElement.getBoundingClientRect();

      for (const depId of task.dependencies) {
        const fromElement = taskRefs.current.get(depId);
        if (!fromElement) {
          continue;
        }

        const fromRect = fromElement.getBoundingClientRect();
        lines.push({
          fromId: depId,
          toId: task.id,
          fromX: fromRect.right - containerRect.left,
          fromY: fromRect.top + fromRect.height / 2 - containerRect.top,
          toX: toRect.left - containerRect.left,
          toY: toRect.top + toRect.height / 2 - containerRect.top,
        });
      }
    }

    setDependencyLines(lines);
  }, [showDependencies, tasks]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      recalculateDependencyLines();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [recalculateDependencyLines, viewMode, timelineScale]);

  useEffect(() => {
    let rafId = 0;
    const scheduleRecalculate = () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }

      rafId = window.requestAnimationFrame(() => {
        recalculateDependencyLines();
        rafId = 0;
      });
    };

    window.addEventListener('resize', scheduleRecalculate);
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleRecalculate())
        : null;

    if (observer && containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', scheduleRecalculate);
      observer?.disconnect();
    };
  }, [recalculateDependencyLines, viewMode]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">正在加载甘特图...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">加载甘特图失败：{(error as Error).message}</p>
      </div>
    );
  }

  const clearFilters = () => {
    setEpicFilter('all');
    setAssigneeFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">甘特图</h2>
          <p className="mt-1 text-sm text-gray-500">以计划为基线，统一查看任务时序、关键路径与依赖。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/plan/new" className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            快速引导
          </Link>
          <button
            onClick={() => setShowDependencies((previous) => !previous)}
            className={`rounded-md px-4 py-2 ${
              showDependencies ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showDependencies ? '隐藏依赖线' : '显示依赖线'}
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`rounded-md px-4 py-2 ${
              viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            周视图
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`rounded-md px-4 py-2 ${
              viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            月视图
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={epicFilter}
            onChange={(event) => setEpicFilter(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">全部 Epic</option>
            {epicOptions.map((epic) => (
              <option key={epic} value={epic}>
                {epic}
              </option>
            ))}
          </select>

          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">全部负责人</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | FeatureStatus)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">全部状态</option>
            <option value="todo">待办</option>
            <option value="in-progress">进行中</option>
            <option value="done">已完成</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            清空筛选
          </button>
          <span className="text-sm text-gray-600">当前任务数：{tasks.length}</span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center text-gray-500 shadow">
          当前筛选条件下没有可展示任务。
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div ref={containerRef} className="relative overflow-hidden rounded-lg bg-white shadow">
            {showDependencies && dependencyLines.length > 0 ? (
              <svg className="pointer-events-none absolute left-0 top-0 h-full w-full" style={{ zIndex: 10 }}>
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#9333ea" />
                  </marker>
                </defs>
                {dependencyLines.map((line, index) => {
                  const midX = (line.fromX + line.toX) / 2;
                  const path = `M ${line.fromX} ${line.fromY} C ${midX} ${line.fromY}, ${midX} ${line.toY}, ${line.toX} ${line.toY}`;
                  return (
                    <path
                      key={`${line.fromId}-${line.toId}-${index}`}
                      d={path}
                      stroke="#9333ea"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      opacity="0.6"
                    />
                  );
                })}
              </svg>
            ) : null}

            <div className="flex border-b">
              <div className="w-64 flex-shrink-0 border-r bg-gray-50 p-4 font-semibold">任务</div>
              <div className="flex flex-1">
                {timelineScale.units.map((unitStart, index) => (
                  <div
                    key={index}
                    className="flex-1 border-r bg-gray-50 p-4 text-center font-semibold last:border-r-0"
                    style={{ minWidth: viewMode === 'week' ? '80px' : '120px' }}
                  >
                    {formatHeaderLabel(unitStart)}
                  </div>
                ))}
              </div>
            </div>

            <div>
              {tasks.map((task) => {
                const position = calculatePosition(task.start, task.end);
                const isCritical = criticalPath.includes(task.id);
                const hasDependencies = task.dependencies.length > 0;

                return (
                  <div key={task.id} className="flex border-b hover:bg-gray-50">
                    <button
                      type="button"
                      className="w-64 flex-shrink-0 border-r p-4 text-left"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="flex items-center">
                        {task.type === 'epic' ? <span className="mr-2">📁</span> : <span className="mr-2 ml-4">📄</span>}
                        <div>
                          <div className={`text-sm ${task.type === 'epic' ? 'font-semibold' : ''}`}>
                            {task.name}
                            {hasDependencies ? (
                              <span className="ml-1 text-purple-600" title={`依赖: ${task.dependencies.join(', ')}`}>
                                🔗
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-500">{task.id}</div>
                        </div>
                      </div>
                    </button>

                    <div className="relative flex-1 p-2" style={{ minHeight: '60px' }}>
                      <button
                        type="button"
                        ref={(element) => {
                          if (element) {
                            taskRefs.current.set(task.id, element);
                          } else {
                            taskRefs.current.delete(task.id);
                          }
                        }}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`absolute h-8 cursor-pointer rounded shadow-sm transition hover:shadow-md ${
                          task.type === 'epic'
                            ? isCritical
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                            : task.status === 'done'
                              ? 'bg-green-500'
                              : task.status === 'in-progress'
                                ? 'bg-yellow-500'
                                : 'bg-gray-400'
                        }`}
                        style={{
                          ...position,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        title={`${task.name}\n${task.start} 至 ${task.end}\n进度: ${task.progress.toFixed(0)}%`}
                      >
                        <div className="flex h-full items-center justify-between px-2 text-xs text-white">
                          <span className="truncate">{task.name}</span>
                          <span>{task.progress.toFixed(0)}%</span>
                        </div>
                        {task.progress > 0 && task.progress < 100 ? (
                          <div
                            className="absolute left-auto right-0 top-0 h-full rounded-l bg-black/20"
                            style={{ width: `${100 - task.progress}%` }}
                          />
                        ) : null}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-6 border-t bg-gray-50 p-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-blue-500" />
                <span>史诗</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-red-500" />
                <span>关键路径</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-green-500" />
                <span>已完成</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-yellow-500" />
                <span>进行中</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-gray-400" />
                <span>待办</span>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">任务详情</h3>
            {!selectedTask ? (
              <p className="mt-3 text-sm text-gray-500">点击左侧任务条查看详细信息。</p>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <div>
                  <p className="text-xs text-gray-500">任务名</p>
                  <p className="font-medium text-gray-900">{selectedTask.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">任务 ID</p>
                  <p className="font-mono">{selectedTask.id}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">开始</p>
                    <p>{selectedTask.start}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">结束</p>
                    <p>{selectedTask.end}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">状态</p>
                    <p>{statusLabelMap[selectedTask.status] ?? selectedTask.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">进度</p>
                    <p>{selectedTask.progress.toFixed(0)}%</p>
                  </div>
                </div>
                {selectedTask.assignee ? (
                  <div>
                    <p className="text-xs text-gray-500">负责人</p>
                    <p>{selectedTask.assignee}</p>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">快捷操作</p>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/kanban" className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">
                      打开看板
                    </Link>
                    <Link to="/features" className="rounded-md bg-gray-800 px-3 py-1.5 text-white hover:bg-gray-900">
                      打开功能列表
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
