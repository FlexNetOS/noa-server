// Global state management with Zustand
import { create } from 'zustand';

import { api, type DashboardWebSocketEvent } from './api';

import type { TelemetryData, TaskQueueItem } from '@/types';

const JOB_PRIORITY_MAP: Record<number, TaskQueueItem['priority']> = {
  1: 'low',
  5: 'medium',
  10: 'high',
  15: 'critical',
};

const mapJobPriority = (value: unknown): TaskQueueItem['priority'] => {
  if (typeof value !== 'number') {
    return 'medium';
  }
  return JOB_PRIORITY_MAP[value] ?? (value >= 10 ? 'high' : value <= 1 ? 'low' : 'medium');
};

const JOB_STATUS_MAP: Record<string, TaskQueueItem['status']> = {
  queued: 'pending',
  pending: 'pending',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
};

const normalizeTaskStatus = (
  value: unknown
): TaskQueueItem['status'] | 'cancelled' => {
  if (typeof value !== 'string') {
    return 'pending';
  }
  const key = value.toLowerCase();
  if (key === 'cancelled' || key === 'canceled') {
    return 'cancelled';
  }
  return JOB_STATUS_MAP[key] ?? 'pending';
};

const deriveOverallHealth = (
  statuses: Array<{ status?: string }>
): 'healthy' | 'degraded' | 'unhealthy' => {
  if (!statuses.length) {
    return 'degraded';
  }
  if (statuses.some((item) => item?.status === 'unhealthy')) {
    return 'unhealthy';
  }
  if (statuses.every((item) => item?.status === 'healthy')) {
    return 'healthy';
  }
  return 'degraded';
};

const average = (values: number[]): number =>
  values.length ? values.reduce((acc, value) => acc + value, 0) / values.length : 0;

const resolveTimestamp = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

interface DashboardStore extends TelemetryData {
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
  autoRefresh: boolean;
  refreshInterval: number;

  // Actions
  fetchTelemetry: () => Promise<void>;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  updateFromWebSocket: (event: DashboardWebSocketEvent) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Initial state
  swarmMetrics: {
    totalAgents: 0,
    activeAgents: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgResponseTime: 0,
    throughput: 0,
    uptime: 0,
  },
  systemHealth: {
    status: 'unhealthy',
    cpu: 0,
    memory: 0,
    disk: 0,
    network: { latency: 0, throughput: 0 },
    services: { mcp: false, neural: false, swarm: false, hooks: false },
  },
  neuralMetrics: {
    modelsLoaded: 0,
    totalInferences: 0,
    avgInferenceTime: 0,
    accuracy: 0,
  },
  agents: [],
  taskQueue: [],
  queues: [],
  mcpTools: [],
  recentHooks: [],
  isLoading: true,
  error: null,
  lastUpdate: null,
  autoRefresh: true,
  refreshInterval: 5000,

