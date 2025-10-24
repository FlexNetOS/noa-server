/**
 * Performance-Optimized Dashboard Component
 *
 * Demonstrates all performance optimization techniques:
 * - Canvas rendering for charts
 * - Virtual scrolling for tables
 * - Lazy loading for images
 * - Memoization and debouncing
 * - Web Workers for data processing
 */

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { CanvasLineChart } from '../charts/CanvasLineChart';
import { VirtualTable, Column } from '../charts/VirtualTable';
import { DataPoint, generateTestData } from '../../utils/canvasRenderer';
import { useDebounce } from '../../utils/performance';
import { useLazyImage } from '../../hooks/useVirtualization';

interface MetricRow {
  id: number;
  timestamp: number;
  value: number;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export const PerformanceDashboard = memo(() => {
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [tableData, setTableData] = useState<MetricRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Generate large dataset on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate 10k chart points
      const chartPoints = generateTestData(10000);
      setChartData(chartPoints);

      // Generate 50k table rows
      const rows: MetricRow[] = Array.from({ length: 50000 }, (_, i) => ({
        id: i + 1,
        timestamp: Date.now() - i * 1000,
        value: Math.random() * 100,
        status: ['success', 'warning', 'error'][Math.floor(Math.random() * 3)] as any,
        message: `Metric event ${i + 1}`,
      }));
      setTableData(rows);

      setIsLoading(false);
    };

    loadData();
  }, []);

  // Filter table data based on search
  const filteredData = useMemo(() => {
    if (!debouncedSearch) return tableData;

    return tableData.filter(
      (row) =>
        row.message.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        row.id.toString().includes(debouncedSearch)
    );
  }, [tableData, debouncedSearch]);

  // Table columns with custom renderers
  const columns = useMemo<Column<MetricRow>[]>(
    () => [
      {
        key: 'id',
        label: 'ID',
        width: 100,
      },
      {
        key: 'timestamp',
        label: 'Timestamp',
        width: 200,
        render: (value: number) => new Date(value).toLocaleString(),
      },
      {
        key: 'value',
        label: 'Value',
        width: 120,
        render: (value: number) => value.toFixed(2),
      },
      {
        key: 'status',
        label: 'Status',
        width: 120,
        render: (value: string) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(value)}`}
          >
            {value.toUpperCase()}
          </span>
        ),
      },
      {
        key: 'message',
        label: 'Message',
        render: (value: string) => <span className="truncate">{value}</span>,
      },
    ],
    []
  );

  const handleRowClick = useCallback((row: MetricRow, index: number) => {
    console.log('Clicked row:', row, 'at index:', index);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Performance Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Handling 10k+ chart points and 50k+ table rows with optimal performance
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Chart Points"
            value={chartData.length.toLocaleString()}
            trend="+12%"
            color="blue"
          />
          <StatCard
            title="Table Rows"
            value={tableData.length.toLocaleString()}
            trend="+8%"
            color="green"
          />
          <StatCard
            title="Filtered Results"
            value={filteredData.length.toLocaleString()}
            trend={debouncedSearch ? '-15%' : '0%'}
            color="purple"
          />
        </div>

        {/* Chart Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Real-time Metrics (10k points)
          </h2>
          <CanvasLineChart
            data={chartData}
            width={1000}
            height={400}
            config={{
              colors: {
                line: '#3b82f6',
                fill: 'rgba(59, 130, 246, 0.1)',
                grid: '#e5e7eb',
                axis: '#6b7280',
              },
              showGrid: true,
              showAxes: true,
              smooth: true,
              downsample: true,
              downsampleThreshold: 1000,
            }}
          />
        </div>

        {/* Table Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Event Log (50k rows)
            </h2>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <VirtualTable
            data={filteredData}
            columns={columns}
            rowHeight={56}
            containerHeight={500}
            overscan={10}
            onRowClick={handleRowClick}
            emptyMessage="No events found"
          />
        </div>
      </div>
    </div>
  );
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

/**
 * Stat Card Component
 */
const StatCard = memo<{
  title: string;
  value: string;
  trend: string;
  color: 'blue' | 'green' | 'purple';
}>(({ title, value, trend, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</div>
      <div className="mt-2 flex items-baseline">
        <div className="text-3xl font-semibold text-gray-900 dark:text-white">{value}</div>
        <div className={`ml-2 rounded-full px-2 py-1 text-xs font-semibold ${colorClasses[color]}`}>
          {trend}
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

/**
 * Helper function to get status color classes
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

/**
 * Lazy Image Component
 */
export const LazyImage = memo<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}>(({ src, alt, width, height, className = '' }) => {
  const { ref, src: imageSrc, isLoaded } = useLazyImage(src);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
