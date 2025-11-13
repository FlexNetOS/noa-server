/**
 * Chart Examples
 * Comprehensive examples demonstrating all chart components
 */

import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { AreaChart } from './AreaChart';
import { ScatterChart } from './ScatterChart';
import { PieChart } from './PieChart';
import { RadarChart } from './RadarChart';
import { HeatmapChart } from './HeatmapChart';

// Sample data generators
const generateTimeSeriesData = (points: number = 20) => {
  const now = Date.now();
  return Array.from({ length: points }, (_, i) => ({
    time: new Date(now - (points - i) * 5000).toLocaleTimeString(),
    value: Math.floor(Math.random() * 100) + 150,
    value2: Math.floor(Math.random() * 30) + 10,
  }));
};

const generateCategoryData = () => [
  { category: 'Jan', revenue: 4500, expenses: 2400, profit: 2100 },
  { category: 'Feb', revenue: 5200, expenses: 2800, profit: 2400 },
  { category: 'Mar', revenue: 6100, expenses: 3200, profit: 2900 },
  { category: 'Apr', revenue: 5800, expenses: 3000, profit: 2800 },
  { category: 'May', revenue: 7200, expenses: 3500, profit: 3700 },
];

const generateScatterData = () =>
  Array.from({ length: 50 }, () => ({
    x: Math.random() * 200,
    y: Math.random() * 200,
    size: Math.random() * 100 + 20,
    group: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
  }));

const generatePieData = () => [
  { name: 'Chrome', value: 45 },
  { name: 'Firefox', value: 25 },
  { name: 'Safari', value: 20 },
  { name: 'Edge', value: 10 },
];

const generateRadarData = () => [
  { subject: 'React', A: 90, B: 75, fullMark: 100 },
  { subject: 'TypeScript', A: 85, B: 82, fullMark: 100 },
  { subject: 'Node.js', A: 75, B: 88, fullMark: 100 },
  { subject: 'GraphQL', A: 70, B: 65, fullMark: 100 },
  { subject: 'Docker', A: 65, B: 92, fullMark: 100 },
  { subject: 'AWS', A: 80, B: 70, fullMark: 100 },
];

const generateHeatmapData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hours = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];
  const data = [];
  for (const day of days) {
    for (const hour of hours) {
      data.push({
        day,
        hour,
        commits: Math.floor(Math.random() * 20),
      });
    }
  }
  return data;
};

/**
 * LineChart Examples
 */
export function LineChartExamples() {
  const data = generateTimeSeriesData();

  return (
    <div className="space-y-8">
      {/* Basic Line Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Basic Line Chart</h3>
        <LineChart
          data={data}
          xKey="time"
          yKeys="value"
          title="Response Time (ms)"
          height={300}
          showExport
        />
      </div>

      {/* Multi-line Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Multi-line Chart with Legend</h3>
        <LineChart
          data={data}
          xKey="time"
          yKeys={['value', 'value2']}
          title="System Metrics"
          showLegend
          legendLabels={{
            value: 'Primary Metric',
            value2: 'Secondary Metric',
          }}
          height={300}
        />
      </div>

      {/* Line Chart with Brush */}
      <div>
        <h3 className="text-xl font-bold mb-4">Line Chart with Zoom Brush</h3>
        <LineChart
          data={data}
          xKey="time"
          yKeys="value"
          title="Time Series with Zoom"
          enableBrush
          height={350}
        />
      </div>

      {/* Dark Mode Line Chart */}
      <div className="bg-slate-900 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-white">Dark Mode Line Chart</h3>
        <LineChart
          data={data}
          xKey="time"
          yKeys={['value', 'value2']}
          title="Dark Theme Chart"
          theme="dark"
          showLegend
          height={300}
        />
      </div>
    </div>
  );
}

/**
 * BarChart Examples
 */
export function BarChartExamples() {
  const data = generateCategoryData();

  return (
    <div className="space-y-8">
      {/* Vertical Bar Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Vertical Bar Chart</h3>
        <BarChart
          data={data}
          xKey="category"
          yKeys={['revenue', 'expenses']}
          title="Monthly Revenue vs Expenses"
          showLegend
          height={300}
        />
      </div>

      {/* Stacked Bar Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Stacked Bar Chart</h3>
        <BarChart
          data={data}
          xKey="category"
          yKeys={['revenue', 'expenses', 'profit']}
          title="Financial Overview"
          stacked
          showLegend
          height={300}
        />
      </div>

      {/* Horizontal Bar Chart with Values */}
      <div>
        <h3 className="text-xl font-bold mb-4">Horizontal Bar Chart with Values</h3>
        <BarChart
          data={data}
          xKey="category"
          yKeys="revenue"
          title="Revenue by Month"
          layout="vertical"
          showValues
          height={300}
        />
      </div>
    </div>
  );
}

/**
 * AreaChart Examples
 */
export function AreaChartExamples() {
  const data = generateTimeSeriesData(30);

  return (
    <div className="space-y-8">
      {/* Basic Area Chart with Gradient */}
      <div>
        <h3 className="text-xl font-bold mb-4">Area Chart with Gradient</h3>
        <AreaChart
          data={data}
          xKey="time"
          yKeys="value"
          title="Traffic Over Time"
          gradient
          height={300}
        />
      </div>

      {/* Stacked Area Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Stacked Area Chart</h3>
        <AreaChart
          data={data}
          xKey="time"
          yKeys={['value', 'value2']}
          title="Multiple Metrics"
          stacked
          gradient
          showLegend
          legendLabels={{ value: 'Organic', value2: 'Paid' }}
          height={300}
        />
      </div>

      {/* Area Chart with Brush */}
      <div>
        <h3 className="text-xl font-bold mb-4">Area Chart with Selection Brush</h3>
        <AreaChart
          data={data}
          xKey="time"
          yKeys="value"
          title="Zoomable Area Chart"
          gradient
          enableBrush
          height={350}
          showExport
        />
      </div>
    </div>
  );
}

