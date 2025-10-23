/**
 * Cost Analytics Dashboard Component
 * Real-time cost tracking, forecasting, and ROI analysis
 */

import React, { useMemo, useState } from 'react';
import { useAIMetrics } from './context/AIMetricsContext';
import MetricCard from './shared/MetricCard';
import TrendChart from './shared/TrendChart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import clsx from 'clsx';

export interface CostAnalyticsDashboardProps {
  className?: string;
  showForecasting?: boolean;
  showBreakdown?: boolean;
  budgetLimit?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const CostAnalyticsDashboard: React.FC<CostAnalyticsDashboardProps> = ({
  className,
  showForecasting = true,
  showBreakdown = true,
  budgetLimit
}) => {
  const { costMetrics, isLoading } = useAIMetrics();
  const [selectedView, setSelectedView] = useState<'provider' | 'model' | 'user'>('provider');

  // Calculate cost trends (mock data - in production, fetch from API)
  const costTrends = useMemo(() => {
    if (!costMetrics) return [];

    const now = Date.now();
    return Array.from({ length: 30 }, (_, i) => ({
      timestamp: now - (29 - i) * 24 * 60 * 60 * 1000,
      value: costMetrics.dailyCost * (0.8 + Math.random() * 0.4)
    }));
  }, [costMetrics]);

  // Prepare breakdown data
  const breakdownData = useMemo(() => {
    if (!costMetrics) return [];

    const data = selectedView === 'provider'
      ? costMetrics.costByProvider
      : selectedView === 'model'
      ? costMetrics.costByModel
      : costMetrics.costByUser;

    return Object.entries(data).map(([name, cost]) => ({
      name,
      cost: Number(cost)
    })).sort((a, b) => b.cost - a.cost);
  }, [costMetrics, selectedView]);

  // Calculate budget utilization
  const budgetUtilization = useMemo(() => {
    if (!budgetLimit || !costMetrics) return null;

    return {
      used: costMetrics.monthlyCost,
      remaining: budgetLimit - costMetrics.monthlyCost,
      percentage: (costMetrics.monthlyCost / budgetLimit) * 100
    };
  }, [budgetLimit, costMetrics]);

  if (isLoading) {
    return (
      <div className={clsx('animate-pulse space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (!costMetrics) {
    return (
      <div className={clsx('text-center py-12 text-gray-500 dark:text-gray-400', className)}>
        No cost data available
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Cost Analytics
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {new Date(costMetrics.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Cost"
          value={`$${costMetrics.totalCost.toFixed(2)}`}
          subtitle="All time"
          color="blue"
        />

        <MetricCard
          title="Daily Cost"
          value={`$${costMetrics.dailyCost.toFixed(2)}`}
          trend="up"
          trendValue="+8%"
          color="purple"
        />

        <MetricCard
          title="Monthly Cost"
          value={`$${costMetrics.monthlyCost.toFixed(2)}`}
          subtitle={showForecasting && costMetrics.forecastedMonthlyCost
            ? `Forecast: $${costMetrics.forecastedMonthlyCost.toFixed(2)}`
            : undefined}
          color={budgetUtilization && budgetUtilization.percentage > 80 ? 'yellow' : 'green'}
        />

        <MetricCard
          title="Cache Savings"
          value={`$${costMetrics.cacheSavings.toFixed(2)}`}
          trend="up"
          trendValue={`${((costMetrics.cacheSavings / costMetrics.monthlyCost) * 100).toFixed(1)}%`}
          color="green"
        />
      </div>

      {/* Budget Alert */}
      {budgetUtilization && budgetUtilization.percentage > 80 && (
        <div className={clsx(
          'rounded-lg border-2 p-4',
          budgetUtilization.percentage > 95
            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
            : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
        )}>
          <p className={clsx(
            'font-semibold',
            budgetUtilization.percentage > 95
              ? 'text-red-800 dark:text-red-300'
              : 'text-yellow-800 dark:text-yellow-300'
          )}>
            {budgetUtilization.percentage > 95 ? '🚨 Budget Exceeded!' : '⚠️ Budget Warning'}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {budgetUtilization.percentage.toFixed(1)}% of monthly budget used
            (${budgetUtilization.used.toFixed(2)} / ${budgetLimit?.toFixed(2)})
          </p>
        </div>
      )}

      {/* Cost Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
        <TrendChart
          data={costTrends}
          title="Daily Cost Trend (30 days)"
          color="#3b82f6"
          dataKey="value"
          formatValue={(v) => `$${v.toFixed(2)}`}
          formatTimestamp={(ts) => new Date(ts).toLocaleDateString()}
          showArea
        />
      </div>

      {/* Cost Breakdown */}
      {showBreakdown && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Cost Breakdown
            </h3>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedView('provider')}
                className={clsx(
                  'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                  selectedView === 'provider'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
              >
                By Provider
              </button>
              <button
                onClick={() => setSelectedView('model')}
                className={clsx(
                  'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                  selectedView === 'model'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
              >
                By Model
              </button>
              <button
                onClick={() => setSelectedView('user')}
                className={clsx(
                  'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                  selectedView === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
              >
                By User
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={breakdownData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#f3f4f6'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                  />
                  <Bar dataKey="cost" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={breakdownData.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cost"
                  >
                    {breakdownData.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#f3f4f6'
                    }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                    Name
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">
                    Cost
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdownData.map((item, index) => (
                  <tr
                    key={item.name}
                    className={clsx(
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    )}
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">
                      ${item.cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                      {((item.cost / costMetrics.monthlyCost) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ROI Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Cache ROI
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Savings</span>
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                ${costMetrics.cacheSavings.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Cost Reduction</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {((costMetrics.cacheSavings / costMetrics.monthlyCost) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {showForecasting && costMetrics.forecastedMonthlyCost && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Monthly Forecast
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Current</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ${costMetrics.monthlyCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Projected</span>
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  ${costMetrics.forecastedMonthlyCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostAnalyticsDashboard;
