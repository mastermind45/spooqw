-- SpooqW Database Schema
-- PostgreSQL 16

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pipelines table
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    config TEXT NOT NULL,  -- YAML configuration
    steps JSONB NOT NULL DEFAULT '[]',
    schedule VARCHAR(100),  -- Cron expression
    schedule_enabled BOOLEAN DEFAULT FALSE,
    last_run_at TIMESTAMPTZ,
    last_run_status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Runs table
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration INTEGER,  -- seconds
    steps_completed INTEGER DEFAULT 0,
    steps_total INTEGER DEFAULT 0,
    error TEXT,
    triggered_by VARCHAR(50) DEFAULT 'manual',  -- manual, schedule, api
    spark_app_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step reports table (detailed step execution info)
CREATE TABLE step_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration INTEGER,
    records_processed BIGINT,
    bytes_processed BIGINT,
    error TEXT,
    metrics JSONB DEFAULT '{}'
);

-- Logs table (for persistent log storage)
CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_id VARCHAR(255),
    level VARCHAR(10) NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Connections table
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    last_tested_at TIMESTAMPTZ,
    last_test_success BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedules table (for job scheduling)
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    enabled BOOLEAN DEFAULT TRUE,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data previews cache table
CREATE TABLE data_previews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    step_id VARCHAR(255) NOT NULL,
    schema JSONB,  -- Column definitions
    sample_data JSONB,  -- First N rows
    row_count BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(run_id, step_id)
);

-- Settings table
CREATE TABLE settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_runs_pipeline_id ON runs(pipeline_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX idx_step_reports_run_id ON step_reports(run_id);
CREATE INDEX idx_logs_run_id ON logs(run_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_schedules_next_run ON schedules(next_run_at) WHERE enabled = TRUE;
CREATE INDEX idx_data_previews_run_step ON data_previews(run_id, step_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pipelines_updated_at
    BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER connections_updated_at
    BEFORE UPDATE ON connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('spark.master', '"local[*]"'),
    ('spark.executor.memory', '"2g"'),
    ('spark.driver.memory', '"1g"'),
    ('log.level', '"INFO"'),
    ('api.cors.enabled', 'true'),
    ('metrics.enabled', 'true');

-- Sample data for testing
INSERT INTO pipelines (id, name, description, config, steps) VALUES
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'etl-customers',
    'Customer data ETL pipeline from CSV to Parquet',
    'id: etl-customers
desc: Customer data ETL pipeline

steps:
  - id: raw_customers
    kind: input
    format: csv
    path: /data/customers.csv
    cache: true

  - id: active_customers
    kind: sql
    sql: |
      SELECT * FROM raw_customers 
      WHERE active = true

  - id: output_parquet
    kind: output
    source: active_customers
    format: parquet
    path: /output/customers.parquet',
    '[{"id": "raw_customers", "kind": "input", "format": "csv"},
      {"id": "active_customers", "kind": "sql", "source": "raw_customers"},
      {"id": "output_parquet", "kind": "output", "source": "active_customers", "format": "parquet"}]'
),
(
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'sync-orders',
    'Real-time order sync from Kafka to Delta Lake',
    'id: sync-orders
steps:
  - id: kafka-input
    kind: input-stream
    format: kafka
  - id: transform
    kind: sql
    sql: SELECT * FROM kafka_input
  - id: delta-output
    kind: output-stream
    format: delta',
    '[{"id": "kafka-input", "kind": "input-stream", "format": "kafka"},
      {"id": "transform", "kind": "sql", "source": "kafka-input"},
      {"id": "delta-output", "kind": "output-stream", "source": "transform", "format": "delta"}]'
);

INSERT INTO connections (id, name, type, config, last_test_success) VALUES
(
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Production PostgreSQL',
    'jdbc',
    '{"url": "jdbc:postgresql://prod-db:5432/analytics", "driver": "org.postgresql.Driver", "user": "analytics_user"}',
    true
),
(
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'Kafka Cluster',
    'kafka',
    '{"bootstrap.servers": "kafka-1:9092,kafka-2:9092", "security.protocol": "SASL_SSL"}',
    true
);

COMMENT ON TABLE pipelines IS 'ETL pipeline definitions';
COMMENT ON TABLE runs IS 'Pipeline execution history';
COMMENT ON TABLE step_reports IS 'Detailed step execution metrics';
COMMENT ON TABLE logs IS 'Execution logs';
COMMENT ON TABLE connections IS 'Data source connections';
COMMENT ON TABLE schedules IS 'Pipeline scheduling configuration';
COMMENT ON TABLE data_previews IS 'Cached data previews for steps';
