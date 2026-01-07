// SpooqW API Client

import type { 
  Pipeline, 
  Run, 
  Connection, 
  DashboardStats,
  ApiResponse,
  PaginatedResponse 
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4242/api/v2';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  // Pipelines
  async getPipelines(): Promise<Pipeline[]> {
    return this.request<Pipeline[]>('/pipelines');
  }

  async getPipeline(id: string): Promise<Pipeline> {
    return this.request<Pipeline>(`/pipelines/${id}`);
  }

  async createPipeline(pipeline: Partial<Pipeline>): Promise<Pipeline> {
    return this.request<Pipeline>('/pipelines', {
      method: 'POST',
      body: JSON.stringify(pipeline),
    });
  }

  async updatePipeline(id: string, pipeline: Partial<Pipeline>): Promise<Pipeline> {
    return this.request<Pipeline>(`/pipelines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pipeline),
    });
  }

  async deletePipeline(id: string): Promise<void> {
    return this.request<void>(`/pipelines/${id}`, {
      method: 'DELETE',
    });
  }

  async validatePipeline(config: string): Promise<ApiResponse<{ valid: boolean; errors?: string[] }>> {
    return this.request('/pipelines/validate', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  }

  async runPipeline(id: string): Promise<Run> {
    return this.request<Run>(`/pipelines/${id}/run`, {
      method: 'POST',
    });
  }

  async dryRunPipeline(id: string): Promise<ApiResponse<{ steps: string[] }>> {
    return this.request(`/pipelines/${id}/dry-run`, {
      method: 'POST',
    });
  }

  // Runs
  async getRuns(params?: { pipelineId?: string; status?: string; limit?: number }): Promise<Run[]> {
    const searchParams = new URLSearchParams();
    if (params?.pipelineId) searchParams.set('pipelineId', params.pipelineId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<Run[]>(`/runs${query ? `?${query}` : ''}`);
  }

  async getRun(id: string): Promise<Run> {
    return this.request<Run>(`/runs/${id}`);
  }

  async cancelRun(id: string): Promise<void> {
    return this.request<void>(`/runs/${id}/cancel`, {
      method: 'POST',
    });
  }

  async getRunLogs(id: string, params?: { offset?: number; limit?: number }): Promise<PaginatedResponse<string>> {
    const searchParams = new URLSearchParams();
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request(`/runs/${id}/logs${query ? `?${query}` : ''}`);
  }

  // Connections
  async getConnections(): Promise<Connection[]> {
    return this.request<Connection[]>('/connections');
  }

  async getConnection(id: string): Promise<Connection> {
    return this.request<Connection>(`/connections/${id}`);
  }

  async createConnection(connection: Partial<Connection>): Promise<Connection> {
    return this.request<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify(connection),
    });
  }

  async updateConnection(id: string, connection: Partial<Connection>): Promise<Connection> {
    return this.request<Connection>(`/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(connection),
    });
  }

  async deleteConnection(id: string): Promise<void> {
    return this.request<void>(`/connections/${id}`, {
      method: 'DELETE',
    });
  }

  async testConnection(id: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    return this.request(`/connections/${id}/test`, {
      method: 'POST',
    });
  }

  // Health
  async health(): Promise<{ status: string }> {
    return this.request('/health');
  }
}

export const api = new ApiClient(API_BASE);

// WebSocket for real-time logs
export function createLogsWebSocket(runId: string, onMessage: (log: string) => void): WebSocket {
  const wsUrl = API_BASE.replace('http', 'ws').replace('/api/v2', '');
  const ws = new WebSocket(`${wsUrl}/ws/runs/${runId}/logs`);
  
  ws.onmessage = (event) => {
    onMessage(event.data);
  };
  
  return ws;
}
