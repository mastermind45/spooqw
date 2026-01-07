// SpooqW API Client

import type { 
  Pipeline, 
  Run, 
  Connection, 
  DashboardStats,
  ApiResponse,
  PaginatedResponse,
  Schedule,
  DataPreview,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4242/api/v2';
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4243';

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
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
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

  async getDataPreview(runId: string, stepId: string): Promise<DataPreview> {
    return this.request<DataPreview>(`/runs/${runId}/preview/${stepId}`);
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

  // Schedules
  async getSchedules(): Promise<Schedule[]> {
    return this.request<Schedule[]>('/schedules');
  }

  async createSchedule(schedule: {
    pipelineId: string;
    cronExpression: string;
    timezone?: string;
    enabled?: boolean;
  }): Promise<Schedule> {
    return this.request<Schedule>('/schedules', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  async updateSchedule(id: string, schedule: Partial<{
    cronExpression: string;
    timezone: string;
    enabled: boolean;
  }>): Promise<Schedule> {
    return this.request<Schedule>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(schedule),
    });
  }

  async deleteSchedule(id: string): Promise<void> {
    return this.request<void>(`/schedules/${id}`, {
      method: 'DELETE',
    });
  }

  // Health
  async health(): Promise<{ status: string; version: string; database?: string }> {
    return this.request('/health');
  }
}

export const api = new ApiClient(API_BASE);

// WebSocket for real-time logs
export class LogsWebSocket {
  private ws: WebSocket | null = null;
  private runId: string;
  private onMessage: (log: LogMessage) => void;
  private onError?: (error: Event) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(
    runId: string, 
    onMessage: (log: LogMessage) => void,
    onError?: (error: Event) => void
  ) {
    this.runId = runId;
    this.onMessage = onMessage;
    this.onError = onError;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(`${WS_BASE}/ws/runs/${this.runId}/logs`);
      
      this.ws.onopen = () => {
        console.log(`WebSocket connected for run ${this.runId}`);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data) as LogMessage;
          this.onMessage(log);
        } catch {
          // Plain text message
          this.onMessage({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: event.data,
          });
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log(`WebSocket closed for run ${this.runId}`);
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

interface LogMessage {
  timestamp: string;
  level: string;
  message: string;
  stepId?: string;
}

// Legacy function for backward compatibility
export function createLogsWebSocket(runId: string, onMessage: (log: string) => void): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/runs/${runId}/logs`);
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data.message || event.data);
    } catch {
      onMessage(event.data);
    }
  };
  
  return ws;
}
