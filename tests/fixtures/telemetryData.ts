/**
 * Test fixtures for telemetry data
 * Reusable mock data for tests
 */

import type {
  TelemetryData,
  AgentStatus,
  TaskQueueItem,
  SystemHealth,
  SwarmMetrics,
  NeuralMetrics,
} from '../../packages/ui-dashboard/src/types';

export const mockSwarmMetrics: SwarmMetrics = {
  totalAgents: 12,
  activeAgents: 8,
  totalTasks: 456,
  completedTasks: 432,
  failedTasks: 4,
  avgResponseTime: 245,
  throughput: 18.5,
  uptime: 3600000,
};

export const mockSystemHealth: SystemHealth = {
  status: 'healthy',
  cpu: 45,
  memory: 62,
  disk: 58,
  network: {
    latency: 12,
    throughput: 850,
  },
  services: {
    mcp: true,
    neural: true,
    swarm: true,
    hooks: true,
  },
};

export const mockNeuralMetrics: NeuralMetrics = {
  modelsLoaded: 3,
  totalInferences: 1247,
  avgInferenceTime: 187,
  gpuUtilization: 78,
  vramUsage: 6.4,
  accuracy: 0.98,
};

export const mockAgent: AgentStatus = {
  id: 'agent-1',
  name: 'coder-1',
  type: 'coder',
  status: 'running',
  taskCount: 15,
  avgResponseTime: 250,
  lastActive: new Date().toISOString(),
  cpu: 45,
  memory: 60,
};

export const mockAgents: AgentStatus[] = [
  mockAgent,
  {
    id: 'agent-2',
    name: 'reviewer-1',
    type: 'reviewer',
    status: 'idle',
    taskCount: 8,
    avgResponseTime: 180,
    lastActive: new Date(Date.now() - 300000).toISOString(),
    cpu: 20,
    memory: 35,
  },
  {
    id: 'agent-3',
    name: 'tester-1',
    type: 'tester',
    status: 'paused',
    taskCount: 12,
    avgResponseTime: 320,
    lastActive: new Date(Date.now() - 600000).toISOString(),
    cpu: 0,
    memory: 10,
  },
];

export const mockTask: TaskQueueItem = {
  id: 'task-1',
  type: 'code-review',
  priority: 'high',
  status: 'running',
  assignedAgent: 'agent-1',
  createdAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  progress: 45,
};

export const mockTasks: TaskQueueItem[] = [
  mockTask,
  {
    id: 'task-2',
    type: 'test-execution',
    priority: 'critical',
    status: 'pending',
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'task-3',
    type: 'deployment',
    priority: 'medium',
    status: 'completed',
    assignedAgent: 'agent-2',
    createdAt: new Date(Date.now() - 600000).toISOString(),
    startedAt: new Date(Date.now() - 480000).toISOString(),
    completedAt: new Date(Date.now() - 60000).toISOString(),
    progress: 100,
  },
];

export const mockTelemetryData: TelemetryData = {
  swarmMetrics: mockSwarmMetrics,
  systemHealth: mockSystemHealth,
  neuralMetrics: mockNeuralMetrics,
  agents: mockAgents,
  taskQueue: mockTasks,
  mcpTools: [
    {
      name: 'mcp__claude-flow__swarm_init',
      invocations: 234,
      avgDuration: 145,
      successRate: 0.98,
      lastUsed: new Date().toISOString(),
      errors: 2,
    },
  ],
  recentHooks: [
    {
      timestamp: new Date().toISOString(),
      event: 'pre-task',
      run: 'test-run-1',
      payload: { taskId: 'task-1' },
      agent: 'agent-1',
      status: 'success',
    },
  ],
  truthGate: {
    passed: true,
    accuracy: 0.98,
    timestamp: new Date().toISOString(),
  },
};