/**
 * ScatterChart Examples
 */
export function ScatterChartExamples() {
  const data = generateScatterData();

  return (
    <div className="space-y-8">
      {/* Basic Scatter Plot */}
      <div>
        <h3 className="text-xl font-bold mb-4">Scatter Plot</h3>
        <ScatterChart
          data={data}
          xKey="x"
          yKey="y"
          title="Correlation Analysis"
          height={300}
        />
      </div>

      {/* Bubble Chart (with size) */}
      <div>
        <h3 className="text-xl font-bold mb-4">Bubble Chart</h3>
        <ScatterChart
          data={data}
          xKey="x"
          yKey="y"
          sizeKey="size"
          title="Multi-dimensional Data"
          height={300}
          showExport
        />
      </div>

      {/* Grouped Scatter Plot */}
      <div>
        <h3 className="text-xl font-bold mb-4">Grouped Scatter Plot</h3>
        <ScatterChart
          data={data}
          xKey="x"
          yKey="y"
          sizeKey="size"
          groupKey="group"
          title="Data by Category"
          showLegend
          legendLabels={{ A: 'Group A', B: 'Group B', C: 'Group C' }}
          height={300}
        />
      </div>
    </div>
  );
}

/**
 * PieChart Examples
 */
export function PieChartExamples() {
  const data = generatePieData();

  return (
    <div className="space-y-8">
      {/* Basic Pie Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Pie Chart</h3>
        <PieChart
          data={data}
          dataKey="value"
          nameKey="name"
          title="Browser Market Share"
          showPercentage
          height={300}
        />
      </div>

      {/* Donut Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Donut Chart</h3>
        <PieChart
          data={data}
          dataKey="value"
          nameKey="name"
          title="Market Distribution"
          innerRadius={60}
          showPercentage
          activeShape
          height={300}
        />
      </div>

      {/* Pie Chart with Custom Position */}
      <div>
        <h3 className="text-xl font-bold mb-4">Pie Chart with Bottom Legend</h3>
        <PieChart
          data={data}
          dataKey="value"
          nameKey="name"
          title="Distribution Analysis"
          showPercentage
          legendPosition="bottom"
          height={350}
          showExport
        />
      </div>
    </div>
  );
}

/**
 * RadarChart Examples
 */
export function RadarChartExamples() {
  const data = generateRadarData();

  return (
    <div className="space-y-8">
      {/* Basic Radar Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Radar Chart</h3>
        <RadarChart
          data={data}
          angleKey="subject"
          radiusKeys="A"
          title="Skills Assessment"
          filled
          height={300}
        />
      </div>

      {/* Comparison Radar Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Comparison Radar Chart</h3>
        <RadarChart
          data={data}
          angleKey="subject"
          radiusKeys={['A', 'B']}
          title="Team Comparison"
          filled
          showLegend
          legendLabels={{ A: 'Team A', B: 'Team B' }}
          height={300}
        />
      </div>

      {/* Unfilled Radar Chart */}
      <div>
        <h3 className="text-xl font-bold mb-4">Unfilled Radar Chart</h3>
        <RadarChart
          data={data}
          angleKey="subject"
          radiusKeys={['A', 'B']}
          title="Performance Metrics"
          filled={false}
          showLegend
          dotSize={4}
          height={300}
          showExport
        />
      </div>
    </div>
  );
}

/**
 * HeatmapChart Examples
 */
export function HeatmapChartExamples() {
  const data = generateHeatmapData();

  return (
    <div className="space-y-8">
      {/* Basic Heatmap */}
      <div>
        <h3 className="text-xl font-bold mb-4">Heatmap Chart</h3>
        <HeatmapChart
          data={data}
          xKey="hour"
          yKey="day"
          valueKey="commits"
          title="Commit Activity by Day/Hour"
          height={300}
        />
      </div>

      {/* Heatmap with Values */}
      <div>
        <h3 className="text-xl font-bold mb-4">Heatmap with Cell Values</h3>
        <HeatmapChart
          data={data}
          xKey="hour"
          yKey="day"
          valueKey="commits"
          title="Detailed Activity Heatmap"
          showValues
          tooltipFormatter={(val) => `${val} commits`}
          height={300}
        />
      </div>

      {/* Custom Color Heatmap */}
      <div>
        <h3 className="text-xl font-bold mb-4">Custom Color Heatmap</h3>
        <HeatmapChart
          data={data}
          xKey="hour"
          yKey="day"
          valueKey="commits"
          title="Activity Intensity"
          colorRange={['#ecfdf5', '#047857']}
          showValues
          height={300}
          showExport
        />
      </div>
    </div>
  );
}

/**
 * All Charts Showcase
 */
export function ChartsShowcase() {
  return (
    <div className="container mx-auto p-8 space-y-16">
      <div>
        <h1 className="text-4xl font-bold mb-2">Chart Library Showcase</h1>
        <p className="text-gray-600 mb-8">
          Comprehensive examples of all chart components with various configurations
        </p>
      </div>

      <section>
        <h2 className="text-3xl font-bold mb-6">Line Charts</h2>
        <LineChartExamples />
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">Bar Charts</h2>
        <BarChartExamples />
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">Area Charts</h2>
        <AreaChartExamples />
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">Scatter Charts</h2>
        <ScatterChartExamples />
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">Pie Charts</h2>
        <PieChartExamples />
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">Radar Charts</h2>
        <RadarChartExamples />
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">Heatmap Charts</h2>
        <HeatmapChartExamples />
      </section>
    </div>
  );
}
