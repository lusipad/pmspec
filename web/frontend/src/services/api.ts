// API Client for PMSpec Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface FeatureInput {
  id?: string;
  epic?: string;
  title?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3' | 'critical' | 'high' | 'medium' | 'low';
  status?: 'todo' | 'in-progress' | 'done';
  assignee?: string;
  estimate?: number;
  actual?: number;
  skillsRequired?: string[];
}

export interface FeatureListQuery {
  status?: 'todo' | 'in-progress' | 'done' | 'all';
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'all';
  assignee?: string;
  epic?: string;
  search?: string;
  sortBy?: 'id' | 'title' | 'epic' | 'priority' | 'status' | 'assignee' | 'estimate' | 'actual';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BatchUpdateFeaturesRequest {
  ids: string[];
  updates: {
    status?: 'todo' | 'in-progress' | 'done';
    priority?: 'critical' | 'high' | 'medium' | 'low';
    assignee?: string;
  };
}

export interface BatchUpdateFeaturesResponse<T = unknown> {
  updated: number;
  failed: Array<{ id: string; message: string }>;
  items: T[];
}

export interface GanttQuery {
  epic?: string;
  assignee?: string;
  status?: 'todo' | 'in-progress' | 'done';
}

export interface PlanningBriefInput {
  goal: string;
  startDate: string;
  targetDate: string;
  teamCapacityHoursPerDay: number;
  constraints: string[];
}

export interface FeatureSchedule {
  featureId: string;
  title: string;
  epic: string;
  estimate: number;
  start: string;
  end: string;
  assignee: string;
  status: 'todo' | 'in-progress' | 'done';
  dependencies: string[];
}

export interface PlanDraft {
  id: string;
  generatedAt: string;
  brief: PlanningBriefInput;
  features: FeatureSchedule[];
  warnings: string[];
}

export interface PlanImpact {
  delayedFeatures: string[];
  overloadedAssignees: Array<{
    assignee: string;
    assignedHours: number;
    capacityHours: number;
  }>;
  dependencyRisks: Array<{
    featureId: string;
    blockedBy: string[];
  }>;
}

export interface ConnectorInfo {
  id: string;
  name: string;
  category: 'engineering' | 'collaboration';
  connected: boolean;
  capabilities: Array<'import' | 'export'>;
}

export interface SyncJob {
  id: string;
  connectorId: string;
  direction: 'import' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildQueryString(query?: Record<string, string | number | undefined>) {
    if (!query) {
      return '';
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) {
        continue;
      }
      const normalized = String(value).trim();
      if (!normalized) {
        continue;
      }
      params.set(key, normalized);
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Epics
  async getEpics<T = unknown>() {
    return this.request<T>('/epics');
  }

  async getEpic(id: string) {
    return this.request(`/epics/${id}`);
  }

  // Features
  async getFeatures<T = unknown>(query?: FeatureListQuery) {
    const queryString = this.buildQueryString({
      status: query?.status,
      priority: query?.priority,
      assignee: query?.assignee,
      epic: query?.epic,
      search: query?.search,
      sortBy: query?.sortBy,
      sortOrder: query?.sortOrder,
      page: query?.page,
      pageSize: query?.pageSize,
    });
    return this.request<T>(`/features${queryString}`);
  }

  async getFeature(id: string) {
    return this.request(`/features/${id}`);
  }

  // Team
  async getTeam() {
    return this.request('/team');
  }

  // Milestones
  async getMilestones<T = unknown>() {
    return this.request<T>('/milestones');
  }

  async getMilestone(id: string) {
    return this.request(`/milestones/${id}`);
  }

  async createMilestone(milestone: { title: string; description?: string; targetDate: string; status: string; features?: string[] }) {
    return this.request('/milestones', {
      method: 'POST',
      body: JSON.stringify(milestone),
    });
  }

  async updateMilestone(id: string, updates: Partial<{ title: string; description?: string; targetDate: string; status: string; features?: string[] }>) {
    return this.request(`/milestones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // CSV
  async exportCSV(): Promise<Blob> {
    const url = `${this.baseUrl}/csv/export`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.blob();
  }

  async downloadTemplate(): Promise<Blob> {
    const url = `${this.baseUrl}/csv/template`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.blob();
  }

  async importCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/csv/import`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return await response.json();
  }

  // Feature CRUD
  async createFeature(feature: FeatureInput) {
    return this.request('/features', {
      method: 'POST',
      body: JSON.stringify(feature),
    });
  }

  async updateFeature(id: string, updates: Partial<FeatureInput>) {
    return this.request(`/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async patchFeature<T = unknown>(id: string, updates: Partial<FeatureInput>) {
    return this.request<T>(`/features/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async batchUpdateFeatures<T = unknown>(payload: BatchUpdateFeaturesRequest) {
    return this.request<BatchUpdateFeaturesResponse<T>>('/features/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteFeature(id: string) {
    return this.request(`/features/${id}`, {
      method: 'DELETE',
    });
  }

  // Statistics
  async getOverviewStats<T = unknown>() {
    return this.request<T>('/stats/overview');
  }

  async getTrends<T = unknown>() {
    return this.request<T>('/stats/trends');
  }

  async getTeamWorkload<T = unknown>() {
    return this.request<T>('/stats/team-workload');
  }

  async getEpicProgress<T = unknown>() {
    return this.request<T>('/stats/epic-progress');
  }

  // Changelog
  async getChangelog(options?: { 
    entityId?: string; 
    entityType?: string; 
    action?: string; 
    since?: string; 
    until?: string; 
    limit?: number; 
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (options?.entityId) params.append('entityId', options.entityId);
    if (options?.entityType) params.append('entityType', options.entityType);
    if (options?.action) params.append('action', options.action);
    if (options?.since) params.append('since', options.since);
    if (options?.until) params.append('until', options.until);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const query = params.toString();
    return this.request(`/changelog${query ? `?${query}` : ''}`);
  }

  async getEntityChangelog(entityId: string) {
    return this.request(`/changelog/${entityId}`);
  }

  async getChangelogStats() {
    return this.request('/changelog/stats');
  }

  // Timeline
  async getGanttData<T = unknown>(query?: GanttQuery) {
    const queryString = this.buildQueryString({
      epic: query?.epic,
      assignee: query?.assignee,
      status: query?.status,
    });
    return this.request<T>(`/timeline/gantt${queryString}`);
  }

  // AI
  async breakdownRequirements(requirements: string) {
    return this.request('/ai/breakdown', {
      method: 'POST',
      body: JSON.stringify({ requirements }),
    });
  }

  async estimateFeature(description: string) {
    return this.request('/ai/estimate', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
  }

  // Workflow planning
  async generatePlan(brief: PlanningBriefInput) {
    return this.request<PlanDraft>('/workflows/plans/generate', {
      method: 'POST',
      body: JSON.stringify(brief),
    });
  }

  async confirmPlan(planId: string) {
    return this.request<{ message: string; plan: PlanDraft }>(`/workflows/plans/${planId}/confirm`, {
      method: 'POST',
    });
  }

  async rebalancePlan(planId: string, strategy: 'conservative' | 'balanced' | 'aggressive') {
    return this.request<PlanDraft>(`/workflows/plans/${planId}/rebalance`, {
      method: 'POST',
      body: JSON.stringify({ strategy }),
    });
  }

  async updatePlanFeature(
    planId: string,
    featureId: string,
    updates: Partial<Pick<FeatureSchedule, 'start' | 'end' | 'assignee' | 'status'>>
  ) {
    return this.request<PlanDraft>(`/workflows/plans/${planId}/features/${featureId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async batchUpdatePlan(
    planId: string,
    featureIds: string[],
    updates: Partial<Pick<FeatureSchedule, 'assignee' | 'status'>>
  ) {
    return this.request<PlanDraft>(`/workflows/plans/${planId}/batch`, {
      method: 'POST',
      body: JSON.stringify({ featureIds, updates }),
    });
  }

  async getPlanImpact(planId: string) {
    return this.request<PlanImpact>(`/workflows/plans/${planId}/impact`);
  }

  // Import from external tools
  async getImportSources() {
    return this.request<{
      sources: Array<{
        source: string;
        name: string;
        description: string;
      }>;
    }>('/import/sources');
  }

  async validateImportFile(file: File, source: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);

    const url = `${this.baseUrl}/import/validate`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return await response.json() as { valid: boolean; errors: string[] };
  }

  async importFromSource(source: string, file: File, options?: { dryRun?: boolean; merge?: boolean }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.dryRun) formData.append('dryRun', 'true');
    if (options?.merge) formData.append('merge', 'true');

    const url = `${this.baseUrl}/import/${source}`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return await response.json() as ImportResult;
  }

  // Integrations
  async getConnectors() {
    return this.request<{ connectors: ConnectorInfo[] }>('/integrations/connectors');
  }

  async connectConnector(connectorId: string) {
    return this.request<{ connector: ConnectorInfo }>(`/integrations/${connectorId}/connect`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async exportConnector(connectorId: string) {
    return this.request<{ job: SyncJob }>(`/integrations/${connectorId}/export`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async importConnector(connectorId: string, file?: File) {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    const url = `${this.baseUrl}/integrations/${connectorId}/import`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return (await response.json()) as { job: SyncJob };
  }

  async getSyncLog() {
    return this.request<{ jobs: SyncJob[] }>('/integrations/sync-log');
  }
}

// Import result types
export interface ImportResult {
  success: boolean;
  source: string;
  features: Array<{
    id: string;
    name: string;
    description: string;
    estimate: number;
    assignee: string;
    priority: string;
    status: string;
    category?: string;
    tags: string[];
  }>;
  epics: Array<{
    id: string;
    name: string;
    description: string;
    originalId?: string;
    originalType?: string;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    description: string;
    dueDate?: string;
    originalId?: string;
  }>;
  errors: Array<{
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    field?: string;
    message: string;
  }>;
  stats: {
    totalItems: number;
    featuresImported: number;
    epicsImported: number;
    milestonesImported: number;
    skipped: number;
    errors: number;
  };
  persisted?: {
    created: number;
    updated: number;
  };
}

export const api = new ApiClient(API_BASE_URL);
