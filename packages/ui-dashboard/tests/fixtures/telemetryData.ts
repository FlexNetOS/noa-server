export const mockAgents = [
  {
    id: 'agent-1',
    name: 'Coordinator Alpha',
    type: 'orchestrator',
    status: 'running' as const,
    taskCount: 42,
    avgResponseTime: 215,
    cpu: 38,
    memory: 62,
    lastActive: '2025-10-21T10:15:00Z',
  },
  {
    id: 'agent-2',
    name: 'Optimizer Beta',
    type: 'optimizer',
    status: 'idle' as const,
    taskCount: 17,
    avgResponseTime: 482,
    cpu: 12,
    memory: 44,
    lastActive: '2025-10-21T10:13:00Z',
  },
  {
    id: 'agent-3',
    name: 'Validator Gamma',
    type: 'validator',
    status: 'paused' as const,
    taskCount: 8,
    avgResponseTime: 910,
    cpu: 7,
    memory: 31,
    lastActive: '2025-10-21T10:12:00Z',
  },
] satisfies Array<{
  id: string;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'paused' | 'error';
  taskCount: number;
  avgResponseTime: number;
  cpu: number;
  memory: number;
  lastActive: string;
}>;

export const mockAgent = mockAgents[0];

export const mockTasks = [
  {
    id: 'task-1',
    agentId: 'agent-1',
    status: 'processing',
    createdAt: '2025-10-21T10:11:00Z',
    priority: 'high',
  },
  {
    id: 'task-2',
    agentId: 'agent-2',
    status: 'queued',
    createdAt: '2025-10-21T09:58:00Z',
    priority: 'medium',
  },
] as const;

export const mockTelemetryData = {
  swarmMetrics: {
    activeAgents: mockAgents.length,
    taskDistribution: mockAgents.map((agent) => ({
      agentId: agent.id,
      tasks: agent.taskCount,
    })),
    averageLatencyMs: 342,
    healthScore: 0.92,
  },
  systemHealth: {
    cpuLoad: 47,
    memoryUsage: 68,
    gpuUtilization: 55,
    incidents: 0,
  },
  neuralMetrics: {
    tokensPerSecond: 15400,
    averageCompletionTimeMs: 884,
    abilityScore: 0.87,
    totalCompletions: 1284,
  },
  taskQueue: mockTasks,
};

export type MockTelemetry = typeof mockTelemetryData;
