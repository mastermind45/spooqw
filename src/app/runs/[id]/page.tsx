"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  StopCircle,
  RefreshCw,
  Terminal,
  GitBranch,
  Timer,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DAGViewer } from "@/components/pipelines/dag-viewer";
import { StepDataPreview } from "@/components/pipelines/data-preview";
import { api, createLogsWebSocket } from "@/lib/api";
import type { Run, RunStatus, LogEntry, Pipeline } from "@/types";

const statusConfig: Record<
  RunStatus,
  { icon: typeof CheckCircle; color: string; bgColor: string; label: string }
> = {
  success: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Success",
  },
  failed: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Failed",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Running",
  },
  pending: {
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Pending",
  },
  cancelled: {
    icon: StopCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    label: "Cancelled",
  },
};

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch run data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const runData = await api.getRun(runId);
        setRun(runData);
        setLogs(runData.logs || []);

        // Fetch pipeline for steps
        if (runData.pipelineId) {
          try {
            const pipelineData = await api.getPipeline(runData.pipelineId);
            setPipeline(pipelineData);
          } catch {
            // Pipeline might not exist anymore
          }
        }
      } catch (err) {
        console.error("Failed to fetch run:", err);
        setError(err instanceof Error ? err.message : "Failed to load run");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [runId]);

  // Poll for updates if running
  useEffect(() => {
    if (!run || run.status !== "running") return;

    const interval = setInterval(async () => {
      try {
        const updatedRun = await api.getRun(runId);
        setRun(updatedRun);
        
        // Fetch new logs
        const logsResponse = await api.getRunLogs(runId, { offset: logs.length });
        if (logsResponse.data && logsResponse.data.length > 0) {
          const newLogs: LogEntry[] = logsResponse.data.map((msg: string) => ({
            timestamp: new Date().toISOString(),
            level: "INFO" as const,
            message: msg,
          }));
          setLogs(prev => [...prev, ...newLogs]);
        }
      } catch (err) {
        console.error("Failed to poll run:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [run?.status, runId, logs.length]);

  // WebSocket for real-time logs
  useEffect(() => {
    if (!run || run.status !== "running") return;

    try {
      wsRef.current = createLogsWebSocket(runId, (message) => {
        const newLog: LogEntry = {
          timestamp: new Date().toISOString(),
          level: "INFO",
          message,
        };
        setLogs(prev => [...prev, newLog]);
      });

      return () => {
        wsRef.current?.close();
      };
    } catch {
      // WebSocket not available, rely on polling
    }
  }, [run?.status, runId]);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleCancel = async () => {
    if (!run) return;
    try {
      setCancelling(true);
      await api.cancelRun(run.id);
      setRun(prev => prev ? { ...prev, status: "cancelled" } : null);
    } catch (err) {
      console.error("Failed to cancel run:", err);
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async () => {
    if (!run) return;
    try {
      const newRun = await api.runPipeline(run.pipelineId);
      router.push(`/runs/${newRun.id}`);
    } catch (err) {
      console.error("Failed to retry run:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/runs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Run Not Found</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error || "Run not found"}
          </p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/runs">Back to Runs</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Build step statuses for DAG
  const stepStatuses = run.stepReports.reduce((acc, report) => {
    acc[report.stepId] = report.status as RunStatus;
    return acc;
  }, {} as Record<string, RunStatus>);

  const steps = pipeline?.steps || [];
  const status = statusConfig[run.status];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/runs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Run {run.id}</h1>
              <Badge
                variant={
                  run.status === "success"
                    ? "default"
                    : run.status === "failed"
                    ? "destructive"
                    : "secondary"
                }
                className="gap-1"
              >
                <StatusIcon
                  className={`h-3 w-3 ${
                    run.status === "running" ? "animate-spin" : ""
                  }`}
                />
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <Link
                href={`/pipelines/${run.pipelineId}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <GitBranch className="h-4 w-4" />
                {run.pipelineName}
              </Link>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Started {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
              </span>
              {run.duration && (
                <span className="flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {run.duration}s
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {run.status === "running" && (
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <StopCircle className="mr-2 h-4 w-4" />
              )}
              Cancel
            </Button>
          )}
          {(run.status === "failed" || run.status === "cancelled") && (
            <Button onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {run.error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{run.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Progress</CardTitle>
            <span className="text-sm text-muted-foreground">
              {run.stepsCompleted}/{run.stepsTotal} steps completed
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                run.status === "success"
                  ? "bg-green-500"
                  : run.status === "failed"
                  ? "bg-red-500"
                  : run.status === "running"
                  ? "bg-blue-500 animate-pulse"
                  : "bg-gray-400"
              }`}
              style={{
                width: `${(run.stepsCompleted / run.stepsTotal) * 100}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs" className="gap-2">
            <Terminal className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="dag" className="gap-2">
            <GitBranch className="h-4 w-4" />
            DAG
          </TabsTrigger>
          <TabsTrigger value="steps" className="gap-2">
            <Layers className="h-4 w-4" />
            Steps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Execution Logs</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={autoScroll ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoScroll(!autoScroll)}
                  >
                    {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] rounded-md border bg-black/90 p-4 font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No logs available yet...
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 py-0.5 ${
                        log.level === "ERROR"
                          ? "text-red-400"
                          : log.level === "WARN"
                          ? "text-yellow-400"
                          : log.level === "DEBUG"
                          ? "text-gray-500"
                          : "text-gray-300"
                      }`}
                    >
                      <span className="text-gray-500 shrink-0">
                        {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                      </span>
                      <span
                        className={`shrink-0 w-14 ${
                          log.level === "ERROR"
                            ? "text-red-500"
                            : log.level === "WARN"
                            ? "text-yellow-500"
                            : log.level === "DEBUG"
                            ? "text-gray-600"
                            : "text-blue-400"
                        }`}
                      >
                        [{log.level}]
                      </span>
                      {log.stepId && (
                        <span className="text-purple-400 shrink-0">
                          [{log.stepId}]
                        </span>
                      )}
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dag">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline DAG</CardTitle>
              <CardDescription>
                Real-time status of pipeline steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              {steps.length > 0 ? (
                <DAGViewer steps={steps} stepStatuses={stepStatuses} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Pipeline steps not available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps">
          <Card>
            <CardHeader>
              <CardTitle>Step Details</CardTitle>
              <CardDescription>
                Detailed status of each pipeline step
              </CardDescription>
            </CardHeader>
            <CardContent>
              {run.stepReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No step reports available yet
                </div>
              ) : (
                <div className="space-y-3">
                  {run.stepReports.map((report, index) => {
                    const stepStatus = statusConfig[report.status as RunStatus] || statusConfig.pending;
                    const StepIcon = stepStatus.icon;

                    return (
                      <div
                        key={report.stepId}
                        className="p-4 rounded-lg border"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className={`p-2 rounded-full ${stepStatus.bgColor}`}>
                              <StepIcon
                                className={`h-4 w-4 ${stepStatus.color} ${
                                  report.status === "running" ? "animate-spin" : ""
                                }`}
                              />
                            </div>
                            <div>
                              <div className="font-medium">{report.stepId}</div>
                              {report.startedAt && (
                                <div className="text-sm text-muted-foreground">
                                  Started {format(new Date(report.startedAt), "HH:mm:ss")}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            {report.recordsProcessed !== undefined && (
                              <div className="text-right">
                                <div className="font-medium">
                                  {report.recordsProcessed.toLocaleString()}
                                </div>
                                <div className="text-muted-foreground">records</div>
                              </div>
                            )}
                            {report.duration !== undefined && (
                              <div className="text-right">
                                <div className="font-medium">{report.duration}s</div>
                                <div className="text-muted-foreground">duration</div>
                              </div>
                            )}
                            <Badge variant={
                              report.status === "success" ? "default" :
                              report.status === "failed" ? "destructive" :
                              "secondary"
                            }>
                              {stepStatus.label}
                            </Badge>
                          </div>
                        </div>
                        {/* Data Preview for completed steps */}
                        {report.status === "success" && (
                          <div className="mt-4 ml-12">
                            <StepDataPreview runId={runId} stepId={report.stepId} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
