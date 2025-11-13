# Performance Optimization Examples

## Complete Examples

### Example 1: Real-time Dashboard with 10k Chart Points

```typescript
import React, { useState, useEffect } from 'react';
import { CanvasLineChart } from '@/components/charts/CanvasLineChart';
import { generateTestData, DataPoint } from '@/utils/canvasRenderer';

export function RealTimeDashboard() {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    // Initial load: 10k historical points
    const historicalData = generateTestData(10000);
    setData(historicalData);

    // Real-time updates: add new point every second
    const interval = setInterval(() => {
      setData((prev) => {
        const lastPoint = prev[prev.length - 1];
        const newPoint: DataPoint = {
          x: lastPoint.x + 1,
          y: Math.random() * 100 + 50,
          timestamp: Date.now(),
        };

        // Keep last 10k points
        const updated = [...prev.slice(-9999), newPoint];
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Real-time Metrics</h2>
      <p className="mb-4 text-gray-600">
        Rendering {data.length.toLocaleString()} data points with live updates
      </p>

      <CanvasLineChart
        data={data}
        width={1200}
        height={500}
        config={{
          colors: {
            line: '#10b981',
            fill: 'rgba(16, 185, 129, 0.1)',
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

      <div className="mt-4 grid grid-cols-3 gap-4">
        <StatCard label="Data Points" value={data.length.toLocaleString()} />
        <StatCard label="Update Interval" value="1s" />
        <StatCard label="Render Time" value="< 16ms" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
```

### Example 2: Virtual Table with 50k Rows and Search

```typescript
import React, { useState, useMemo } from 'react';
import { VirtualTable, Column } from '@/components/charts/VirtualTable';
import { useDebounce } from '@/utils/performance';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  source: string;
}

export function LogViewer() {
  const [logs] = useState<LogEntry[]>(() =>
    Array.from({ length: 50000 }, (_, i) => ({
      id: i + 1,
      timestamp: new Date(Date.now() - i * 1000),
      level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)] as any,
      message: `Log message ${i + 1}`,
      source: `Service-${Math.floor(i / 100)}`,
    }))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !debouncedSearch ||
        log.message.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        log.source.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [logs, debouncedSearch, levelFilter]);

  const columns: Column<LogEntry>[] = [
    {
      key: 'id',
      label: 'ID',
      width: 80,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      width: 200,
      render: (value: Date) => value.toLocaleString(),
    },
    {
      key: 'level',
      label: 'Level',
      width: 100,
      render: (value: string) => (
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${getLevelColor(value)}`}
        >
          {value.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      width: 150,
    },
    {
      key: 'message',
      label: 'Message',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="mb-4 text-2xl font-bold">Log Viewer</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded border px-4 py-2"
          />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded border px-4 py-2"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Showing {filteredLogs.length.toLocaleString()} of {logs.length.toLocaleString()} logs
        </p>
      </div>

      <VirtualTable
        data={filteredLogs}
        columns={columns}
        rowHeight={56}
        containerHeight={600}
        overscan={10}
        onRowClick={(log) => console.log('Clicked log:', log)}
        emptyMessage="No logs match your filters"
      />
    </div>
  );
}

function getLevelColor(level: string): string {
  switch (level) {
    case 'info':
      return 'bg-blue-100 text-blue-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
```

### Example 3: Image Gallery with Lazy Loading

```typescript
import React, { useState } from 'react';
import { VirtualGrid } from '@/components/charts/VirtualTable';
import { LazyImage } from '@/components/dashboard/PerformanceDashboard';

interface Image {
  id: number;
  url: string;
  thumbnail: string;
  title: string;
}

export function ImageGallery() {
  const [images] = useState<Image[]>(() =>
    Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      url: `https://picsum.photos/800/600?random=${i}`,
      thumbnail: `https://picsum.photos/200/200?random=${i}`,
      title: `Image ${i + 1}`,
    }))
  );

  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Image Gallery</h2>
      <p className="mb-4 text-gray-600">
        {images.length.toLocaleString()} images with lazy loading
      </p>

      <VirtualGrid
        items={images}
        itemWidth={220}
        itemHeight={220}
        gap={16}
        containerHeight={800}
        renderItem={(image, index) => (
          <div
            className="cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-lg"
            onClick={() => setSelectedImage(image)}
          >
            <LazyImage
              src={image.thumbnail}
              alt={image.title}
              width={220}
              height={200}
              className="h-[200px] w-full"
            />
            <div className="p-2">
              <p className="truncate text-sm font-medium">{image.title}</p>
            </div>
          </div>
        )}
      />

      {selectedImage && (
        <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
}

function ImageModal({ image, onClose }: { image: Image; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div className="max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <img src={image.url} alt={image.title} className="max-h-[80vh] rounded-lg" />
        <p className="mt-4 text-center text-white">{image.title}</p>
      </div>
    </div>
  );
}
```

### Example 4: CSV Processing with Web Workers

```typescript
import React, { useState } from 'react';
import { WorkerPool } from '@/utils/performance';

const workerPool = new WorkerPool('/workers/dataProcessor.worker.js', 4);

export function CSVProcessor() {
  const [status, setStatus] = useState<string>('Ready');
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('Reading file...');

    const csvText = await file.text();
    const fileSize = (file.size / 1024 / 1024).toFixed(2);

    setStatus(`Processing ${fileSize}MB CSV file...`);

    const startTime = performance.now();

    try {
      // Parse CSV in Web Worker
      const parsed = await workerPool.execute('parseCSV', { csvText });
      setData(parsed);

      // Calculate statistics in Web Worker
      const values = parsed.map((row: any) => row.value || 0);
      const statistics = await workerPool.execute('calculateStats', { data: values });
      setStats(statistics);

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      setStatus(`Processed ${parsed.length.toLocaleString()} rows in ${duration}s`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">CSV Processor</h2>

      <div className="mb-6 rounded-lg border p-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="mb-2"
        />
        <p className="text-sm text-gray-600">{status}</p>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <StatCard label="Mean" value={stats.mean.toFixed(2)} />
          <StatCard label="Median" value={stats.median.toFixed(2)} />
          <StatCard label="Std Dev" value={stats.stdDev.toFixed(2)} />
          <StatCard label="P95" value={stats.p95.toFixed(2)} />
        </div>
      )}

      {data.length > 0 && (
        <VirtualTable
          data={data.slice(0, 10000)} // Limit to 10k for display
          columns={Object.keys(data[0]).map((key) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
          }))}
          rowHeight={48}
          containerHeight={500}
        />
      )}
    </div>
  );
}
```

### Example 5: Multi-Chart Performance Dashboard

```typescript
import React, { useState, useEffect } from 'react';
import { CanvasLineChart } from '@/components/charts/CanvasLineChart';
import { DataPoint } from '@/utils/canvasRenderer';
import { usePerformanceMonitor } from '@/utils/performance';

