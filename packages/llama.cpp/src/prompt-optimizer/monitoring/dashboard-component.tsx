/**
 * Enhanced Prompt Optimization Monitoring Dashboard
 * Real-time metrics visualization with charts and analytics
 */

import React, { useEffect, useState } from 'react';
import { metricsAPI } from './metrics-api';
import type { MetricsSummary, PerformanceMetrics, MetricsAlert } from './index';

interface DashboardProps {
  refreshInterval?: number; // milliseconds
  showCharts?: boolean;
  compact?: boolean;
}

export function PromptOptimizationDashboard({
  refreshInterval = 5000,
  showCharts = true,
  compact = false
}: DashboardProps) {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [alerts, setAlerts] = useState<MetricsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchMetrics = async () => {
    try {
      const response = metricsAPI.getSummary();

      if (response.success && response.data) {
        setSummary(response.data);
        setAlerts(response.data.alerts.recent);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAlerts = async () => {
    const response = metricsAPI.clearAlerts();
    if (response.success) {
      setAlerts([]);
    }
  };

  const handleResetMetrics = async () => {
    const response = metricsAPI.resetMetrics();
    if (response.success) {
      fetchMetrics();
    }
  };

  const handleExportMetrics = async () => {
    const response = metricsAPI.exportMetrics();
    if (response.success && response.data) {
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
        <div className="text-center text-gray-400">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-red-700">
        <div className="text-center text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Prompt Optimization Monitoring</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportMetrics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
          >
            Export
          </button>
          <button
            onClick={handleResetMetrics}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Optimizations"
          value={summary.overview.totalOptimizations}
          trend={summary.trends.successRateTrend}
          icon="📊"
        />
        <MetricCard
          title="Success Rate"
          value={`${(summary.overview.successRate * 100).toFixed(1)}%`}
          trend={summary.trends.successRateTrend}
          icon="✅"
          color={summary.overview.successRate > 0.95 ? 'green' : summary.overview.successRate > 0.85 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="Avg Processing Time"
          value={`${summary.overview.avgProcessingTime.toFixed(0)}ms`}
          trend={summary.trends.processingTimeTrend}
          icon="⚡"
          color={summary.overview.avgProcessingTime < 1000 ? 'green' : summary.overview.avgProcessingTime < 3000 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="Cache Hit Rate"
          value={`${(summary.overview.cacheHitRate * 100).toFixed(1)}%`}
          trend="stable"
          icon="💾"
          color={summary.overview.cacheHitRate > 0.7 ? 'green' : summary.overview.cacheHitRate > 0.5 ? 'yellow' : 'red'}
        />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              ⚠️ Alerts ({alerts.length})
            </h3>
            <button
              onClick={handleClearAlerts}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processing Time Breakdown */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Processing Time Distribution</h3>
          <div className="space-y-3">
            <PercentileStat label="P50 (Median)" value={summary.performance.processingTime.p50} unit="ms" />
            <PercentileStat label="P95" value={summary.performance.processingTime.p95} unit="ms" />
            <PercentileStat label="P99" value={summary.performance.processingTime.p99} unit="ms" />
            <PercentileStat label="Min" value={summary.performance.processingTime.min} unit="ms" />
            <PercentileStat label="Max" value={summary.performance.processingTime.max} unit="ms" />
          </div>
        </div>

        {/* Quality Score Distribution */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quality Score Distribution</h3>
          <div className="space-y-2">
            {Object.entries(summary.performance.qualityScore.distribution).map(([range, count]) => (
              <QualityDistributionBar
                key={range}
                label={range}
                count={count}
                total={summary.overview.totalOptimizations}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Strategy Usage */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Strategy Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(summary.performance.strategyUsage).map(([strategy, stats]) => (
            <StrategyCard key={strategy} strategy={strategy} stats={stats} />
          ))}
        </div>
      </div>

      {/* Time Series Chart */}
      {showCharts && summary.performance.hourlyStats.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Processing Time Trend (Hourly)</h3>
          <SimpleLineChart data={summary.performance.hourlyStats} />
        </div>
      )}
    </div>
  );
}

// Sub-components

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: 'improving' | 'stable' | 'degrading';
  icon: string;
  color?: 'green' | 'yellow' | 'red' | 'blue';
}

function MetricCard({ title, value, trend, icon, color = 'blue' }: MetricCardProps) {
  const colors = {
    green: 'border-green-700 bg-green-900/20',
    yellow: 'border-yellow-700 bg-yellow-900/20',
    red: 'border-red-700 bg-red-900/20',
    blue: 'border-gray-700 bg-gray-900'
  };

  const trendIcons = {
    improving: '📈',
    stable: '➡️',
    degrading: '📉'
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-lg">{trendIcons[trend]}</span>
      </div>
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function AlertItem({ alert }: { alert: MetricsAlert }) {
  const severityColors = {
    critical: 'bg-red-900/30 border-red-700 text-red-300',
    error: 'bg-orange-900/30 border-orange-700 text-orange-300',
    warning: 'bg-yellow-900/30 border-yellow-700 text-yellow-300',
    info: 'bg-blue-900/30 border-blue-700 text-blue-300'
  };

  return (
    <div className={`rounded p-3 border ${severityColors[alert.severity]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{alert.message}</div>
          <div className="text-sm opacity-75 mt-1">
            Current: {alert.currentValue.toFixed(2)} | Threshold: {alert.threshold.toFixed(2)}
          </div>
        </div>
        <div className="text-xs opacity-75">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function PercentileStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">
        {isFinite(value) ? `${value.toFixed(0)}${unit}` : 'N/A'}
      </span>
    </div>
  );
}

function QualityDistributionBar({
  label,
  count,
  total
}: {
  label: string;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm text-gray-300">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StrategyCard({
  strategy,
  stats
}: {
  strategy: string;
  stats: {
    count: number;
    avgProcessingTime: number;
    avgQualityScore: number;
    successRate: number;
  };
}) {
  return (
    <div className="bg-gray-800 rounded p-4 border border-gray-700">
      <div className="font-medium text-white mb-3">{strategy}</div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Count:</span>
          <span className="text-white">{stats.count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Avg Time:</span>
          <span className="text-white">{stats.avgProcessingTime.toFixed(0)}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Avg Quality:</span>
          <span className="text-white">{(stats.avgQualityScore * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Success Rate:</span>
          <span className="text-white">{(stats.successRate * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

function SimpleLineChart({ data }: { data: Array<{ timestamp: number; value: number }> }) {
  if (data.length === 0) {
    return <div className="text-center text-gray-400">No data available</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="relative h-64 bg-gray-800 rounded p-4">
      <svg className="w-full h-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => (
          <line
            key={percent}
            x1="0"
            y1={`${percent}%`}
            x2="100%"
            y2={`${percent}%`}
            stroke="#374151"
            strokeWidth="1"
          />
        ))}

        {/* Line chart */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={data
            .map((point, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - ((point.value - minValue) / range) * 100;
              return `${x},${y}`;
            })
            .join(' ')}
        />

        {/* Data points */}
        {data.map((point, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((point.value - minValue) / range) * 100;
          return (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r="3" fill="#3b82f6" />
          );
        })}
      </polyline>
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 pr-2">
        <span>{maxValue.toFixed(0)}ms</span>
        <span>{((maxValue + minValue) / 2).toFixed(0)}ms</span>
        <span>{minValue.toFixed(0)}ms</span>
      </div>
    </div>
  );
}

export default PromptOptimizationDashboard;
