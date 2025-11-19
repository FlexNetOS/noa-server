# Performance Optimization Guide

## Overview

This package includes comprehensive performance optimizations for handling large datasets (10k+ data points) with minimal performance impact. All optimizations target 60fps rendering and sub-100ms interaction times.

## Performance Targets

### Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8s
- **TTI (Time to Interactive)**: < 3.8s

### Component Performance
- **Chart Rendering**: < 16ms (60fps)
- **Table Virtualization**: < 100ms scroll
- **Image Preview Load**: < 500ms
- **Dashboard Initial Load**: < 2s
- **Memory Usage**: < 100MB for 10k rows

## Features

### 1. Canvas Rendering (`canvasRenderer.ts`)

High-performance canvas-based chart rendering for large datasets.

```typescript
import { CanvasChartRenderer, generateTestData } from '@/utils/canvasRenderer';

const canvas = document.getElementById('chart') as HTMLCanvasElement;
const renderer = new CanvasChartRenderer(canvas, {
  width: 800,
  height: 400,
  colors: {
    line: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.1)',
  },
  downsample: true,
  downsampleThreshold: 1000,
});

const data = generateTestData(10000);
renderer.setData(data);
```

**Key Features:**
- LTTB (Largest Triangle Three Buckets) downsampling algorithm
- Offscreen canvas for complex rendering
- High-DPI display support
- Request Animation Frame optimization
- Batch drawing operations

**Performance:**
- 1,000 points: < 16ms
- 10,000 points: < 50ms (with downsampling)
- 100,000 points: < 100ms (aggressive downsampling)

### 2. Virtual Scrolling (`useVirtualization.ts`)

Efficient rendering of large lists and tables by only rendering visible items.

