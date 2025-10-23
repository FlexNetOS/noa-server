/**
 * Provider Health Monitor Component
 * Real-time health monitoring for AI providers with status indicators and sparklines
 */

import React, { useMemo } from 'react';
import { useAIMetrics } from './context/AIMetricsContext';
import { ProviderStatus, CircuitBreakerState } from './types';
import { Sparklines, SparklinesLine } from 'recharts';
import clsx from 'clsx';
import { format } from 'date-fns';

export interface ProviderHealthMonitorProps {
  className?: string;
  showCircuitBreaker?: boolean;
  showResponseTime?: boolean;
  showFallbackEvents?: boolean;
}

const statusConfig = {
  [ProviderStatus.HEALTHY]: {
    color: 'bg-green-500',
    textColor: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-700',
    label: 'Healthy'
  },
  [ProviderStatus.DEGRADED]: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-700',
    label: 'Degraded'
  },
  [ProviderStatus.DOWN]: {
    color: 'bg-red-500',
    textColor: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-700',
    label: 'Down'
  },
  [ProviderStatus.UNKNOWN]: {
    color: 'bg-gray-500',
    textColor: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-700',
    label: 'Unknown'
  }
};

const circuitBreakerConfig = {
  [CircuitBreakerState.CLOSED]: {
    label: 'Closed',
    color: 'text-green-600 dark:text-green-400',
    icon: '🟢'
  },
  [CircuitBreakerState.OPEN]: {
    label: 'Open',
    color: 'text-red-600 dark:text-red-400',
    icon: '🔴'
  },
  [CircuitBreakerState.HALF_OPEN]: {
    label: 'Half-Open',
    color: 'text-yellow-600 dark:text-yellow-400',
    icon: '🟡'
  }
};

export const ProviderHealthMonitor: React.FC<ProviderHealthMonitorProps> = ({
  className,
  showCircuitBreaker = true,
  showResponseTime = true,
  showFallbackEvents = false
}) => {
  const { providerMetrics, isLoading } = useAIMetrics();

  // Mock response time history (in production, this would come from metrics)
  const generateSparklineData = (baseValue: number) => {
    return Array.from({ length: 60 }, (_, i) => ({
      value: baseValue + Math.random() * 20 - 10
    }));
  };

  const sortedProviders = useMemo(() => {
    return [...providerMetrics].sort((a, b) => {
      const statusPriority = {
        [ProviderStatus.DOWN]: 0,
        [ProviderStatus.DEGRADED]: 1,
        [ProviderStatus.HEALTHY]: 2,
        [ProviderStatus.UNKNOWN]: 3
      };
      return statusPriority[a.status] - statusPriority[b.status];
    });
  }, [providerMetrics]);

  if (isLoading) {
    return (
      <div className={clsx('animate-pulse space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Provider Health Monitor
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">Degraded</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Down</span>
          </div>
        </div>
      </div>

      {sortedProviders.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No provider data available
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedProviders.map((provider) => {
            const config = statusConfig[provider.status];
            const sparklineData = generateSparklineData(provider.responseTime);

            return (
              <div
                key={provider.providerId}
                className={clsx(
                  'rounded-lg border-2 p-6 transition-all duration-200',
                  config.bgColor,
                  config.borderColor
                )}
              >
                {/* Provider Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-4 h-4 rounded-full', config.color)} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {provider.providerName}
                      </h3>
                      {provider.modelId && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Model: {provider.modelId}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={clsx('text-sm font-semibold', config.textColor)}>
                      {config.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(provider.availability * 100).toFixed(2)}% uptime
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Response Time
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {provider.responseTime.toFixed(0)}ms
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Throughput
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {provider.throughput.toFixed(1)} req/s
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Error Rate
                    </p>
                    <p
                      className={clsx(
                        'text-xl font-bold',
                        provider.errorRate < 0.01
                          ? 'text-green-600 dark:text-green-400'
                          : provider.errorRate < 0.05
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {(provider.errorRate * 100).toFixed(2)}%
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Total Requests
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {provider.totalRequests.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Response Time Sparkline */}
                {showResponseTime && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Response Time (Last 60 minutes)
                    </p>
                    <div className="h-16">
                      <Sparklines data={sparklineData.map(d => d.value)} width={400} height={60}>
                        <SparklinesLine
                          color={provider.status === ProviderStatus.HEALTHY ? '#10b981' : '#ef4444'}
                          style={{ strokeWidth: 2 }}
                        />
                      </Sparklines>
                    </div>
                  </div>
                )}

                {/* Circuit Breaker Status */}
                {showCircuitBreaker && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Circuit Breaker:
                      </span>
                      <span className={clsx('text-sm font-semibold', circuitBreakerConfig[provider.circuitBreakerState].color)}>
                        {circuitBreakerConfig[provider.circuitBreakerState].icon}{' '}
                        {circuitBreakerConfig[provider.circuitBreakerState].label}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Last updated: {format(new Date(provider.timestamp), 'HH:mm:ss')}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderHealthMonitor;
