/**
 * Analytics Page
 * Data insights and visualization dashboard
 */

import React from 'react';
import { DataTable } from '../components/analytics/DataTable';
import { FilterPanel } from '../components/analytics/FilterPanel';
import { AggregationPanel } from '../components/analytics/AggregationPanel';
import { useDataAnalytics } from '../hooks/useDataAnalytics';
import { useRouteStateMultiple } from '../hooks/useRouteState';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import type { ColumnConfig } from '../types/analytics';

const AnalyticsPage: React.FC = () => {
  // Sample dataset for analytics
  const sampleData = [
    { id: 1, name: 'Item A', value: 120, category: 'A', date: '2024-01-01' },
    { id: 2, name: 'Item B', value: 150, category: 'A', date: '2024-01-02' },
    { id: 3, name: 'Item C', value: 180, category: 'B', date: '2024-01-03' },
  ];

  const { processedData, loading } = useDataAnalytics({
    data: sampleData,
    filters: [],
    groupBy: null,
    sortBy: [],
  });

  // Sync analytics state with URL
  const [state, setState] = useRouteStateMultiple({
    view: { defaultValue: 'table' as 'table' | 'chart' },
    chartType: { defaultValue: 'line' as 'line' | 'bar' },
    timeRange: { defaultValue: '7d' },
  });

  // Sample chart data
  const chartData = [
    { date: '2024-01-01', value: 120, category: 'A' },
    { date: '2024-01-02', value: 150, category: 'A' },
    { date: '2024-01-03', value: 180, category: 'A' },
    { date: '2024-01-04', value: 140, category: 'B' },
    { date: '2024-01-05', value: 200, category: 'B' },
    { date: '2024-01-06', value: 170, category: 'B' },
    { date: '2024-01-07', value: 190, category: 'C' },
  ];

  // Sample column configurations
  const columns: ColumnConfig[] = [
    {
      id: 'id',
      header: 'ID',
      accessorKey: 'id',
      visible: true,
      pinned: false,
      sortable: true,
      filterable: true,
      resizable: true,
      width: 100,
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      visible: true,
      pinned: false,
      sortable: true,
      filterable: true,
      resizable: true,
      width: 200,
    },
    {
      id: 'value',
      header: 'Value',
      accessorKey: 'value',
      visible: true,
      pinned: false,
      sortable: true,
      filterable: true,
      resizable: true,
      width: 150,
    },
  ];

  return (
    <div className="page-container h-full flex flex-col">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-description">
              Explore and analyze your data
            </p>
          </div>

          {/* View controls */}
          <div className="flex items-center gap-2">
            <select
              value={state.timeRange}
              onChange={(e) => setState({ timeRange: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>

            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button
                onClick={() => setState({ view: 'table' })}
                className={`px-3 py-2 rounded transition-colors text-sm ${
                  state.view === 'table'
                    ? 'bg-white dark:bg-gray-700'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setState({ view: 'chart' })}
                className={`px-3 py-2 rounded transition-colors text-sm ${
                  state.view === 'chart'
                    ? 'bg-white dark:bg-gray-700'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Chart
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-6 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left sidebar - Filters */}
        <aside className="col-span-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <FilterPanel columns={columns} />

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Aggregations</h2>
            <AggregationPanel columns={columns} />
          </div>
        </aside>

        {/* Main content */}
        <div className="col-span-9 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {state.view === 'table' ? (
            <div className="h-full overflow-auto">
              <DataTable
                data={processedData as any[]}
                columns={columns}
                loading={loading}
              />
            </div>
          ) : (
            <div className="h-full p-6">
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setState({ chartType: 'line' })}
                  className={`px-3 py-1 rounded text-sm ${
                    state.chartType === 'line'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  Line Chart
                </button>
                <button
                  onClick={() => setState({ chartType: 'bar' })}
                  className={`px-3 py-1 rounded text-sm ${
                    state.chartType === 'bar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  Bar Chart
                </button>
              </div>

              {state.chartType === 'line' ? (
                <LineChart
                  data={chartData}
                  xKey="date"
                  yKeys={['value']}
                  height={400}
                />
              ) : (
                <BarChart
                  data={chartData}
                  xKey="date"
                  yKeys={['value']}
                  height={400}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
