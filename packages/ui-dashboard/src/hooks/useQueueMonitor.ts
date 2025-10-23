/**
 * useQueueMonitor Hook
 *
 * Custom React hook for real-time message queue monitoring with WebSocket integration.
 * Provides queue metrics, job updates, and health status with automatic reconnection.
 *
 * Features:
 * - Real-time WebSocket updates
 * - Automatic reconnection with exponential backoff
 * - Queue metrics aggregation
 * - Job status tracking
 * - Health monitoring
 * - Connection state management
 *
 * @example
 * ```tsx
 * const { metrics, jobs, health, isConnected, refresh } = useQueueMonitor();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, type DashboardWebSocketEvent } from '@/services/api';

export interface QueueMetrics {
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  throughput: number;
  avgProcessingTime: number;
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
}

export interface QueueJob {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  queueName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  error?: string;
  result?: any;
}

export interface QueueHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: string;
  providers: Array<{
    name: string;
    connected: boolean;
    errorCount: number;
  }>;
}

export interface UseQueueMonitorReturn {
  metrics: QueueMetrics;
  jobs: QueueJob[];
  health: QueueHealth;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useQueueMonitor(): UseQueueMonitorReturn {
  const [metrics, setMetrics] = useState<QueueMetrics>({
    activeJobs: 0,
    queuedJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    throughput: 0,
    avgProcessingTime: 0,
    totalMessages: 0,
    messagesSent: 0,
    messagesReceived: 0,
  });

  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [health, setHealth] = useState<QueueHealth>({
    status: 'healthy',
    latency: 0,
    errorRate: 0,
    lastCheck: new Date().toISOString(),
    providers: [],
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const unsubscribeRefs = useRef<Array<() => void>>([]);

  const fetchQueueData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const telemetry = await api.getTelemetry();

      // Update metrics from telemetry
      const activeJobs = telemetry.taskQueue.filter(t => t.status === 'running').length;
      const queuedJobs = telemetry.taskQueue.filter(t => t.status === 'pending').length;

      setMetrics({
        activeJobs,
        queuedJobs,
        completedJobs: telemetry.swarmMetrics.completedTasks,
        failedJobs: telemetry.swarmMetrics.failedTasks,
        throughput: telemetry.swarmMetrics.throughput,
        avgProcessingTime: telemetry.swarmMetrics.avgResponseTime,
        totalMessages: telemetry.swarmMetrics.totalTasks,
        messagesSent: telemetry.swarmMetrics.totalTasks - telemetry.swarmMetrics.completedTasks,
        messagesReceived: telemetry.swarmMetrics.completedTasks,
      });

      // Transform task queue to jobs
      setJobs(telemetry.taskQueue.map(task => ({
        id: task.id,
        type: task.type,
        priority: task.priority,
        status: task.status,
        queueName: 'main',
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        progress: task.progress,
      })));

      // Update health
      const errorRate = telemetry.swarmMetrics.totalTasks > 0
        ? telemetry.swarmMetrics.failedTasks / telemetry.swarmMetrics.totalTasks
        : 0;

      setHealth({
        status: telemetry.systemHealth.status,
        latency: telemetry.systemHealth.network.latency,
        errorRate,
        lastCheck: new Date().toISOString(),
        providers: telemetry.agents.map(agent => ({
          name: agent.name,
          connected: agent.status === 'running',
          errorCount: 0,
        })),
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch queue data');
      setError(error);
      console.error('Failed to fetch queue data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleWebSocketMessage = useCallback((event: DashboardWebSocketEvent) => {
    switch (event.type) {
      case 'task-update':
        handleJobUpdate(event);
        break;
      case 'metrics-update':
      case 'telemetry-update':
        handleMetricsUpdate(event);
        break;
      case 'health-update':
        handleHealthUpdate(event);
        break;
    }
  }, []);

  const handleJobUpdate = useCallback((event: DashboardWebSocketEvent) => {
    if (event.type !== 'task-update') return;

    const { jobId, status, job } = event.data;

    setJobs(prevJobs => {
      const existingIndex = prevJobs.findIndex(j => j.id === jobId);

      if (existingIndex >= 0) {
        // Update existing job
        const updatedJobs = [...prevJobs];
        updatedJobs[existingIndex] = {
          ...updatedJobs[existingIndex],
          status: status as QueueJob['status'],
          progress: job?.progress,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined,
          error: job?.error?.message || event.data.error?.message,
          result: job?.result || event.data.result,
        };
        return updatedJobs;
      } else {
        // Add new job
        const newJob: QueueJob = {
          id: jobId,
          type: job?.type || 'unknown',
          priority: job?.priority || 'medium',
          status: status as QueueJob['status'],
          queueName: event.data.queueName,
          createdAt: job?.createdAt || new Date().toISOString(),
          startedAt: status === 'running' ? new Date().toISOString() : undefined,
          progress: job?.progress,
        };
        return [newJob, ...prevJobs].slice(0, 100); // Keep last 100 jobs
      }
    });

    // Update metrics based on job status change
    setMetrics(prev => {
      const updates: Partial<QueueMetrics> = { ...prev };

      if (status === 'running') {
        updates.activeJobs = (prev.activeJobs || 0) + 1;
        updates.queuedJobs = Math.max((prev.queuedJobs || 0) - 1, 0);
      } else if (status === 'completed') {
        updates.activeJobs = Math.max((prev.activeJobs || 0) - 1, 0);
        updates.completedJobs = (prev.completedJobs || 0) + 1;
        updates.messagesReceived = (prev.messagesReceived || 0) + 1;
      } else if (status === 'failed') {
        updates.activeJobs = Math.max((prev.activeJobs || 0) - 1, 0);
        updates.failedJobs = (prev.failedJobs || 0) + 1;
      } else if (status === 'pending') {
        updates.queuedJobs = (prev.queuedJobs || 0) + 1;
        updates.messagesSent = (prev.messagesSent || 0) + 1;
      }

      return updates as QueueMetrics;
    });
  }, []);

  const handleMetricsUpdate = useCallback((event: DashboardWebSocketEvent) => {
    if (event.type !== 'metrics-update' && event.type !== 'telemetry-update') return;

    const data = event.data;

    setMetrics(prev => ({
      ...prev,
      throughput: (data.throughput as number) ?? prev.throughput,
      avgProcessingTime: (data.avgProcessingTime as number) ?? prev.avgProcessingTime,
      totalMessages: (data.totalMessages as number) ?? prev.totalMessages,
      messagesSent: (data.messagesSent as number) ?? prev.messagesSent,
      messagesReceived: (data.messagesReceived as number) ?? prev.messagesReceived,
    }));
  }, []);

  const handleHealthUpdate = useCallback((event: DashboardWebSocketEvent) => {
    if (event.type !== 'health-update') return;

    setHealth(prev => ({
      ...prev,
      status: event.data.status,
      lastCheck: new Date().toISOString(),
    }));
  }, []);

  const handleWebSocketError = useCallback((error: Event) => {
    console.error('WebSocket error:', error);
    setIsConnected(false);
    setError(new Error('WebSocket connection failed'));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    // Fetch initial data
    fetchQueueData();

    // Set up WebSocket connection for real-time updates
    api.connectWebSocket(handleWebSocketMessage, handleWebSocketError);
    setIsConnected(true);

    // Subscribe to queue events
    const unsubscribeJobs = api.subscribe('jobs', handleWebSocketMessage);
    const unsubscribeMetrics = api.subscribe('metrics', handleWebSocketMessage);
    const unsubscribeHealth = api.subscribe('health', handleWebSocketMessage);
    const unsubscribeTelemetry = api.subscribe('telemetry-update', handleWebSocketMessage);
    const unsubscribeTaskUpdate = api.subscribe('task-update', handleWebSocketMessage);

    unsubscribeRefs.current = [
      unsubscribeJobs,
      unsubscribeMetrics,
      unsubscribeHealth,
      unsubscribeTelemetry,
      unsubscribeTaskUpdate,
    ];

    // Cleanup
    return () => {
      unsubscribeRefs.current.forEach(unsub => unsub());
      api.disconnectWebSocket();
      setIsConnected(false);
    };
  }, [fetchQueueData, handleWebSocketMessage, handleWebSocketError]);

  return {
    metrics,
    jobs,
    health,
    isConnected,
    isLoading,
    error,
    refresh: fetchQueueData,
    clearError,
  };
}