```typescript
import { useVirtualization } from '@/hooks/useVirtualization';

function LargeList({ items }) {
  const { virtualItems, virtualRange, totalHeight, handleScroll } = useVirtualization(items, {
    itemHeight: 50,
    containerHeight: 600,
    overscan: 5,
  });

  return (
    <div style={{ height: 600, overflow: 'auto' }} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${virtualRange.offsetTop}px)` }}>
          {virtualItems.map((item, index) => (
            <div key={virtualRange.start + index} style={{ height: 50 }}>
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Hooks Available:**
- `useVirtualization` - Fixed-height items
- `useVariableVirtualization` - Variable-height items
- `useGridVirtualization` - Grid layouts
- `useIntersectionObserver` - Lazy loading
- `useLazyImage` - Lazy image loading
- `useInfiniteScroll` - Infinite scrolling

**Performance:**
- Constant memory usage regardless of dataset size
- < 100ms scroll lag
- Supports 100k+ items

### 3. Web Workers (`dataProcessor.worker.ts`)

Offload heavy computations to background threads.

```typescript
import { WorkerPool } from '@/utils/performance';

const workerPool = new WorkerPool('/workers/dataProcessor.worker.js', 4);

// Parse large CSV in background
const data = await workerPool.execute('parseCSV', { csvText: largeCSV });

// Aggregate time-series data
const aggregated = await workerPool.execute('aggregateByTime', {
  data: rawData,
  timeField: 'timestamp',
  valueField: 'value',
  bucketSize: 60000, // 1 minute buckets
});

// Calculate statistics
const stats = await workerPool.execute('calculateStats', { data: values });
```

**Supported Operations:**
- CSV/JSON parsing
- Data aggregation
- Statistical calculations
- Downsampling (LTTB algorithm)
- Chart data transformation
- Moving averages

### 4. Performance Utilities (`performance.ts`)

Comprehensive utilities for optimizing React applications.

```typescript
import {
  debounce,
  throttle,
  useDebounce,
  useThrottle,
  memoize,
  PerformanceMonitor,
  useRenderTime,
} from '@/utils/performance';

// Debounce search input
const handleSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

// Throttle scroll events
const handleScroll = throttle((event: Event) => {
  updateScrollPosition(event);
}, 100);

// Monitor render performance
const MyComponent = () => {
  useRenderTime('MyComponent');

  return <div>Content</div>;
};

// Performance monitoring
const monitor = new PerformanceMonitor();
monitor.mark('start');
// ... expensive operation
monitor.measure('operation', 'start');
const stats = monitor.getStats('operation');
console.log(`Average: ${stats.mean}ms, P95: ${stats.p95}ms`);
```

**Utilities Available:**
- `debounce` / `useDebounce` - Delay function execution
- `throttle` / `useThrottle` - Limit function execution rate
- `memoize` - Cache function results (LRU)
- `PerformanceMonitor` - Measure and track performance
- `useRenderTime` - Measure component render time
- `BatchUpdater` - Batch DOM updates using RAF
- `WorkerPool` - Manage Web Worker pool
- `FPSMonitor` - Monitor frame rate

## Components

### CanvasLineChart

Optimized line chart using Canvas API.

```typescript
import { CanvasLineChart } from '@/components/charts/CanvasLineChart';

<CanvasLineChart
  data={chartData}
  width={800}
  height={400}
  config={{
    colors: {
      line: '#3b82f6',
      fill: 'rgba(59, 130, 246, 0.1)',
    },
    smooth: true,
    downsample: true,
    downsampleThreshold: 1000,
  }}
  onDataPointHover={(point) => console.log(point)}
/>
```

### VirtualTable

High-performance table with virtual scrolling.

```typescript
import { VirtualTable, Column } from '@/components/charts/VirtualTable';

const columns: Column<DataRow>[] = [
  { key: 'id', label: 'ID', width: 100 },
  { key: 'name', label: 'Name', width: 200 },
  {
    key: 'value',
    label: 'Value',
    render: (value) => value.toFixed(2),
  },
];

<VirtualTable
  data={tableData}
  columns={columns}
  rowHeight={48}
  containerHeight={600}
  onRowClick={(row, index) => console.log(row)}
/>
```

### VirtualGrid

Grid layout with virtualization for image galleries.

```typescript
import { VirtualGrid } from '@/components/charts/VirtualTable';

<VirtualGrid
  items={images}
  itemWidth={200}
  itemHeight={200}
  gap={16}
  containerHeight={600}
  renderItem={(image, index) => (
    <img src={image.url} alt={image.alt} />
  )}
/>
```

## Optimization Strategies

### 1. React Memoization

```typescript
// Memoize expensive components
const ExpensiveComponent = memo(({ data }) => {
  // Heavy rendering logic
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data === nextProps.data;
});

// Memoize computed values
const processedData = useMemo(() => {
  return expensiveTransform(rawData);
}, [rawData]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething();
}, [dependency]);
```

### 2. Code Splitting

```typescript
// Lazy load heavy components
const Dashboard = lazy(() => import('./components/Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
```

### 3. Image Optimization

```typescript
import { LazyImage } from '@/components/dashboard/PerformanceDashboard';

<LazyImage
  src="large-image.jpg"
  alt="Description"
  width={400}
  height={300}
/>
```

### 4. Event Handler Optimization

```typescript
// Debounce rapid events
const handleSearchChange = useDebounce((query: string) => {
  performSearch(query);
}, 300);

// Throttle scroll/resize events
const handleScroll = useThrottle((event: Event) => {
  updateUI(event);
}, 100);
```

### 5. Bundle Optimization

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'chart-renderer': ['./src/utils/canvasRenderer.ts'],
          'virtualization': ['./src/hooks/useVirtualization.ts'],
        },
      },
    },
  },
});
```

## Benchmarking

Run performance benchmarks:

```bash
npm run test:performance
```

Example benchmark results:

```
Chart Rendering Performance:
┌─────────────────────┬──────────┬────────┬─────────┐
│ Dataset             │ Duration │ FPS    │ Points  │
├─────────────────────┼──────────┼────────┼─────────┤
│ Small (100 points)  │ 4.23ms   │ 236    │ 100     │
│ Medium (1K points)  │ 12.45ms  │ 80     │ 1,000   │
│ Large (10K points)  │ 38.91ms  │ 26     │ 1,000*  │
│ Very Large (50K)    │ 87.34ms  │ 11     │ 1,000*  │
└─────────────────────┴──────────┴────────┴─────────┘
* Downsampled

