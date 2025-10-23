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
      <div className="bg-brand-card border border-brand-border rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Prompt Optimization Monitor</h2>
        <div className="text-center text-brand-muted">Loading...</div>
      </div>
    );
  }

  const optimizationRate = stats.totalRequests > 0
    ? (stats.optimizedRequests / stats.totalRequests) * 100
    : 0;

  const cacheHitRate = stats.totalRequests > 0
    ? ((stats.cachedRequests + stats.bypassedRequests) / stats.totalRequests) * 100
    : 0;

  return (
    <div className="bg-brand-card border border-brand-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Prompt Optimization Monitor</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleEnabled}
            className={`px-3 py-1 rounded text-sm font-medium ${
              isEnabled
                ? 'bg-brand-success text-white'
                : 'bg-brand-warning text-white'
            }`}
          >
            {isEnabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={handleResetStats}
            className="px-3 py-1 rounded text-sm font-medium bg-brand-muted text-white hover:bg-brand-border"
          >
            Reset Stats
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isEnabled
            ? 'bg-brand-success/20 text-brand-success border border-brand-success/30'
            : 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isEnabled ? 'bg-brand-success' : 'bg-brand-warning'
          }`} />
          {isEnabled ? 'Active - Optimizing Requests' : 'Inactive - Requests Pass Through'}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <p className="text-sm text-brand-muted mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-white">{formatNumber(stats.totalRequests)}</p>
        </div>
        <div>
          <p className="text-sm text-brand-muted mb-1">Optimized</p>
          <p className="text-2xl font-bold text-brand-success">{formatNumber(stats.optimizedRequests)}</p>
          <p className="text-xs text-brand-muted">{optimizationRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-sm text-brand-muted mb-1">Cached/Bypassed</p>
          <p className="text-2xl font-bold text-brand-info">{formatNumber(stats.cachedRequests + stats.bypassedRequests)}</p>
          <p className="text-xs text-brand-muted">{cacheHitRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-sm text-brand-muted mb-1">Avg Processing</p>
          <p className="text-2xl font-bold text-white">{formatDuration(stats.avgProcessingTime)}</p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-brand-border">
          <span className="text-brand-muted">Successfully Optimized</span>
          <span className="text-white font-medium">{formatNumber(stats.optimizedRequests)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-brand-border">
          <span className="text-brand-muted">Cache Hits</span>
          <span className="text-white font-medium">{formatNumber(stats.cachedRequests)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-brand-border">
          <span className="text-brand-muted">Bypassed Requests</span>
          <span className="text-white font-medium">{formatNumber(stats.bypassedRequests)}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-brand-muted">Failed Requests</span>
          <span className={`font-medium ${stats.failedRequests > 0 ? 'text-brand-warning' : 'text-white'}`}>
            {formatNumber(stats.failedRequests)}
          </span>
        </div>
      </div>

      {/* Performance Note */}
      {stats.avgProcessingTime > 100 && (
        <div className="mt-4 p-3 bg-brand-warning/10 border border-brand-warning/30 rounded">
          <p className="text-sm text-brand-warning">
            ⚠️ High average processing time detected ({formatDuration(stats.avgProcessingTime)}).
            Consider enabling caching or adjusting quality thresholds.
          </p>
        </div>
      )}
    </div>
  );
}
