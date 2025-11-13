# Chart Library Guide

Comprehensive React chart components built with **Recharts 2.15** and **D3.js v7**, featuring theming, accessibility, and export capabilities.

## Features

- **7 Chart Types**: Line, Bar, Area, Scatter, Pie, Radar, Heatmap
- **Dark/Light Themes**: Automatic theme detection with custom theme support
- **Responsive**: Auto-resize with container, mobile-first design
- **Accessible**: WCAG 2.1 AA compliant with ARIA labels and keyboard navigation
- **Export**: PNG, SVG, and CSV export functionality
- **Interactive**: Tooltips, legends, zoom, brush, series toggling
- **TypeScript**: Fully typed with comprehensive interfaces
- **Performant**: Optimized animations and rendering

## Installation

```bash
# Required dependencies
pnpm add recharts@^2.15.0 d3@^7.0.0

# Peer dependencies
pnpm add react@^18.0.0 react-dom@^18.0.0
```

## Quick Start

### Basic Line Chart

```tsx
import { LineChart } from '@/components/charts';

const data = [
  { time: '00:00', cpu: 45, memory: 62 },
  { time: '01:00', cpu: 52, memory: 58 },
  { time: '02:00', cpu: 38, memory: 65 },
];

function MyChart() {
  return (
    <LineChart
      data={data}
      xKey="time"
      yKeys={['cpu', 'memory']}
      title="System Metrics"
      showLegend
      legendLabels={{ cpu: 'CPU Usage (%)', memory: 'Memory Usage (%)' }}
      height={300}
      showExport
    />
  );
}
```

### Bar Chart with Stacking

```tsx
import { BarChart } from '@/components/charts';

const data = [
  { category: 'Q1', revenue: 4500, expenses: 2400 },
  { category: 'Q2', revenue: 5200, expenses: 2800 },
  { category: 'Q3', revenue: 6100, expenses: 3200 },
];

function FinancialChart() {
  return (
    <BarChart
      data={data}
      xKey="category"
      yKeys={['revenue', 'expenses']}
      stacked
      showValues
      layout="vertical"
      title="Quarterly Financials"
    />
  );
}
```

### Area Chart with Gradients

```tsx
import { AreaChart } from '@/components/charts';

function TrafficChart() {
  return (
    <AreaChart
      data={data}
      xKey="date"
      yKeys={['organic', 'paid', 'social']}
      gradient
      stacked
      enableBrush
      title="Website Traffic Sources"
    />
  );
}
```

### Scatter Chart (Bubble Chart)

```tsx
import { ScatterChart } from '@/components/charts';

const data = [
  { x: 100, y: 200, size: 50, group: 'A' },
  { x: 120, y: 180, size: 75, group: 'A' },
  { x: 140, y: 220, size: 60, group: 'B' },
];

function CorrelationChart() {
  return (
    <ScatterChart
      data={data}
      xKey="x"
      yKey="y"
      sizeKey="size"
      groupKey="group"
      showRegressionLine
      title="Correlation Analysis"
    />
  );
}
```

### Pie/Donut Chart

```tsx
import { PieChart } from '@/components/charts';

const data = [
  { name: 'Chrome', value: 45 },
  { name: 'Firefox', value: 25 },
  { name: 'Safari', value: 20 },
  { name: 'Edge', value: 10 },
];

function BrowserShareChart() {
  return (
    <PieChart
      data={data}
      dataKey="value"
      nameKey="name"
      innerRadius={60} // 0 for pie, >0 for donut
      showPercentage
      activeShape
      title="Browser Market Share"
    />
  );
}
```

### Radar Chart

```tsx
import { RadarChart } from '@/components/charts';

const data = [
  { skill: 'React', current: 90, target: 95 },
  { skill: 'TypeScript', current: 85, target: 90 },
  { skill: 'Node.js', current: 75, target: 85 },
  { skill: 'GraphQL', current: 70, target: 80 },
  { skill: 'Docker', current: 65, target: 85 },
];

function SkillsChart() {
  return (
    <RadarChart
      data={data}
      angleKey="skill"
      radiusKeys={['current', 'target']}
      filled
      title="Skills Assessment"
    />
  );
}
```

### Heatmap Chart (D3.js)

```tsx
import { HeatmapChart } from '@/components/charts';

const data = [
  { day: 'Mon', hour: '9am', commits: 5 },
  { day: 'Mon', hour: '10am', commits: 12 },
  { day: 'Tue', hour: '9am', commits: 8 },
  // ... more data
];

function CommitActivityChart() {
  return (
    <HeatmapChart
      data={data}
      xKey="hour"
      yKey="day"
      valueKey="commits"
      colorRange={['#eef2ff', '#4338ca']}
      showValues
      title="Commit Activity Heatmap"
      tooltipFormatter={(val) => `${val} commits`}
    />
  );
}
```

## Theming

### Using Default Themes

```tsx
import { LineChart, CHART_THEMES } from '@/components/charts';

// Light mode (default)
<LineChart data={data} xKey="x" yKeys="y" theme="light" />

// Dark mode
<LineChart data={data} xKey="x" yKeys="y" theme="dark" />
```

### Custom Theme

```tsx
import { LineChart } from '@/components/charts';
import type { ChartTheme } from '@/types/charts';

const customTheme: Partial<ChartTheme> = {
  colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a'],
  backgroundColor: '#1a1a2e',
  textColor: '#eee',
  gridColor: '#333',
  tooltipBg: '#16213e',
  tooltipText: '#fff',
};

function ThemedChart() {
  return (
    <LineChart
      data={data}
      xKey="x"
      yKeys="y"
      customTheme={customTheme}
    />
  );
}
```

## Export Features

All charts support PNG, SVG, and CSV export:

```tsx
<LineChart
  data={data}
  xKey="x"
  yKeys="y"
  showExport // Enable export buttons
  title="My Chart" // Used as default filename
/>
```

## File Structure

```
packages/ui/src/
├── components/charts/
│   ├── LineChart.tsx        # Line chart component
│   ├── BarChart.tsx         # Bar chart component
│   ├── AreaChart.tsx        # Area chart component
│   ├── ScatterChart.tsx     # Scatter/bubble chart component
│   ├── PieChart.tsx         # Pie/donut chart component
│   ├── RadarChart.tsx       # Radar chart component
│   ├── HeatmapChart.tsx     # Heatmap chart (D3.js)
│   └── index.ts             # Barrel export
├── hooks/
│   └── useChartTheme.ts     # Theme hook
├── utils/
│   └── chartExport.ts       # Export utilities
└── types/
    └── charts.ts            # TypeScript definitions
```

## Chart Types Reference

| Chart Type | Best For | Key Props |
|-----------|----------|-----------|
| **LineChart** | Time series, trends | `xKey`, `yKeys`, `lineType`, `enableBrush` |
| **BarChart** | Comparisons, categories | `xKey`, `yKeys`, `stacked`, `layout` |
| **AreaChart** | Volume over time | `xKey`, `yKeys`, `gradient`, `stacked` |
| **ScatterChart** | Correlations, distributions | `xKey`, `yKey`, `sizeKey`, `groupKey` |
| **PieChart** | Proportions, composition | `dataKey`, `nameKey`, `innerRadius` |
| **RadarChart** | Multi-metric comparison | `angleKey`, `radiusKeys`, `filled` |
| **HeatmapChart** | 2D intensity data | `xKey`, `yKey`, `valueKey`, `colorRange` |

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## License

MIT License
