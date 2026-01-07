"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MoreVertical,
  StopCircle,
  RefreshCw,
  Eye,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Run, RunStatus } from "@/types";

const statusConfig: Record<
  RunStatus,
  { icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  success: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10" },
  failed: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
  running: { icon: Loader2, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  pending: { icon: Clock, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  cancelled: { icon: StopCircle, color: "text-gray-500", bgColor: "bg-gray-500/10" },
};

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchRuns();
    
    // Refresh every 10 seconds for running pipelines
    const interval = setInterval(fetchRuns, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  async function fetchRuns() {
    try {
      setError(null);
      const params: { status?: string } = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const data = await api.getRuns(params);
      setRuns(data);
    } catch (err) {
      console.error("Failed to fetch runs:", err);
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = async (runId: string) => {
    try {
      await api.cancelRun(runId);
      fetchRuns();
    } catch (err) {
      console.error("Failed to cancel run:", err);
    }
  };

  const handleRetry = async (run: Run) => {
    try {
      await api.runPipeline(run.pipelineId);
      fetchRuns();
    } catch (err) {
      console.error("Failed to retry run:", err);
    }
  };

  const filteredRuns = runs.filter((run) => {
    const matchesSearch = run.pipelineName
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch;
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
          <p className="text-muted-foreground">
            Monitor and manage pipeline executions.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to connect to API: {error}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchRuns}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
        <p className="text-muted-foreground">
          Monitor and manage pipeline executions.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by pipeline name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <Badge variant="secondary">{filteredRuns.length} runs</Badge>
      </div>

      {filteredRuns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No runs yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Run a pipeline to see execution history here.
            </p>
            <Button asChild>
              <Link href="/pipelines">Go to Pipelines</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.map((run) => {
                const status = statusConfig[run.status];
                const StatusIcon = status.icon;

                return (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${status.bgColor}`}>
                          <StatusIcon
                            className={`h-4 w-4 ${status.color} ${
                              run.status === "running" ? "animate-spin" : ""
                            }`}
                          />
                        </div>
                        <Badge
                          variant={
                            run.status === "success"
                              ? "default"
                              : run.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {run.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/pipelines/${run.pipelineId}`}
                        className="font-medium hover:underline"
                      >
                        {run.pipelineName}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        Run {run.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {format(new Date(run.startedAt), "MMM d, HH:mm")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(run.startedAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.duration ? (
                        <span>{run.duration}s</span>
                      ) : run.status === "running" ? (
                        <span className="text-muted-foreground">In progress...</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className={`h-full ${
                              run.status === "success"
                                ? "bg-green-500"
                                : run.status === "failed"
                                ? "bg-red-500"
                                : run.status === "running"
                                ? "bg-blue-500"
                                : "bg-gray-400"
                            }`}
                            style={{
                              width: `${(run.stepsCompleted / run.stepsTotal) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {run.stepsCompleted}/{run.stepsTotal}
                        </span>
                      </div>
                      {run.error && (
                        <div className="text-xs text-red-500 mt-1 truncate max-w-[200px]">
                          {run.error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/runs/${run.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {run.status === "running" && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleCancel(run.id)}
                            >
                              <StopCircle className="mr-2 h-4 w-4" />
                              Cancel Run
                            </DropdownMenuItem>
                          )}
                          {(run.status === "failed" || run.status === "cancelled") && (
                            <DropdownMenuItem onClick={() => handleRetry(run)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Retry
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
