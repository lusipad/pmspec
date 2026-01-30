// API Client for PMSpec Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface FeatureInput {
  id?: string;
  epic?: string;
  title?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  status?: 'todo' | 'in-progress' | 'done';
  assignee?: string;
  estimate?: number;
  actual?: number;
  skillsRequired?: string[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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

      return await response.json();
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
  async getFeatures<T = unknown>() {
    return this.request<T>('/features');
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
  async getGanttData() {
    return this.request('/timeline/gantt');
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
}

export const api = new ApiClient(API_BASE_URL);
