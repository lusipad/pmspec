// API Client for PMSpec Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  async getEpics() {
    return this.request('/epics');
  }

  async getEpic(id: string) {
    return this.request(`/epics/${id}`);
  }

  // Features
  async getFeatures() {
    return this.request('/features');
  }

  async getFeature(id: string) {
    return this.request(`/features/${id}`);
  }

  // Team
  async getTeam() {
    return this.request('/team');
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
  async createFeature(feature: any) {
    return this.request('/features', {
      method: 'POST',
      body: JSON.stringify(feature),
    });
  }

  async updateFeature(id: string, updates: any) {
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
}

export const api = new ApiClient(API_BASE_URL);
