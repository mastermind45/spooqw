// SpooqW Types

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  config: string; // YAML/JSON config
  steps: Step[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: RunStatus;
}

export interface Step {
  id: string;
  kind: StepKind;
  shortDesc?: string;
  desc?: string;
  format?: string;
  sql?: string;
  path?: string;
  source?: string;
  options?: Record<string, string>;
  schema?: string;
  cache?: boolean;
  show?: boolean;
  dependsOn?: string[];
  // Position for DAG visualization
  position?: { x: number; y: number };
}

export type StepKind = 
  | 'input'
  | 'input-stream'
  | 'sql'
  | 'variable'
  | 'script'
  | 'custom'
  | 'customInput'
  | 'avro-serde'
  | 'udf'
  | 'output'
  | 'output-stream'
  | 'parse-json';

export type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface Run {
  id: string;
  pipelineId: string;
  pipelineName: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number; // seconds
  stepsCompleted: number;
  stepsTotal: number;
  error?: string;
  logs: LogEntry[];
  stepReports: StepReport[];
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  stepId?: string;
}

export interface StepReport {
  stepId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  recordsProcessed?: number;
  error?: string;
}

export interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  config: Record<string, string>;
  createdAt: string;
  lastTestedAt?: string;
  lastTestSuccess?: boolean;
}

export type ConnectionType = 
  | 'jdbc'
  | 'kafka'
  | 's3'
  | 'gcs'
  | 'azure-blob'
  | 'hdfs'
  | 'mongodb'
  | 'hbase';

export interface DashboardStats {
  totalPipelines: number;
  totalRuns: number;
  runsToday: number;
  successRate: number;
  activeRuns: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