Virtual Table Performance:
- 50k rows: < 100ms scroll lag
- Memory: ~50MB constant
- DOM nodes: ~30 (regardless of dataset size)
```

## Best Practices

### DO ✅

1. **Use Canvas for > 1,000 data points**
   ```typescript
   if (dataPoints.length > 1000) {
     return <CanvasLineChart data={dataPoints} />;
   }
   return <SVGLineChart data={dataPoints} />;
   ```

2. **Enable downsampling for large datasets**
   ```typescript
   config={{
     downsample: true,
     downsampleThreshold: 1000,
   }}
   ```

3. **Virtualize long lists**
   ```typescript
   // Instead of:
   {items.map(item => <Row key={item.id} {...item} />)}

   // Use:
   <VirtualTable data={items} columns={columns} />
   ```

4. **Debounce search inputs**
   ```typescript
   const debouncedSearch = useDebounce(searchQuery, 300);
   ```

5. **Lazy load images**
   ```typescript
   <LazyImage src={image.url} alt={image.alt} />
   ```

6. **Memoize expensive calculations**
   ```typescript
   const stats = useMemo(() => calculateStats(data), [data]);
   ```

7. **Use Web Workers for heavy processing**
   ```typescript
   const result = await workerPool.execute('parseCSV', { csvText });
   ```

### DON'T ❌

1. **Don't render all items in large lists**
   ```typescript
   // Bad: Renders 10k DOM nodes
   {items.map(item => <div>{item.name}</div>)}
   ```

2. **Don't use inline functions in render**
   ```typescript
   // Bad: Creates new function on every render
   <button onClick={() => handleClick(id)}>Click</button>

   // Good: Memoized callback
   const handleButtonClick = useCallback(() => handleClick(id), [id]);
   <button onClick={handleButtonClick}>Click</button>
   ```

3. **Don't skip key props**
   ```typescript
   // Bad: No key
   {items.map(item => <Row {...item} />)}

   // Good: Stable key
   {items.map(item => <Row key={item.id} {...item} />)}
   ```

4. **Don't use SVG for > 1,000 points**
   ```typescript
   // Bad performance with large datasets
   <LineChart data={tenThousandPoints} /> // Using Recharts

   // Good: Use Canvas
   <CanvasLineChart data={tenThousandPoints} />
   ```

5. **Don't forget to clean up resources**
   ```typescript
   useEffect(() => {
     const renderer = new CanvasChartRenderer(canvas);

     return () => {
       renderer.destroy(); // Important!
     };
   }, []);
   ```

## Performance Monitoring

### Lighthouse CI

Run Lighthouse audits:

```bash
npm run lighthouse
```

Target scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### Real User Monitoring

```typescript
// Track Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### Custom Performance Metrics

```typescript
const monitor = usePerformanceMonitor();

useEffect(() => {
  monitor.mark('data-load-start');

  loadData().then(() => {
    const duration = monitor.measure('data-load', 'data-load-start');
    console.log(`Data loaded in ${duration}ms`);
  });
}, []);
```

## Troubleshooting

### Slow Chart Rendering

**Symptom:** Chart takes > 50ms to render

**Solutions:**
1. Enable downsampling: `downsample: true, downsampleThreshold: 1000`
2. Reduce overscan: `overscan: 3` (default 5)
3. Disable smooth curves: `smooth: false`
4. Hide grid: `showGrid: false`

### Laggy Scrolling

**Symptom:** Scroll feels janky or delayed

**Solutions:**
1. Increase scroll throttle: `scrollThrottle: 32` (default 16)
2. Reduce overscan: `overscan: 2`
3. Increase item height estimate accuracy
4. Use fixed heights instead of variable

### High Memory Usage

**Symptom:** Browser uses > 500MB memory

**Solutions:**
1. Check for memory leaks (missing `destroy()` calls)
2. Reduce cache sizes in memoization
3. Limit worker pool size: `new WorkerPool(workerPath, 2)`
4. Clear performance monitor: `monitor.clear()`

### Low FPS

**Symptom:** Animations run at < 30fps

**Solutions:**
1. Profile with Chrome DevTools Performance tab
2. Check for expensive renders with `useRenderTime`
3. Add React.memo to heavy components
4. Move calculations to Web Workers
5. Use `requestIdleCallback` for non-critical work

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [React Profiler](https://react.dev/reference/react/Profiler)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

## License

MIT
