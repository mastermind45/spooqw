/**
 * SpooqW API Server v2
 * 
 * Features:
 * - PostgreSQL persistence
 * - WebSocket for real-time logs
 * - Cron scheduling for pipelines
 * - Full REST API
 */

const http = require('http');
const { URL } = require('url');
const { Pool } = require('pg');
const WebSocket = require('ws');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

// Configuration
const PORT = process.env.PORT || 4242;
const WS_PORT = process.env.WS_PORT || 4243;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://spooqw:spooqw_secret@localhost:5432/spooqw';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// WebSocket server for real-time logs
const wss = new WebSocket.Server({ port: WS_PORT });
const runSubscriptions = new Map(); // runId -> Set of WebSocket clients

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${WS_PORT}`);
  const match = url.pathname.match(/^\/ws\/runs\/([^/]+)\/logs$/);
  
  if (match) {
    const runId = match[1];
    if (!runSubscriptions.has(runId)) {
      runSubscriptions.set(runId, new Set());
    }
    runSubscriptions.get(runId).add(ws);
    
    ws.on('close', () => {
      runSubscriptions.get(runId)?.delete(ws);
    });
    
    console.log(`WebSocket: Client subscribed to run ${runId}`);
  }
});

// Broadcast log to subscribers
function broadcastLog(runId, log) {
  const subscribers = runSubscriptions.get(runId);
  if (subscribers) {
    const message = JSON.stringify(log);
    subscribers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

// Scheduled jobs storage
const scheduledJobs = new Map();

// Initialize scheduler from database
async function initializeScheduler() {
  try {
    const result = await pool.query(`
      SELECT s.*, p.name as pipeline_name 
      FROM schedules s 
      JOIN pipelines p ON s.pipeline_id = p.id 
      WHERE s.enabled = true
    `);
    
    for (const schedule of result.rows) {
      scheduleJob(schedule);
    }
    
    console.log(`Scheduler: Loaded ${result.rows.length} scheduled jobs`);
  } catch (err) {
    console.error('Failed to initialize scheduler:', err);
  }
}

function scheduleJob(schedule) {
  if (scheduledJobs.has(schedule.id)) {
    scheduledJobs.get(schedule.id).stop();
  }
  
  const job = cron.schedule(schedule.cron_expression, async () => {
    console.log(`Scheduler: Running pipeline ${schedule.pipeline_name}`);
    try {
      await runPipeline(schedule.pipeline_id, 'schedule');
      await pool.query(
        'UPDATE schedules SET last_run_at = NOW() WHERE id = $1',
        [schedule.id]
      );
    } catch (err) {
      console.error(`Scheduler: Failed to run pipeline ${schedule.pipeline_name}:`, err);
    }
  }, {
    timezone: schedule.timezone || 'UTC'
  });
  
  scheduledJobs.set(schedule.id, job);
}

// Run a pipeline
async function runPipeline(pipelineId, triggeredBy = 'manual') {
  const client = await pool.connect();
  
  try {
    // Get pipeline
    const pipelineResult = await client.query(
      'SELECT * FROM pipelines WHERE id = $1',
      [pipelineId]
    );
    
    if (pipelineResult.rows.length === 0) {
      throw new Error('Pipeline not found');
    }
    
    const pipeline = pipelineResult.rows[0];
    const steps = typeof pipeline.steps === 'string' ? JSON.parse(pipeline.steps) : pipeline.steps;
    
    // Create run
    const runResult = await client.query(`
      INSERT INTO runs (pipeline_id, status, steps_total, triggered_by)
      VALUES ($1, 'running', $2, $3)
      RETURNING *
    `, [pipelineId, steps.length, triggeredBy]);
    
    const run = runResult.rows[0];
    
    // Create step reports
    for (const step of steps) {
      await client.query(`
        INSERT INTO step_reports (run_id, step_id, status)
        VALUES ($1, $2, 'pending')
      `, [run.id, step.id]);
    }
    
    // Update pipeline last run
    await client.query(`
      UPDATE pipelines SET last_run_at = NOW(), last_run_status = 'running'
      WHERE id = $1
    `, [pipelineId]);
    
    // Add initial log
    await addLog(run.id, null, 'INFO', `Starting pipeline ${pipeline.name}`);
    
    // Simulate execution in background
    simulateExecution(run.id, pipeline, steps);
    
    return {
      ...run,
      pipelineName: pipeline.name,
      stepsCompleted: 0,
      stepsTotal: steps.length,
      logs: [],
      stepReports: steps.map(s => ({ stepId: s.id, status: 'pending' }))
    };
  } finally {
    client.release();
  }
}

// Simulate pipeline execution (replace with real Spark execution)
async function simulateExecution(runId, pipeline, steps) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Start step
    await pool.query(`
      UPDATE step_reports SET status = 'running', started_at = NOW()
      WHERE run_id = $1 AND step_id = $2
    `, [runId, step.id]);
    
    await addLog(runId, step.id, 'INFO', `Starting step ${step.id}`);
    broadcastLog(runId, { stepId: step.id, level: 'INFO', message: `Starting step ${step.id}`, timestamp: new Date().toISOString() });
    
    // Simulate processing
    const duration = Math.floor(Math.random() * 5000) + 2000;
    await new Promise(r => setTimeout(r, duration));
    
    // Generate sample data preview
    const sampleData = generateSampleData(step);
    await pool.query(`
      INSERT INTO data_previews (run_id, step_id, schema, sample_data, row_count)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (run_id, step_id) DO UPDATE SET
        schema = $3, sample_data = $4, row_count = $5, created_at = NOW()
    `, [runId, step.id, JSON.stringify(sampleData.schema), JSON.stringify(sampleData.rows), sampleData.rowCount]);
    
    // Complete step
    const records = Math.floor(Math.random() * 50000) + 10000;
    await pool.query(`
      UPDATE step_reports SET 
        status = 'success', 
        completed_at = NOW(), 
        duration = $3,
        records_processed = $4
      WHERE run_id = $1 AND step_id = $2
    `, [runId, step.id, Math.floor(duration / 1000), records]);
    
    await pool.query(`
      UPDATE runs SET steps_completed = $2 WHERE id = $1
    `, [runId, i + 1]);
    
    await addLog(runId, step.id, 'INFO', `Step ${step.id} completed: ${records.toLocaleString()} records processed`);
    broadcastLog(runId, { stepId: step.id, level: 'INFO', message: `Completed: ${records.toLocaleString()} records`, timestamp: new Date().toISOString() });
  }
  
  // Complete run
  await pool.query(`
    UPDATE runs SET status = 'success', completed_at = NOW(), 
    duration = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE id = $1
  `, [runId]);
  
  await pool.query(`
    UPDATE pipelines SET last_run_status = 'success' WHERE id = $1
  `, [pipeline.id]);
  
  await addLog(runId, null, 'INFO', 'Pipeline completed successfully');
  broadcastLog(runId, { level: 'INFO', message: 'Pipeline completed successfully', timestamp: new Date().toISOString() });
}

// Generate sample data for preview
function generateSampleData(step) {
  const columns = ['id', 'name', 'value', 'created_at'];
  const rows = [];
  
  for (let i = 0; i < 10; i++) {
    rows.push({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString()
    });
  }
  
  return {
    schema: columns.map(c => ({ name: c, type: c === 'id' || c === 'value' ? 'integer' : 'string' })),
    rows,
    rowCount: Math.floor(Math.random() * 50000) + 10000
  };
}

// Add log entry
async function addLog(runId, stepId, level, message) {
  await pool.query(`
    INSERT INTO logs (run_id, step_id, level, message)
    VALUES ($1, $2, $3, $4)
  `, [runId, stepId, level, message]);
}

// HTTP request handler
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(`${method} ${path}`);
  
  try {
    // Parse body for POST/PUT
    let body = {};
    if (method === 'POST' || method === 'PUT') {
      body = await parseBody(req);
    }
    
    // Route matching
    let result;
    
    // Health
    if (path === '/api/v2/health') {
      result = { status: 'ok', version: '2.0.0', database: 'connected' };
    }
    
    // Dashboard stats
    else if (path === '/api/v2/dashboard/stats') {
      result = await getDashboardStats();
    }
    
    // Pipelines
    else if (path === '/api/v2/pipelines' && method === 'GET') {
      result = await getPipelines();
    }
    else if (path === '/api/v2/pipelines' && method === 'POST') {
      result = await createPipeline(body);
    }
    else if (path.match(/^\/api\/v2\/pipelines\/([^/]+)$/) && method === 'GET') {
      const id = path.split('/')[4];
      result = await getPipeline(id);
    }
    else if (path.match(/^\/api\/v2\/pipelines\/([^/]+)$/) && method === 'PUT') {
      const id = path.split('/')[4];
      result = await updatePipeline(id, body);
    }
    else if (path.match(/^\/api\/v2\/pipelines\/([^/]+)$/) && method === 'DELETE') {
      const id = path.split('/')[4];
      result = await deletePipeline(id);
    }
    else if (path.match(/^\/api\/v2\/pipelines\/([^/]+)\/run$/) && method === 'POST') {
      const id = path.split('/')[4];
      result = await runPipeline(id, 'manual');
    }
    else if (path === '/api/v2/pipelines/validate' && method === 'POST') {
      result = await validatePipeline(body);
    }
    
    // Runs
    else if (path === '/api/v2/runs' && method === 'GET') {
      const params = Object.fromEntries(url.searchParams);
      result = await getRuns(params);
    }
    else if (path.match(/^\/api\/v2\/runs\/([^/]+)$/) && method === 'GET') {
      const id = path.split('/')[4];
      result = await getRun(id);
    }
    else if (path.match(/^\/api\/v2\/runs\/([^/]+)\/cancel$/) && method === 'POST') {
      const id = path.split('/')[4];
      result = await cancelRun(id);
    }
    else if (path.match(/^\/api\/v2\/runs\/([^/]+)\/logs$/) && method === 'GET') {
      const id = path.split('/')[4];
      const params = Object.fromEntries(url.searchParams);
      result = await getRunLogs(id, params);
    }
    else if (path.match(/^\/api\/v2\/runs\/([^/]+)\/preview\/([^/]+)$/) && method === 'GET') {
      const parts = path.split('/');
      result = await getDataPreview(parts[4], parts[6]);
    }
    
    // Connections
    else if (path === '/api/v2/connections' && method === 'GET') {
      result = await getConnections();
    }
    else if (path === '/api/v2/connections' && method === 'POST') {
      result = await createConnection(body);
    }
    else if (path.match(/^\/api\/v2\/connections\/([^/]+)$/) && method === 'GET') {
      const id = path.split('/')[4];
      result = await getConnection(id);
    }
    else if (path.match(/^\/api\/v2\/connections\/([^/]+)$/) && method === 'PUT') {
      const id = path.split('/')[4];
      result = await updateConnection(id, body);
    }
    else if (path.match(/^\/api\/v2\/connections\/([^/]+)$/) && method === 'DELETE') {
      const id = path.split('/')[4];
      result = await deleteConnection(id);
    }
    else if (path.match(/^\/api\/v2\/connections\/([^/]+)\/test$/) && method === 'POST') {
      const id = path.split('/')[4];
      result = await testConnection(id);
    }
    
    // Schedules
    else if (path === '/api/v2/schedules' && method === 'GET') {
      result = await getSchedules();
    }
    else if (path === '/api/v2/schedules' && method === 'POST') {
      result = await createSchedule(body);
    }
    else if (path.match(/^\/api\/v2\/schedules\/([^/]+)$/) && method === 'PUT') {
      const id = path.split('/')[4];
      result = await updateSchedule(id, body);
    }
    else if (path.match(/^\/api\/v2\/schedules\/([^/]+)$/) && method === 'DELETE') {
      const id = path.split('/')[4];
      result = await deleteSchedule(id);
    }
    
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    
  } catch (err) {
    console.error('Error:', err);
    res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// Helper: Parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ==================== API Handlers ====================

async function getDashboardStats() {
  const stats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM pipelines) as total_pipelines,
      (SELECT COUNT(*) FROM runs) as total_runs,
      (SELECT COUNT(*) FROM runs WHERE DATE(started_at) = CURRENT_DATE) as runs_today,
      (SELECT COUNT(*) FROM runs WHERE status = 'running') as active_runs,
      (SELECT COUNT(*)::FLOAT / NULLIF(COUNT(*), 0) * 100 FROM runs WHERE status = 'success') as success_rate
  `);
  
  const row = stats.rows[0];
  return {
    totalPipelines: parseInt(row.total_pipelines),
    totalRuns: parseInt(row.total_runs),
    runsToday: parseInt(row.runs_today),
    activeRuns: parseInt(row.active_runs),
    successRate: parseFloat(row.success_rate) || 0
  };
}

