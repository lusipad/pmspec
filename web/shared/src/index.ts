// ============================================================================
// Core Domain Types
// ============================================================================

/** Status types for epics */
export type EpicStatus = 'planning' | 'in-progress' | 'completed';

/** Status types for features and user stories */
export type FeatureStatus = 'todo' | 'in-progress' | 'done';

/** Priority levels (text-based) */
export type Priority = 'critical' | 'high' | 'medium' | 'low';

/** Workload size */
export type WorkloadSize = 'S' | 'M' | 'L' | 'XL';

/** Dependency type for features */
export type DependencyType = 'blocks' | 'relates-to';

// ============================================================================
// Core Entity Types
// ============================================================================

/** Epic - high-level project initiative */
export interface Epic {
  id: string;
  title: string;
  description: string;
  status: EpicStatus;
  owner: string;
  estimate: number;
  actual: number;
  features: string[];
}

/** Feature dependency */
export interface Dependency {
  featureId: string;
  type: DependencyType;
}

/** Feature - a deliverable unit of work */
export interface Feature {
  id: string;
  epic: string;
  title: string;
  description?: string;
  status: FeatureStatus;
  priority?: Priority;
  assignee: string;
  estimate: number;
  actual: number;
  skillsRequired: string[];
  userStories?: UserStory[];
  acceptanceCriteria?: string[];
  dependencies?: Dependency[];
}

/** User Story - granular user-facing requirement */
export interface UserStory {
  id: string;
  title: string;
  estimate: number;
  status: FeatureStatus;
}

/** Milestone status types */
export type MilestoneStatus = 'upcoming' | 'active' | 'completed' | 'missed';

/** Milestone - a project milestone */
export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  status: MilestoneStatus;
  features: string[];
}

/** Team member */
export interface TeamMember {
  name: string;
  skills: string[];
  capacity: number;
  currentLoad: number;
}

/** Team */
export interface Team {
  members: TeamMember[];
}

/** Project metadata */
export interface Project {
  name: string;
  description: string;
  timeline: {
    start: string;
    end: string;
  };
  teamCapacity: {
    total: number;
    available: number;
  };
}

// ============================================================================
// Dashboard & Statistics Types
// ============================================================================

/** Overview statistics response */
export interface OverviewStats {
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
    completed: number;
    completionRate: number;
  };
  team: {
    totalMembers: number;
    totalCapacity: number;
    totalLoad: number;
    averageUtilization: number;
  };
  totalEstimate: number;
  totalActual: number;
}

/** Trend data point */
export interface TrendData {
  date: string;
  completed: number;
  inProgress: number;
  todo: number;
}

/** Trends response */
export interface TrendsResponse {
  trends: TrendData[];
}

/** Workload item for team member */
export interface WorkloadItem {
  name: string;
  capacity: number;
  assigned: number;
  completed: number;
  remaining: number;
  utilization: number;
  featureCount: number;
}

/** Team workload response */
export interface TeamWorkloadResponse {
  workload: WorkloadItem[];
}

/** Epic progress item */
export interface EpicProgressItem {
  id: string;
  title: string;
  status: EpicStatus;
  totalFeatures: number;
  completedFeatures: number;
  inProgressFeatures: number;
  progressPercent: number;
  hoursProgress: number;
  estimate: number;
  actual: number;
}

/** Epic progress response */
export interface EpicProgressResponse {
  epics: EpicProgressItem[];
}

// ============================================================================
// Gantt Chart Types
// ============================================================================

/** Gantt chart task type */
export type GanttTaskType = 'epic' | 'feature';

/** Gantt chart task */
export interface GanttTask {
  id: string;
  name: string;
  type: GanttTaskType;
  start: string;
  end: string;
  progress: number;
  dependencies: string[];
  assignee?: string;
  status: string;
}

/** Gantt API response */
export interface GanttApiResponse {
  tasks: GanttTask[];
  criticalPath: string[];
}

// ============================================================================
// CSV Import/Export Types
// ============================================================================

/** Import error */
export interface ImportError {
  row: number;
  field: string;
  message: string;
}

/** Import result */
export interface ImportResult {
  message: string;
  created: number;
  updated: number;
  total: number;
  errors: ImportError[];
}

/** Export options */
export interface ExportOptions {
  format?: 'csv' | 'json';
  includeMetadata?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

/** Validation error */
export interface ValidationError {
  field: string;
  message: string;
}

/** API error response */
export interface ApiErrorResponse {
  error: string;
  errors?: ImportError[];
  created?: number;
  updated?: number;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Filter & Query Types
// ============================================================================

/** Feature filter options */
export interface FeatureFilterOptions {
  status?: FeatureStatus | 'all';
  priority?: Priority | 'all';
  assignee?: string | 'all';
  epicId?: string;
  searchTerm?: string;
}

/** Sort options */
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

/** Feature query parameters */
export interface FeatureQueryParams extends FeatureFilterOptions {
  sort?: SortOptions;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Kanban Types
// ============================================================================

/** Kanban column */
export interface KanbanColumn {
  id: FeatureStatus;
  title: string;
  features: Feature[];
}

/** Kanban board state */
export interface KanbanBoardState {
  columns: KanbanColumn[];
}

/** Kanban drag event */
export interface KanbanDragEvent {
  featureId: string;
  sourceColumn: FeatureStatus;
  targetColumn: FeatureStatus;
  newIndex: number;
}
