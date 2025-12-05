import type { AgentStatus, TaskQueueItem, TelemetryData } from '@/types';

export const mockAgents: AgentStatus[] = [
  {
    id: 'agent-1',
    name: 'Coordinator Alpha',
    type: 'orchestrator',
    status: 'running',
    taskCount: 42,
    avgResponseTime: 215,
    lastActive: '2025-10-21T10:15:00Z',
    cpu: 38,
    memory: 62,
  },
  {
    id: 'agent-2',
    name: 'Optimizer Beta',
    type: 'optimizer',
    status: 'idle',
    taskCount: 17,
    avgResponseTime: 482,
    lastActive: '2025-10-21T10:13:00Z',
    cpu: 12,
    memory: 44,
  },
  {
    id: 'agent-3',
    name: 'Validator Gamma',
    type: 'validator',
    status: 'paused',
    taskCount: 8,
    avgResponseTime: 910,
    lastActive: '2025-10-21T10:12:00Z',
    cpu: 7,
    memory: 31,
  },
];

export const mockAgent = mockAgents[0];

export const mockTasks: TaskQueueItem[] = [
  {
    id: 'task-1',
    type: 'analysis',
    priority: 'high',
    status: 'running',
    assignedAgent: 'agent-1',
    createdAt: '2025-10-21T10:11:00Z',
    startedAt: '2025-10-21T10:11:30Z',
    progress: 60,
  },
  {
    id: 'task-2',
    type: 'planning',
    priority: 'medium',
    status: 'pending',
    assignedAgent: 'agent-2',
    createdAt: '2025-10-21T09:58:00Z',
  },
];

export const mockTelemetryData: TelemetryData = {
  swarmMetrics: {
    totalAgents: mockAgents.length,
    activeAgents: mockAgents.filter((agent) => agent.status === 'running').length,
    totalTasks: mockTasks.length,
    completedTasks: 1,
    failedTasks: 0,
    avgResponseTime: 342,
    throughput: 1.5,
    uptime: 3600000,
  },
  systemHealth: {
    status: 'healthy',
    cpu: 47,
    memory: 68,
    disk: 55,
    network: {
      latency: 20,
      throughput: 800,
    },
    services: {
      mcp: true,
      neural: true,
      swarm: true,
      hooks: false,
    },
  },
  neuralMetrics: {
    modelsLoaded: 2,
    totalInferences: 15400,
    avgInferenceTime: 884,
    gpuUtilization: 55,
    vramUsage: 8,
    accuracy: 0.87,
  },
  agents: mockAgents,
  taskQueue: mockTasks,
  queues: [
    {
      name: 'main',
      jobs: mockTasks.map((task) => ({
        id: task.id,
        type: task.type,
        priority: task.priority,
        status: task.status,
        assignedAgent: task.assignedAgent,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        progress: task.progress,
      })),
    },
  ],
  mcpTools: [
    {
      name: 'message-queue',
      invocations: 100,
      avgDuration: 200,
      successRate: 0.95,
      lastUsed: '2025-10-21T10:15:00Z',
      errors: 0,
    },
  ],
  recentHooks: [],
  truthGate: {
    passed: true,
    accuracy: 0.92,
    timestamp: '2025-10-21T10:15:00Z',
  },
};

export type MockTelemetry = TelemetryData;