async function getPipelines() {
  const result = await pool.query(`
    SELECT id, name, description, config, steps, schedule, schedule_enabled,
           last_run_at, last_run_status, created_at, updated_at
    FROM pipelines ORDER BY updated_at DESC
  `);
  
  return result.rows.map(formatPipeline);
}

async function getPipeline(id) {
  const result = await pool.query('SELECT * FROM pipelines WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    const err = new Error('Pipeline not found');
    err.status = 404;
    throw err;
  }
  return formatPipeline(result.rows[0]);
}

async function createPipeline(data) {
  const result = await pool.query(`
    INSERT INTO pipelines (name, description, config, steps)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [data.name, data.description || '', data.config || '', JSON.stringify(data.steps || [])]);
  
  return formatPipeline(result.rows[0]);
}

async function updatePipeline(id, data) {
  const result = await pool.query(`
    UPDATE pipelines SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      config = COALESCE($4, config),
      steps = COALESCE($5, steps)
    WHERE id = $1
    RETURNING *
  `, [id, data.name, data.description, data.config, data.steps ? JSON.stringify(data.steps) : null]);
  
  if (result.rows.length === 0) {
    const err = new Error('Pipeline not found');
    err.status = 404;
    throw err;
  }
  return formatPipeline(result.rows[0]);
}

async function deletePipeline(id) {
  await pool.query('DELETE FROM pipelines WHERE id = $1', [id]);
  return { success: true };
}

async function validatePipeline(data) {
  const errors = [];
  if (!data.config) {
    errors.push('Configuration is required');
  } else {
    if (!data.config.includes('id:')) errors.push("Pipeline must have an 'id' field");
    if (!data.config.includes('steps:')) errors.push("Pipeline must have a 'steps' section");
  }
  return { data: { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined } };
}

async function getRuns(params = {}) {
  let query = `
    SELECT r.*, p.name as pipeline_name
    FROM runs r
    JOIN pipelines p ON r.pipeline_id = p.id
    WHERE 1=1
  `;
  const values = [];
  let paramIndex = 1;
  
  if (params.pipelineId) {
    query += ` AND r.pipeline_id = $${paramIndex++}`;
    values.push(params.pipelineId);
  }
  if (params.status) {
    query += ` AND r.status = $${paramIndex++}`;
    values.push(params.status);
  }
  
  query += ' ORDER BY r.started_at DESC';
  
  if (params.limit) {
    query += ` LIMIT $${paramIndex++}`;
    values.push(parseInt(params.limit));
  }
  
  const result = await pool.query(query, values);
  
  // Get step reports for each run
  const runs = [];
  for (const row of result.rows) {
    const stepReports = await pool.query(
      'SELECT * FROM step_reports WHERE run_id = $1 ORDER BY started_at',
      [row.id]
    );
    runs.push(formatRun(row, stepReports.rows));
  }
  
  return runs;
}

async function getRun(id) {
  const result = await pool.query(`
    SELECT r.*, p.name as pipeline_name
    FROM runs r
    JOIN pipelines p ON r.pipeline_id = p.id
    WHERE r.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    const err = new Error('Run not found');
    err.status = 404;
    throw err;
  }
  
  const stepReports = await pool.query(
    'SELECT * FROM step_reports WHERE run_id = $1 ORDER BY started_at',
    [id]
  );
  
  const logs = await pool.query(
    'SELECT * FROM logs WHERE run_id = $1 ORDER BY timestamp LIMIT 1000',
    [id]
  );
  
  return formatRun(result.rows[0], stepReports.rows, logs.rows);
}

