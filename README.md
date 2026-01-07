# SpooqW

A modern web interface for [Spooq](https://github.com/supermariolabs/spooq) - the ETL Big Data tool powered by Apache Spark.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-Apache%202.0-green)

## Features

- **Dashboard** - Overview of pipelines, runs, and system stats
- **Pipeline Editor** - Monaco-based YAML editor with syntax highlighting
- **DAG Visualizer** - Interactive pipeline visualization with React Flow
- **Run Monitoring** - Real-time logs and step progress tracking
- **Connection Manager** - Configure and test data source connections
- **Dark/Light Theme** - System-aware theme switching

## Screenshots

### Dashboard
Overview with stats, recent runs, and pipeline status.

### Pipeline Editor
Monaco YAML editor with live DAG preview.

### Run Monitoring
Real-time logs and step progress visualization.

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

### With Real Backend

```bash
# Ensure SpooqW Core is running on port 4242
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── pipelines/         # Pipeline CRUD + Editor
│   ├── runs/              # Run monitoring
│   ├── connections/       # Data source connections
│   └── settings/          # Configuration
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Sidebar, Header
│   ├── dashboard/         # Stats, Recent runs
│   └── pipelines/         # DAG viewer, Config editor
├── lib/
│   ├── api.ts             # API client
│   └── utils.ts           # Utilities
└── types/
    └── index.ts           # TypeScript definitions
```

## API Endpoints

SpooqW expects these endpoints from the backend:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/dashboard/stats` | Dashboard statistics |
| GET | `/api/v2/pipelines` | List pipelines |
| POST | `/api/v2/pipelines` | Create pipeline |
| GET | `/api/v2/pipelines/:id` | Get pipeline |
| PUT | `/api/v2/pipelines/:id` | Update pipeline |
| DELETE | `/api/v2/pipelines/:id` | Delete pipeline |
| POST | `/api/v2/pipelines/:id/run` | Execute pipeline |
| GET | `/api/v2/runs` | List runs |
| GET | `/api/v2/runs/:id` | Get run details |
| POST | `/api/v2/runs/:id/cancel` | Cancel run |
| GET | `/api/v2/runs/:id/logs` | Get run logs |
| GET | `/api/v2/connections` | List connections |
| POST | `/api/v2/connections` | Create connection |
| POST | `/api/v2/connections/:id/test` | Test connection |

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4242/api/v2
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Docker

```bash
docker build -t spooqw .
docker run -p 3000:3000 spooqw
```

## Related

- [Spooq](https://github.com/supermariolabs/spooq) - ETL Big Data tool powered by Apache Spark

## License

Apache 2.0
