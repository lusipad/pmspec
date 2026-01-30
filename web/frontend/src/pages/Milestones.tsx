import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { QueryErrorBoundary } from '../components/QueryErrorBoundary';
import type { Milestone as MilestoneType, Feature } from '@pmspec/types';

export function Milestones() {
  return (
    <QueryErrorBoundary>
      <MilestonesContent />
    </QueryErrorBoundary>
  );
}

function MilestonesContent() {
  const { data: milestones, isLoading: milestonesLoading, error: milestonesError } = useQuery<MilestoneType[]>({
    queryKey: ['milestones'],
    queryFn: () => api.getMilestones<MilestoneType[]>(),
  });

  const { data: features } = useQuery<Feature[]>({
    queryKey: ['features'],
    queryFn: () => api.getFeatures<Feature[]>(),
  });

  if (milestonesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading milestones...</div>
      </div>
    );
  }

  if (milestonesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading milestones: {(milestonesError as Error).message}</p>
      </div>
    );
  }

  // Create a feature lookup map
  const featureMap = new Map(features?.map(f => [f.id, f]) || []);

  // Calculate progress for each milestone
  const milestonesWithProgress = milestones?.map(milestone => {
    const milestoneFeatures = milestone.features.map(id => featureMap.get(id)).filter(Boolean) as Feature[];
    const completedCount = milestoneFeatures.filter(f => f.status === 'done').length;
    const progress = milestoneFeatures.length > 0 
      ? Math.round((completedCount / milestoneFeatures.length) * 100) 
      : 0;
    return { ...milestone, progress, completedCount, totalFeatures: milestoneFeatures.length, milestoneFeatures };
  }) || [];

  // Sort by target date
  const sortedMilestones = [...milestonesWithProgress].sort((a, b) => 
    a.targetDate.localeCompare(b.targetDate)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Milestones</h2>
      </div>

      {/* Timeline View */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          <div className="space-y-6">
            {sortedMilestones.map((milestone) => (
              <div key={milestone.id} className="relative flex items-start ml-4">
                <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 border-white ${
                  milestone.status === 'completed' ? 'bg-green-500' :
                  milestone.status === 'active' ? 'bg-blue-500' :
                  milestone.status === 'missed' ? 'bg-red-500' :
                  'bg-gray-300'
                }`}></div>
                <div className="ml-6 text-sm text-gray-500">{formatDate(milestone.targetDate)}</div>
                <div className="ml-4 font-medium text-gray-900">{milestone.title}</div>
                <StatusBadge status={milestone.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Milestone Cards */}
      <div className="grid gap-6">
        {sortedMilestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            featureMap={featureMap}
          />
        ))}

        {(!milestones || milestones.length === 0) && (
          <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
            No milestones found. Run `pmspec create milestone` to create some.
          </div>
        )}
      </div>
    </div>
  );
}

interface MilestoneWithProgress extends MilestoneType {
  progress: number;
  completedCount: number;
  totalFeatures: number;
  milestoneFeatures: Feature[];
}

function MilestoneCard({ 
  milestone, 
  featureMap 
}: { 
  milestone: MilestoneWithProgress;
  featureMap: Map<string, Feature>;
}) {
  const isOverdue = new Date(milestone.targetDate) < new Date() && milestone.status !== 'completed';
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{milestone.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{milestone.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={milestone.status} />
          {isOverdue && milestone.status !== 'missed' && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Overdue
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Target: {formatDate(milestone.targetDate)}
        </div>
      </div>

      {milestone.description && (
        <p className="text-gray-700 mb-4">{milestone.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{milestone.completedCount}/{milestone.totalFeatures} features ({milestone.progress}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              milestone.progress === 100 ? 'bg-green-500' :
              milestone.progress > 50 ? 'bg-blue-500' :
              milestone.progress > 0 ? 'bg-yellow-500' :
              'bg-gray-300'
            }`}
            style={{ width: `${milestone.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Feature List */}
      {milestone.features.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Features</h4>
          <div className="space-y-2">
            {milestone.features.map(featureId => {
              const feature = featureMap.get(featureId);
              return (
                <div key={featureId} className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={feature?.status === 'done'} 
                    readOnly 
                    className="rounded border-gray-300"
                  />
                  <span className={feature?.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-700'}>
                    {featureId}: {feature?.title || '[Not found]'}
                  </span>
                  {feature && (
                    <FeatureStatusBadge status={feature.status} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MilestoneType['status'] }) {
  const colors = {
    upcoming: 'bg-gray-100 text-gray-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    missed: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

function FeatureStatusBadge({ status }: { status: Feature['status'] }) {
  const colors = {
    todo: 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}
