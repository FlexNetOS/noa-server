// Type definitions for Claude Suite Dashboard

export interface AgentStatus {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'error' | 'paused';
  taskCount: number;
  avgResponseTime: number;
  lastActive: string;
  cpu: number;
  memory: number;
}

export interface SwarmMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgResponseTime: number;
  throughput: number;
  uptime: number;
}

export interface TaskQueueItem {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  assignedAgent?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  cpu: number;
  memory: number;
  disk: number;
  network: {
    latency: number;
    throughput: number;
  };
  services: {
    mcp: boolean;
    neural: boolean;
    swarm: boolean;
    hooks: boolean;
  };
}

export interface NeuralMetrics {
  modelsLoaded: number;
  totalInferences: number;
  avgInferenceTime: number;
  gpuUtilization?: number;
  vramUsage?: number;
  accuracy: number;
}

export interface MCPToolMetric {
  name: string;
  invocations: number;
  avgDuration: number;
  successRate: number;
  lastUsed: string;
  errors: number;
}

export interface HookEvent {
  timestamp: string;
  event: string;
  run: string;
  payload: Record<string, unknown>;
  agent?: string;
  status?: 'success' | 'error';
}

export interface QueueJob {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  assignedAgent?: string;
  createdAt: string;
  startedAt?: string;
  progress?: number;
}

export interface Queue {
  name: string;
  jobs: QueueJob[];
}

export interface TelemetryData {
  swarmMetrics: SwarmMetrics;
  systemHealth: SystemHealth;
  neuralMetrics: NeuralMetrics;
  agents: AgentStatus[];
  taskQueue: TaskQueueItem[];
  queues: Queue[];
  mcpTools: MCPToolMetric[];
  recentHooks: HookEvent[];
  truthGate?: {
    passed: boolean;
    accuracy: number;
    timestamp: string;
  };
}
