import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function Features() {
  const { data: features, isLoading, error } = useQuery({
    queryKey: ['features'],
    queryFn: () => api.getFeatures(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading features...</div>
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
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Features</h2>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estimate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(features as any[])?.map((feature: any) => (
              <tr key={feature.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {feature.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {feature.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    feature.status === 'done' ? 'bg-green-100 text-green-800' :
                    feature.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {feature.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {feature.assignee || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {feature.estimate}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!features || (features as any[]).length === 0) && (
          <div className="text-center py-12 text-gray-500">
            No features found. Run `pmspec init` and create some features.
          </div>
        )}
      </div>
    </div>
  );
}
