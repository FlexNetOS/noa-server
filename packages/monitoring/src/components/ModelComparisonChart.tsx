/**
 * Model Performance Comparison Component
 * Side-by-side comparison of AI models with quality, speed, cost, and reliability metrics
 */

import React, { useState, useMemo } from 'react';
import { useAIMetrics } from './context/AIMetricsContext';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis
} from 'recharts';
import clsx from 'clsx';

export interface ModelComparisonChartProps {
  className?: string;
  maxModels?: number;
  showRadarChart?: boolean;
  showScatterPlot?: boolean;
  showTable?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ModelComparisonChart: React.FC<ModelComparisonChartProps> = ({
  className,
  maxModels = 6,
  showRadarChart = true,
  showScatterPlot = true,
  showTable = true
}) => {
  const { modelPerformance, isLoading } = useAIMetrics();
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'quality' | 'speed' | 'cost' | 'reliability'>('quality');

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!modelPerformance || selectedModels.length === 0) return [];

    const metrics = ['Quality', 'Speed', 'Cost Efficiency', 'Reliability'];

    return metrics.map((metric) => {
      const dataPoint: any = { metric };

      selectedModels.forEach((modelId) => {
        const model = modelPerformance.find((m) => m.modelId === modelId);
        if (!model) return;

        let value = 0;
        switch (metric) {
          case 'Quality':
            value = model.qualityScore * 100;
            break;
          case 'Speed':
            value = Math.max(0, 100 - model.avgResponseTime / 10); // Normalize speed
            break;
          case 'Cost Efficiency':
            value = Math.max(0, 100 - model.costPerRequest * 100); // Normalize cost
            break;
          case 'Reliability':
            value = (1 - model.errorRate) * 100;
            break;
        }

        dataPoint[model.modelName] = value;
      });

      return dataPoint;
    });
  }, [modelPerformance, selectedModels]);

  // Prepare scatter plot data (Quality vs Cost)
  const scatterData = useMemo(() => {
    if (!modelPerformance) return [];

    return modelPerformance.map((model) => ({
      x: model.costPerRequest,
      y: model.qualityScore * 100,
      z: model.avgResponseTime,
      name: model.modelName,
      provider: model.provider
    }));
  }, [modelPerformance]);

  // Sort models
  const sortedModels = useMemo(() => {
    if (!modelPerformance) return [];

    return [...modelPerformance].sort((a, b) => {
      switch (sortBy) {
        case 'quality':
          return b.qualityScore - a.qualityScore;
        case 'speed':
          return a.avgResponseTime - b.avgResponseTime;
        case 'cost':
          return a.costPerRequest - b.costPerRequest;
        case 'reliability':
          return a.errorRate - b.errorRate;
        default:
          return 0;
      }
    });
  }, [modelPerformance, sortBy]);

  // Toggle model selection
  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      } else if (prev.length < maxModels) {
        return [...prev, modelId];
      }
      return prev;
    });
  };

  // Auto-select top models on mount
  React.useEffect(() => {
    if (modelPerformance && modelPerformance.length > 0 && selectedModels.length === 0) {
      setSelectedModels(
        sortedModels.slice(0, Math.min(3, maxModels)).map((m) => m.modelId)
      );
    }
  }, [modelPerformance, sortedModels, maxModels, selectedModels.length]);

  if (isLoading) {
    return (
      <div className={clsx('animate-pulse space-y-6', className)}>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (!modelPerformance || modelPerformance.length === 0) {
    return (
      <div className={clsx('text-center py-12 text-gray-500 dark:text-gray-400', className)}>
        No model performance data available
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Model Performance Comparison
        </h2>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          >
            <option value="quality">Quality</option>
            <option value="speed">Speed</option>
            <option value="cost">Cost</option>
            <option value="reliability">Reliability</option>
          </select>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Select models to compare (max {maxModels}):
        </h3>

        <div className="flex flex-wrap gap-2">
          {sortedModels.map((model, index) => {
            const isSelected = selectedModels.includes(model.modelId);

            return (
              <button
                key={model.modelId}
                onClick={() => toggleModel(model.modelId)}
                disabled={!isSelected && selectedModels.length >= maxModels}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isSelected
                    ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
                  !isSelected && selectedModels.length >= maxModels && 'opacity-50 cursor-not-allowed'
                )}
                style={isSelected ? {
                  backgroundColor: COLORS[selectedModels.indexOf(model.modelId) % COLORS.length],
                  color: 'white',
                  borderColor: COLORS[selectedModels.indexOf(model.modelId) % COLORS.length]
                } : {}}
              >
                {model.modelName}
                <span className="ml-2 text-xs opacity-75">({model.provider})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Radar Chart */}
      {showRadarChart && selectedModels.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Multi-Dimensional Comparison
          </h3>

          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis
                dataKey="metric"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" />

              {selectedModels.map((modelId, index) => {
                const model = modelPerformance.find((m) => m.modelId === modelId);
                if (!model) return null;

                return (
                  <Radar
                    key={modelId}
                    name={model.modelName}
                    dataKey={model.modelName}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                );
              })}

              <Legend
                wrapperStyle={{ color: '#9ca3af' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scatter Plot - Quality vs Cost */}
      {showScatterPlot && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Cost vs Quality Analysis
          </h3>

          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

              <XAxis
                type="number"
                dataKey="x"
                name="Cost per Request"
                unit="$"
                stroke="#9ca3af"
                label={{
                  value: 'Cost per Request ($)',
                  position: 'bottom',
                  offset: 40,
                  style: { fill: '#9ca3af', fontSize: 14 }
                }}
              />

              <YAxis
                type="number"
                dataKey="y"
                name="Quality Score"
                unit="%"
                stroke="#9ca3af"
                label={{
                  value: 'Quality Score (%)',
                  angle: -90,
                  position: 'left',
                  offset: 40,
                  style: { fill: '#9ca3af', fontSize: 14 }
                }}
              />

              <ZAxis type="number" dataKey="z" range={[50, 400]} name="Response Time" unit="ms" />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f3f4f6'
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'Cost per Request') return `$${value.toFixed(4)}`;
                  if (name === 'Quality Score') return `${value.toFixed(1)}%`;
                  if (name === 'Response Time') return `${value.toFixed(0)}ms`;
                  return value;
                }}
                labelFormatter={(label: any) => scatterData[label]?.name || ''}
              />

              <Scatter
                name="Models"
                data={scatterData}
                fill="#3b82f6"
              />
            </ScatterChart>
          </ResponsiveContainer>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
            Bubble size represents response time. Top-right quadrant shows high quality, high cost models.
          </p>
        </div>
      )}

      {/* Comparison Table */}
      {showTable && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 overflow-x-auto">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Detailed Comparison Table
          </h3>

          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Model
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Provider
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  Quality
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  Response Time
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  Cost/Request
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  Error Rate
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  Total Requests
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.map((model, index) => {
                const isSelected = selectedModels.includes(model.modelId);

                return (
                  <tr
                    key={model.modelId}
                    className={clsx(
                      'border-b border-gray-200 dark:border-gray-700',
                      isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                      index % 2 === 0 && !isSelected && 'bg-gray-50 dark:bg-gray-700/50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[selectedModels.indexOf(model.modelId) % COLORS.length] }}
                          />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {model.modelName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {model.provider}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx(
                        'font-semibold',
                        model.qualityScore > 0.9 ? 'text-green-600 dark:text-green-400' : model.qualityScore > 0.7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {(model.qualityScore * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {model.avgResponseTime.toFixed(0)}ms
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      ${model.costPerRequest.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={clsx(
                        'font-semibold',
                        model.errorRate < 0.01 ? 'text-green-600 dark:text-green-400' : model.errorRate < 0.05 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {(model.errorRate * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {model.requestCount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ModelComparisonChart;
