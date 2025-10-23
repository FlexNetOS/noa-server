/**
 * AI Job Queue Monitor Component
 * Real-time monitoring of job queue depth, worker utilization, and latency percentiles
 */

import React, { useMemo } from 'react';
import { useAIMetrics } from './context/AIMetricsContext';
import MetricCard from './shared/MetricCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis
} from 'recharts';
import clsx from 'clsx';

export interface AIJobQueueMonitorProps {
  className?: string;
  showWorkerUtilization?: boolean;
  showPriorityDistribution?: boolean;
  showLatencyPercentiles?: boolean;
}

export const AIJobQueueMonitor: React.FC<AIJobQueueMonitorProps> = ({
  className,
  showWorkerUtilization = true,
  showPriorityDistribution = true,
  showLatencyPercentiles = true
}) => {
  const { queueMetrics, isLoading } = useAIMetrics();

  // Prepare priority distribution data
  const priorityData = useMemo(() => {
    if (!queueMetrics?.priorityDistribution) return [];

    return Object.entries(queueMetrics.priorityDistribution).map(([priority, count]) => ({
      priority,
      count: Number(count)
    }));
  }, [queueMetrics]);

  // Prepare latency percentiles data
  const latencyData = useMemo(() => {
    if (!queueMetrics?.latencyPercentiles) return [];

    return [
      { percentile: 'p50', value: queueMetrics.latencyPercentiles.p50, label: '50th' },
      { percentile: 'p95', value: queueMetrics.latencyPercentiles.p95, label: '95th' },
      { percentile: 'p99', value: queueMetrics.latencyPercentiles.p99, label: '99th' }
    ];
  }, [queueMetrics]);

  // Worker utilization gauge data
  const utilizationData = useMemo(() => {
    if (!queueMetrics) return [];

    return [
      {
        name: 'Utilization',
        value: queueMetrics.workerUtilization * 100,
        fill: queueMetrics.workerUtilization > 0.8 ? '#ef4444' : queueMetrics.workerUtilization > 0.6 ? '#f59e0b' : '#10b981'
      }
    ];
  }, [queueMetrics]);

  if (isLoading) {
    return (
      <div className={clsx('animate-pulse space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (!queueMetrics) {
    return (
      <div className={clsx('text-center py-12 text-gray-500 dark:text-gray-400', className)}>
        No queue data available
      </div>
    );
  }

  const queueHealthColor = queueMetrics.queueDepth < 100 ? 'green' : queueMetrics.queueDepth < 500 ? 'yellow' : 'red';
  const dlqAlertColor = queueMetrics.deadLetterQueueDepth > 0 ? 'red' : 'gray';

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          AI Job Queue Monitor
        </h2>
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'w-3 h-3 rounded-full',
              queueMetrics.queueDepth < 100 ? 'bg-green-500' : queueMetrics.queueDepth < 500 ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-pulse'
            )}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {queueMetrics.queueDepth < 100 ? 'Healthy' : queueMetrics.queueDepth < 500 ? 'Moderate Load' : 'High Load'}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Queue Depth"
          value={queueMetrics.queueDepth}
          subtitle={`${queueMetrics.queuedJobs} queued`}
          color={queueHealthColor}
          trend={queueMetrics.queueDepth > 200 ? 'up' : 'down'}
        />

        <MetricCard
          title="Processing"
          value={queueMetrics.processingJobs}
          subtitle="Active jobs"
          color="blue"
        />

        <MetricCard
          title="Completed"
          value={queueMetrics.completedJobs.toLocaleString()}
          trend="up"
          color="green"
        />

        <MetricCard
          title="Failed"
          value={queueMetrics.failedJobs}
          subtitle={queueMetrics.deadLetterQueueDepth > 0 ? `DLQ: ${queueMetrics.deadLetterQueueDepth}` : 'No DLQ items'}
          color={queueMetrics.failedJobs > 10 ? 'red' : 'gray'}
        />
      </div>

      {/* Dead Letter Queue Alert */}
      {queueMetrics.deadLetterQueueDepth > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                Dead Letter Queue Alert
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {queueMetrics.deadLetterQueueDepth} jobs in dead letter queue require attention
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worker Utilization Gauge */}
        {showWorkerUtilization && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Worker Pool Utilization
            </h3>

            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  data={utilizationData}
                  startAngle={180}
                  endAngle={0}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    minAngle={15}
                    background
                    clockWise
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900 dark:text-white">
                {(queueMetrics.workerUtilization * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {queueMetrics.workerUtilization > 0.8 ? 'High utilization - consider scaling' : 'Normal utilization'}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <MetricCard
                title="Avg Processing Time"
                value={`${queueMetrics.avgProcessingTime.toFixed(0)}ms`}
                color="blue"
                size="sm"
              />
              <MetricCard
                title="Total Jobs"
                value={queueMetrics.completedJobs + queueMetrics.failedJobs}
                subtitle="Lifetime"
                color="gray"
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Latency Percentiles */}
        {showLatencyPercentiles && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Job Latency Percentiles
            </h3>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                    color: '#f3f4f6'
                  }}
                  formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Latency']}
                />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">p50</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {queueMetrics.latencyPercentiles.p50.toFixed(0)}ms
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">p95</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {queueMetrics.latencyPercentiles.p95.toFixed(0)}ms
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">p99</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {queueMetrics.latencyPercentiles.p99.toFixed(0)}ms
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Priority Distribution */}
      {showPriorityDistribution && priorityData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Priority Queue Distribution
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} />
              <YAxis
                type="category"
                dataKey="priority"
                stroke="#9ca3af"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f3f4f6'
                }}
                formatter={(value: number) => [value, 'Jobs']}
              />
              <Legend />
              <Bar dataKey="count" fill="#10b981" name="Job Count" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {priorityData.map((item) => (
              <div key={item.priority} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  {item.priority}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {item.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job Status Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Job Status Distribution
        </h3>

        <div className="flex items-center gap-4 h-8">
          {/* Queued */}
          <div
            className="bg-blue-500 h-full flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${(queueMetrics.queuedJobs / queueMetrics.queueDepth) * 100}%` }}
          >
            Queued: {queueMetrics.queuedJobs}
          </div>

          {/* Processing */}
          <div
            className="bg-yellow-500 h-full flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${(queueMetrics.processingJobs / queueMetrics.queueDepth) * 100}%` }}
          >
            Processing: {queueMetrics.processingJobs}
          </div>
        </div>

        <div className="mt-4 flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>0</span>
          <span>Queue Depth: {queueMetrics.queueDepth}</span>
        </div>
      </div>
    </div>
  );
};

export default AIJobQueueMonitor;