async function cancelRun(id) {
  await pool.query(`
    UPDATE runs SET status = 'cancelled', completed_at = NOW()
    WHERE id = $1 AND status = 'running'
  `, [id]);
  return { success: true };
}

async function getRunLogs(id, params = {}) {
  const offset = parseInt(params.offset) || 0;
  const limit = parseInt(params.limit) || 100;
  
  const result = await pool.query(`
    SELECT * FROM logs WHERE run_id = $1 
    ORDER BY timestamp 
    OFFSET $2 LIMIT $3
  `, [id, offset, limit]);
  
  const total = await pool.query('SELECT COUNT(*) FROM logs WHERE run_id = $1', [id]);
  
  return {
    data: result.rows.map(r => r.message),
    total: parseInt(total.rows[0].count),
    page: Math.floor(offset / limit),
    pageSize: limit,
    totalPages: Math.ceil(parseInt(total.rows[0].count) / limit)
  };
}

async function getDataPreview(runId, stepId) {
  const result = await pool.query(`
    SELECT * FROM data_previews WHERE run_id = $1 AND step_id = $2
  `, [runId, stepId]);
  
  if (result.rows.length === 0) {
    return { schema: [], rows: [], rowCount: 0 };
  }
  
  const row = result.rows[0];
  return {
    schema: row.schema,
    rows: row.sample_data,
    rowCount: parseInt(row.row_count)
  };
}

