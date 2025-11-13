# Performance Optimization Quick Reference

## When to Use What

### Canvas vs SVG Charts

```typescript
// Use Canvas for:
✅ > 1,000 data points
✅ Real-time updates (high frequency)
✅ Simple line/area charts
✅ Performance-critical visualizations

// Use SVG for:
✅ < 1,000 data points
✅ Interactive charts (hover effects)
✅ Complex shapes and annotations
✅ Accessibility requirements
```

### Virtual Scrolling Decision Tree

```typescript
if (items.length > 100) {
  if (itemsHaveFixedHeight) {
    return <VirtualTable />; // Use useVirtualization
  } else {
    return <VirtualVariableTable />; // Use useVariableVirtualization
  }
} else {
  return <RegularTable />; // No virtualization needed
}
```

## Common Patterns

### 1. Large Dataset Chart

```typescript
import { CanvasLineChart } from '@/components/charts/CanvasLineChart';

<CanvasLineChart
  data={largeDataset}
  config={{
    downsample: true,
    downsampleThreshold: 1000,
  }}
/>
```

### 2. Virtual Table with Search

```typescript
import { VirtualTable } from '@/components/charts/VirtualTable';
import { useDebounce } from '@/utils/performance';

const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

const filtered = useMemo(
  () => data.filter(item => item.name.includes(debouncedSearch)),
  [data, debouncedSearch]
);

<VirtualTable data={filtered} columns={columns} />
```

### 3. Web Worker Data Processing

```typescript
import { WorkerPool } from '@/utils/performance';

const worker = new WorkerPool('/workers/dataProcessor.worker.js');
const result = await worker.execute('parseCSV', { csvText });
```

### 4. Lazy Loading Images

```typescript
import { LazyImage } from '@/components/dashboard/PerformanceDashboard';

<LazyImage src="large-image.jpg" alt="Description" />
```

## Performance Checklist

### Before Deployment

- [ ] Charts with > 1k points use Canvas
- [ ] Lists with > 100 items use virtualization
- [ ] Search inputs are debounced (300ms)
- [ ] Scroll handlers are throttled (100ms)
- [ ] Images use lazy loading
- [ ] Heavy computations use Web Workers
- [ ] Components use React.memo where appropriate
- [ ] Expensive calculations use useMemo
- [ ] Callbacks use useCallback

### After Deployment

- [ ] Lighthouse score > 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Memory usage < 100MB
- [ ] No memory leaks detected

## Quick Fixes

### Problem: Slow Chart Rendering

```typescript
// Before
<LineChart data={tenThousandPoints} />

// After
<CanvasLineChart
  data={tenThousandPoints}
  config={{ downsample: true, downsampleThreshold: 1000 }}
/>
```

### Problem: Laggy Scrolling

```typescript
// Before
{items.map(item => <Row {...item} />)}

// After
<VirtualTable data={items} columns={columns} rowHeight={48} />
```

### Problem: Janky Search

```typescript
// Before
<input onChange={(e) => performSearch(e.target.value)} />

// After
const debouncedSearch = useDebounce(searchQuery, 300);
<input onChange={(e) => setSearchQuery(e.target.value)} />
```

### Problem: Slow Data Processing

```typescript
// Before
const processed = heavyTransform(data); // Blocks UI

// After
const worker = new WorkerPool('/workers/dataProcessor.worker.js');
const processed = await worker.execute('transform', { data });
```

## Performance Targets Reference

| Metric | Target | Critical |
|--------|--------|----------|
| Chart Render | < 16ms | < 50ms |
| Table Scroll | < 100ms | < 200ms |
| Search Delay | 300ms | 500ms |
| Image Load | < 500ms | < 1s |
| Memory Usage | < 100MB | < 200MB |
| FPS | 60fps | 30fps |

## File Locations

```
packages/ui/src/
├── utils/
│   ├── canvasRenderer.ts        # Canvas chart rendering
│   └── performance.ts           # Performance utilities
├── hooks/
│   └── useVirtualization.ts     # Virtual scrolling hooks
├── components/
│   ├── charts/
│   │   ├── CanvasLineChart.tsx  # Canvas chart component
│   │   └── VirtualTable.tsx     # Virtual table/grid
│   └── dashboard/
│       └── PerformanceDashboard.tsx  # Example dashboard
└── workers/
    └── dataProcessor.worker.ts  # Web Worker
```

## Import Cheat Sheet

```typescript
// Canvas rendering
import { CanvasLineChart } from '@/components/charts/CanvasLineChart';
import { CanvasChartRenderer, generateTestData } from '@/utils/canvasRenderer';

// Virtual scrolling
import { VirtualTable, VirtualGrid } from '@/components/charts/VirtualTable';
import { useVirtualization, useLazyImage } from '@/hooks/useVirtualization';

// Performance
import {
  debounce,
  throttle,
  useDebounce,
  useThrottle,
  WorkerPool,
  PerformanceMonitor,
} from '@/utils/performance';
```

## Configuration Presets

### High Performance (10k+ points)

```typescript
const config = {
  downsample: true,
  downsampleThreshold: 500,
  smooth: false,
  showGrid: false,
  lineWidth: 1,
};
```

### Balanced (1k-10k points)

```typescript
const config = {
  downsample: true,
  downsampleThreshold: 1000,
  smooth: true,
  showGrid: true,
  lineWidth: 2,
};
```

### Quality (< 1k points)

```typescript
const config = {
  downsample: false,
  smooth: true,
  showGrid: true,
  showAxes: true,
  lineWidth: 2,
};
```

## Monitoring Snippets

### Check Render Performance

```typescript
import { useRenderTime } from '@/utils/performance';

function MyComponent() {
  useRenderTime('MyComponent');
  // Logs warning if > 16ms
}
```

### Track FPS

```typescript
import { FPSMonitor } from '@/utils/performance';

const fpsMonitor = new FPSMonitor();
fpsMonitor.start();

setInterval(() => {
  console.log(`FPS: ${fpsMonitor.getCurrentFPS().toFixed(1)}`);
}, 1000);
```

### Memory Usage

```typescript
import { getMemoryUsage } from '@/utils/performance';

const memory = getMemoryUsage();
if (memory) {
  console.log(`Heap: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
}
```

## Test Commands

```bash
# Run all tests
npm test

# Run performance benchmarks
npm run test:performance

# Run Lighthouse audit
npm run lighthouse

# Watch mode
npm run test:watch
```

## Support

- Full docs: `/packages/ui/docs/PERFORMANCE_OPTIMIZATION.md`
- Examples: `/packages/ui/docs/EXAMPLES.md`
- Implementation: `/docs/PERFORMANCE_OPTIMIZATION_IMPLEMENTATION.md`
