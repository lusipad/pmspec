import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

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

export function Gantt() {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const { data, isLoading, error } = useQuery<GanttApiResponse>({
    queryKey: ['gantt'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3000/api/timeline/gantt');
      if (!response.ok) throw new Error('Failed to fetch gantt data');
      return (await response.json()) as GanttApiResponse;
    },
  });

  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const criticalPath = useMemo(() => data?.criticalPath ?? [], [data?.criticalPath]);

  // Calculate date range
  const dateRange = useMemo((): { start: Date; end: Date; months: Date[] } => {
    if (tasks.length === 0) {
      const current = new Date();
      return { start: current, end: current, months: [] };
    }

    const allDates: Date[] = tasks.flatMap((task) => [
      new Date(task.start),
      new Date(task.end),
    ]);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // Generate months
    const months: Date[] = [];
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (current <= maxDate) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return { start: minDate, end: maxDate, months };
  }, [tasks]);

  const calculatePosition = (taskStart: string, taskEnd: string) => {
    const start = new Date(taskStart);
    const end = new Date(taskEnd);

    const totalDays = Math.max(
      1,
      Math.ceil(
        (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    const startDays = Math.ceil(
      (start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const left = (startDays / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return { left: `${left}%`, width: `${Math.max(width, 1)}%` };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading gantt chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading gantt chart: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Gantt Chart</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Week View
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-md ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Month View
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
          No tasks available for gantt chart.
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Timeline Header */}
          <div className="flex border-b">
            <div className="w-64 flex-shrink-0 p-4 bg-gray-50 font-semibold border-r">
              Task Name
            </div>
            <div className="flex-1 flex">
              {dateRange.months.map((month, idx) => (
                <div
                  key={idx}
                  className="flex-1 p-4 text-center border-r last:border-r-0 bg-gray-50 font-semibold"
                  style={{ minWidth: '100px' }}
                >
                  {month.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div>
            {tasks.map((task: GanttTask) => {
              const position = calculatePosition(task.start, task.end);
              const isCritical = criticalPath.includes(task.id);

              return (
                <div key={task.id} className="flex border-b hover:bg-gray-50">
                  {/* Task Name */}
                  <div className="w-64 flex-shrink-0 p-4 border-r">
                    <div className="flex items-center">
                      {task.type === 'epic' ? (
                        <span className="mr-2">📁</span>
                      ) : (
                        <span className="mr-2 ml-4">📄</span>
                      )}
                      <div>
                        <div className={`text-sm ${task.type === 'epic' ? 'font-semibold' : ''}`}>
                          {task.name}
                        </div>
                        <div className="text-xs text-gray-500">{task.id}</div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-1 p-2 relative" style={{ minHeight: '60px' }}>
                    <div
                      className={`absolute h-8 rounded ${
                        task.type === 'epic'
                          ? isCritical
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                          : task.status === 'done'
                          ? 'bg-green-500'
                          : task.status === 'in-progress'
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                      } shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                      style={{
                        ...position,
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                      title={`${task.name}\n${task.start} to ${task.end}\nProgress: ${task.progress.toFixed(
                        0
                      )}%`}
                    >
                      <div className="flex items-center justify-between h-full px-2 text-white text-xs">
                        <span className="truncate">{task.name}</span>
                        <span>{task.progress.toFixed(0)}%</span>
                      </div>
                      {/* Progress overlay */}
                      {task.progress > 0 && task.progress < 100 && (
                        <div
                          className="absolute top-0 left-0 h-full bg-black bg-opacity-20 rounded-l"
                          style={{ width: `${100 - task.progress}%`, right: 0, left: 'auto' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="p-4 bg-gray-50 border-t flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Epic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Critical Path</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Done</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span>To Do</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
