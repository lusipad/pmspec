import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { QueryErrorBoundary } from '../components/QueryErrorBoundary';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface OverviewStats {
  features: {
    total: number;
    byStatus: {
      todo: number;
      'in-progress': number;
      done: number;
    };
  };
  epics: {
    total: number;
    byStatus: {
      planning: number;
      'in-progress': number;
      completed: number;
    };
  };
  hours: {
    estimated: number;
    actual: number;
    completionRate: number;
  };
  team: {
    total?: number;
    totalMembers?: number;
    averageUtilization: number;
    assignedMembers?: number;
  };
}

interface TrendData {
  date: string;
  completed: number;
  inProgress: number;
  todo: number;
}

interface TrendsResponse {
  trends: TrendData[];
}

interface WorkloadItem {
  name: string;
  capacity: number;
  assigned: number;
  completed: number;
}

interface TeamWorkloadResponse {
  workload: WorkloadItem[];
}

interface EpicProgressItem {
  id: string;
  title: string;
  status: 'planning' | 'in-progress' | 'completed' | string;
  totalFeatures: number;
  completedFeatures: number;
  progressPercent: number;
  hoursProgress: number;
}

interface EpicProgressResponse {
  epics: EpicProgressItem[];
}

const COLORS = {
  todo: '#94a3b8',
  'in-progress': '#3b82f6',
  done: '#22c55e',
};

function KpiCard({
  title,
  value,
  subValue,
  accentClass,
  icon,
}: {
  title: string;
  value: string;
  subValue: string;
  accentClass: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{value}</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{subValue}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${accentClass}`}
          aria-hidden
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
        <div className="h-80 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <QueryErrorBoundary>
      <DashboardContent />
    </QueryErrorBoundary>
  );
}

function DashboardContent() {
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewStats>({
    queryKey: ['stats', 'overview'],
    queryFn: () => api.getOverviewStats<OverviewStats>(),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendsResponse>({
    queryKey: ['stats', 'trends'],
    queryFn: () => api.getTrends<TrendsResponse>(),
  });

  const { data: teamWorkload, isLoading: teamLoading } = useQuery<TeamWorkloadResponse>({
    queryKey: ['stats', 'team-workload'],
    queryFn: () => api.getTeamWorkload<TeamWorkloadResponse>(),
  });

  const { data: epicProgress, isLoading: epicLoading } = useQuery<EpicProgressResponse>({
    queryKey: ['stats', 'epic-progress'],
    queryFn: () => api.getEpicProgress<EpicProgressResponse>(),
  });

  if (overviewLoading) {
    return <DashboardSkeleton />;
  }

  const stats = overview;
  const completionRate = Math.max(0, Math.min(100, stats?.hours.completionRate ?? 0));
  const teamMemberCount = stats?.team.totalMembers ?? stats?.team.total ?? 0;
  const assignedMembers = stats?.team.assignedMembers ?? teamMemberCount;

  const featureStatusData = [
    { name: '待办', value: stats?.features.byStatus.todo || 0, color: COLORS.todo },
    { name: '进行中', value: stats?.features.byStatus['in-progress'] || 0, color: COLORS['in-progress'] },
    { name: '已完成', value: stats?.features.byStatus.done || 0, color: COLORS.done },
  ];

  const epicStatusLabel: Record<string, string> = {
    planning: '规划中',
    'in-progress': '进行中',
    completed: '已完成',
  };

  const epicStatusClass: Record<string, string> = {
    planning: 'bg-amber-100 text-amber-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-slate-50 p-6 shadow-sm dark:border-blue-500/20 dark:from-[#162131] dark:to-[#1B2434]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">项目驾驶舱</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              聚焦交付进度、工时健康度与团队负载，帮助你快速做出排期决策。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
              <Link
                to="/plan/new"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                快速生成计划
              </Link>
            <Link
              to="/features"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:bg-[#1F2937] dark:text-gray-200 dark:hover:bg-[#273344]"
            >
              管理功能列表
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="功能总量"
          value={`${stats?.features.total ?? 0}`}
          subValue={`已完成 ${stats?.features.byStatus.done ?? 0} · 进行中 ${stats?.features.byStatus['in-progress'] ?? 0}`}
          accentClass="bg-blue-100 text-blue-700"
          icon="📌"
        />
        <KpiCard
          title="交付完成率"
          value={`${completionRate.toFixed(0)}%`}
          subValue={`总估时 ${stats?.hours.estimated ?? 0}h · 实际 ${stats?.hours.actual ?? 0}h`}
          accentClass="bg-green-100 text-green-700"
          icon="✅"
        />
        <KpiCard
          title="团队利用率"
          value={`${stats?.team.averageUtilization ?? 0}%`}
          subValue={`在岗 ${assignedMembers} / ${teamMemberCount} 人`}
          accentClass="bg-orange-100 text-orange-700"
          icon="👥"
        />
        <KpiCard
          title="史诗总量"
          value={`${stats?.epics.total ?? 0}`}
          subValue={`进行中 ${stats?.epics.byStatus['in-progress'] ?? 0} · 已完成 ${stats?.epics.byStatus.completed ?? 0}`}
          accentClass="bg-purple-100 text-purple-700"
          icon="🧭"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">功能状态分布</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">按当前状态查看待办积压与交付节奏</p>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={featureStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name || ''} ${percent ? (percent * 100).toFixed(0) : '0'}%`
                  }
                  outerRadius={82}
                  dataKey="value"
                >
                  {featureStatusData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">最近趋势（7天）</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">追踪完成、进行中与待办任务的变化</p>
          <div className="mt-4 h-[280px]">
            {trendsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">加载中...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends?.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke={COLORS.done} name="已完成" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="inProgress"
                    stroke={COLORS['in-progress']}
                    name="进行中"
                    strokeWidth={2}
                  />
                  <Line type="monotone" dataKey="todo" stroke={COLORS.todo} name="待办" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">团队负载分布</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">观察容量、已分配与已完成工时，快速识别过载成员</p>
        <div className="mt-4 h-[300px]">
          {teamLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">加载中...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamWorkload?.workload || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="capacity" fill="#d1d5db" name="容量" />
                <Bar dataKey="assigned" fill="#3b82f6" name="已分配" />
                <Bar dataKey="completed" fill="#22c55e" name="已完成" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#1C1C1E]">
        <div className="border-b border-black/5 px-5 py-4 dark:border-white/10">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">史诗进度</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">按史诗维度审视功能完成率与工时进度</p>
        </div>
        {epicLoading ? (
          <div className="p-6 text-center text-sm text-gray-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50/80 dark:bg-white/5">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">史诗</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">状态</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">功能进度</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">完成率</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">工时进度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {(epicProgress?.epics || []).map((epic) => (
                  <tr key={epic.id} className="hover:bg-gray-50/60 dark:hover:bg-white/5">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{epic.title}</div>
                      <div className="text-xs text-gray-500">{epic.id}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          epicStatusClass[epic.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {epicStatusLabel[epic.status] || epic.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {epic.completedFeatures} / {epic.totalFeatures}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 rounded-full bg-gray-200 dark:bg-white/15">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${Math.max(0, Math.min(100, epic.progressPercent))}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">{epic.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {epic.hoursProgress}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
