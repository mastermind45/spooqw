"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Play,
  Edit,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  FileCode,
  GitBranch,
  Loader2,
  Calendar,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DAGViewer } from "@/components/pipelines/dag-viewer";
import { ScheduleManager } from "@/components/pipelines/schedule-manager";
import { api } from "@/lib/api";
import type { Pipeline, Run } from "@/types";

export default function PipelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pipelineId = params.id as string;

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [pipelineData, runsData] = await Promise.all([
          api.getPipeline(pipelineId),
          api.getRuns({ pipelineId }),
        ]);

        setPipeline(pipelineData);
        setRuns(runsData);
      } catch (err) {
        console.error("Failed to fetch pipeline:", err);
        setError(err instanceof Error ? err.message : "Failed to load pipeline");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [pipelineId]);

  const handleRun = async () => {
    if (!pipeline) return;
    try {
      setRunning(true);
      const run = await api.runPipeline(pipeline.id);
      router.push(`/runs/${run.id}`);
    } catch (err) {
      console.error("Failed to run pipeline:", err);
    } finally {
      setRunning(false);
    }
  };

  const handleDuplicate = async () => {
    if (!pipeline) return;
    try {
      const newPipeline = await api.createPipeline({
        name: `${pipeline.name}-copy`,
        description: pipeline.description,
        config: pipeline.config,
        steps: pipeline.steps,
      });
      router.push(`/pipelines/${newPipeline.id}/edit`);
    } catch (err) {
      console.error("Failed to duplicate pipeline:", err);
    }
  };

  const handleExport = () => {
    if (!pipeline) return;
    const blob = new Blob([pipeline.config], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pipeline.name}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!pipeline) return;
    try {
      setDeleting(true);
      await api.deletePipeline(pipeline.id);
      router.push("/pipelines");
    } catch (err) {
      console.error("Failed to delete pipeline:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !pipeline) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pipelines">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Pipeline Not Found</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error || "Pipeline not found"}
          </p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/pipelines">Back to Pipelines</Link>
          </Button>
        </div>
      </div>
    );
  }

  const avgDuration = runs.length > 0
    ? Math.round(runs.reduce((sum, r) => sum + (r.duration || 0), 0) / runs.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pipelines">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{pipeline.name}</h1>
              {pipeline.lastRunStatus && (
                <Badge
                  variant={
                    pipeline.lastRunStatus === "success"
                      ? "default"
                      : pipeline.lastRunStatus === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                  className="gap-1"
                >
                  {pipeline.lastRunStatus === "success" && <CheckCircle className="h-3 w-3" />}
                  {pipeline.lastRunStatus === "failed" && <XCircle className="h-3 w-3" />}
                  {pipeline.lastRunStatus}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              {pipeline.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRun} disabled={running}>
            {running ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Pipeline
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/pipelines/${pipeline.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <FileCode className="mr-2 h-4 w-4" />
                Export Config
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Steps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.steps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Runs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Run</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pipeline.lastRunAt
                ? formatDistanceToNow(new Date(pipeline.lastRunAt), { addSuffix: true })
                : "Never"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgDuration > 0 ? `${avgDuration}s` : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="dag" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dag" className="gap-2">
            <GitBranch className="h-4 w-4" />
            DAG View
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <FileCode className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="runs" className="gap-2">
            <Clock className="h-4 w-4" />
            Run History
          </TabsTrigger>
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dag" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline DAG</CardTitle>
              <CardDescription>
                Visual representation of your pipeline steps and data flow.
                Click on a step to see details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DAGViewer
                steps={pipeline.steps}
                onStepClick={(stepId) => setSelectedStep(stepId)}
              />
            </CardContent>
          </Card>

          {selectedStep && (
            <Card>
              <CardHeader>
                <CardTitle>Step: {selectedStep}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                  {JSON.stringify(
                    pipeline.steps.find((s) => s.id === selectedStep),
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Configuration</CardTitle>
              <CardDescription>
                YAML configuration for this pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[600px] font-mono">
                {pipeline.config || "No configuration"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader>
              <CardTitle>Run History</CardTitle>
              <CardDescription>
                Past executions of this pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No runs yet. Click &quot;Run Pipeline&quot; to execute this pipeline.
                </div>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <Link
                      key={run.id}
                      href={`/runs/${run.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {run.status === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : run.status === "failed" ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium">Run {run.id}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm">
                            {run.stepsCompleted}/{run.stepsTotal} steps
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {run.duration ? `${run.duration}s` : "-"}
                          </div>
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
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <ScheduleManager pipelineId={pipeline.id} pipelineName={pipeline.name} />
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pipeline</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{pipeline.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
