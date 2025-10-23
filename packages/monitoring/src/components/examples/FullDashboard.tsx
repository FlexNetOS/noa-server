/**
 * Full Dashboard Example
 * Complete example showing all AI dashboard components integrated together
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AIMetricsProvider,
  AIMetricsDashboard,
  ProviderHealthMonitor,
  CostAnalyticsDashboard,
  AIJobQueueMonitor,
  ModelComparisonChart
} from '../index';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export const FullDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'costs' | 'queue' | 'models'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'providers', label: 'Providers', icon: '🔌' },
    { id: 'costs', label: 'Costs', icon: '💰' },
    { id: 'queue', label: 'Queue', icon: '📋' },
    { id: 'models', label: 'Models', icon: '🤖' }
  ] as const;

  return (
    <QueryClientProvider client={queryClient}>
      <AIMetricsProvider
        config={{
          apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
          websocketUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:3000',
          refreshInterval: 30000,
          enableWebSocket: true,
          darkMode: false,
          maxDataPoints: 100
        }}
      >
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Navigation Tabs */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4">
              <nav className="flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-4 px-3 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 py-8">
            {activeTab === 'overview' && (
              <AIMetricsDashboard
                showAlerts={true}
                autoRefresh={true}
                refreshInterval={30000}
              />
            )}

            {activeTab === 'providers' && (
              <ProviderHealthMonitor
                showCircuitBreaker={true}
                showResponseTime={true}
                showFallbackEvents={false}
              />
            )}

            {activeTab === 'costs' && (
              <CostAnalyticsDashboard
                showForecasting={true}
                showBreakdown={true}
                budgetLimit={1000}
              />
            )}

            {activeTab === 'queue' && (
              <AIJobQueueMonitor
                showWorkerUtilization={true}
                showPriorityDistribution={true}
                showLatencyPercentiles={true}
              />
            )}

            {activeTab === 'models' && (
              <ModelComparisonChart
                maxModels={6}
                showRadarChart={true}
                showScatterPlot={true}
                showTable={true}
              />
            )}
          </div>
        </div>
      </AIMetricsProvider>
    </QueryClientProvider>
  );
};

export default FullDashboard;
