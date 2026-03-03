import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Feature, FeatureStatus, Priority } from '@pmspec/types';
import {
  api,
  type BatchUpdateFeaturesRequest,
  type BatchUpdateFeaturesResponse,
  type FeatureListQuery,
  type PaginatedResponse,
} from '../services/api';
import { PriorityBadge } from '../components/PriorityBadge';
import { QueryErrorBoundary } from '../components/QueryErrorBoundary';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface ImportErrorItem {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  created: number;
  updated: number;
  total?: number;
  errors?: ImportErrorItem[];
}

interface ImportApiError {
  errors?: ImportErrorItem[];
  error?: string;
  message?: string;
}

type SortField = NonNullable<FeatureListQuery['sortBy']>;
type EditableField = 'title' | 'assignee' | 'estimate';

interface EditingState {
  id: string;
  field: EditableField;
  value: string;
}

const STATUS_OPTIONS: Array<{ value: FeatureStatus; label: string }> = [
  { value: 'todo', label: '待办' },
  { value: 'in-progress', label: '进行中' },
  { value: 'done', label: '已完成' },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: 'critical', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const SORTABLE_COLUMNS: Array<{ key: SortField; label: string }> = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: '标题' },
  { key: 'priority', label: '优先级' },
  { key: 'status', label: '状态' },
  { key: 'assignee', label: '负责人' },
  { key: 'estimate', label: '估时' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function parseImportError(error: unknown): ImportApiError {
  if (error && typeof error === 'object') {
    const parsed = error as ImportApiError;
    return parsed;
  }
  return {};
}

export function Features() {
  return (
    <QueryErrorBoundary>
      <FeaturesContent />
    </QueryErrorBoundary>
  );
}

function FeaturesContent() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error, info } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FeatureStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [epicFilter, setEpicFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortField>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [batchPending, setBatchPending] = useState<BatchUpdateFeaturesRequest['updates'] | null>(null);
  const [batchSummary, setBatchSummary] = useState('');
  const [batchStatusValue, setBatchStatusValue] = useState<FeatureStatus>('in-progress');
  const [batchPriorityValue, setBatchPriorityValue] = useState<Priority>('high');
  const [batchAssigneeValue, setBatchAssigneeValue] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useMemo<FeatureListQuery>(
    () => ({
      status: statusFilter,
      priority: priorityFilter,
      epic: epicFilter === 'all' ? undefined : epicFilter,
      assignee: assigneeFilter === 'all' ? undefined : assigneeFilter,
      search: searchTerm || undefined,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
    [assigneeFilter, epicFilter, page, pageSize, priorityFilter, searchTerm, sortBy, sortOrder, statusFilter]
  );

  const {
    data: featurePage,
    isLoading,
    isFetching,
    error: listError,
  } = useQuery<PaginatedResponse<Feature>>({
    queryKey: ['features', 'list', listQuery],
    queryFn: () => api.getFeatures<PaginatedResponse<Feature>>(listQuery),
    placeholderData: (previous) => previous,
  });

  const { data: allFeatures = [] } = useQuery<Feature[]>({
    queryKey: ['features', 'all'],
    queryFn: () => api.getFeatures<Feature[]>(),
    staleTime: 30000,
  });

  const assigneeOptions = useMemo(() => {
    const set = new Set(allFeatures.map((feature) => feature.assignee).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allFeatures]);

  const epicOptions = useMemo(() => {
    const set = new Set(allFeatures.map((feature) => feature.epic).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allFeatures]);

  const features = featurePage?.data ?? [];
  const total = featurePage?.total ?? 0;
  const totalPages = featurePage?.totalPages ?? 1;
  const currentPage = featurePage?.page ?? page;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cleanup stale selections when features change
    setSelectedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of prev) {
        if (!allFeatures.some((feature) => feature.id === id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [allFeatures]);

  const exportMutation = useMutation({
    mutationFn: () => api.exportCSV(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `features-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
      success('导出成功', '已下载最新功能列表 CSV。');
    },
    onError: () => {
      error('导出失败', '请稍后重试。');
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importCSV(file),
    onSuccess: (result: ImportResult) => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      success('导入成功', `新增 ${result.created} 条，更新 ${result.updated} 条。`);
    },
    onError: (mutationError: unknown) => {
      const parsed = parseImportError(mutationError);
      if (parsed.errors && parsed.errors.length > 0) {
        const detail = parsed.errors
          .slice(0, 6)
          .map((item) => `第 ${item.row} 行 ${item.field}: ${item.message}`)
          .join('\n');
        error('导入失败', detail);
        return;
      }
      error('导入失败', parsed.error || parsed.message || '未知错误');
    },
  });

  const patchMutation = useMutation({
    mutationFn: (payload: { id: string; updates: Partial<Feature> }) =>
      api.patchFeature<Feature>(payload.id, payload.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
    },
    onError: () => {
      error('更新失败', '未能保存修改，请重试。');
    },
  });

  const batchMutation = useMutation({
    mutationFn: (payload: BatchUpdateFeaturesRequest) =>
      api.batchUpdateFeatures<Feature>(payload),
    onSuccess: (result: BatchUpdateFeaturesResponse<Feature>) => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      setSelectedIds(new Set());
      if (result.failed.length > 0) {
        error(
          '批量操作部分失败',
          `成功 ${result.updated} 条，失败 ${result.failed.length} 条。`
        );
      } else {
        success('批量操作成功', `已更新 ${result.updated} 条功能。`);
      }
    },
    onError: () => {
      error('批量操作失败', '请检查输入后重试。');
    },
    onSettled: () => {
      setBatchPending(null);
      setBatchSummary('');
    },
  });

  const selectedCount = selectedIds.size;
  const currentPageIds = features.map((feature) => feature.id);
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));

  const toggleSort = (column: SortField) => {
    if (sortBy === column) {
      setSortOrder((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectCurrentPage = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allCurrentPageSelected) {
        for (const id of currentPageIds) {
          next.delete(id);
        }
      } else {
        for (const id of currentPageIds) {
          next.add(id);
        }
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setEpicFilter('all');
    setAssigneeFilter('all');
    setPage(1);
  };

  const downloadTemplate = async () => {
    try {
      const blob = await api.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'pmspec-template.csv';
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
      success('模板下载成功', '请按模板填写后再导入。');
    } catch {
      error('模板下载失败', '请稍后重试。');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    importMutation.mutate(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateFeature = (id: string, updates: Partial<Feature>) => {
    patchMutation.mutate(
      { id, updates },
      {
        onSuccess: () => {
          success('保存成功');
        },
      }
    );
  };

  const startEditing = (feature: Feature, field: EditableField) => {
    const value = field === 'estimate' ? String(feature.estimate) : String(feature[field] ?? '');
    setEditing({ id: feature.id, field, value });
  };

  const commitEditing = (feature: Feature) => {
    if (!editing || editing.id !== feature.id) {
      return;
    }

    const value = editing.value.trim();
    if (editing.field === 'title') {
      if (!value || value === feature.title) {
        setEditing(null);
        return;
      }
      updateFeature(feature.id, { title: value });
      setEditing(null);
      return;
    }

    if (editing.field === 'assignee') {
      if (value === feature.assignee) {
        setEditing(null);
        return;
      }
      updateFeature(feature.id, { assignee: value });
      setEditing(null);
      return;
    }

    if (editing.field === 'estimate') {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        error('估时格式错误', '估时必须是大于等于 0 的数字。');
        return;
      }
      if (numeric === feature.estimate) {
        setEditing(null);
        return;
      }
      updateFeature(feature.id, { estimate: numeric });
      setEditing(null);
    }
  };

  const openBatchConfirm = (updates: BatchUpdateFeaturesRequest['updates'], label: string) => {
    if (selectedCount === 0) {
      info('请先选择功能项');
      return;
    }
    setBatchPending(updates);
    setBatchSummary(label);
  };

  const runBatchUpdate = () => {
    if (!batchPending || selectedCount === 0) {
      setBatchPending(null);
      setBatchSummary('');
      return;
    }

    batchMutation.mutate({
      ids: Array.from(selectedIds),
      updates: batchPending,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">正在加载功能列表...</div>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">加载功能列表失败：{(listError as Error).message}</p>
      </div>
    );
  }

  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold text-gray-900">功能管理</h2>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            下载模板
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {importMutation.isPending ? '导入中...' : '导入 CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {exportMutation.isPending ? '导出中...' : '导出 CSV'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="搜索 ID / 标题 / 描述"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'all' | FeatureStatus);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部状态</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value as 'all' | Priority);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部优先级</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={epicFilter}
            onChange={(event) => {
              setEpicFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            onChange={(event) => {
              setAssigneeFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部负责人</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            清空筛选
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
          <span>
            显示 {startIndex}-{endIndex} / 共 {total} 条
          </span>
          {isFetching ? <span>正在同步最新数据...</span> : null}
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-blue-900">已选择 {selectedCount} 项</span>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
              onClick={() => openBatchConfirm({ status: batchStatusValue }, `状态更新为「${batchStatusValue}」`)}
            >
              批量改状态
            </button>
            <select
              value={batchStatusValue}
              onChange={(event) => setBatchStatusValue(event.target.value as FeatureStatus)}
              className="rounded-md border border-blue-200 bg-white px-2 py-1.5"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
              onClick={() =>
                openBatchConfirm(
                  { priority: batchPriorityValue },
                  `优先级更新为「${batchPriorityValue}」`
                )
              }
            >
              批量改优先级
            </button>
            <select
              value={batchPriorityValue}
              onChange={(event) => setBatchPriorityValue(event.target.value as Priority)}
              className="rounded-md border border-blue-200 bg-white px-2 py-1.5"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="新负责人"
              value={batchAssigneeValue}
              onChange={(event) => setBatchAssigneeValue(event.target.value)}
              className="rounded-md border border-blue-200 bg-white px-2 py-1.5"
            />
            <button
              type="button"
              className="rounded-md bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
              onClick={() =>
                openBatchConfirm(
                  { assignee: batchAssigneeValue.trim() },
                  `负责人更新为「${batchAssigneeValue.trim() || '未分配'}」`
                )
              }
            >
              批量改负责人
            </button>

            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-gray-600 hover:bg-white"
              onClick={() => setSelectedIds(new Set())}
            >
              清空选择
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={toggleSelectCurrentPage}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
              </th>
              {SORTABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100"
                  onClick={() => toggleSort(column.key)}
                >
                  {column.label}{' '}
                  {sortBy === column.key ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {features.map((feature) => (
              <tr key={feature.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(feature.id)}
                    onChange={() => toggleSelect(feature.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {feature.id}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {editing?.id === feature.id && editing.field === 'title' ? (
                    <input
                      autoFocus
                      value={editing.value}
                      onChange={(event) =>
                        setEditing((previous) =>
                          previous
                            ? { ...previous, value: event.target.value }
                            : previous
                        )
                      }
                      onBlur={() => commitEditing(feature)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitEditing(feature);
                        }
                        if (event.key === 'Escape') {
                          setEditing(null);
                        }
                      }}
                      className="w-full rounded border border-blue-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-left hover:text-blue-700"
                      onDoubleClick={() => startEditing(feature, 'title')}
                    >
                      {feature.title}
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={feature.priority ?? 'medium'} size="small" />
                    <select
                      value={feature.priority ?? 'medium'}
                      onChange={(event) =>
                        updateFeature(feature.id, { priority: event.target.value as Priority })
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <select
                    value={feature.status}
                    onChange={(event) =>
                      updateFeature(feature.id, { status: event.target.value as FeatureStatus })
                    }
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {editing?.id === feature.id && editing.field === 'assignee' ? (
                    <input
                      autoFocus
                      value={editing.value}
                      onChange={(event) =>
                        setEditing((previous) =>
                          previous
                            ? { ...previous, value: event.target.value }
                            : previous
                        )
                      }
                      onBlur={() => commitEditing(feature)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitEditing(feature);
                        }
                        if (event.key === 'Escape') {
                          setEditing(null);
                        }
                      }}
                      className="w-full rounded border border-blue-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-left hover:text-blue-700"
                      onDoubleClick={() => startEditing(feature, 'assignee')}
                    >
                      {feature.assignee || '-'}
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                  {editing?.id === feature.id && editing.field === 'estimate' ? (
                    <input
                      autoFocus
                      value={editing.value}
                      onChange={(event) =>
                        setEditing((previous) =>
                          previous
                            ? { ...previous, value: event.target.value }
                            : previous
                        )
                      }
                      onBlur={() => commitEditing(feature)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitEditing(feature);
                        }
                        if (event.key === 'Escape') {
                          setEditing(null);
                        }
                      }}
                      className="w-24 rounded border border-blue-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <button
                      type="button"
                      className="hover:text-blue-700"
                      onDoubleClick={() => startEditing(feature, 'estimate')}
                    >
                      {feature.estimate}h
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {features.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            当前筛选条件下没有功能数据。
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="text-sm text-gray-600">
          第 {currentPage} / {totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            disabled={currentPage <= 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
          >
            上一页
          </button>
          <button
            type="button"
            onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
          >
            下一页
          </button>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                每页 {size} 条
              </option>
            ))}
          </select>
        </div>
      </div>

      <ConfirmDialog
        open={batchPending !== null}
        title="确认批量更新"
        description={`将对 ${selectedCount} 条功能执行批量修改：${batchSummary}`}
        confirmText="确认执行"
        onConfirm={runBatchUpdate}
        onCancel={() => {
          if (!batchMutation.isPending) {
            setBatchPending(null);
            setBatchSummary('');
          }
        }}
        busy={batchMutation.isPending}
      />
    </div>
  );
}
