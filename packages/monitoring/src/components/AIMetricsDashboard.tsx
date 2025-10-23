/**
 * AI Metrics Dashboard Component
 * Main dashboard displaying real-time AI metrics, costs, and performance
 */

import React, { useState } from 'react';
import { useAIMetrics } from './context/AIMetricsContext';
import MetricCard from './shared/MetricCard';
import TrendChart from './shared/TrendChart';
import AlertBanner from './shared/AlertBanner';
import clsx from 'clsx';

export interface AIMetricsDashboardProps {
  className?: string;
  showAlerts?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const AIMetricsDashboard: React.FC<AIMetricsDashboardProps> = ({
  className,
  showAlerts = true,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const {
    metrics,
    providerMetrics,
    costMetrics,
    queueMetrics,
    alerts,
    isConnected,
    isLoading,
    error,
    refreshData,
    acknowledgeAlert
  } = useAIMetrics();

  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

  // Calculate aggregate metrics
  const latestMetric = metrics[metrics.length - 1];
  const avgLatency = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length
    : 0;
  const avgThroughput = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length
    : 0;
  const totalRequests = latestMetric?.totalRequests || 0;
  const successRate = latestMetric?.successRate || 0;

  // Provider health summary
  const healthyProviders = providerMetrics.filter(p => p.status === 'healthy').length;
  const totalProviders = providerMetrics.length;

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Metrics Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time monitoring of AI providers and performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'w-3 h-3 rounded-full',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              )}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Refresh button */}
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Alerts */}
      {showAlerts && alerts.length > 0 && (
        <AlertBanner alerts={alerts} onDismiss={acknowledgeAlert} />
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Average Latency"
          value={avgLatency.toFixed(0)}
          unit="ms"
          trend={avgLatency < 100 ? 'down' : 'up'}
          trendValue={`${avgLatency > 0 ? ((avgLatency / 100) * 100).toFixed(1) : 0}%`}
          color="blue"
          loading={isLoading}
        />

        <MetricCard
          title="Throughput"
          value={avgThroughput.toFixed(1)}
          unit="req/s"
          trend="up"
          trendValue="+12%"
          color="green"
          loading={isLoading}
        />

        <MetricCard
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          subtitle="Last 24h"
          color="purple"
          loading={isLoading}
        />

        <MetricCard
          title="Success Rate"
          value={`${(successRate * 100).toFixed(1)}%`}
          trend={successRate > 0.95 ? 'up' : 'down'}
          color={successRate > 0.95 ? 'green' : successRate > 0.9 ? 'yellow' : 'red'}
          loading={isLoading}
        />
      </div>

      {/* Provider Health & Cost Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Health */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Provider Health
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Healthy Providers
              </span>
              <span className="text-lg font-bold text-green-600">
                {healthyProviders} / {totalProviders}
              </span>
            </div>

            {providerMetrics.map((provider) => (
              <div
                key={provider.providerId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-3 h-3 rounded-full',
                      provider.status === 'healthy' && 'bg-green-500',
                      provider.status === 'degraded' && 'bg-yellow-500',
                      provider.status === 'down' && 'bg-red-500'
                    )}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {provider.providerName}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {provider.responseTime.toFixed(0)}ms
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {(provider.availability * 100).toFixed(1)}% uptime
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Cost Analytics
          </h2>

          {costMetrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  title="Daily Cost"
                  value={`$${costMetrics.dailyCost.toFixed(2)}`}
                  color="blue"
                  size="sm"
                />
                <MetricCard
                  title="Monthly Cost"
                  value={`$${costMetrics.monthlyCost.toFixed(2)}`}
                  color="purple"
                  size="sm"
                />
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Cache Savings
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${costMetrics.cacheSavings.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This month
                </p>
              </div>

              {costMetrics.forecastedMonthlyCost && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Forecasted: <strong>${costMetrics.forecastedMonthlyCost.toFixed(2)}</strong>
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No cost data available</p>
          )}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <TrendChart
            data={metrics.map(m => ({ timestamp: m.timestamp, value: m.latency }))}
            title="Latency Trend"
            color="#3b82f6"
            dataKey="value"
            formatValue={(v) => `${v.toFixed(0)}ms`}
            loading={isLoading}
          />
        </div>

        {/* Throughput Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <TrendChart
            data={metrics.map(m => ({ timestamp: m.timestamp, value: m.throughput }))}
            title="Throughput Trend"
            color="#10b981"
            dataKey="value"
            formatValue={(v) => `${v.toFixed(1)} req/s`}
            showArea
            loading={isLoading}
          />
        </div>
      </div>

      {/* Queue Metrics */}
      {queueMetrics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Job Queue Status
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Queue Depth"
              value={queueMetrics.queueDepth}
              color="blue"
              size="sm"
            />
            <MetricCard
              title="Processing"
              value={queueMetrics.processingJobs}
              color="yellow"
              size="sm"
            />
            <MetricCard
              title="Completed"
              value={queueMetrics.completedJobs}
              color="green"
              size="sm"
            />
            <MetricCard
              title="Failed"
              value={queueMetrics.failedJobs}
              color="red"
              size="sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIMetricsDashboard;
