"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Play,
  Check,
  AlertCircle,
  Code,
  GitBranch,
  Eye,
  Loader2,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfigEditor } from "@/components/pipelines/config-editor";
import { DAGViewer } from "@/components/pipelines/dag-viewer";
import { DAGEditor } from "@/components/pipelines/dag-editor";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Step } from "@/types";

const DEFAULT_CONFIG = `id: new-pipeline
desc: Pipeline description

steps:
  - id: input_step
    kind: input
    format: csv
    path: /data/file.csv
    cache: true

  - id: transform_step
    kind: sql
    sql: |
      SELECT * FROM input_step

  - id: output_step
    kind: output
    source: transform_step
    format: parquet
    mode: overwrite
    path: /output/result.parquet`;

// Simple YAML parser for steps (in real app, use a proper YAML library)
function parseYamlSteps(yaml: string): Step[] {
  const steps: Step[] = [];
  const stepsMatch = yaml.match(/steps:\s*\n([\s\S]*?)(?=\n\w|$)/);
  
  if (!stepsMatch) return steps;
  
  const stepsContent = stepsMatch[1];
  const stepBlocks = stepsContent.split(/\n  - /).filter(Boolean);
  
  stepBlocks.forEach((block) => {
    const idMatch = block.match(/id:\s*(\w+)/);
    const kindMatch = block.match(/kind:\s*([\w-]+)/);
    const formatMatch = block.match(/format:\s*(\w+)/);
    const sourceMatch = block.match(/source:\s*(\w+)/);
    const pathMatch = block.match(/path:\s*(.+)/);
    
    if (idMatch && kindMatch) {
      steps.push({
        id: idMatch[1],
        kind: kindMatch[1] as Step["kind"],
        format: formatMatch?.[1],
        source: sourceMatch?.[1],
        path: pathMatch?.[1]?.trim(),
      });
    }
  });
  
  return steps;
}

export default function EditPipelinePage() {
  const params = useParams();
  const router = useRouter();
  const pipelineId = params.id as string;
  const isNew = pipelineId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [steps, setSteps] = useState<Step[]>([]);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [running, setRunning] = useState(false);

  // Fetch pipeline if editing
  useEffect(() => {
    if (isNew) {
      setSteps(parseYamlSteps(DEFAULT_CONFIG));
      return;
    }

    async function fetchPipeline() {
      try {
        setLoading(true);
        setError(null);
        const pipeline = await api.getPipeline(pipelineId);
        setName(pipeline.name);
        setDescription(pipeline.description || "");
        setConfig(pipeline.config || DEFAULT_CONFIG);
        setSteps(pipeline.steps);
      } catch (err) {
        console.error("Failed to fetch pipeline:", err);
        setError(err instanceof Error ? err.message : "Failed to load pipeline");
      } finally {
        setLoading(false);
      }
    }

    fetchPipeline();
  }, [pipelineId, isNew]);

  // Parse steps when config changes
  useEffect(() => {
    const parsedSteps = parseYamlSteps(config);
    setSteps(parsedSteps);
  }, [config]);

  const handleValidate = async () => {
    setValidating(true);
    
    try {
      const result = await api.validatePipeline(config);
      setValidationResult(result.data || { valid: true });
      
      if (result.data?.valid) {
        toast.success("Configuration is valid!");
      } else {
        toast.error("Configuration has errors");
      }
    } catch {
      // Fallback to local validation
      const errors: string[] = [];
      
      if (!config.includes("id:")) {
        errors.push("Pipeline must have an 'id' field");
      }
      if (!config.includes("steps:")) {
        errors.push("Pipeline must have a 'steps' section");
      }
      if (steps.length === 0) {
        errors.push("Pipeline must have at least one step");
      }
      
      const validKinds = [
        "input", "input-stream", "sql", "variable", "script",
        "custom", "customInput", "avro-serde", "udf", "output", "output-stream", "parse-json"
      ];
      steps.forEach((step) => {
        if (!validKinds.includes(step.kind)) {
          errors.push(`Invalid step kind '${step.kind}' in step '${step.id}'`);
        }
      });

      setValidationResult({
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      });

      if (errors.length === 0) {
        toast.success("Configuration is valid!");
      } else {
        toast.error("Configuration has errors");
      }
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Pipeline name is required");
      return;
    }

    setSaving(true);
    
    try {
      if (isNew) {
        const newPipeline = await api.createPipeline({
          name,
          description,
          config,
          steps,
        });
        toast.success("Pipeline created!");
        router.push(`/pipelines/${newPipeline.id}`);
      } else {
        await api.updatePipeline(pipelineId, {
          name,
          description,
          config,
          steps,
        });
        toast.success("Pipeline saved!");
      }
    } catch (err) {
      console.error("Failed to save pipeline:", err);
      toast.error("Failed to save pipeline");
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (isNew) return;
    
    setRunning(true);
    try {
      const run = await api.runPipeline(pipelineId);
      toast.success("Pipeline started!");
      router.push(`/runs/${run.id}`);
    } catch (err) {
      console.error("Failed to run pipeline:", err);
      toast.error("Failed to run pipeline");
    } finally {
      setRunning(false);
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pipelines">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Pipeline Not Found</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/pipelines">Back to Pipelines</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={isNew ? "/pipelines" : `/pipelines/${pipelineId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "Create Pipeline" : "Edit Pipeline"}
            </h1>
            <p className="text-muted-foreground">
              {isNew
                ? "Configure your new ETL pipeline"
                : `Editing ${name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleValidate} disabled={validating}>
            {validating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Validate
          </Button>
          {!isNew && (
            <Button variant="outline" onClick={handleRun} disabled={running}>
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <Alert variant={validationResult.valid ? "default" : "destructive"}>
          {validationResult.valid ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {validationResult.valid ? "Valid Configuration" : "Validation Errors"}
          </AlertTitle>
          <AlertDescription>
            {validationResult.valid ? (
              "Your pipeline configuration is valid and ready to run."
            ) : (
              <ul className="list-disc list-inside mt-2">
                {validationResult.errors?.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Details</CardTitle>
            <CardDescription>Basic information about your pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-pipeline"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this pipeline do?"
                rows={3}
              />
            </div>
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Detected Steps</h4>
              <div className="space-y-2">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted"
                  >
                    <span className="text-sm font-medium">{step.id}</span>
                    <Badge variant="outline" className="text-xs">
                      {step.kind}
                    </Badge>
                  </div>
                ))}
                {steps.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No steps detected. Add steps in the configuration.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editor and Preview */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="code" className="space-y-4">
            <TabsList>
              <TabsTrigger value="code" className="gap-2">
                <Code className="h-4 w-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="visual" className="gap-2">
                <MousePointer2 className="h-4 w-4" />
                Visual Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview DAG
              </TabsTrigger>
            </TabsList>

            <TabsContent value="code">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>YAML Configuration</CardTitle>
                    <Badge variant="secondary">YAML</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-lg">
                  <ConfigEditor
                    value={config}
                    onChange={setConfig}
                    language="yaml"
                    height="500px"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visual">
              <Card>
                <CardHeader>
                  <CardTitle>Visual Editor</CardTitle>
                  <CardDescription>
                    Drag and drop steps to build your pipeline visually
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DAGEditor
                    steps={steps}
                    onChange={(newSteps) => {
                      setSteps(newSteps);
                      // TODO: Sync back to YAML config
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Preview</CardTitle>
                  <CardDescription>
                    Visual representation of your pipeline based on the configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {steps.length > 0 ? (
                    <DAGViewer steps={steps} />
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Add steps to see the pipeline preview</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
