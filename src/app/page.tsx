"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { PipelinesOverview } from "@/components/dashboard/pipelines-overview";
import { api } from "@/lib/api";
import type { Pipeline, Run, DashboardStats } from "@/types";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const [statsData, pipelinesData, runsData] = await Promise.all([
          api.getDashboardStats(),
          api.getPipelines(),
          api.getRuns({ limit: 10 }),
        ]);
        
        setStats(statsData);
        setPipelines(pipelinesData);
        setRuns(runsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunPipeline = async (id: string) => {
    try {
      await api.runPipeline(id);
      // Refresh data after starting a run
      const [runsData, pipelinesData] = await Promise.all([
        api.getRuns({ limit: 10 }),
        api.getPipelines(),
      ]);
      setRuns(runsData);
      setPipelines(pipelinesData);
    } catch (err) {
      console.error("Failed to run pipeline:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your ETL pipelines and recent activity.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to connect to API: {error}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Make sure the SpooqW backend is running on {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4242'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your ETL pipelines and recent activity.
        </p>
      </div>

      {stats && <StatsCards stats={stats} />}

      <div className="grid gap-6 md:grid-cols-3">
        <RecentRuns runs={runs} />
        <PipelinesOverview pipelines={pipelines} onRun={handleRunPipeline} />
      </div>
    </div>
  );
}
