// SpooqW Global Store (Zustand)

import { create } from 'zustand';
import type { Pipeline, Run, Connection } from '@/types';

interface AppState {
  // Pipelines
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  setPipelines: (pipelines: Pipeline[]) => void;
  setSelectedPipeline: (pipeline: Pipeline | null) => void;
  addPipeline: (pipeline: Pipeline) => void;
  updatePipeline: (id: string, pipeline: Partial<Pipeline>) => void;
  removePipeline: (id: string) => void;

  // Runs
  runs: Run[];
  activeRun: Run | null;
  setRuns: (runs: Run[]) => void;
  setActiveRun: (run: Run | null) => void;
  addRun: (run: Run) => void;
  updateRun: (id: string, run: Partial<Run>) => void;

  // Connections
  connections: Connection[];
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, connection: Partial<Connection>) => void;
  removeConnection: (id: string) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Pipelines
  pipelines: [],
  selectedPipeline: null,
  setPipelines: (pipelines) => set({ pipelines }),
  setSelectedPipeline: (pipeline) => set({ selectedPipeline: pipeline }),
  addPipeline: (pipeline) => set((state) => ({ 
    pipelines: [...state.pipelines, pipeline] 
  })),
  updatePipeline: (id, updates) => set((state) => ({
    pipelines: state.pipelines.map((p) => 
      p.id === id ? { ...p, ...updates } : p
    ),
    selectedPipeline: state.selectedPipeline?.id === id 
      ? { ...state.selectedPipeline, ...updates }
      : state.selectedPipeline,
  })),
  removePipeline: (id) => set((state) => ({
    pipelines: state.pipelines.filter((p) => p.id !== id),
    selectedPipeline: state.selectedPipeline?.id === id 
      ? null 
      : state.selectedPipeline,
  })),

  // Runs
  runs: [],
  activeRun: null,
  setRuns: (runs) => set({ runs }),
  setActiveRun: (run) => set({ activeRun: run }),
  addRun: (run) => set((state) => ({ 
    runs: [run, ...state.runs] 
  })),
  updateRun: (id, updates) => set((state) => ({
    runs: state.runs.map((r) => 
      r.id === id ? { ...r, ...updates } : r
    ),
    activeRun: state.activeRun?.id === id 
      ? { ...state.activeRun, ...updates }
      : state.activeRun,
  })),

  // Connections
  connections: [],
  setConnections: (connections) => set({ connections }),
  addConnection: (connection) => set((state) => ({ 
    connections: [...state.connections, connection] 
  })),
  updateConnection: (id, updates) => set((state) => ({
    connections: state.connections.map((c) => 
      c.id === id ? { ...c, ...updates } : c
    ),
  })),
  removeConnection: (id) => set((state) => ({
    connections: state.connections.filter((c) => c.id !== id),
  })),

  // UI State
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}));