async function getConnections() {
  const result = await pool.query('SELECT * FROM connections ORDER BY created_at DESC');
  return result.rows.map(formatConnection);
}

async function getConnection(id) {
  const result = await pool.query('SELECT * FROM connections WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    const err = new Error('Connection not found');
    err.status = 404;
    throw err;
  }
  return formatConnection(result.rows[0]);
}

async function createConnection(data) {
  const result = await pool.query(`
    INSERT INTO connections (name, type, config)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [data.name, data.type, JSON.stringify(data.config || {})]);
  
  return formatConnection(result.rows[0]);
}

async function updateConnection(id, data) {
  const result = await pool.query(`
    UPDATE connections SET
      name = COALESCE($2, name),
      type = COALESCE($3, type),
      config = COALESCE($4, config)
    WHERE id = $1
    RETURNING *
  `, [id, data.name, data.type, data.config ? JSON.stringify(data.config) : null]);
  
  if (result.rows.length === 0) {
    const err = new Error('Connection not found');
    err.status = 404;
    throw err;
  }
  return formatConnection(result.rows[0]);
}

async function deleteConnection(id) {
  await pool.query('DELETE FROM connections WHERE id = $1', [id]);
  return { success: true };
}

async function testConnection(id) {
  // Simulate connection test
  const success = Math.random() > 0.2;
  
  await pool.query(`
    UPDATE connections SET last_tested_at = NOW(), last_test_success = $2
    WHERE id = $1
  `, [id, success]);
  
  return {
    data: {
      success,
      message: success ? 'Connection successful' : 'Connection failed: timeout'
    }
  };
}

async function getSchedules() {
  const result = await pool.query(`
    SELECT s.*, p.name as pipeline_name
    FROM schedules s
    JOIN pipelines p ON s.pipeline_id = p.id
    ORDER BY s.created_at DESC
  `);
  return result.rows.map(formatSchedule);
}

async function createSchedule(data) {
  const result = await pool.query(`
    INSERT INTO schedules (pipeline_id, cron_expression, timezone, enabled)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [data.pipelineId, data.cronExpression, data.timezone || 'UTC', data.enabled !== false]);
  
  const schedule = result.rows[0];
  
  // Get pipeline name
  const pipeline = await pool.query('SELECT name FROM pipelines WHERE id = $1', [data.pipelineId]);
  schedule.pipeline_name = pipeline.rows[0]?.name;
  
  // Register with scheduler
  if (schedule.enabled) {
    scheduleJob(schedule);
  }
  
  return formatSchedule(schedule);
}

