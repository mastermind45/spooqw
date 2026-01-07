"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  Database, 
  Code, 
  FileOutput, 
  Radio, 
  Braces,
  Workflow 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Step, StepKind, RunStatus } from "@/types";

interface DAGViewerProps {
  steps: Step[];
  stepStatuses?: Record<string, RunStatus>;
  onStepClick?: (stepId: string) => void;
}

const kindConfig: Record<StepKind, { icon: typeof Database; color: string; label: string }> = {
  "input": { icon: Database, color: "#22c55e", label: "Input" },
  "input-stream": { icon: Radio, color: "#3b82f6", label: "Stream Input" },
  "sql": { icon: Code, color: "#8b5cf6", label: "SQL" },
  "variable": { icon: Braces, color: "#f59e0b", label: "Variable" },
  "script": { icon: Code, color: "#ec4899", label: "Script" },
  "custom": { icon: Workflow, color: "#6366f1", label: "Custom" },
  "customInput": { icon: Database, color: "#14b8a6", label: "Custom Input" },
  "avro-serde": { icon: Braces, color: "#f97316", label: "Avro" },
  "udf": { icon: Code, color: "#84cc16", label: "UDF" },
  "output": { icon: FileOutput, color: "#ef4444", label: "Output" },
  "output-stream": { icon: Radio, color: "#dc2626", label: "Stream Output" },
  "parse-json": { icon: Braces, color: "#0ea5e9", label: "Parse JSON" },
};

const statusColors: Record<RunStatus, string> = {
  pending: "#6b7280",
  running: "#3b82f6",
  success: "#22c55e",
  failed: "#ef4444",
  cancelled: "#9ca3af",
};

// Custom Node Component
function StepNode({ data }: { data: { step: Step; status?: RunStatus; onClick?: () => void } }) {
  const { step, status, onClick } = data;
  const config = kindConfig[step.kind] || kindConfig["custom"];
  const Icon = config.icon;
  const statusColor = status ? statusColors[status] : undefined;

  return (
    <div 
      className="px-4 py-3 rounded-lg border-2 bg-card shadow-lg min-w-[180px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{ 
        borderColor: statusColor || config.color,
        borderLeftWidth: '4px',
      }}
      onClick={onClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-3 !h-3"
      />
      
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="p-1.5 rounded-md" 
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="h-4 w-4" style={{ color: config.color }} />
        </div>
        <span className="font-semibold text-sm">{step.id}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {config.label}
        </Badge>
        {step.format && (
          <Badge variant="secondary" className="text-xs">
            {step.format}
          </Badge>
        )}
      </div>
      
      {step.shortDesc && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
          {step.shortDesc}
        </p>
      )}

      {status && (
        <div className="mt-2 flex items-center gap-1">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs capitalize">{status}</span>
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground !w-3 !h-3"
      />
    </div>
  );
}

const nodeTypes = {
  step: StepNode,
};

export function DAGViewer({ steps, stepStatuses, onStepClick }: DAGViewerProps) {
  // Generate nodes from steps
  const initialNodes: Node[] = useMemo(() => {
    const nodeWidth = 200;
    const nodeHeight = 120;
    const horizontalGap = 80;
    const verticalGap = 60;

    // Simple layout: arrange in rows based on dependencies
    const levels: Map<string, number> = new Map();
    
    // First pass: assign levels based on dependencies
    const assignLevel = (stepId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(stepId)) return levels.get(stepId) || 0;
      visited.add(stepId);
      
      const step = steps.find(s => s.id === stepId);
      if (!step) return 0;
      
      if (!step.dependsOn || step.dependsOn.length === 0) {
        // Also check if this step is referenced as source by any other step
        const isSource = steps.some(s => s.source === stepId);
        if (!isSource && !step.source) {
          levels.set(stepId, 0);
          return 0;
        }
      }
      
      // Check source dependency
      let maxDepLevel = -1;
      if (step.source) {
        maxDepLevel = Math.max(maxDepLevel, assignLevel(step.source, visited));
      }
      
      // Check explicit dependencies
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          maxDepLevel = Math.max(maxDepLevel, assignLevel(dep, visited));
        }
      }
      
      const level = maxDepLevel + 1;
      levels.set(stepId, level);
      return level;
    };

    // Assign levels to all steps
    steps.forEach(step => assignLevel(step.id));

    // Group by level
    const levelGroups: Map<number, Step[]> = new Map();
    steps.forEach(step => {
      const level = levels.get(step.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(step);
    });

    // Generate nodes with positions
    return steps.map(step => {
      const level = levels.get(step.id) || 0;
      const levelSteps = levelGroups.get(level) || [];
      const indexInLevel = levelSteps.indexOf(step);
      const levelWidth = levelSteps.length * (nodeWidth + horizontalGap);
      
      return {
        id: step.id,
        type: 'step',
        position: {
          x: indexInLevel * (nodeWidth + horizontalGap) - levelWidth / 2 + nodeWidth / 2,
          y: level * (nodeHeight + verticalGap),
        },
        data: {
          step,
          status: stepStatuses?.[step.id],
          onClick: () => onStepClick?.(step.id),
        },
      };
    });
  }, [steps, stepStatuses, onStepClick]);

  // Generate edges from dependencies
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    
    steps.forEach(step => {
      // Add edge from source
      if (step.source) {
        edges.push({
          id: `${step.source}-${step.id}`,
          source: step.source,
          target: step.id,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: {
            strokeWidth: 2,
          },
          animated: stepStatuses?.[step.source] === 'running',
        });
      }
      
      // Add edges from dependsOn
      if (step.dependsOn) {
        step.dependsOn.forEach(dep => {
          // Avoid duplicate edges
          if (dep !== step.source) {
            edges.push({
              id: `${dep}-${step.id}`,
              source: dep,
              target: step.id,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
              },
              style: {
                strokeWidth: 2,
                strokeDasharray: '5,5', // Dashed for dependsOn
              },
              animated: stepStatuses?.[dep] === 'running',
            });
          }
        });
      }
    });

    // Infer implicit edges (step N -> step N+1 if no explicit deps)
    for (let i = 0; i < steps.length - 1; i++) {
      const current = steps[i];
      const next = steps[i + 1];
      
      // Only add implicit edge if next has no source and doesn't depend on current
      if (!next.source && !next.dependsOn?.includes(current.id)) {
        const hasExplicitDeps = next.dependsOn && next.dependsOn.length > 0;
        if (!hasExplicitDeps) {
          edges.push({
            id: `implicit-${current.id}-${next.id}`,
            source: current.id,
            target: next.id,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: {
              strokeWidth: 2,
              opacity: 0.5,
            },
          });
        }
      }
    }
    
    return edges;
  }, [steps, stepStatuses]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-[500px] w-full rounded-lg border bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap 
          nodeStrokeWidth={3}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
