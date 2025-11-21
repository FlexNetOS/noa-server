# Charts Quick Reference Card

## Import

```tsx
import {
  LineChart,
  BarChart,
  AreaChart,
  ScatterChart,
  PieChart,
  RadarChart,
  HeatmapChart,
  useChartTheme,
  exportToPNG,
  exportToSVG,
  exportToCSV,
} from '@noa/ui/charts';
```

## Chart Types

### LineChart

**Best for**: Time series, trends, continuous data

```tsx
<LineChart
  data={data}
  xKey="time"
  yKeys={['cpu', 'memory']}
  lineType="monotone"
  showDots={false}
  enableBrush
  showLegend
/>
```

**Key Props**: `lineType`, `showDots`, `strokeDashArray`, `strokeWidth`, `enableZoom`, `enableBrush`

---

### BarChart

**Best for**: Comparisons, categories, discrete data

```tsx
<BarChart
  data={data}
  xKey="category"
  yKeys={['value1', 'value2']}
  layout="vertical"
  stacked
  showValues
/>
```

**Key Props**: `layout`, `stacked`, `barSize`, `barGap`, `showValues`

---

### AreaChart

**Best for**: Volume over time, cumulative data

```tsx
<AreaChart
  data={data}
  xKey="date"
  yKeys="value"
  gradient
  fillOpacity={0.3}
  stacked
/>
```

**Key Props**: `gradient`, `fillOpacity`, `stacked`, `areaType`, `enableBrush`

---

### ScatterChart

**Best for**: Correlations, distributions, outliers

```tsx
<ScatterChart
  data={data}
  xKey="x"
  yKey="y"
  sizeKey="size"
  groupKey="category"
  shape="circle"
/>
```

**Key Props**: `sizeKey`, `groupKey`, `shape`, `showRegressionLine`

---

### PieChart

**Best for**: Proportions, composition, percentages

```tsx
<PieChart
  data={data}
  dataKey="value"
  nameKey="name"
  innerRadius={60}
  showPercentage
  activeShape
/>
```

**Key Props**: `innerRadius`, `outerRadius`, `paddingAngle`, `showLabels`, `showPercentage`, `legendPosition`

---

### RadarChart

**Best for**: Multi-dimensional comparisons

```tsx
<RadarChart
  data={data}
  angleKey="metric"
  radiusKeys={['team1', 'team2']}
  filled
  fillOpacity={0.6}
/>
```

**Key Props**: `filled`, `fillOpacity`, `dotSize`

---

### HeatmapChart

**Best for**: 2D intensity data, patterns

```tsx
<HeatmapChart
  data={data}
  xKey="hour"
  yKey="day"
  valueKey="count"
  colorRange={['#fff', '#000']}
  showValues
/>
```

**Key Props**: `colorScale`, `colorRange`, `showValues`, `cellBorderWidth`, `tooltipFormatter`

---

## Common Props (All Charts)

```tsx
interface BaseChartProps {
  data: any[];
  height?: number;           // Default: 300
  width?: string | number;   // Default: '100%'
  animate?: boolean;         // Default: true
  theme?: 'light' | 'dark';
  customTheme?: Partial<ChartTheme>;
  title?: string;
  showExport?: boolean;      // Default: false
  className?: string;
  ariaLabel?: string;
  loading?: boolean;
  error?: string;
}
```

---

## Theming

### Use Default Theme

```tsx
<LineChart theme="dark" {...props} />
```

### Custom Theme

```tsx
const customTheme = {
  colors: ['#ff0000', '#00ff00', '#0000ff'],
  backgroundColor: '#1a1a2e',
  textColor: '#eee',
  gridColor: '#333',
};

<LineChart customTheme={customTheme} {...props} />
```

### Use Theme Hook

```tsx
const theme = useChartTheme({ mode: 'dark' });
const colors = useChartColors(5);
```

---

## Export

### Enable Export Buttons

```tsx
<LineChart showExport title="My Chart" {...props} />
```

### Programmatic Export

```tsx
const chartRef = useRef<HTMLDivElement>(null);

const handleExport = async () => {
  const svg = chartRef.current?.querySelector('svg');
  if (svg) {
    await exportToPNG(svg, { format: 'png', filename: 'chart' });
  }
};

<div ref={chartRef}>
  <LineChart {...props} />
</div>
```

---

## Legend & Tooltips

### Custom Legend Labels

```tsx
<LineChart
  yKeys={['metric1', 'metric2']}
  legendLabels={{
    metric1: 'CPU Usage',
    metric2: 'Memory Usage',
  }}
  showLegend
/>
```

### Custom Tooltip Formatter

```tsx
<LineChart
  tooltipFormatter={(value, name) => [`${value}ms`, name]}
/>
```

---

## Loading & Error States

```tsx
<LineChart
  loading={isLoading}
  error={error?.message}
  {...props}
/>
```

---

## Accessibility

All charts automatically include:
- ARIA labels
- Keyboard navigation
- WCAG 2.1 AA color contrast
- Screen reader support

Override default label:

```tsx
<LineChart
  ariaLabel="Chart showing temperature trends from 2020 to 2025"
  {...props}
/>
```

---

## Performance Tips

```tsx
// Memoize data transformations
const chartData = useMemo(() =>
  rawData.map(transform),
  [rawData]
);

// Disable animations for real-time data
<LineChart
  data={chartData}
  animate={false}
  {...props}
/>

// Limit data points
const recentData = useMemo(() =>
  data.slice(-100),
  [data]
);
```

---

## Common Patterns

### Real-time Streaming Chart

```tsx
const [data, setData] = useState([]);

useEffect(() => {
  const interval = setInterval(() => {
    setData(prev => [
      ...prev.slice(-99),
      { time: new Date(), value: Math.random() * 100 }
    ]);
  }, 1000);
  return () => clearInterval(interval);
}, []);

<LineChart
  data={data}
  xKey="time"
  yKeys="value"
  animate={false}
  enableBrush
/>
```

### Multi-series Toggle

```tsx
// Legend click automatically toggles series visibility
<LineChart
  yKeys={['series1', 'series2', 'series3']}
  showLegend
  legendLabels={{
    series1: 'Production',
    series2: 'Staging',
    series3: 'Development',
  }}
/>
```

### Responsive Dashboard

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <LineChart {...props} />
  <BarChart {...props} />
  <AreaChart {...props} className="col-span-full" />
  <PieChart {...props} />
</div>
```

---

## Browser Support

✅ Chrome/Edge 90+
✅ Firefox 88+
✅ Safari 14+
✅ Mobile (iOS Safari 14+, Chrome Mobile)

---

## TypeScript

Full type safety included:

```tsx
import type {
  LineChartProps,
  ChartTheme,
  ChartDataPoint,
} from '@noa/ui/charts';

const data: ChartDataPoint[] = [
  { x: 1, y: 100 },
];

const props: LineChartProps = {
  data,
  xKey: 'x',
  yKeys: 'y',
};
```

---

## Resources

- 📚 Full Guide: `/docs/charts-library-guide.md`
- 💻 Examples: `packages/ui/src/components/charts/examples.tsx`
- 📝 Implementation: `/docs/charts-implementation-summary.md`
- 🔧 Types: `packages/ui/src/types/charts.ts`
