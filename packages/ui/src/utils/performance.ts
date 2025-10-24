/**
 * Performance Utilities and Monitoring
 *
 * Includes debounce, throttle, memoization, and performance measurement
 */

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Debounce function - delays execution until after wait time has elapsed
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function throttled(...args: Parameters<T>): void {
    if (!inThrottle) {
      inThrottle = true;
      func(...args);

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * React hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * React hook for throttled callbacks
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): T {
  const throttledCallback = useRef<T>();
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    throttledCallback.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRan.current >= limit) {
        throttledCallback.current?.(...args);
        lastRan.current = now;
      }
    }) as T,
    [limit]
  );
}

/**
 * Memoization decorator with LRU cache
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  cacheSize: number = 100
): T {
  const cache = new Map<string, { result: ReturnType<T>; timestamp: number }>();

  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      const cached = cache.get(key)!;
      return cached.result;
    }

    const result = func(...args);

    // LRU eviction
    if (cache.size >= cacheSize) {
      const oldestKey = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      cache.delete(oldestKey);
    }

    cache.set(key, { result, timestamp: Date.now() });

    return result;
  } as T;
}

/**
 * Performance measurement utilities
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();
  private measures = new Map<string, number[]>();

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }

    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    if (endMark && !endTime) {
      console.warn(`End mark "${endMark}" not found`);
      return 0;
    }

    const duration = (endTime || performance.now()) - startTime;

    if (!this.measures.has(name)) {
      this.measures.set(name, []);
    }

    this.measures.get(name)!.push(duration);

    return duration;
  }

  getStats(name: string): {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } | null {
    const measurements = this.measures.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((acc, val) => acc + val, 0);

    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      count: measurements.length,
      mean: sum / measurements.length,
      median: percentile(50),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  clear() {
    this.marks.clear();
    this.measures.clear();
  }

  getAllStats(): Record<string, ReturnType<PerformanceMonitor['getStats']>> {
    const stats: Record<string, ReturnType<PerformanceMonitor['getStats']>> = {};

    for (const name of this.measures.keys()) {
      stats[name] = this.getStats(name);
    }

    return stats;
  }
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor() {
  const monitor = useRef(new PerformanceMonitor());

  return monitor.current;
}

/**
 * Hook to measure render time
 */
export function useRenderTime(componentName: string) {
  const monitor = usePerformanceMonitor();

  useEffect(() => {
    monitor.mark(`${componentName}-render-start`);

    return () => {
      const duration = monitor.measure(
        `${componentName}-render`,
        `${componentName}-render-start`
      );

      if (duration > 16) {
        // Log renders slower than 60fps
        console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
      }
    };
  });

  return monitor;
}

/**
 * Request Animation Frame wrapper
 */
export function requestIdleCallback(callback: () => void, timeout?: number): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  }

  // Fallback to setTimeout for browsers without requestIdleCallback
  return (window as Window).setTimeout(callback, timeout || 1);
}

export function cancelIdleCallback(id: number) {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Batch DOM updates using RAF
 */
export class BatchUpdater {
  private pending = new Set<() => void>();
  private rafId: number | null = null;

  schedule(callback: () => void) {
    this.pending.add(callback);

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  flush() {
    const callbacks = Array.from(this.pending);
    this.pending.clear();
    this.rafId = null;

    for (const callback of callbacks) {
      callback();
    }
  }

  cancel() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pending.clear();
  }
}

/**
 * Web Worker wrapper with Promise API
 */
export class WorkerPool<T = any> {
  private workers: Worker[] = [];
  private queue: Array<{
    id: string;
    type: string;
    payload: any;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = [];
  private pending = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor(workerPath: string, poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerPath, { type: 'module' });

      worker.onmessage = (event) => {
        const { id, result, error } = event.data;
        const pending = this.pending.get(id);

        if (pending) {
          if (error) {
            pending.reject(new Error(error));
          } else {
            pending.resolve(result);
          }
          this.pending.delete(id);
          this.processQueue();
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
      };

      this.workers.push(worker);
    }
  }

  async execute(type: string, payload: any): Promise<T> {
    const id = `${Date.now()}-${Math.random()}`;

    return new Promise((resolve, reject) => {
      this.queue.push({ id, type, payload, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue() {
    const availableWorker = this.workers.find(
      (_, index) => !this.pending.has(`worker-${index}`)
    );

    if (availableWorker && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.pending.set(task.id, { resolve: task.resolve, reject: task.reject });

      availableWorker.postMessage({
        id: task.id,
        type: task.type,
        payload: task.payload,
      });
    }
  }

  terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.queue = [];
    this.pending.clear();
  }
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * FPS monitor
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();
  private rafId: number | null = null;

  start() {
    const measure = () => {
      const now = performance.now();
      const delta = now - this.lastTime;
      const fps = 1000 / delta;

      this.frames.push(fps);
      if (this.frames.length > 60) {
        this.frames.shift();
      }

      this.lastTime = now;
      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getCurrentFPS(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1];
  }

  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((acc, fps) => acc + fps, 0);
    return sum / this.frames.length;
  }
}
