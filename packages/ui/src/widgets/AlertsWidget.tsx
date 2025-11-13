/**
 * Alerts Widget
 *
 * Active alerts and notifications
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

export const AlertsWidget: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  const fetchData = async (): Promise<WidgetData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const severities = ['info', 'warning', 'error', 'critical'] as const;
    const sources = ['API Gateway', 'Database', 'Cache Server', 'Load Balancer', 'Background Jobs'];
    const messages = [
      'High CPU usage detected',
      'Disk space running low',
      'Unusual traffic pattern detected',
      'Database connection pool exhausted',
      'SSL certificate expiring soon',
      'Failed backup job',
      'API rate limit exceeded',
      'Memory usage above threshold',
    ];

    return {
      alerts: Array.from({ length: 8 }, (_, i) => ({
        id: `alert-${i}`,
        timestamp: new Date(Date.now() - i * 600000).toISOString(),
        severity: severities[Math.floor(Math.random() * severities.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        acknowledged: false,
      })),
    };
  };

  const { data, isLoading } = useWidgetData(id, fetchData, settings.refreshInterval);
  const widgetData = propData || data;

  const alerts = (widgetData?.alerts || []).filter(
    (alert) => !acknowledgedAlerts.has(alert.id)
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'error':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '🔴';
      case 'critical':
        return '🚨';
      default:
        return '📢';
    }
  };

  const handleAcknowledge = (alertId: string) => {
    setAcknowledgedAlerts((prev) => new Set([...prev, alertId]));
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (isLoading && !widgetData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const errorCount = alerts.filter((a) => a.severity === 'error').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="alerts-widget h-full flex flex-col">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-xs text-gray-600">Critical</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{errorCount}</div>
          <div className="text-xs text-gray-600">Errors</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
          <div className="text-xs text-gray-600">Warnings</div>
        </div>
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">{getSeverityIcon(alert.severity)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm uppercase">
                      {alert.severity}
                    </div>
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-70 transition-colors"
                      title="Acknowledge"
                    >
                      ✓
                    </button>
                  </div>
                  <div className="text-sm mb-1">{alert.message}</div>
                  <div className="flex items-center justify-between text-xs opacity-75">
                    <span>{alert.source}</span>
                    <span>{getTimeAgo(alert.timestamp)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {alerts.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">✅</div>
            <div>No active alerts</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsWidget;
