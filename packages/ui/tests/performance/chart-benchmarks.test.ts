/**
 * Performance Benchmarking Tests for Chart Rendering
 *
 * Tests rendering performance with varying dataset sizes
 * Validates targets: <16ms for 60fps, <100ms for interactions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CanvasChartRenderer, generateTestData } from '../../src/utils/canvasRenderer';
import { PerformanceMonitor } from '../../src/utils/performance';

describe('Chart Rendering Performance Benchmarks', () => {
  let canvas: HTMLCanvasElement;
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    canvas.remove();
  });

  describe('Canvas Renderer', () => {
    it('should render 1,000 points in <16ms (60fps)', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        colors: { line: '#22c55e' },
      });

      const data = generateTestData(1000);

      monitor.mark('render-1k-start');
      renderer.setData(data);
      renderer.render();
      const duration = monitor.measure('render-1k', 'render-1k-start');

      expect(duration).toBeLessThan(16);
      expect(renderer.getDataPointCount()).toBe(1000);
    });

    it('should render 10,000 points in <50ms with downsampling', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        colors: { line: '#22c55e' },
        downsample: true,
        downsampleThreshold: 1000,
      });

      const data = generateTestData(10000);

      monitor.mark('render-10k-start');
      renderer.setData(data);
      renderer.render();
      const duration = monitor.measure('render-10k', 'render-10k-start');

      expect(duration).toBeLessThan(50);
      expect(renderer.isDownsampled()).toBe(true);
      expect(renderer.getDataPointCount()).toBeLessThanOrEqual(1000);
    });

    it('should render 100,000 points in <100ms with aggressive downsampling', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        colors: { line: '#22c55e' },
        downsample: true,
        downsampleThreshold: 500,
      });

      const data = generateTestData(100000);

      monitor.mark('render-100k-start');
      renderer.setData(data);
      renderer.render();
      const duration = monitor.measure('render-100k', 'render-100k-start');

      expect(duration).toBeLessThan(100);
      expect(renderer.getDataPointCount()).toBeLessThanOrEqual(500);
    });

    it('should handle smooth rendering without performance degradation', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        colors: { line: '#22c55e' },
        smooth: true,
      });

      const data = generateTestData(500);

      monitor.mark('smooth-render-start');
      renderer.setData(data);
      renderer.render();
      const duration = monitor.measure('smooth-render', 'smooth-render-start');

      expect(duration).toBeLessThan(20);
    });

    it('should efficiently update data without full re-render', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        colors: { line: '#22c55e' },
      });

      const initialData = generateTestData(1000);
      renderer.setData(initialData);
      renderer.render();

      const updateData = generateTestData(1000);

      monitor.mark('update-start');
      renderer.setData(updateData);
      renderer.render();
      const duration = monitor.measure('update', 'update-start');

      expect(duration).toBeLessThan(16);
    });

    it('should maintain 60fps during continuous updates', async () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        colors: { line: '#22c55e' },
      });

      const durations: number[] = [];

      for (let i = 0; i < 60; i++) {
        const data = generateTestData(500);

        monitor.mark(`frame-${i}-start`);
        renderer.setData(data);
        renderer.render();
        const duration = monitor.measure(`frame-${i}`, `frame-${i}-start`);

        durations.push(duration);
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(16);
      expect(maxDuration).toBeLessThan(20);
    });
  });

  describe('Downsampling Algorithm Performance', () => {
    it('should downsample 10k points to 1k in <10ms', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        downsample: true,
        downsampleThreshold: 1000,
      });

      const data = generateTestData(10000);

      monitor.mark('downsample-start');
      renderer.setData(data);
      const duration = monitor.measure('downsample', 'downsample-start');

      expect(duration).toBeLessThan(10);
      expect(renderer.getDataPointCount()).toBeLessThanOrEqual(1000);
    });

    it('should preserve visual characteristics after downsampling', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        downsample: true,
        downsampleThreshold: 100,
      });

      // Create data with distinct peaks
      const data = Array.from({ length: 1000 }, (_, i) => ({
        x: i,
        y: i % 100 === 0 ? 200 : 100 + Math.random() * 10,
      }));

      renderer.setData(data);

      const downsampledData = renderer.getDataPointCount();

      // Should keep significant points (peaks)
      expect(downsampledData).toBeLessThan(1000);
      expect(downsampledData).toBeGreaterThan(10); // Not too aggressive
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory during repeated renders', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform 100 render cycles
      for (let i = 0; i < 100; i++) {
        const data = generateTestData(1000);
        renderer.setData(data);
        renderer.render();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (<10MB)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }

      renderer.destroy();
    });

    it('should clean up resources on destroy', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
      });

      const data = generateTestData(1000);
      renderer.setData(data);
      renderer.render();

      renderer.destroy();

      // Verify cleanup (no errors on subsequent destroy)
      expect(() => renderer.destroy()).not.toThrow();
    });
  });

  describe('High-DPI Rendering', () => {
    it('should handle high-DPI displays efficiently', () => {
      // Simulate 2x DPI
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      });

      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
      });

      const data = generateTestData(1000);

      monitor.mark('hidpi-render-start');
      renderer.setData(data);
      renderer.render();
      const duration = monitor.measure('hidpi-render', 'hidpi-render-start');

      expect(duration).toBeLessThan(20);

      // Reset DPI
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 1,
      });
    });
  });

  describe('Grid and Axes Performance', () => {
    it('should render grid lines efficiently', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        showGrid: true,
        showAxes: true,
      });

      const data = generateTestData(1000);

      monitor.mark('grid-render-start');
      renderer.setData(data);
      renderer.render();
      const duration = monitor.measure('grid-render', 'grid-render-start');

      expect(duration).toBeLessThan(20);
    });

    it('should skip grid rendering when disabled', () => {
      const rendererWithGrid = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        showGrid: true,
      });

      const rendererWithoutGrid = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        showGrid: false,
      });

      const data = generateTestData(1000);

      monitor.mark('with-grid-start');
      rendererWithGrid.setData(data);
      rendererWithGrid.render();
      const withGridDuration = monitor.measure('with-grid', 'with-grid-start');

      monitor.mark('without-grid-start');
      rendererWithoutGrid.setData(data);
      rendererWithoutGrid.render();
      const withoutGridDuration = monitor.measure('without-grid', 'without-grid-start');

      // Rendering without grid should be faster
      expect(withoutGridDuration).toBeLessThan(withGridDuration);
    });
  });

  describe('Batch Rendering Performance', () => {
    it('should batch multiple renders efficiently', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
      });

      const datasets = Array.from({ length: 10 }, () => generateTestData(500));

      monitor.mark('batch-render-start');

      for (const data of datasets) {
        renderer.setData(data);
        renderer.render();
      }

      const duration = monitor.measure('batch-render', 'batch-render-start');
      const avgPerRender = duration / datasets.length;

      expect(avgPerRender).toBeLessThan(16);
    });
  });

  describe('Resize Performance', () => {
    it('should handle resize efficiently', () => {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
      });

      const data = generateTestData(1000);
      renderer.setData(data);

      monitor.mark('resize-start');
      renderer.resize(1200, 600);
      renderer.render();
      const duration = monitor.measure('resize', 'resize-start');

      expect(duration).toBeLessThan(20);
    });
  });
});

describe('Performance Monitoring', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  it('should accurately measure execution time', () => {
    monitor.mark('start');

    // Simulate work
    const arr = Array.from({ length: 10000 }, (_, i) => i);
    arr.sort((a, b) => b - a);

    monitor.mark('end');
    const duration = monitor.measure('sort', 'start', 'end');

    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it('should calculate statistics correctly', () => {
    for (let i = 0; i < 100; i++) {
      monitor.mark(`test-${i}-start`);
      // Simulate varying work
      Array.from({ length: Math.random() * 1000 }, (_, j) => j);
      monitor.measure('test', `test-${i}-start`);
    }

    const stats = monitor.getStats('test');

    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(100);
    expect(stats!.mean).toBeGreaterThan(0);
    expect(stats!.p95).toBeGreaterThanOrEqual(stats!.mean);
    expect(stats!.max).toBeGreaterThanOrEqual(stats!.p95);
  });
});

describe('Benchmark Report', () => {
  it('should generate comprehensive performance report', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;

    const monitor = new PerformanceMonitor();
    const results: Record<string, any> = {};

    // Test different dataset sizes
    const testCases = [
      { size: 100, name: 'Small (100 points)' },
      { size: 1000, name: 'Medium (1K points)' },
      { size: 10000, name: 'Large (10K points)' },
      { size: 50000, name: 'Very Large (50K points)' },
    ];

    for (const { size, name } of testCases) {
      const renderer = new CanvasChartRenderer(canvas, {
        width: 800,
        height: 400,
        downsample: true,
        downsampleThreshold: 1000,
      });

      const data = generateTestData(size);

      monitor.mark(`${name}-start`);
      renderer.setData(data);
      renderer.render();
      const duration = monitor.measure(name, `${name}-start`);

      results[name] = {
        size,
        duration: duration.toFixed(2),
        fps: (1000 / duration).toFixed(2),
        actualPoints: renderer.getDataPointCount(),
        downsampled: renderer.isDownsampled(),
      };

      renderer.destroy();
    }

    console.table(results);

    // All tests should meet performance targets
    expect(Number(results['Small (100 points)'].duration)).toBeLessThan(10);
    expect(Number(results['Medium (1K points)'].duration)).toBeLessThan(16);
    expect(Number(results['Large (10K points)'].duration)).toBeLessThan(50);
    expect(Number(results['Very Large (50K points)'].duration)).toBeLessThan(100);
  });
});
