import type { Epic, Feature } from '@pmspec/types';

export interface GanttTask {
  id: string;
  name: string;
  type: 'epic' | 'feature';
  start: string; // ISO date
  end: string; // ISO date
  progress: number; // 0-100
  dependencies: string[];
  assignee?: string;
  status: string;
}

/**
 * Calculate timeline dates based on estimates and team capacity
 */
export function calculateTimeline(
  epics: Epic[],
  features: Feature[],
  startDate: Date = new Date()
): GanttTask[] {
  const tasks: GanttTask[] = [];

  // Default: 8 hours per day, 5 days per week
  const HOURS_PER_DAY = 8;
  const knownFeatureIds = new Set(features.map((feature) => feature.id));
  const knownEpicIds = new Set(epics.map((epic) => epic.id));

  function toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function hoursToDate(startDate: Date, hours: number): Date {
    const days = Math.ceil(hours / HOURS_PER_DAY);
    const result = new Date(startDate);

    // Add working days (skip weekends)
    let addedDays = 0;
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Not Sunday or Saturday
        addedDays++;
      }
    }

    return result;
  }

  function resolveDependencies(feature: Feature, fallbackDependencyId?: string): string[] {
    const explicitDependencies = (feature.dependencies ?? [])
      .filter((dependency) => dependency.type === 'blocks')
      .map((dependency) => dependency.featureId)
      .filter((dependencyId) => dependencyId !== feature.id && knownFeatureIds.has(dependencyId));

    if (explicitDependencies.length > 0) {
      return Array.from(new Set(explicitDependencies));
    }

    return fallbackDependencyId ? [fallbackDependencyId] : [];
  }

  function scheduleFeaturesSequentially(group: Feature[], groupStartDate: Date): Date {
    let featureDate = new Date(groupStartDate);
    const sortedFeatures = [...group].sort((a, b) => a.id.localeCompare(b.id));

    sortedFeatures.forEach((feature, index) => {
      const featureStart = new Date(featureDate);
      const featureEnd = hoursToDate(featureStart, feature.estimate || 8);
      const fallbackDependencyId = index > 0 ? sortedFeatures[index - 1].id : undefined;

      tasks.push({
        id: feature.id,
        name: feature.title,
        type: 'feature',
        start: toIsoDate(featureStart),
        end: toIsoDate(featureEnd),
        progress: feature.estimate > 0 ? (feature.actual / feature.estimate) * 100 : 0,
        dependencies: resolveDependencies(feature, fallbackDependencyId),
        assignee: feature.assignee,
        status: feature.status,
      });

      featureDate = new Date(featureEnd);
    });

    return featureDate;
  }

  // Sort epics by ID
  const sortedEpics = [...epics].sort((a, b) => a.id.localeCompare(b.id));

  let currentDate = new Date(startDate);

  // Process each epic
  sortedEpics.forEach((epic) => {
    const epicFeatures = features.filter((f) => f.epic === epic.id);

    if (epicFeatures.length === 0) {
      // Epic without features
      const epicStart = new Date(currentDate);
      const epicEnd = hoursToDate(epicStart, epic.estimate || 40);

      tasks.push({
        id: epic.id,
        name: epic.title,
        type: 'epic',
        start: toIsoDate(epicStart),
        end: toIsoDate(epicEnd),
        progress: epic.estimate > 0 ? (epic.actual / epic.estimate) * 100 : 0,
        dependencies: [],
        status: epic.status,
      });

      currentDate = new Date(epicEnd);
    } else {
      // Epic with features
      const epicStart = new Date(currentDate);
      const featureDate = scheduleFeaturesSequentially(epicFeatures, currentDate);

      // Add epic task spanning all features
      tasks.push({
        id: epic.id,
        name: epic.title,
        type: 'epic',
        start: toIsoDate(epicStart),
        end: toIsoDate(featureDate),
        progress: epic.estimate > 0 ? (epic.actual / epic.estimate) * 100 : 0,
        dependencies: [],
        status: epic.status,
      });

      currentDate = new Date(featureDate);
    }
  });

  // Include features that do not belong to a known epic
  const orphanFeatures = features.filter((feature) => !feature.epic || !knownEpicIds.has(feature.epic));
  if (orphanFeatures.length > 0) {
    scheduleFeaturesSequentially(orphanFeatures, currentDate);
  }

  return tasks;
}

/**
 * Calculate critical path (longest path through the project)
 */
export function calculateCriticalPath(tasks: GanttTask[]): string[] {
  // Simple implementation: find tasks with no dependencies that take the longest
  const criticalTasks: string[] = [];

  tasks.forEach((task) => {
    if (task.type === 'epic') {
      const start = new Date(task.start);
      const end = new Date(task.end);
      const duration = end.getTime() - start.getTime();

      // Epic tasks with longest duration are on critical path
      if (duration > 0) {
        criticalTasks.push(task.id);
      }
    }
  });

  return criticalTasks;
}
