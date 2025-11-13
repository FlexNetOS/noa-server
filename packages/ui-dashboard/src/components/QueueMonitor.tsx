/**
 * Queue Monitor Component
 *
 * Comprehensive message queue monitoring dashboard with real-time updates
 * via WebSocket. Displays queue metrics, job lists, health indicators,
 * and throughput visualization.
 *
 * Features:
 * - Real-time queue metrics (active jobs, throughput, latency)
 * - Job queue visualization with status indicators
 * - Queue health monitoring
 * - WebSocket integration for live updates
 * - Responsive design with Tailwind CSS
 * - Accessibility compliant (WCAG 2.1 AA)
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type DashboardWebSocketEvent } from '@/services/api';
import { formatDuration, formatNumber, formatRelativeTime } from '@/utils/format';

interface QueueMetrics {
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  throughput: number;
  avgProcessingTime: number;
  totalMessages: number;
}

interface QueueJob {
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
}

interface QueueHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: string;
}

export function QueueMonitor() {
  const [metrics, setMetrics] = useState<QueueMetrics>({
    activeJobs: 0,
    queuedJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    throughput: 0,
    avgProcessingTime: 0,
    totalMessages: 0,
  });

  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [health, setHealth] = useState<QueueHealth>({
    status: 'healthy',
    latency: 0,
    errorRate: 0,
    lastCheck: new Date().toISOString(),
  });

  const [isConnected, setIsConnected] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'running' | 'completed' | 'failed'>('all');

  useEffect(() => {
    // Fetch initial data
    fetchQueueData();

    // Set up WebSocket connection for real-time updates
    api.connectWebSocket(handleWebSocketMessage, handleWebSocketError);
    setIsConnected(true);

    // Subscribe to queue events
    const unsubscribeJobs = api.subscribe('jobs', handleJobUpdate);
    const unsubscribeMetrics = api.subscribe('metrics', handleMetricsUpdate);
    const unsubscribeHealth = api.subscribe('health', handleHealthUpdate);

    // Cleanup
    return () => {
      unsubscribeJobs();
      unsubscribeMetrics();
      unsubscribeHealth();
      api.disconnectWebSocket();
      setIsConnected(false);
    };
  }, []);

  const fetchQueueData = async () => {
    try {
      const telemetry = await api.getTelemetry();

      // Update metrics from telemetry
      setMetrics({
        activeJobs: telemetry.taskQueue.filter(t => t.status === 'running').length,
        queuedJobs: telemetry.taskQueue.filter(t => t.status === 'pending').length,
        completedJobs: telemetry.swarmMetrics.completedTasks,
        failedJobs: telemetry.swarmMetrics.failedTasks,
        throughput: telemetry.swarmMetrics.throughput,
        avgProcessingTime: telemetry.swarmMetrics.avgResponseTime,
        totalMessages: telemetry.swarmMetrics.totalTasks,
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
      setHealth({
        status: telemetry.systemHealth.status,
        latency: telemetry.systemHealth.network.latency,
        errorRate: telemetry.swarmMetrics.failedTasks / Math.max(telemetry.swarmMetrics.totalTasks, 1),
        lastCheck: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    }
  };

  const handleWebSocketMessage = (event: DashboardWebSocketEvent) => {
    switch (event.type) {
      case 'task-update':
        handleJobUpdate(event);
        break;
      case 'metrics-update':
        handleMetricsUpdate(event);
        break;
      case 'health-update':
        handleHealthUpdate(event);
        break;
    }
  };

  const handleJobUpdate = (event: DashboardWebSocketEvent) => {
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
          error: job?.error?.message,
        };
        return updatedJobs;
      } else {
        // Add new job
        return [{
          id: jobId,
          type: job?.type || 'unknown',
          priority: job?.priority || 'medium',
          status: status as QueueJob['status'],
          queueName: event.data.queueName,
          createdAt: job?.createdAt || new Date().toISOString(),
          startedAt: status === 'running' ? new Date().toISOString() : undefined,
        }, ...prevJobs].slice(0, 50); // Keep last 50 jobs
      }
    });

    // Update metrics
    setMetrics(prev => ({
      ...prev,
      activeJobs: prev.activeJobs + (status === 'running' ? 1 : 0),
      queuedJobs: prev.queuedJobs - (status === 'running' ? 1 : 0),
      completedJobs: prev.completedJobs + (status === 'completed' ? 1 : 0),
      failedJobs: prev.failedJobs + (status === 'failed' ? 1 : 0),
    }));
  };

  const handleMetricsUpdate = (event: DashboardWebSocketEvent) => {
    if (event.type !== 'metrics-update' && event.type !== 'telemetry-update') return;

    const data = event.data;
    setMetrics(prev => ({
      ...prev,
      throughput: (data.throughput as number) || prev.throughput,
      avgProcessingTime: (data.avgProcessingTime as number) || prev.avgProcessingTime,
      totalMessages: (data.totalMessages as number) || prev.totalMessages,
    }));
  };

  const handleHealthUpdate = (event: DashboardWebSocketEvent) => {
    if (event.type !== 'health-update') return;

    setHealth(prev => ({
      ...prev,
      status: event.data.status,
      lastCheck: new Date().toISOString(),
    }));
  };

  const handleWebSocketError = (error: Event) => {
    console.error('WebSocket error:', error);
    setIsConnected(false);
  };

  const filteredJobs = filter === 'all'
    ? jobs
    : jobs.filter(job => job.status === filter);

  return (
    <div className="space-y-6">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Queue Monitor</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-sm text-brand-muted">
            {isConnected ? 'Live Updates' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Jobs"
          value={formatNumber(metrics.activeJobs)}
          subtitle="Currently processing"
          icon="🔄"
          status={metrics.activeJobs > 0 ? 'info' : 'success'}
        />
        <MetricCard
          title="Queue Depth"
          value={formatNumber(metrics.queuedJobs)}
          subtitle="Waiting to process"
          icon="📋"
          status={metrics.queuedJobs > 10 ? 'warning' : 'success'}
        />
        <MetricCard
          title="Throughput"
          value={`${metrics.throughput.toFixed(1)}`}
          subtitle="jobs/sec"
          icon="⚡"
          status="success"
        />
        <MetricCard
          title="Avg Processing Time"
          value={formatDuration(metrics.avgProcessingTime)}
          subtitle="per job"
          icon="⏱️"
          status="info"
        />
      </div>

      {/* Queue Health Indicator */}
      <QueueHealthIndicator health={health} />

      {/* Job Queue Table */}
      <div className="bg-brand-card border border-brand-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Job Queue</h3>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(['all', 'pending', 'running', 'completed', 'failed'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-bg text-brand-muted hover:bg-brand-border'
                }`}
                aria-pressed={filter === status}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-brand-muted">
            <p>No jobs to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-brand-muted uppercase">Job ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-brand-muted uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-brand-muted uppercase">Priority</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-brand-muted uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-brand-muted uppercase">Progress</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-brand-muted uppercase">Created</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredJobs.map(job => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Processed"
          value={formatNumber(metrics.completedJobs)}
          icon="✅"
          color="green"
        />
        <StatCard
          label="Failed Jobs"
          value={formatNumber(metrics.failedJobs)}
          icon="❌"
          color="red"
        />
        <StatCard
          label="Total Messages"
          value={formatNumber(metrics.totalMessages)}
          icon="📨"
          color="blue"
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  status: 'success' | 'warning' | 'danger' | 'info';
}

function MetricCard({ title, value, subtitle, icon, status }: MetricCardProps) {
  const statusColors = {
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-brand-card border rounded-lg p-4 ${statusColors[status]}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-brand-muted uppercase tracking-wide">{title}</h3>
        <span className="text-2xl" role="img" aria-label={title}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-brand-muted">{subtitle}</p>
    </motion.div>
  );
}

interface QueueHealthIndicatorProps {
  health: QueueHealth;
}

function QueueHealthIndicator({ health }: QueueHealthIndicatorProps) {
  const statusConfig = {
    healthy: {
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: '✅',
      label: 'Healthy',
    },
    degraded: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: '⚠️',
      label: 'Degraded',
    },
    unhealthy: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: '❌',
      label: 'Unhealthy',
    },
  };

  const config = statusConfig[health.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-6 ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-label={config.label}>{config.icon}</span>
          <div>
            <h3 className="text-lg font-bold text-white">Queue Health: {config.label}</h3>
            <p className="text-sm text-brand-muted">
              Last checked {formatRelativeTime(health.lastCheck)}
            </p>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-sm text-brand-muted">Latency</p>
            <p className={`text-xl font-bold ${config.color}`}>{health.latency}ms</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-brand-muted">Error Rate</p>
            <p className={`text-xl font-bold ${config.color}`}>
              {(health.errorRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface JobRowProps {
  job: QueueJob;
}

function JobRow({ job }: JobRowProps) {
  const priorityColors = {
    critical: 'text-red-400',
    high: 'text-yellow-400',
    medium: 'text-blue-400',
    low: 'text-gray-400',
  };

  const statusConfig = {
    pending: { color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Pending' },
    running: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Running' },
    completed: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'Completed' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' },
    cancelled: { color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Cancelled' },
  };

  const status = statusConfig[job.status];

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="border-b border-brand-border hover:bg-brand-border/30 transition-colors"
    >
      <td className="py-3 px-4">
        <span className="text-sm font-mono text-white">{job.id.slice(0, 8)}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-white">{job.type}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-sm font-semibold ${priorityColors[job.priority]}`}>
          {job.priority.toUpperCase()}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </td>
      <td className="py-3 px-4">
        {job.progress !== undefined ? (
          <div className="flex items-center gap-2">
            <div className="w-24 bg-brand-border rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <span className="text-xs text-brand-muted">{job.progress}%</span>
          </div>
        ) : (
          <span className="text-xs text-brand-muted">-</span>
        )}
      </td>
      <td className="py-3 px-4">
        <span className="text-xs text-brand-muted">{formatRelativeTime(job.createdAt)}</span>
      </td>
    </motion.tr>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'green' | 'red' | 'blue';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colors = {
    green: 'border-green-500/30 bg-green-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
  };

  return (
    <div className={`bg-brand-card border rounded-lg p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-muted mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <span className="text-3xl" role="img" aria-label={label}>{icon}</span>
      </div>
    </div>
  );
}
