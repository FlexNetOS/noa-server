// Workflow-related type definitions

export interface WorkflowNode {
  id: string;
  type: 'start' | 'task' | 'decision' | 'parallel' | 'end' | 'agent';
  label: string;
  position: { x: number; y: number };
  data: {
    agentType?: string;
    taskDescription?: string;
    condition?: string;
    config?: Record<string, unknown>;
  };
  inputs?: string[];
  outputs?: string[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
  type?: 'default' | 'conditional' | 'error';
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
  schedule?: {
    enabled: boolean;
    cron?: string;
    timezone?: string;
  };
  metrics?: {
    totalExecutions: number;
    successRate: number;
    avgDuration: number;
    lastExecution?: string;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  triggeredBy: string;
  currentNode?: string;
  progress: number;
  nodes: {
    [nodeId: string]: {
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
      startedAt?: string;
      completedAt?: string;
      output?: unknown;
      error?: string;
      logs?: string[];
    };
  };
  output?: unknown;
  error?: string;
  logs: {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    nodeId?: string;
  }[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'automation' | 'data-processing' | 'ml-pipeline' | 'testing' | 'deployment';
  thumbnail?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: {
    name: string;
    type: string;
    required: boolean;
    default?: unknown;
  }[];
}