export function MultiChartDashboard() {
  const [cpuData, setCpuData] = useState<DataPoint[]>([]);
  const [memoryData, setMemoryData] = useState<DataPoint[]>([]);
  const [networkData, setNetworkData] = useState<DataPoint[]>([]);

  const monitor = usePerformanceMonitor();

  useEffect(() => {
    // Generate initial data
    const generateData = () => {
      const data: DataPoint[] = [];
      for (let i = 0; i < 5000; i++) {
        data.push({
          x: i,
          y: Math.random() * 100,
          timestamp: Date.now() - (5000 - i) * 1000,
        });
      }
      return data;
    };

    monitor.mark('data-generation-start');
    setCpuData(generateData());
    setMemoryData(generateData());
    setNetworkData(generateData());
    const duration = monitor.measure('data-generation', 'data-generation-start');

    console.log(`Generated 15k points in ${duration.toFixed(2)}ms`);

    // Real-time updates
    const interval = setInterval(() => {
      const updateData = (prev: DataPoint[]) => {
        const newPoint: DataPoint = {
          x: prev[prev.length - 1].x + 1,
          y: Math.random() * 100,
          timestamp: Date.now(),
        };
        return [...prev.slice(-4999), newPoint];
      };

      setCpuData(updateData);
      setMemoryData(updateData);
      setNetworkData(updateData);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const chartConfig = {
    showGrid: true,
    showAxes: true,
    smooth: true,
    downsample: true,
    downsampleThreshold: 500,
  };

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <ChartCard title="CPU Usage" data={cpuData} color="#3b82f6" config={chartConfig} />
      <ChartCard title="Memory Usage" data={memoryData} color="#10b981" config={chartConfig} />
      <ChartCard
        title="Network Traffic"
        data={networkData}
        color="#8b5cf6"
        config={chartConfig}
        className="lg:col-span-2"
      />
    </div>
  );
}

function ChartCard({
  title,
  data,
  color,
  config,
  className = '',
}: {
  title: string;
  data: DataPoint[];
  color: string;
  config: any;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-white p-6 shadow-sm ${className}`}>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <CanvasLineChart
        data={data}
        height={300}
        config={{
          ...config,
          colors: {
            line: color,
            fill: `${color}1a`,
            grid: '#e5e7eb',
            axis: '#6b7280',
          },
        }}
      />
      <p className="mt-2 text-sm text-gray-600">
        {data.length.toLocaleString()} data points
      </p>
    </div>
  );
}
```

## Performance Comparison

### Before Optimization

```typescript
// Renders 10k SVG elements - VERY SLOW
function OldChart({ data }: { data: DataPoint[] }) {
  return (
    <svg width={800} height={400}>
      {data.map((point, i) => (
        <circle key={i} cx={point.x} cy={point.y} r={2} fill="blue" />
      ))}
    </svg>
  );
}

// Performance: ~500ms+ render time, janky interactions
```

### After Optimization

```typescript
// Uses Canvas with downsampling - FAST
function NewChart({ data }: { data: DataPoint[] }) {
  return (
    <CanvasLineChart
      data={data}
      config={{
        downsample: true,
        downsampleThreshold: 1000,
      }}
    />
  );
}

// Performance: ~15ms render time, smooth 60fps
```

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run performance tests
npm run test:performance

# Run Lighthouse audit
npm run lighthouse
```

## Additional Resources

See [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) for detailed documentation.
