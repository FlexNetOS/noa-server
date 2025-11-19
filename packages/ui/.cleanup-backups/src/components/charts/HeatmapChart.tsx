/**
 * HeatmapChart Component
 * D3.js-powered heatmap with theming and export capabilities
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { useChartTheme } from '../../hooks/useChartTheme';
import { exportToPNG, exportToSVG, exportToCSV, getSVGElement } from '../../utils/chartExport';
import type { HeatmapChartProps, ChartDataPoint } from '../../types/charts';

/**
 * Export button component
 */
function ExportButtons({
  onExportPNG,
  onExportSVG,
  onExportCSV,
}: {
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportCSV: () => void;
}) {
  return (
    <div className="flex gap-2 mb-2" role="group" aria-label="Export options">
      <button
        onClick={onExportPNG}
        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Export as PNG"
      >
        PNG
      </button>
      <button
        onClick={onExportSVG}
        className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        aria-label="Export as SVG"
      >
        SVG
      </button>
      <button
        onClick={onExportCSV}
        className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Export as CSV"
      >
        CSV
      </button>
    </div>
  );
}

/**
 * HeatmapChart Component
 */
export function HeatmapChart({
  data,
  xKey,
  yKey,
  valueKey,
  height = 300,
  _width = '100%',
  animate = true,
  theme,
  customTheme,
  title,
  showExport = false,
  className = '',
  style,
  ariaLabel,
  loading = false,
  error,
  colorScale = 'linear',
  colorRange,
  showValues = false,
  cellBorderWidth = 1,
  tooltipFormatter,
}: HeatmapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartTheme = useChartTheme({ mode: theme, customTheme });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Get unique X and Y values
  const { xValues, yValues, valueExtent } = useMemo(() => {
    const xSet = new Set<string>();
    const ySet = new Set<string>();
    const values: number[] = [];

    data.forEach((item) => {
      xSet.add(String(item[xKey]));
      ySet.add(String(item[yKey]));
      const val = Number(item[valueKey]);
      if (!isNaN(val)) values.push(val);
    });

    return {
      xValues: Array.from(xSet),
      yValues: Array.from(ySet),
      valueExtent: d3.extent(values) as [number, number],
    };
  }, [data, xKey, yKey, valueKey]);

  // Create color scale
  const colorScaleFn = useMemo(() => {
    const [min, max] = valueExtent;
    const range = colorRange || ['#f0f9ff', '#0369a1']; // light blue to dark blue

    switch (colorScale) {
      case 'quantile':
        return d3.scaleQuantile<string>().domain([min, max]).range(range);
      case 'quantize':
        return d3.scaleQuantize<string>().domain([min, max]).range(range);
      case 'threshold':
        return d3.scaleThreshold<number, string>().domain([min, (min + max) / 2, max]).range(range);
      default:
        return d3.scaleLinear<string>().domain([min, max]).range(range);
    }
  }, [valueExtent, colorScale, colorRange]);

  // Update dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: typeof height === 'number' ? height : rect.height,
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [height]);

  // Render heatmap
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const margin = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartWidth = dimensions.width - margin.left - margin.right;
    const chartHeight = dimensions.height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .style('background-color', chartTheme.backgroundColor);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand().domain(xValues).range([0, chartWidth]).padding(0.05);
    const yScale = d3.scaleBand().domain(yValues).range([0, chartHeight]).padding(0.05);

    // Create tooltip
    const tooltip = d3
      .select(containerRef.current)
      .append('div')
      .attr('class', 'heatmap-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', chartTheme.tooltipBg)
      .style('color', chartTheme.tooltipText)
      .style('border', `1px solid ${chartTheme.borderColor}`)
      .style('border-radius', '8px')
      .style('padding', '8px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Draw cells
    const cells = g
      .selectAll('rect')
      .data(data as ChartDataPoint[])
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(String(d[xKey])) || 0)
      .attr('y', (d) => yScale(String(d[yKey])) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => {
        const val = Number(d[valueKey]);
        return isNaN(val) ? chartTheme.gridColor : (colorScaleFn(val) as string);
      })
      .attr('stroke', chartTheme.borderColor)
      .attr('stroke-width', cellBorderWidth)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
        const val = Number(d[valueKey]);
        const displayValue = tooltipFormatter ? tooltipFormatter(val) : val;
        tooltip
          .style('visibility', 'visible')
          .html(`<strong>${d[xKey]} × ${d[yKey]}</strong><br/>Value: ${displayValue}`);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('top', `${event.pageY - 40}px`)
          .style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.style('visibility', 'hidden');
      });

    // Add animations
    if (animate) {
      cells.attr('opacity', 0).transition().duration(800).attr('opacity', 1);
    }

    // Add cell values if enabled
    if (showValues) {
      g.selectAll('text.cell-value')
        .data(data as ChartDataPoint[])
        .enter()
        .append('text')
        .attr('class', 'cell-value')
        .attr('x', (d) => (xScale(String(d[xKey])) || 0) + xScale.bandwidth() / 2)
        .attr('y', (d) => (yScale(String(d[yKey])) || 0) + yScale.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', chartTheme.textColor)
        .attr('font-size', '10px')
        .text((d) => {
          const val = Number(d[valueKey]);
          return isNaN(val) ? '' : tooltipFormatter ? tooltipFormatter(val) : val.toFixed(1);
        });
    }

    // Add X axis
    const xAxis = d3.axisBottom(xScale).tickSize(0);
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', chartTheme.textColor)
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    // Add Y axis
    const yAxis = d3.axisLeft(yScale).tickSize(0);
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', chartTheme.textColor);

    // Style axes
    g.selectAll('.domain').attr('stroke', chartTheme.gridColor);
    g.selectAll('.tick line').attr('stroke', chartTheme.gridColor);

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [
    data,
    xKey,
    yKey,
    valueKey,
    xValues,
    yValues,
    dimensions,
    chartTheme,
    colorScaleFn,
    showValues,
    cellBorderWidth,
    tooltipFormatter,
    animate,
  ]);

  // Export handlers
  const handleExportPNG = async () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      await exportToPNG(svg, { format: 'png', filename: title || 'heatmap-chart' });
    }
  };

  const handleExportSVG = () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      exportToSVG(svg, { format: 'svg', filename: title || 'heatmap-chart' });
    }
  };

  const handleExportCSV = () => {
    exportToCSV(data, { format: 'csv', filename: title || 'heatmap-chart-data' });
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height, ...style }}
        role="status"
        aria-label="Chart loading"
      >
        <div className="animate-pulse text-center">
          <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height, ...style }}
        role="alert"
        aria-label="Chart error"
      >
        <div className="text-red-500 text-center">
          <p className="font-semibold">Error loading chart</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`chart-container ${className}`}
      style={{ position: 'relative', ...style }}
      role="img"
      aria-label={ariaLabel || title || 'Heatmap chart'}
    >
      {title && (
        <h3 className="text-lg font-semibold mb-2" style={{ color: chartTheme.textColor }}>
          {title}
        </h3>
      )}

      {showExport && (
        <ExportButtons
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onExportCSV={handleExportCSV}
        />
      )}

      <svg ref={svgRef} style={{ width: '100%', height }} />
    </div>
  );
}
