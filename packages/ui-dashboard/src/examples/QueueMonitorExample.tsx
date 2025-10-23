/**
 * Queue Monitor Integration Example
 *
 * Complete example showing how to integrate the queue monitoring components
 * into your dashboard. Includes both the main monitor and analytics views
 * with tab-based navigation.
 *
 * @example
 * ```tsx
 * import { QueueMonitorExample } from '@/examples/QueueMonitorExample';
 *
 * function App() {
 *   return <QueueMonitorExample />;
 * }
 * ```
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { QueueMonitor } from '@/components/QueueMonitor';
import { QueueAnalytics } from '@/components/QueueAnalytics';
import { useQueueMonitor } from '@/hooks/useQueueMonitor';

type Tab = 'monitor' | 'analytics';

export function QueueMonitorExample() {
  const [activeTab, setActiveTab] = useState<Tab>('monitor');
  const { metrics, jobs, health, isConnected, isLoading, error, refresh } = useQueueMonitor();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-muted">Loading queue monitor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-brand-muted mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-brand-accent text-white rounded hover:bg-brand-accent/90 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <header className="bg-brand-card border-b border-brand-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Message Queue Dashboard</h1>
            <p className="text-sm text-brand-muted mt-1">
              Real-time monitoring and analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection Status Badge */}
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-bg border border-brand-border rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-sm text-brand-muted">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={refresh}
              className="px-4 py-2 bg-brand-bg border border-brand-border text-white rounded-lg hover:bg-brand-border transition-colors"
              title="Refresh data"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <TabButton
            active={activeTab === 'monitor'}
            onClick={() => setActiveTab('monitor')}
          >
            📊 Monitor
          </TabButton>
          <TabButton
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </TabButton>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'monitor' && <QueueMonitor />}
          {activeTab === 'analytics' && (
            <QueueAnalytics metrics={metrics} jobs={jobs} />
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-card border-t border-brand-border px-8 py-4 mt-8">
        <div className="flex items-center justify-between text-sm text-brand-muted">
          <div>
            <p>Queue Status: <span className={`font-semibold ${health.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}`}>{health.status.toUpperCase()}</span></p>
          </div>
          <div className="flex gap-6">
            <span>Latency: {health.latency}ms</span>
            <span>Error Rate: {(health.errorRate * 100).toFixed(1)}%</span>
            <span>Throughput: {metrics.throughput.toFixed(1)} jobs/sec</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-brand-accent text-white'
          : 'text-brand-muted hover:bg-brand-border hover:text-white'
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/**
 * Standalone Monitor View
 *
 * Use this if you only need the monitor without analytics
 */
export function StandaloneMonitor() {
  return (
    <div className="min-h-screen bg-brand-bg p-8">
      <QueueMonitor />
    </div>
  );
}

/**
 * Standalone Analytics View
 *
 * Use this if you only need analytics without the live monitor
 */
export function StandaloneAnalytics() {
  const { metrics, jobs } = useQueueMonitor();

  return (
    <div className="min-h-screen bg-brand-bg p-8">
      <QueueAnalytics metrics={metrics} jobs={jobs} />
    </div>
  );
}

/**
 * Minimal Monitor Widget
 *
 * Compact widget for embedding in other dashboards
 */
export function QueueMonitorWidget() {
  const { metrics, health, isConnected } = useQueueMonitor();

  return (
    <div className="bg-brand-card border border-brand-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Queue Status</h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-brand-muted mb-1">Active Jobs</p>
          <p className="text-2xl font-bold text-white">{metrics.activeJobs}</p>
        </div>
        <div>
          <p className="text-xs text-brand-muted mb-1">Queue Depth</p>
          <p className="text-2xl font-bold text-white">{metrics.queuedJobs}</p>
        </div>
        <div>
          <p className="text-xs text-brand-muted mb-1">Throughput</p>
          <p className="text-2xl font-bold text-white">{metrics.throughput.toFixed(1)}/s</p>
        </div>
        <div>
          <p className="text-xs text-brand-muted mb-1">Health</p>
          <p className={`text-sm font-bold ${
            health.status === 'healthy' ? 'text-green-400' :
            health.status === 'degraded' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {health.status.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