async function updateSchedule(id, data) {
  const result = await pool.query(`
    UPDATE schedules SET
      cron_expression = COALESCE($2, cron_expression),
      timezone = COALESCE($3, timezone),
      enabled = COALESCE($4, enabled)
    WHERE id = $1
    RETURNING *
  `, [id, data.cronExpression, data.timezone, data.enabled]);
  
  if (result.rows.length === 0) {
    const err = new Error('Schedule not found');
    err.status = 404;
    throw err;
  }
  
  const schedule = result.rows[0];
  
  // Update scheduler
  if (schedule.enabled) {
    const pipeline = await pool.query('SELECT name FROM pipelines WHERE id = $1', [schedule.pipeline_id]);
    schedule.pipeline_name = pipeline.rows[0]?.name;
    scheduleJob(schedule);
  } else if (scheduledJobs.has(id)) {
    scheduledJobs.get(id).stop();
    scheduledJobs.delete(id);
  }
  
  return formatSchedule(schedule);
}

async function deleteSchedule(id) {
  if (scheduledJobs.has(id)) {
    scheduledJobs.get(id).stop();
    scheduledJobs.delete(id);
  }
  await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
  return { success: true };
}

// Formatters
function formatPipeline(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    config: row.config,
    steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps,
    schedule: row.schedule,
    scheduleEnabled: row.schedule_enabled,
    lastRunAt: row.last_run_at?.toISOString(),
    lastRunStatus: row.last_run_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function formatRun(row, stepReports = [], logs = []) {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    pipelineName: row.pipeline_name,
    status: row.status,
    startedAt: row.started_at.toISOString(),
    completedAt: row.completed_at?.toISOString(),
    duration: row.duration,
    stepsCompleted: row.steps_completed,
    stepsTotal: row.steps_total,
    error: row.error,
    triggeredBy: row.triggered_by,
    sparkAppId: row.spark_app_id,
    logs: logs.map(l => ({
      timestamp: l.timestamp.toISOString(),
      level: l.level,
      message: l.message,
      stepId: l.step_id
    })),
    stepReports: stepReports.map(s => ({
      stepId: s.step_id,
      status: s.status,
      startedAt: s.started_at?.toISOString(),
      completedAt: s.completed_at?.toISOString(),
      duration: s.duration,
      recordsProcessed: s.records_processed ? parseInt(s.records_processed) : undefined,
      error: s.error
    }))
  };
}

function formatConnection(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    lastTestedAt: row.last_tested_at?.toISOString(),
    lastTestSuccess: row.last_test_success,
    createdAt: row.created_at.toISOString()
  };
}

function formatSchedule(row) {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    pipelineName: row.pipeline_name,
    cronExpression: row.cron_expression,
    timezone: row.timezone,
    enabled: row.enabled,
    nextRunAt: row.next_run_at?.toISOString(),
    lastRunAt: row.last_run_at?.toISOString(),
    createdAt: row.created_at.toISOString()
  };
}

// Start server
const server = http.createServer(handleRequest);

server.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   SpooqW API Server v2.0.0                                     ║
║   HTTP:      http://localhost:${PORT}                            ║
║   WebSocket: ws://localhost:${WS_PORT}                            ║
║                                                                ║
║   Features:                                                    ║
║   - PostgreSQL persistence                                     ║
║   - WebSocket real-time logs                                   ║
║   - Cron scheduling                                            ║
║   - Data previews                                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  // Wait for database and initialize scheduler
  setTimeout(initializeScheduler, 2000);
});