  // Actions
  fetchTelemetry: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getTelemetry();
      set({
        ...data,
        isLoading: false,
        lastUpdate: new Date().toISOString(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch telemetry',
        isLoading: false,
      });
    }
  },

  setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),

  setRefreshInterval: (interval) => set({ refreshInterval: interval }),

  updateFromWebSocket: (event) => {
    set((state) => {
      const timestampMs = resolveTimestamp(event.timestamp, Date.now());
      const lastUpdate = new Date(timestampMs).toISOString();

      let swarmMetrics = state.swarmMetrics;
      let neuralMetrics = state.neuralMetrics;
      let systemHealth = state.systemHealth;
      let taskQueue = state.taskQueue;

      switch (event.type) {
        case 'telemetry-update': {
          const data = event.data ?? {};
          const messagesSent =
            typeof data.messagesSent === 'number' ? data.messagesSent : 0;
          const messagesReceived =
            typeof data.messagesReceived === 'number' ? data.messagesReceived : 0;

          if (messagesSent || messagesReceived) {
            swarmMetrics = {
              ...swarmMetrics,
              totalTasks: swarmMetrics.totalTasks + messagesSent + messagesReceived,
              completedTasks: swarmMetrics.completedTasks + messagesReceived,
            };
          }

          if (typeof data.totalInferences === 'number') {
            neuralMetrics = {
              ...neuralMetrics,
              totalInferences: data.totalInferences,
            };
          }

          if (typeof data.uptime === 'number') {
            swarmMetrics = {
              ...swarmMetrics,
              uptime: data.uptime,
            };
          }
          break;
        }

        case 'metrics-update': {
          const metricsPayload = event.data?.metrics as
            | {
                metrics?: Array<{
                  messageCount?: number;
                  processingRate?: number;
                  averageProcessingTime?: number;
                }>;
                healthStatuses?: Array<{ status?: string; latency?: number }>;
                stats?: {
                  totalMessages?: number;
                  throughput?: number;
                  averageProcessingTime?: number;
                };
              }
            | undefined;

          if (metricsPayload) {
            const metricsList = Array.isArray(metricsPayload.metrics)
              ? metricsPayload.metrics
              : [];

            if (metricsList.length) {
              const totalMessages = metricsList.reduce(
                (acc, item) =>
                  acc + (typeof item?.messageCount === 'number' ? item.messageCount : 0),
                0
              );

              const avgProcessingTime = average(
                metricsList
                  .map((item) =>
                    typeof item?.averageProcessingTime === 'number'
                      ? item.averageProcessingTime
                      : undefined
                  )
                  .filter((value): value is number => typeof value === 'number')
              );

              const totalProcessingRate = metricsList.reduce(
                (acc, item) =>
                  acc + (typeof item?.processingRate === 'number' ? item.processingRate : 0),
                0
              );

              swarmMetrics = {
                ...swarmMetrics,
                totalTasks: totalMessages || swarmMetrics.totalTasks,
                avgResponseTime: avgProcessingTime || swarmMetrics.avgResponseTime,
                throughput: totalProcessingRate || swarmMetrics.throughput,
              };
            }

            if (metricsPayload.stats) {
              const { totalMessages, throughput, averageProcessingTime } =
                metricsPayload.stats;

              swarmMetrics = {
                ...swarmMetrics,
                totalTasks:
                  typeof totalMessages === 'number'
                    ? totalMessages
                    : swarmMetrics.totalTasks,
                throughput:
                  typeof throughput === 'number' ? throughput : swarmMetrics.throughput,
                avgResponseTime:
                  typeof averageProcessingTime === 'number'
                    ? averageProcessingTime
                    : swarmMetrics.avgResponseTime,
              };
            }

            const healthStatuses = Array.isArray(
              (metricsPayload as { healthStatuses?: unknown }).healthStatuses
            )
              ? (metricsPayload as {
                  healthStatuses: Array<{ status?: string; latency?: number }>;
                }).healthStatuses
              : [];

            if (healthStatuses.length) {
              const derivedStatus = deriveOverallHealth(healthStatuses);
              const latencies = healthStatuses
                .map((status) =>
                  typeof status?.latency === 'number' ? status.latency : undefined
                )
                .filter((value): value is number => typeof value === 'number');
              const latency = latencies.length ? average(latencies) : undefined;

              systemHealth = {
                ...systemHealth,
                status: derivedStatus,
                network: {
                  ...systemHealth.network,
                  latency: latency ?? systemHealth.network.latency,
                },
                services: {
                  ...systemHealth.services,
                  swarm: derivedStatus !== 'unhealthy',
                },
              };
            }
          }
          break;
        }

        case 'task-update': {
          const data = event.data;
          if (data?.jobId) {
            const normalizedStatus = normalizeTaskStatus(data.status);
            const timestamp = resolveTimestamp(data.timestamp, event.timestamp);
            const timestampIso = new Date(timestamp).toISOString();
            const existingIndex = taskQueue.findIndex((task) => task.id === data.jobId);

            if (normalizedStatus === 'cancelled') {
              if (existingIndex >= 0) {
                const nextQueue = [...taskQueue];
                nextQueue.splice(existingIndex, 1);
                taskQueue = nextQueue;
              }
              break;
            }

            const mappedStatus = normalizedStatus as TaskQueueItem['status'];

            if (existingIndex >= 0) {
              const previousTask = taskQueue[existingIndex];
              const previousStatus = previousTask.status;
              const nextQueue = [...taskQueue];

              const updatedTask: TaskQueueItem = {
                ...previousTask,
                status: mappedStatus,
                startedAt:
                  mappedStatus === 'running'
                    ? previousTask.startedAt ?? timestampIso
                    : previousTask.startedAt,
                completedAt:
                  mappedStatus === 'completed' || mappedStatus === 'failed'
                    ? timestampIso
                    : previousTask.completedAt,
                progress:
                  mappedStatus === 'completed'
                    ? 100
                    : previousTask.progress,
              };

              nextQueue[existingIndex] = updatedTask;
              taskQueue = nextQueue;

              if (mappedStatus === 'completed' && previousStatus !== 'completed') {
                swarmMetrics = {
                  ...swarmMetrics,
                  completedTasks: swarmMetrics.completedTasks + 1,
                };
              } else if (mappedStatus === 'failed' && previousStatus !== 'failed') {
                swarmMetrics = {
                  ...swarmMetrics,
                  failedTasks: swarmMetrics.failedTasks + 1,
                };
              }
            } else {
              const newTask: TaskQueueItem = {
                id: data.jobId,
                type: typeof data.job?.type === 'string' ? data.job.type : 'job',
                priority: mapJobPriority(data.job?.priority),
                status: mappedStatus,
                createdAt: timestampIso,
              };

              if (mappedStatus === 'running') {
                newTask.startedAt = timestampIso;
              }

              if (mappedStatus === 'completed' || mappedStatus === 'failed') {
                newTask.completedAt = timestampIso;
                if (mappedStatus === 'completed') {
                  newTask.progress = 100;
                  swarmMetrics = {
                    ...swarmMetrics,
                    completedTasks: swarmMetrics.completedTasks + 1,
                  };
                } else {
                  swarmMetrics = {
                    ...swarmMetrics,
                    failedTasks: swarmMetrics.failedTasks + 1,
                  };
                }
              }

              taskQueue = [...taskQueue, newTask];
            }
          }
          break;
        }

        case 'health-update': {
          const data = event.data ?? {};
          const statuses = Array.isArray(data.healthStatuses) ? data.healthStatuses : [];
          const derivedStatus =
            data.status === 'healthy' || data.status === 'degraded' || data.status === 'unhealthy'
              ? data.status
              : deriveOverallHealth(statuses);
          const latencies = statuses
            .map((status: { latency?: number }) =>
              typeof status?.latency === 'number' ? status.latency : undefined
            )
            .filter((value): value is number => typeof value === 'number');
          const latency = latencies.length ? average(latencies) : undefined;

          systemHealth = {
            ...systemHealth,
            status: derivedStatus,
            network: {
              ...systemHealth.network,
              latency: latency ?? systemHealth.network.latency,
            },
            services: {
              ...systemHealth.services,
              swarm: derivedStatus !== 'unhealthy',
            },
          };

          if (typeof (data as { uptime?: number }).uptime === 'number') {
            swarmMetrics = {
              ...swarmMetrics,
              uptime: (data as { uptime: number }).uptime,
            };
          }
          break;
        }

        default:
          break;
      }

      return {
        ...state,
        swarmMetrics,
        neuralMetrics,
        systemHealth,
        taskQueue,
        lastUpdate,
      };
    });
  },
}));
