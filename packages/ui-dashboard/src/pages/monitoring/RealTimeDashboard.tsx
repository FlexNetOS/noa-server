import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';

import { AlertsPanel } from './AlertsPanel';
import { MetricsChart } from './MetricsChart';
import { SystemHealth } from './SystemHealth';
import { useWebSocket } from '../../hooks/useWebSocket';

import type { TelemetryData } from '../../types';

export function RealTimeDashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'network' | 'agents'>(
    'cpu'
  );

  // Real-time WebSocket connection
  const { isConnected, lastMessage } = useWebSocket({
    url: `ws://${window.location.host}/api/ws/telemetry`,
    onMessage: (data: any) => {
      setTelemetry(data);
      // Keep last 50 data points for charts
      setHistoricalData((prev) => {
        const updated = [...prev, { ...data, timestamp: Date.now() }];
        return updated.slice(-50);
      });
    },
  });

  useEffect(() => {
    // Fetch initial telemetry data
    fetchTelemetry();
  }, []);

  const fetchTelemetry = async () => {
    try {
      const response = await fetch('/api/telemetry');
      const data = await response.json();
      setTelemetry(data);
    } catch (error) {
      console.error('Failed to fetch telemetry:', error);
    }
  };

  if (!telemetry) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  const activeAlerts = telemetry.systemHealth.status !== 'healthy' ? 1 : 0;

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-none border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Real-Time Monitoring
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Live system metrics and performance data
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 animate-pulse rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                aria-label={isConnected ? 'Connected' : 'Disconnected'}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>

            {activeAlerts > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-red-800 dark:bg-red-900 dark:text-red-200">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">{activeAlerts} Active Alerts</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Metric Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Agents
              </h3>
              <svg
                className="h-5 w-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              {telemetry.swarmMetrics.activeAgents} / {telemetry.swarmMetrics.totalAgents}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {(
                (telemetry.swarmMetrics.activeAgents / telemetry.swarmMetrics.totalAgents) *
                100
              ).toFixed(1)}
              % utilization
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Task Throughput
              </h3>
              <svg
                className="h-5 w-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              {telemetry.swarmMetrics.throughput.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">tasks/second</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Avg Response Time
              </h3>
              <svg
                className="h-5 w-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
              {telemetry.swarmMetrics.avgResponseTime.toFixed(0)}ms
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">average latency</div>
          </motion.div>
        </div>

        {/* System Health */}
        <div className="mb-6">
          <SystemHealth health={telemetry.systemHealth} />
        </div>

        {/* Charts */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MetricsChart
            title="CPU Usage"
            data={historicalData}
            dataKey="systemHealth.cpu"
            color="#3b82f6"
            unit="%"
          />
          <MetricsChart
            title="Memory Usage"
            data={historicalData}
            dataKey="systemHealth.memory"
            color="#8b5cf6"
            unit="%"
          />
          <MetricsChart
            title="Network Throughput"
            data={historicalData}
            dataKey="systemHealth.network.throughput"
            color="#10b981"
            unit="MB/s"
          />
          <MetricsChart
            title="Active Agents"
            data={historicalData}
            dataKey="swarmMetrics.activeAgents"
            color="#f59e0b"
            unit=""
          />
        </div>

        {/* Alerts */}
        <AlertsPanel systemHealth={telemetry.systemHealth} />
      </div>
    </div>
  );
}

export default RealTimeDashboard;
