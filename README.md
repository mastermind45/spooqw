# SpooqW

A modern web interface for [Spooq](https://github.com/supermariolabs/spooq) - the ETL Big Data tool powered by Apache Spark.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-Apache%202.0-green)

## Features

- **Dashboard** - Overview of pipelines, runs, and system stats
- **Pipeline Editor** - Monaco-based YAML editor with syntax highlighting
- **Visual DAG Editor** - Drag-and-drop pipeline builder with React Flow
- **DAG Visualizer** - Interactive pipeline visualization
- **Run Monitoring** - Real-time logs and step progress tracking
- **Data Preview** - View step output data with export to CSV
- **Connection Manager** - Configure and test data source connections
- **Scheduling** - Cron-based pipeline scheduling with timezone support
- **Dark/Light Theme** - System-aware theme switching

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS 4
- **State**: Zustand + TanStack Query
- **DAG Visualization**: React Flow (@xyflow/react)
- **Code Editor**: Monaco Editor
- **Notifications**: Sonner

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for full stack)

### Development with Mock Server

The mock server simulates the SpooqW backend API - perfect for UI development without Spark.

```bash
# Install dependencies
npm install

# Terminal 1: Start mock API server (port 4242)
node mock-server.js

# Terminal 2: Start Next.js dev server (port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker Compose (Full Stack)

```bash
# Start all services (PostgreSQL, API, Web, Spark)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services:
- **Web UI**: http://localhost:3000
- **API Server**: http://localhost:4242
- **WebSocket**: ws://localhost:4243
- **Spark Master UI**: http://localhost:8080

## Project Structure

```
spooqw/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard
│   │   ├── pipelines/          # Pipeline CRUD + Editor
│   │   ├── runs/               # Run monitoring
│   │   ├── connections/        # Data source connections
│   │   └── settings/           # Configuration
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Sidebar, Header
│   │   ├── dashboard/          # Stats, Recent runs
│   │   ├── pipelines/          # DAG viewer/editor, Config editor
│   │   └── error-boundary.tsx  # Error handling
│   ├── lib/
│   │   ├── api.ts              # API client with WebSocket
│   │   ├── yaml-utils.ts       # YAML parsing/generation
│   │   └── utils.ts            # Utilities
│   └── types/
│       └── index.ts            # TypeScript definitions
├── api-server/
│   ├── server.js               # Express API server with PostgreSQL
│   └── package.json
├── docker/
│   ├── Dockerfile.api          # API server container
│   ├── init.sql                # PostgreSQL schema
│   └── spark-defaults.conf     # Spark configuration
├── __tests__/                  # Unit and integration tests
├── e2e/                        # Playwright E2E tests
├── docker-compose.yml
└── mock-server.js              # Standalone mock server
```

## API Endpoints

### Pipelines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/pipelines` | List all pipelines |
| POST | `/api/v2/pipelines` | Create pipeline |
| GET | `/api/v2/pipelines/:id` | Get pipeline details |
| PUT | `/api/v2/pipelines/:id` | Update pipeline |
| DELETE | `/api/v2/pipelines/:id` | Delete pipeline |
| POST | `/api/v2/pipelines/:id/run` | Execute pipeline |
| POST | `/api/v2/pipelines/validate` | Validate config |

### Runs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/runs` | List runs (with filters) |
| GET | `/api/v2/runs/:id` | Get run details |
| POST | `/api/v2/runs/:id/cancel` | Cancel run |
| GET | `/api/v2/runs/:id/logs` | Get run logs |
| GET | `/api/v2/runs/:id/preview/:stepId` | Get step data preview |

### Connections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/connections` | List connections |
| POST | `/api/v2/connections` | Create connection |
| PUT | `/api/v2/connections/:id` | Update connection |
| DELETE | `/api/v2/connections/:id` | Delete connection |
| POST | `/api/v2/connections/:id/test` | Test connection |

### Schedules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/schedules` | List schedules |
| POST | `/api/v2/schedules` | Create schedule |
| PUT | `/api/v2/schedules/:id` | Update schedule |
| DELETE | `/api/v2/schedules/:id` | Delete schedule |

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4242/api/v2
NEXT_PUBLIC_WS_URL=ws://localhost:4243

# For API server
DATABASE_URL=postgresql://spooq:spooq@localhost:5432/spooqw
SPARK_MASTER_URL=spark://localhost:7077
```

## Pipeline Configuration

SpooqW uses YAML for pipeline configuration, fully compatible with Spooq:

```yaml
id: my-pipeline
desc: Example ETL pipeline

steps:
  - id: input_data
    kind: input
    format: csv
    path: /data/input.csv
    cache: true

  - id: transform
    kind: sql
    sql: |
      SELECT 
        id,
        name,
        amount * 1.1 as adjusted_amount
      FROM input_data
      WHERE status = 'active'

  - id: output_data
    kind: output
    source: transform
    format: parquet
    mode: overwrite
    path: /output/result.parquet
```

### Supported Step Kinds

| Kind | Description |
|------|-------------|
| `input` | Read data from files (CSV, JSON, Parquet, Delta, etc.) |
| `input-stream` | Streaming input (Kafka, etc.) |
| `sql` | SQL transformation |
| `script` | Custom Scala/Python script |
| `variable` | Define variables |
| `custom` | Custom transformer class |
| `customInput` | Custom input class |
| `udf` | User-defined functions |
| `output` | Write data to files |
| `output-stream` | Streaming output |
| `parse-json` | Parse JSON strings |

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
npm run test      # Run unit tests
npm run test:e2e  # Run E2E tests
```

## Docker

```bash
# Build and run standalone
docker build -t spooqw .
docker run -p 3000:3000 spooqw

# Or use docker-compose for full stack
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Related

- [Spooq](https://github.com/supermariolabs/spooq) - ETL Big Data tool powered by Apache Spark
- [Apache Spark](https://spark.apache.org/) - Distributed computing engine

## License

Apache 2.0
