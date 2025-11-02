import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function Epics() {
  const { data: epics, isLoading, error } = useQuery({
    queryKey: ['epics'],
    queryFn: () => api.getEpics(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading epics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading epics: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Epics</h2>

      <div className="grid gap-6">
        {(epics as any[])?.map((epic: any) => (
          <div key={epic.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{epic.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{epic.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                epic.status === 'completed' ? 'bg-green-100 text-green-800' :
                epic.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {epic.status}
              </span>
            </div>

            <p className="text-gray-700 mb-4">{epic.description}</p>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Owner:</span>
                <span className="ml-2 font-medium">{epic.owner || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Estimate:</span>
                <span className="ml-2 font-medium">{epic.estimate}h</span>
              </div>
              <div>
                <span className="text-gray-500">Features:</span>
                <span className="ml-2 font-medium">{epic.features?.length || 0}</span>
              </div>
            </div>
          </div>
        ))}

        {(!epics || (epics as any[]).length === 0) && (
          <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
            No epics found. Run `pmspec init` and create some epics.
          </div>
        )}
      </div>
    </div>
  );
}
