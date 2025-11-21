/**
 * High-Performance Canvas Line Chart Component
 *
 * Optimized for 10k+ data points using Canvas rendering
 * Includes automatic downsampling and memoization
 */

import React, { useRef, useEffect, useMemo, memo } from 'react';
import { CanvasChartRenderer, DataPoint, RenderConfig } from '../../utils/canvasRenderer';
import { useRenderTime, throttle } from '../../utils/performance';

export interface CanvasLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  config?: Partial<RenderConfig>;
  onDataPointHover?: (point: DataPoint | null) => void;
  className?: string;
}

/**
 * Memoized Canvas Line Chart Component
 */
export const CanvasLineChart = memo<CanvasLineChartProps>(
  ({ data, width = 800, height = 400, config, onDataPointHover, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<CanvasChartRenderer>();
    const containerRef = useRef<HTMLDivElement>(null);

    // Monitor render performance
    useRenderTime('CanvasLineChart');

    // Create renderer on mount
    useEffect(() => {
      if (!canvasRef.current) return;

      rendererRef.current = new CanvasChartRenderer(canvasRef.current, {
        width,
        height,
        ...config,
      });

      return () => {
        rendererRef.current?.destroy();
      };
    }, []);

    // Update data when changed
    useEffect(() => {
      if (rendererRef.current) {
        rendererRef.current.setData(data);
      }
    }, [data]);

    // Update config when changed
    useEffect(() => {
      if (rendererRef.current && config) {
        rendererRef.current.updateConfig(config);
      }
    }, [config]);

    // Handle resize
    useEffect(() => {
      if (!containerRef.current || !rendererRef.current) return;

      const resizeObserver = new ResizeObserver(
        throttle((entries) => {
          const entry = entries[0];
          if (entry && rendererRef.current) {
            const { width, height } = entry.contentRect;
            rendererRef.current.resize(width, height);
          }
        }, 250)
      );

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Handle mouse hover for tooltips
    const handleMouseMove = useMemo(
      () =>
        throttle((event: React.MouseEvent<HTMLCanvasElement>) => {
          if (!canvasRef.current || !onDataPointHover) return;

          const rect = canvasRef.current.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;

          // Find nearest data point (simplified)
          // In production, use spatial indexing for better performance
          const point = findNearestPoint(data, x, y, rect.width, rect.height);
          onDataPointHover(point);
        }, 100),
      [data, onDataPointHover]
    );

    return (
      <div ref={containerRef} className={className} style={{ width, height }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => onDataPointHover?.(null)}
          style={{ display: 'block', width: '100%', height: '100%' }}
          role="img"
          aria-label="Line chart visualization"
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better memoization
    return (
      prevProps.data === nextProps.data &&
      prevProps.width === nextProps.width &&
      prevProps.height === nextProps.height &&
      JSON.stringify(prevProps.config) === JSON.stringify(nextProps.config)
    );
  }
);

CanvasLineChart.displayName = 'CanvasLineChart';

/**
 * Find nearest data point to mouse coordinates
 */
function findNearestPoint(
  data: DataPoint[],
  mouseX: number,
  mouseY: number,
  width: number,
  height: number
): DataPoint | null {
  if (data.length === 0) return null;

  // Simple linear search (could be optimized with spatial indexing)
  const threshold = 10; // pixels
  let nearest: DataPoint | null = null;
  let minDistance = Infinity;

  const minX = Math.min(...data.map((d) => d.x));
  const maxX = Math.max(...data.map((d) => d.x));
  const minY = Math.min(...data.map((d) => d.y));
  const maxY = Math.max(...data.map((d) => d.y));

  for (const point of data) {
    const px = ((point.x - minX) / (maxX - minX)) * width;
    const py = height - ((point.y - minY) / (maxY - minY)) * height;

    const distance = Math.sqrt(Math.pow(px - mouseX, 2) + Math.pow(py - mouseY, 2));

    if (distance < minDistance && distance < threshold) {
      minDistance = distance;
      nearest = point;
    }
  }

  return nearest;
}
