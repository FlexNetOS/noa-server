import { requestInterceptor } from '@/services/request-interceptor';
import { formatDuration, formatNumber } from '@/utils/format';
import { useEffect, useState } from 'react';

interface OptimizationStats {
  totalRequests: number;
  optimizedRequests: number;
  bypassedRequests: number;
  cachedRequests: number;
  failedRequests: number;
  avgProcessingTime: number;
}

export function PromptOptimizationMonitor() {
  const [stats, setStats] = useState<OptimizationStats | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Get initial stats
    setStats(requestInterceptor.getStats());

    // Update stats every 5 seconds
    const interval = setInterval(() => {
      setStats(requestInterceptor.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleEnabled = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    requestInterceptor.setEnabled(newState);
  };

  const handleResetStats = () => {
    requestInterceptor.resetStats();
    setStats(requestInterceptor.getStats());
  };

  if (!stats) {
    return (
      <div className="rounded-lg border border-brand-border bg-brand-card p-6">
        <h2 className="mb-4 text-xl font-bold text-white">Prompt Optimization Monitor</h2>
        <div className="text-center text-brand-muted">Loading...</div>
      </div>
    );
  }

  const optimizationRate =
    stats.totalRequests > 0 ? (stats.optimizedRequests / stats.totalRequests) * 100 : 0;

  const cacheHitRate =
    stats.totalRequests > 0
      ? ((stats.cachedRequests + stats.bypassedRequests) / stats.totalRequests) * 100
      : 0;

  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Prompt Optimization Monitor</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleEnabled}
            className={`rounded px-3 py-1 text-sm font-medium ${
              isEnabled ? 'bg-brand-success text-white' : 'bg-brand-warning text-white'
            }`}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={handleResetStats}
            className="rounded bg-brand-muted px-3 py-1 text-sm font-medium text-white hover:bg-brand-border"
          >
            Reset Stats
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mb-4">
        <div
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
            isEnabled
              ? 'border border-brand-success/30 bg-brand-success/20 text-brand-success'
              : 'border border-brand-warning/30 bg-brand-warning/20 text-brand-warning'
          }`}
        >
          <div
            className={`mr-2 h-2 w-2 rounded-full ${
              isEnabled ? 'bg-brand-success' : 'bg-brand-warning'
            }`}
          />
          {isEnabled ? 'Active - Optimizing Requests' : 'Inactive - Requests Pass Through'}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <p className="mb-1 text-sm text-brand-muted">Total Requests</p>
          <p className="text-2xl font-bold text-white">{formatNumber(stats.totalRequests)}</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-brand-muted">Optimized</p>
          <p className="text-2xl font-bold text-brand-success">
            {formatNumber(stats.optimizedRequests)}
          </p>
          <p className="text-xs text-brand-muted">{optimizationRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-brand-muted">Cached/Bypassed</p>
          <p className="text-2xl font-bold text-brand-info">
            {formatNumber(stats.cachedRequests + stats.bypassedRequests)}
          </p>
          <p className="text-xs text-brand-muted">{cacheHitRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-brand-muted">Avg Processing</p>
          <p className="text-2xl font-bold text-white">{formatDuration(stats.avgProcessingTime)}</p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-brand-border py-2">
          <span className="text-brand-muted">Successfully Optimized</span>
          <span className="font-medium text-white">{formatNumber(stats.optimizedRequests)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-brand-border py-2">
          <span className="text-brand-muted">Cache Hits</span>
          <span className="font-medium text-white">{formatNumber(stats.cachedRequests)}</span>
        </div>
        <div className="flex items-center justify-between border-b border-brand-border py-2">
          <span className="text-brand-muted">Bypassed Requests</span>
          <span className="font-medium text-white">{formatNumber(stats.bypassedRequests)}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-brand-muted">Failed Requests</span>
          <span
            className={`font-medium ${stats.failedRequests > 0 ? 'text-brand-warning' : 'text-white'}`}
          >
            {formatNumber(stats.failedRequests)}
          </span>
        </div>
      </div>

      {/* Performance Note */}
      {stats.avgProcessingTime > 100 && (
        <div className="mt-4 rounded border border-brand-warning/30 bg-brand-warning/10 p-3">
          <p className="text-sm text-brand-warning">
            ⚠️ High average processing time detected ({formatDuration(stats.avgProcessingTime)}).
            Consider enabling caching or adjusting quality thresholds.
          </p>
        </div>
      )}
    </div>
  );
}
