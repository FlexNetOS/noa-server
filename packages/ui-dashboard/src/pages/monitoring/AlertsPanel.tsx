import React, { useState } from 'react';

import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import type { SystemHealth, SystemAlert } from '../../types/admin';

interface AlertsPanelProps {
  systemHealth: SystemHealth;
}

export function AlertsPanel({ systemHealth }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  // Generate alerts based on system health
  React.useEffect(() => {
    const newAlerts: SystemAlert[] = [];

    if (systemHealth.cpu > 90) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        severity: 'critical',
        category: 'resource',
        title: 'High CPU Usage',
        message: `CPU usage is at ${systemHealth.cpu.toFixed(1)}%. System performance may be degraded.`,
        source: 'system-monitor',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    } else if (systemHealth.cpu > 75) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        severity: 'warning',
        category: 'resource',
        title: 'Elevated CPU Usage',
        message: `CPU usage is at ${systemHealth.cpu.toFixed(1)}%. Monitor for potential issues.`,
        source: 'system-monitor',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    if (systemHealth.memory > 90) {
      newAlerts.push({
        id: `mem-${Date.now()}`,
        severity: 'critical',
        category: 'resource',
        title: 'High Memory Usage',
        message: `Memory usage is at ${systemHealth.memory.toFixed(1)}%. System may run out of memory.`,
        source: 'system-monitor',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    } else if (systemHealth.memory > 75) {
      newAlerts.push({
        id: `mem-${Date.now()}`,
        severity: 'warning',
        category: 'resource',
        title: 'Elevated Memory Usage',
        message: `Memory usage is at ${systemHealth.memory.toFixed(1)}%. Monitor for potential issues.`,
        source: 'system-monitor',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    if (!systemHealth.services.mcp) {
      newAlerts.push({
        id: `mcp-${Date.now()}`,
        severity: 'error',
        category: 'system',
        title: 'MCP Server Offline',
        message: 'MCP server is not responding. Check server status and logs.',
        source: 'service-monitor',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    if (!systemHealth.services.neural) {
      newAlerts.push({
        id: `neural-${Date.now()}`,
        severity: 'warning',
        category: 'system',
        title: 'Neural Processing Offline',
        message: 'Neural processing service is unavailable. AI features may be limited.',
        source: 'service-monitor',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    setAlerts(newAlerts);
  }, [systemHealth]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/70 dark:text-red-300 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const handleResolve = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Alerts</h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {alerts.length} Active
          </span>
        </div>
      </div>

      <div className="p-6">
        {alerts.length === 0 ? (
          <div className="py-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              All systems operational
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No active alerts at this time
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`rounded-lg border-2 p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-none">{getSeverityIcon(alert.severity)}</div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold">{alert.title}</h4>
                        <span className="flex-none text-xs opacity-75">
                          {format(new Date(alert.timestamp), 'p')}
                        </span>
                      </div>

                      <p className="mb-2 text-sm opacity-90">{alert.message}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs opacity-75">
                          <span>{alert.category}</span>
                          <span>•</span>
                          <span>{alert.source}</span>
                        </div>

                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="rounded px-2 py-1 text-xs font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default AlertsPanel;
