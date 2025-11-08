import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
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

const COLORS = {
  todo: '#94a3b8',
  'in-progress': '#3b82f6',
  done: '#22c55e',
  planning: '#f59e0b',
  completed: '#10b981',
};

export function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => api.getOverviewStats(),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['stats', 'trends'],
    queryFn: () => api.getTrends(),
  });

  const { data: teamWorkload, isLoading: teamLoading } = useQuery({
    queryKey: ['stats', 'team-workload'],
    queryFn: () => api.getTeamWorkload(),
  });

  const { data: epicProgress, isLoading: epicLoading } = useQuery({
    queryKey: ['stats', 'epic-progress'],
    queryFn: () => api.getEpicProgress(),
  });

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const stats = overview as any;

  // Prepare pie chart data
  const featureStatusData = [
    { name: '待办', value: stats?.features.byStatus.todo || 0, color: COLORS.todo },
    { name: '进行中', value: stats?.features.byStatus['in-progress'] || 0, color: COLORS['in-progress'] },
    { name: '已完成', value: stats?.features.byStatus.done || 0, color: COLORS.done },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Features Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">总特性数</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.features.total || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">
              {stats?.features.byStatus.done || 0} 已完成
            </span>
            <span className="text-gray-500 ml-2">
              / {stats?.features.byStatus['in-progress'] || 0} 进行中
            </span>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">完成率</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.hours.completionRate || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${stats?.hours.completionRate || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hours Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">估算工时</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.hours.estimated || 0}h
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-purple-600 font-medium">
              {stats?.hours.actual || 0}h 实际
            </span>
          </div>
        </div>

        {/* Team Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">团队利用率</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.team.averageUtilization || 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-orange-600 font-medium">
              {stats?.team.totalMembers || 0} 成员
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Status Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">特性状态分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={featureStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {featureStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Trends Line Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">趋势（最近 7 天）</h3>
          {trendsLoading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              加载中...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={(trends as any)?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke={COLORS.done}
                  name="已完成"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="inProgress"
                  stroke={COLORS['in-progress']}
                  name="进行中"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="todo"
                  stroke={COLORS.todo}
                  name="待办"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Team Workload Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">团队工作负载</h3>
        {teamLoading ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            加载中...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(teamWorkload as any)?.workload || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="capacity" fill="#e5e7eb" name="容量" />
              <Bar dataKey="assigned" fill="#3b82f6" name="已分配" />
              <Bar dataKey="completed" fill="#22c55e" name="已完成" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Epic Progress Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Epic 进度</h3>
        </div>
        {epicLoading ? (
          <div className="p-6 text-center text-gray-400">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Epic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    特性数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    进度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工时进度
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {((epicProgress as any)?.epics || []).map((epic: any) => (
                  <tr key={epic.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{epic.title}</div>
                      <div className="text-sm text-gray-500">{epic.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          epic.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : epic.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {epic.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {epic.completedFeatures} / {epic.totalFeatures}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 mr-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${epic.progressPercent}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-gray-600">{epic.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {epic.hoursProgress}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
