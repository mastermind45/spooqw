"use client";

import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { 
  Database, 
  Code, 
  FileOutput, 
  Radio, 
  Braces,
  Workflow,
  Trash2,
  GripVertical,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Step, StepKind } from "@/types";

interface DAGEditorProps {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

const stepKinds: { value: StepKind; label: string; icon: typeof Database; color: string }[] = [
  { value: "input", label: "Input", icon: Database, color: "#22c55e" },
  { value: "input-stream", label: "Stream Input", icon: Radio, color: "#3b82f6" },
  { value: "sql", label: "SQL Transform", icon: Code, color: "#8b5cf6" },
  { value: "script", label: "Script", icon: Code, color: "#ec4899" },
  { value: "custom", label: "Custom", icon: Workflow, color: "#6366f1" },
  { value: "output", label: "Output", icon: FileOutput, color: "#ef4444" },
  { value: "output-stream", label: "Stream Output", icon: Radio, color: "#dc2626" },
];

const kindConfig: Record<string, { icon: typeof Database; color: string }> = {
  "input": { icon: Database, color: "#22c55e" },
  "input-stream": { icon: Radio, color: "#3b82f6" },
  "sql": { icon: Code, color: "#8b5cf6" },
  "variable": { icon: Braces, color: "#f59e0b" },
  "script": { icon: Code, color: "#ec4899" },
  "custom": { icon: Workflow, color: "#6366f1" },
  "customInput": { icon: Database, color: "#14b8a6" },
  "output": { icon: FileOutput, color: "#ef4444" },
  "output-stream": { icon: Radio, color: "#dc2626" },
};

// Draggable step from palette
function DraggableStep({ kind }: { kind: typeof stepKinds[0] }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ kind: kind.value }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const Icon = kind.icon;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 p-2 border rounded-md cursor-grab hover:bg-muted/50 transition-colors"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div 
        className="p-1.5 rounded-md" 
        style={{ backgroundColor: `${kind.color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color: kind.color }} />
      </div>
      <span className="text-sm font-medium">{kind.label}</span>
    </div>
  );
}

// Editable step node
function EditableStepNode({ data }: NodeProps) {
  const { step, onEdit, onDelete } = data as { 
    step: Step; 
    onEdit: (step: Step) => void;
    onDelete: (id: string) => void;
  };
  
  const config = kindConfig[step.kind] || kindConfig["custom"];
  const Icon = config.icon;

  return (
    <div 
      className="px-4 py-3 rounded-lg border-2 bg-card shadow-lg min-w-[180px] group"
      style={{ 
        borderColor: config.color,
        borderLeftWidth: '4px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-3 !h-3"
      />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-md" 
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: config.color }} />
          </div>
          <span className="font-semibold text-sm">{step.id}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6"
            onClick={() => onEdit(step)}
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(step.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {step.kind}
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
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground !w-3 !h-3"
      />
    </div>
  );
}

const nodeTypes = {
  editableStep: EditableStepNode,
};

function DAGEditorInner({ steps, onChange }: DAGEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  
  // Convert steps to nodes
  const stepsToNodes = useCallback((steps: Step[]): Node[] => {
    return steps.map((step, index) => ({
      id: step.id,
      type: 'editableStep',
      position: step.position || { x: 250, y: index * 150 },
      data: {
        step,
        onEdit: (s: Step) => setEditingStep(s),
        onDelete: (id: string) => {
          const newSteps = steps.filter(s => s.id !== id);
          onChange(newSteps);
        },
      },
    }));
  }, [onChange]);

  // Convert steps to edges
  const stepsToEdges = useCallback((steps: Step[]): Edge[] => {
    const edges: Edge[] = [];
    steps.forEach(step => {
      if (step.source) {
        edges.push({
          id: `${step.source}-${step.id}`,
          source: step.source,
          target: step.id,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          style: { strokeWidth: 2 },
        });
      }
    });
    return edges;
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(stepsToNodes(steps));
  const [edges, setEdges, onEdgesChange] = useEdgesState(stepsToEdges(steps));

  // Handle new connections
  const onConnect = useCallback((connection: Connection) => {
    // Update step source
    const newSteps = steps.map(s => 
      s.id === connection.target 
        ? { ...s, source: connection.source || undefined }
        : s
    );
    onChange(newSteps);
    setEdges(eds => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      style: { strokeWidth: 2 },
    }, eds));
  }, [steps, onChange, setEdges]);

  // Handle node position changes
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    const newSteps = steps.map(s =>
      s.id === node.id
        ? { ...s, position: node.position }
        : s
    );
    onChange(newSteps);
  }, [steps, onChange]);

  // Handle drop from palette
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const data = event.dataTransfer.getData('application/json');
    if (!data) return;

    const { kind } = JSON.parse(data) as { kind: StepKind };
    
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Generate unique ID
    const baseId = kind.replace('-', '_');
    let id = baseId;
    let counter = 1;
    while (steps.some(s => s.id === id)) {
      id = `${baseId}_${counter++}`;
    }

    const newStep: Step = {
      id,
      kind,
      position,
    };

    const newSteps = [...steps, newStep];
    onChange(newSteps);
    
    // Update nodes
    setNodes(nodes => [...nodes, {
      id: newStep.id,
      type: 'editableStep',
      position,
      data: {
        step: newStep,
        onEdit: (s: Step) => setEditingStep(s),
        onDelete: (stepId: string) => {
          const filtered = steps.filter(s => s.id !== stepId);
          onChange(filtered);
        },
      },
    }]);
  }, [steps, onChange, screenToFlowPosition, setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle step edit save
  const handleSaveStep = useCallback((updatedStep: Step) => {
    const newSteps = steps.map(s => 
      s.id === updatedStep.id ? updatedStep : s
    );
    onChange(newSteps);
    setEditingStep(null);
    
    // Update node data
    setNodes(nodes => nodes.map(n => 
      n.id === updatedStep.id 
        ? { ...n, data: { ...n.data, step: updatedStep } }
        : n
    ));
  }, [steps, onChange, setNodes]);

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Palette */}
      <div className="w-56 border-r bg-muted/30 p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-3">Steps</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Drag and drop steps onto the canvas
          </p>
        </div>
        <div className="space-y-2">
          {stepKinds.map(kind => (
            <DraggableStep key={kind.value} kind={kind} />
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
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
          <MiniMap nodeStrokeWidth={3} pannable zoomable />
        </ReactFlow>
      </div>

      {/* Step Editor Sheet */}
      <Sheet open={!!editingStep} onOpenChange={() => setEditingStep(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Step</SheetTitle>
            <SheetDescription>
              Configure the step properties
            </SheetDescription>
          </SheetHeader>
          
          {editingStep && (
            <StepEditor 
              step={editingStep} 
              steps={steps}
              onSave={handleSaveStep}
              onCancel={() => setEditingStep(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Step editor form
function StepEditor({ 
  step, 
  steps,
  onSave, 
  onCancel 
}: { 
  step: Step; 
  steps: Step[];
  onSave: (step: Step) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Step>(step);

  const otherSteps = steps.filter(s => s.id !== step.id);

  return (
    <div className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="step-id">Step ID</Label>
        <Input
          id="step-id"
          value={formData.id}
          onChange={e => setFormData({ ...formData, id: e.target.value })}
          placeholder="my_step"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="step-kind">Type</Label>
        <Select 
          value={formData.kind} 
          onValueChange={v => setFormData({ ...formData, kind: v as StepKind })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stepKinds.map(k => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="step-source">Source (depends on)</Label>
        <Select 
          value={formData.source || ''} 
          onValueChange={v => setFormData({ ...formData, source: v || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source step" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {otherSteps.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(formData.kind === 'input' || formData.kind === 'output') && (
        <div className="space-y-2">
          <Label htmlFor="step-format">Format</Label>
          <Select 
            value={formData.format || ''} 
            onValueChange={v => setFormData({ ...formData, format: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="parquet">Parquet</SelectItem>
              <SelectItem value="delta">Delta</SelectItem>
              <SelectItem value="avro">Avro</SelectItem>
              <SelectItem value="jdbc">JDBC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {(formData.kind === 'input' || formData.kind === 'output') && (
        <div className="space-y-2">
          <Label htmlFor="step-path">Path</Label>
          <Input
            id="step-path"
            value={formData.path || ''}
            onChange={e => setFormData({ ...formData, path: e.target.value })}
            placeholder="/data/file.csv"
          />
        </div>
      )}

      {formData.kind === 'sql' && (
        <div className="space-y-2">
          <Label htmlFor="step-sql">SQL Query</Label>
          <Textarea
            id="step-sql"
            value={formData.sql || ''}
            onChange={e => setFormData({ ...formData, sql: e.target.value })}
            placeholder="SELECT * FROM source_table"
            rows={5}
            className="font-mono text-sm"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="step-desc">Description</Label>
        <Input
          id="step-desc"
          value={formData.shortDesc || ''}
          onChange={e => setFormData({ ...formData, shortDesc: e.target.value })}
          placeholder="Brief description"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button onClick={() => onSave(formData)} className="flex-1">
          Save
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Export wrapped in provider
export function DAGEditor(props: DAGEditorProps) {
  return (
    <ReactFlowProvider>
      <DAGEditorInner {...props} />
    </ReactFlowProvider>
  );
}
