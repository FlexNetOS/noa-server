/**
 * Alert Banner Component
 * Displays alerts and warnings with different severity levels
 */

import React from 'react';
import clsx from 'clsx';
import { Alert } from '../types';

export interface AlertBannerProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
  maxVisible?: number;
  className?: string;
}

const severityConfig = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
    icon: 'ℹ️'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-700',
    text: 'text-yellow-800 dark:text-yellow-300',
    icon: '⚠️'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-700',
    text: 'text-red-800 dark:text-red-300',
    icon: '❌'
  },
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    border: 'border-red-300 dark:border-red-600',
    text: 'text-red-900 dark:text-red-200',
    icon: '🚨'
  }
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onDismiss,
  maxVisible = 5,
  className
}) => {
  const visibleAlerts = alerts
    .filter(alert => !alert.acknowledged)
    .slice(0, maxVisible);

  if (visibleAlerts.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className={clsx('space-y-2', className)}>
      {visibleAlerts.map((alert) => {
        const config = severityConfig[alert.severity];

        return (
          <div
            key={alert.id}
            className={clsx(
              'rounded-lg border-2 p-4 flex items-start gap-3',
              config.bg,
              config.border,
              'transition-all duration-200'
            )}
            role="alert"
          >
            <span className="text-xl flex-shrink-0">{config.icon}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className={clsx('font-semibold', config.text)}>
                  {alert.title}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {formatTimestamp(alert.timestamp)}
                </span>
              </div>

              <p className={clsx('text-sm', config.text, 'opacity-90')}>
                {alert.message}
              </p>

              {alert.source && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Source: {alert.source}
                </p>
              )}
            </div>

            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className={clsx(
                  'flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10',
                  config.text
                )}
                aria-label="Dismiss alert"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      {alerts.filter(a => !a.acknowledged).length > maxVisible && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          + {alerts.filter(a => !a.acknowledged).length - maxVisible} more alerts
        </p>
      )}
    </div>
  );
};

export default AlertBanner;
