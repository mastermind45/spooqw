/**
 * SpooqW Mock API Server
 * 
 * A simple Express server that simulates the SpooqW backend API.
 * Use this for UI development and testing without running the full Scala/Spark backend.
 * 
 * Usage:
 *   node mock-server.js
 * 
 * The server runs on port 4242 by default (same as the real backend).
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 4242;

// In-memory data store
const store = {
  pipelines: [
    {
      id: 'pipeline-1',
      name: 'etl-customers',
      description: 'Customer data ETL pipeline from CSV to Parquet with transformations',
      config: `id: etl-customers
desc: Customer data ETL pipeline

steps:
  - id: raw_customers
    kind: input
    format: csv
    path: /data/customers.csv
    options:
      header: "true"
      inferSchema: "true"
    cache: true

  - id: active_customers
    kind: sql
    sql: |
      SELECT 
        customer_id,
        first_name,
        last_name,
        email,
        created_at
      FROM raw_customers 
      WHERE active = true
      AND email IS NOT NULL
    show: true

  - id: enriched
    kind: sql
    source: active_customers
    sql: |
      SELECT 
        *,
        UPPER(CONCAT(first_name, ' ', last_name)) as full_name,
        CURRENT_TIMESTAMP() as processed_at
      FROM active_customers

  - id: output_parquet
    kind: output
    source: enriched
    format: parquet
    mode: overwrite
    path: /output/customers.parquet`,
      steps: [
        { id: 'raw_customers', kind: 'input', format: 'csv', shortDesc: 'Load CSV data' },
        { id: 'active_customers', kind: 'sql', source: 'raw_customers', shortDesc: 'Filter active' },
        { id: 'enriched', kind: 'sql', source: 'active_customers', shortDesc: 'Add computed fields' },
        { id: 'output_parquet', kind: 'output', source: 'enriched', format: 'parquet', shortDesc: 'Write Parquet' },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z',
      lastRunAt: '2024-01-07T10:30:00Z',
      lastRunStatus: 'success',
    },
    {
      id: 'pipeline-2',
      name: 'sync-orders',
      description: 'Real-time order sync from Kafka to Delta Lake',
      config: `id: sync-orders
steps:
  - id: kafka-input
    kind: input-stream
    format: kafka
  - id: transform
    kind: sql
    sql: SELECT * FROM kafka_input
  - id: delta-output
    kind: output-stream
    format: delta`,
      steps: [
        { id: 'kafka-input', kind: 'input-stream', format: 'kafka' },
        { id: 'transform', kind: 'sql', source: 'kafka-input' },
        { id: 'delta-output', kind: 'output-stream', source: 'transform', format: 'delta' },
      ],
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-06T00:00:00Z',
      lastRunAt: '2024-01-07T09:15:00Z',
      lastRunStatus: 'running',
    },
    {
      id: 'pipeline-3',
      name: 'daily-report',
      description: 'Generate daily analytics report from JDBC source',
      config: `id: daily-report
steps:
  - id: input
    kind: input
    format: jdbc
  - id: agg
    kind: sql
    sql: SELECT date, COUNT(*) as total FROM input GROUP BY date
  - id: output
    kind: output
    format: json`,
      steps: [
        { id: 'input', kind: 'input', format: 'jdbc' },
        { id: 'agg', kind: 'sql', source: 'input' },
        { id: 'output', kind: 'output', source: 'agg', format: 'json' },
      ],
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
      lastRunAt: '2024-01-07T06:00:00Z',
      lastRunStatus: 'failed',
    },
  ],
  runs: [
    {
      id: 'run-001',
      pipelineId: 'pipeline-1',
      pipelineName: 'etl-customers',
      status: 'success',
      startedAt: '2024-01-07T10:30:00Z',
      completedAt: '2024-01-07T10:31:15Z',
      duration: 75,
      stepsCompleted: 4,
      stepsTotal: 4,
      logs: [
        { timestamp: '2024-01-07T10:30:00Z', level: 'INFO', message: 'Starting pipeline etl-customers' },
        { timestamp: '2024-01-07T10:30:05Z', level: 'INFO', message: 'Step raw_customers: Loading CSV', stepId: 'raw_customers' },
        { timestamp: '2024-01-07T10:30:15Z', level: 'INFO', message: 'Step raw_customers: Loaded 50,000 records', stepId: 'raw_customers' },
        { timestamp: '2024-01-07T10:30:30Z', level: 'INFO', message: 'Step active_customers: Filtered to 42,000 records', stepId: 'active_customers' },
        { timestamp: '2024-01-07T10:30:45Z', level: 'INFO', message: 'Step enriched: Added computed columns', stepId: 'enriched' },
        { timestamp: '2024-01-07T10:31:15Z', level: 'INFO', message: 'Step output_parquet: Written to /output/customers.parquet', stepId: 'output_parquet' },
        { timestamp: '2024-01-07T10:31:15Z', level: 'INFO', message: 'Pipeline completed successfully' },
      ],
      stepReports: [
        { stepId: 'raw_customers', status: 'success', startedAt: '2024-01-07T10:30:00Z', completedAt: '2024-01-07T10:30:15Z', duration: 15, recordsProcessed: 50000 },
        { stepId: 'active_customers', status: 'success', startedAt: '2024-01-07T10:30:15Z', completedAt: '2024-01-07T10:30:30Z', duration: 15, recordsProcessed: 42000 },
        { stepId: 'enriched', status: 'success', startedAt: '2024-01-07T10:30:30Z', completedAt: '2024-01-07T10:30:45Z', duration: 15, recordsProcessed: 42000 },
        { stepId: 'output_parquet', status: 'success', startedAt: '2024-01-07T10:30:45Z', completedAt: '2024-01-07T10:31:15Z', duration: 30, recordsProcessed: 42000 },
      ],
    },
    {
      id: 'run-002',
      pipelineId: 'pipeline-2',
      pipelineName: 'sync-orders',
      status: 'running',
      startedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      stepsCompleted: 1,
      stepsTotal: 3,
      logs: [
        { timestamp: new Date(Date.now() - 300000).toISOString(), level: 'INFO', message: 'Starting streaming pipeline sync-orders' },
        { timestamp: new Date(Date.now() - 290000).toISOString(), level: 'INFO', message: 'Connected to Kafka broker', stepId: 'kafka-input' },
        { timestamp: new Date(Date.now() - 280000).toISOString(), level: 'INFO', message: 'Processing micro-batch 1', stepId: 'transform' },
      ],
      stepReports: [
        { stepId: 'kafka-input', status: 'success', startedAt: new Date(Date.now() - 300000).toISOString(), completedAt: new Date(Date.now() - 290000).toISOString(), duration: 10 },
        { stepId: 'transform', status: 'running', startedAt: new Date(Date.now() - 290000).toISOString() },
        { stepId: 'delta-output', status: 'pending' },
      ],
    },
    {
      id: 'run-003',
      pipelineId: 'pipeline-3',
      pipelineName: 'daily-report',
      status: 'failed',
      startedAt: '2024-01-07T06:00:00Z',
      completedAt: '2024-01-07T06:02:30Z',
      duration: 150,
      stepsCompleted: 1,
      stepsTotal: 3,
      error: 'Connection timeout to database: jdbc:postgresql://prod-db:5432/analytics',
      logs: [
        { timestamp: '2024-01-07T06:00:00Z', level: 'INFO', message: 'Starting pipeline daily-report' },
        { timestamp: '2024-01-07T06:00:05Z', level: 'INFO', message: 'Connecting to JDBC source', stepId: 'input' },
        { timestamp: '2024-01-07T06:02:30Z', level: 'ERROR', message: 'Connection timeout to database', stepId: 'input' },
        { timestamp: '2024-01-07T06:02:30Z', level: 'ERROR', message: 'Pipeline failed' },
      ],
      stepReports: [
        { stepId: 'input', status: 'failed', startedAt: '2024-01-07T06:00:00Z', completedAt: '2024-01-07T06:02:30Z', duration: 150, error: 'Connection timeout' },
        { stepId: 'agg', status: 'pending' },
        { stepId: 'output', status: 'pending' },
      ],
    },
  ],
  connections: [
    {
      id: 'conn-1',
      name: 'Production PostgreSQL',
      type: 'jdbc',
      config: {
        url: 'jdbc:postgresql://prod-db:5432/analytics',
        driver: 'org.postgresql.Driver',
        user: 'analytics_user',
      },
      createdAt: '2024-01-01T00:00:00Z',
      lastTestedAt: '2024-01-07T10:00:00Z',
      lastTestSuccess: true,
    },
    {
      id: 'conn-2',
      name: 'Kafka Cluster',
      type: 'kafka',
      config: {
        'bootstrap.servers': 'kafka-1:9092,kafka-2:9092',
        'security.protocol': 'SASL_SSL',
      },
      createdAt: '2024-01-02T00:00:00Z',
      lastTestedAt: '2024-01-06T15:00:00Z',
      lastTestSuccess: true,
    },
    {
      id: 'conn-3',
      name: 'Data Lake S3',
      type: 's3',
      config: {
        bucket: 'company-data-lake',
        region: 'us-east-1',
      },
      createdAt: '2024-01-03T00:00:00Z',
      lastTestedAt: '2024-01-05T12:00:00Z',
      lastTestSuccess: false,
    },
  ],
};

// Helper functions
function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}`;
}

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

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function sendError(res, message, status = 400) {
  sendJson(res, { error: message }, status);
}

// Route handlers
const routes = {
  // Health check
  'GET /api/v2/health': (req, res) => {
    sendJson(res, { status: 'ok', version: '2.0.0-mock' });
  },

  // Dashboard stats
  'GET /api/v2/dashboard/stats': (req, res) => {
    const totalRuns = store.runs.length;
    const successRuns = store.runs.filter(r => r.status === 'success').length;
    const todayRuns = store.runs.filter(r => {
      const runDate = new Date(r.startedAt).toDateString();
      return runDate === new Date().toDateString();
    }).length;

    sendJson(res, {
      totalPipelines: store.pipelines.length,
      totalRuns: totalRuns,
      runsToday: todayRuns || store.runs.length, // fallback for demo
      successRate: totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0,
      activeRuns: store.runs.filter(r => r.status === 'running').length,
    });
  },

  // Pipelines
  'GET /api/v2/pipelines': (req, res) => {
    sendJson(res, store.pipelines);
  },

  'POST /api/v2/pipelines': async (req, res) => {
    const body = await parseBody(req);
    const pipeline = {
      id: generateId('pipeline'),
      name: body.name || 'new-pipeline',
      description: body.description || '',
      config: body.config || '',
      steps: body.steps || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.pipelines.push(pipeline);
    sendJson(res, pipeline, 201);
  },

  'GET /api/v2/pipelines/:id': (req, res, params) => {
    const pipeline = store.pipelines.find(p => p.id === params.id);
    if (!pipeline) return sendError(res, 'Pipeline not found', 404);
    sendJson(res, pipeline);
  },

  'PUT /api/v2/pipelines/:id': async (req, res, params) => {
    const index = store.pipelines.findIndex(p => p.id === params.id);
    if (index === -1) return sendError(res, 'Pipeline not found', 404);
    
    const body = await parseBody(req);
    store.pipelines[index] = {
      ...store.pipelines[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    sendJson(res, store.pipelines[index]);
  },

  'DELETE /api/v2/pipelines/:id': (req, res, params) => {
    const index = store.pipelines.findIndex(p => p.id === params.id);
    if (index === -1) return sendError(res, 'Pipeline not found', 404);
    store.pipelines.splice(index, 1);
    sendJson(res, { success: true });
  },

  'POST /api/v2/pipelines/:id/run': (req, res, params) => {
    const pipeline = store.pipelines.find(p => p.id === params.id);
    if (!pipeline) return sendError(res, 'Pipeline not found', 404);

    const run = {
      id: generateId('run'),
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      status: 'running',
      startedAt: new Date().toISOString(),
      stepsCompleted: 0,
      stepsTotal: pipeline.steps.length,
      logs: [
        { timestamp: new Date().toISOString(), level: 'INFO', message: `Starting pipeline ${pipeline.name}` },
      ],
      stepReports: pipeline.steps.map((step, i) => ({
        stepId: step.id,
        status: i === 0 ? 'running' : 'pending',
        ...(i === 0 ? { startedAt: new Date().toISOString() } : {}),
      })),
    };
    store.runs.unshift(run);

    // Update pipeline last run
    pipeline.lastRunAt = run.startedAt;
    pipeline.lastRunStatus = 'running';

    // Simulate run completion after some time
    setTimeout(() => {
      const runIndex = store.runs.findIndex(r => r.id === run.id);
      if (runIndex !== -1) {
        const success = Math.random() > 0.2; // 80% success rate
        store.runs[runIndex] = {
          ...store.runs[runIndex],
          status: success ? 'success' : 'failed',
          completedAt: new Date().toISOString(),
          duration: Math.floor(Math.random() * 60) + 30,
          stepsCompleted: success ? pipeline.steps.length : Math.floor(pipeline.steps.length / 2),
          ...(success ? {} : { error: 'Simulated failure for demo purposes' }),
          stepReports: pipeline.steps.map((step, i) => ({
            stepId: step.id,
            status: success || i < pipeline.steps.length / 2 ? 'success' : 'failed',
            startedAt: new Date(Date.now() - (pipeline.steps.length - i) * 10000).toISOString(),
            completedAt: new Date(Date.now() - (pipeline.steps.length - i - 1) * 10000).toISOString(),
            duration: Math.floor(Math.random() * 20) + 5,
            recordsProcessed: Math.floor(Math.random() * 50000) + 10000,
          })),
        };
        pipeline.lastRunStatus = success ? 'success' : 'failed';
      }
    }, 10000); // Complete after 10 seconds

    sendJson(res, run, 201);
  },

  'POST /api/v2/pipelines/validate': async (req, res) => {
    const body = await parseBody(req);
    const errors = [];
    
    if (!body.config) {
      errors.push('Configuration is required');
    } else {
      if (!body.config.includes('id:')) errors.push("Pipeline must have an 'id' field");
      if (!body.config.includes('steps:')) errors.push("Pipeline must have a 'steps' section");
    }

    sendJson(res, { data: { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined } });
  },

  // Runs
  'GET /api/v2/runs': (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let runs = [...store.runs];
    
    if (parsedUrl.query.pipelineId) {
      runs = runs.filter(r => r.pipelineId === parsedUrl.query.pipelineId);
    }
    if (parsedUrl.query.status) {
      runs = runs.filter(r => r.status === parsedUrl.query.status);
    }
    if (parsedUrl.query.limit) {
      runs = runs.slice(0, parseInt(parsedUrl.query.limit));
    }
    
    sendJson(res, runs);
  },

  'GET /api/v2/runs/:id': (req, res, params) => {
    const run = store.runs.find(r => r.id === params.id);
    if (!run) return sendError(res, 'Run not found', 404);
    sendJson(res, run);
  },

  'POST /api/v2/runs/:id/cancel': (req, res, params) => {
    const run = store.runs.find(r => r.id === params.id);
    if (!run) return sendError(res, 'Run not found', 404);
    
    run.status = 'cancelled';
    run.completedAt = new Date().toISOString();
    
    sendJson(res, { success: true });
  },

  'GET /api/v2/runs/:id/logs': (req, res, params) => {
    const run = store.runs.find(r => r.id === params.id);
    if (!run) return sendError(res, 'Run not found', 404);
    
    const parsedUrl = url.parse(req.url, true);
    const offset = parseInt(parsedUrl.query.offset) || 0;
    const limit = parseInt(parsedUrl.query.limit) || 100;
    
    const logs = (run.logs || []).slice(offset, offset + limit).map(l => l.message);
    
    sendJson(res, {
      data: logs,
      total: run.logs?.length || 0,
      page: Math.floor(offset / limit),
      pageSize: limit,
      totalPages: Math.ceil((run.logs?.length || 0) / limit),
    });
  },

  // Connections
  'GET /api/v2/connections': (req, res) => {
    sendJson(res, store.connections);
  },

  'POST /api/v2/connections': async (req, res) => {
    const body = await parseBody(req);
    const connection = {
      id: generateId('conn'),
      name: body.name || 'new-connection',
      type: body.type || 'jdbc',
      config: body.config || {},
      createdAt: new Date().toISOString(),
    };
    store.connections.push(connection);
    sendJson(res, connection, 201);
  },

  'GET /api/v2/connections/:id': (req, res, params) => {
    const connection = store.connections.find(c => c.id === params.id);
    if (!connection) return sendError(res, 'Connection not found', 404);
    sendJson(res, connection);
  },

  'PUT /api/v2/connections/:id': async (req, res, params) => {
    const index = store.connections.findIndex(c => c.id === params.id);
    if (index === -1) return sendError(res, 'Connection not found', 404);
    
    const body = await parseBody(req);
    store.connections[index] = {
      ...store.connections[index],
      ...body,
    };
    sendJson(res, store.connections[index]);
  },

  'DELETE /api/v2/connections/:id': (req, res, params) => {
    const index = store.connections.findIndex(c => c.id === params.id);
    if (index === -1) return sendError(res, 'Connection not found', 404);
    store.connections.splice(index, 1);
    sendJson(res, { success: true });
  },

  'POST /api/v2/connections/:id/test': (req, res, params) => {
    const connection = store.connections.find(c => c.id === params.id);
    if (!connection) return sendError(res, 'Connection not found', 404);
    
    // Simulate test (80% success rate)
    const success = Math.random() > 0.2;
    
    connection.lastTestedAt = new Date().toISOString();
    connection.lastTestSuccess = success;
    
    sendJson(res, {
      data: {
        success,
        message: success ? 'Connection successful' : 'Connection failed: timeout',
      },
    });
  },
};

// Router
function matchRoute(method, pathname) {
  const key = `${method} ${pathname}`;
  
  // Exact match
  if (routes[key]) {
    return { handler: routes[key], params: {} };
  }
  
  // Pattern match
  for (const [pattern, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = pattern.split(' ');
    if (routeMethod !== method) continue;
    
    const routeParts = routePath.split('/');
    const pathParts = pathname.split('/');
    
    if (routeParts.length !== pathParts.length) continue;
    
    const params = {};
    let match = true;
    
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }
    
    if (match) {
      return { handler, params };
    }
  }
  
  return null;
}

// Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }
  
  console.log(`${req.method} ${pathname}`);
  
  const route = matchRoute(req.method, pathname);
  
  if (route) {
    try {
      await route.handler(req, res, route.params);
    } catch (error) {
      console.error('Error:', error);
      sendError(res, 'Internal server error', 500);
    }
  } else {
    sendError(res, 'Not found', 404);
  }
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   SpooqW Mock API Server                                      ║
║   Running on http://localhost:${PORT}                           ║
║                                                               ║
║   Available endpoints:                                        ║
║   - GET  /api/v2/health                                       ║
║   - GET  /api/v2/dashboard/stats                              ║
║   - GET  /api/v2/pipelines                                    ║
║   - POST /api/v2/pipelines                                    ║
║   - GET  /api/v2/pipelines/:id                                ║
║   - PUT  /api/v2/pipelines/:id                                ║
║   - DELETE /api/v2/pipelines/:id                              ║
║   - POST /api/v2/pipelines/:id/run                            ║
║   - POST /api/v2/pipelines/validate                           ║
║   - GET  /api/v2/runs                                         ║
║   - GET  /api/v2/runs/:id                                     ║
║   - POST /api/v2/runs/:id/cancel                              ║
║   - GET  /api/v2/runs/:id/logs                                ║
║   - GET  /api/v2/connections                                  ║
║   - POST /api/v2/connections                                  ║
║   - GET  /api/v2/connections/:id                              ║
║   - PUT  /api/v2/connections/:id                              ║
║   - DELETE /api/v2/connections/:id                            ║
║   - POST /api/v2/connections/:id/test                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
