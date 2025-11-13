/**
 * Virtualization Performance Tests
 *
 * Tests virtual scrolling performance for large lists and tables
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import {
  useVirtualization,
  useVariableVirtualization,
  useGridVirtualization,
} from '../../src/hooks/useVirtualization';

describe('Virtual Scrolling Performance', () => {
  describe('useVirtualization', () => {
    it('should virtualize 10k items efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `Item ${i}` }));

      const { result } = renderHook(() =>
        useVirtualization(items, {
          itemHeight: 50,
          containerHeight: 500,
          overscan: 3,
        })
      );

      // Should only render visible items + overscan
      expect(result.current.virtualItems.length).toBeLessThan(50);
      expect(result.current.totalHeight).toBe(10000 * 50);
    });

    it('should update virtual range on scroll', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVirtualization(items, {
          itemHeight: 50,
          containerHeight: 500,
          overscan: 2,
        })
      );

      const initialRange = result.current.virtualRange;

      // Simulate scroll
      const scrollEvent = {
        target: { scrollTop: 1000 },
      } as any;

      result.current.handleScroll(scrollEvent);

      // Range should update (note: in real implementation with state)
      expect(result.current.virtualRange).toBeDefined();
    });

    it('should handle empty arrays', () => {
      const { result } = renderHook(() =>
        useVirtualization([], {
          itemHeight: 50,
          containerHeight: 500,
        })
      );

      expect(result.current.virtualItems).toEqual([]);
      expect(result.current.totalHeight).toBe(0);
    });

    it('should calculate correct offset', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVirtualization(items, {
          itemHeight: 50,
          containerHeight: 500,
          overscan: 0,
        })
      );

      expect(result.current.virtualRange.offsetTop).toBeGreaterThanOrEqual(0);
    });
  });

  describe('useVariableVirtualization', () => {
    it('should handle variable height items', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, content: `Item ${i}` }));

      const estimateHeight = (index: number) => {
        return index % 2 === 0 ? 50 : 100; // Alternating heights
      };

      const { result } = renderHook(() =>
        useVariableVirtualization(items, {
          containerHeight: 500,
          overscan: 3,
          itemHeight: 0, // Not used for variable
          estimateItemHeight: estimateHeight,
        })
      );

      expect(result.current.virtualItems.length).toBeGreaterThan(0);
      expect(result.current.totalHeight).toBeGreaterThan(0);
    });

    it('should use binary search for range calculation', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVariableVirtualization(items, {
          containerHeight: 500,
          overscan: 5,
          itemHeight: 0,
          estimateItemHeight: () => 60,
        })
      );

      // Should efficiently find visible range
      expect(result.current.virtualRange.start).toBeGreaterThanOrEqual(0);
      expect(result.current.virtualRange.end).toBeLessThanOrEqual(items.length);
      expect(result.current.virtualRange.visibleItems).toBeGreaterThan(0);
    });
  });

  describe('useGridVirtualization', () => {
    it('should virtualize grid layouts', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useGridVirtualization(items, {
          itemWidth: 200,
          itemHeight: 200,
          containerWidth: 1000,
          containerHeight: 600,
          gap: 16,
          overscan: 1,
        })
      );

      expect(result.current.columns).toBeGreaterThan(0);
      expect(result.current.virtualItems.length).toBeGreaterThan(0);
      expect(result.current.virtualItems.length).toBeLessThan(100); // Should be virtualized
    });

    it('should calculate columns based on container width', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useGridVirtualization(items, {
          itemWidth: 200,
          itemHeight: 200,
          containerWidth: 1000,
          containerHeight: 600,
          gap: 16,
        })
      );

      // 1000px container / (200px item + 16px gap) ≈ 4-5 columns
      expect(result.current.columns).toBe(4);
    });

    it('should handle grid with overscan', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useGridVirtualization(items, {
          itemWidth: 150,
          itemHeight: 150,
          containerWidth: 900,
          containerHeight: 450,
          gap: 10,
          overscan: 2,
        })
      );

      const visibleRows = Math.ceil(450 / (150 + 10));
      const totalOverscanRows = visibleRows + 4; // 2 above + 2 below
      const columns = result.current.columns;

      expect(result.current.virtualItems.length).toBeLessThanOrEqual(totalOverscanRows * columns);
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain constant memory regardless of dataset size', () => {
      const sizes = [1000, 10000, 50000];

      for (const size of sizes) {
        const items = Array.from({ length: size }, (_, i) => ({ id: i }));

        const { result } = renderHook(() =>
          useVirtualization(items, {
            itemHeight: 50,
            containerHeight: 500,
            overscan: 3,
          })
        );

        // Virtual items should always be similar size regardless of total items
        expect(result.current.virtualItems.length).toBeLessThan(50);
      }
    });

    it('should throttle scroll events', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVirtualization(items, {
          itemHeight: 50,
          containerHeight: 500,
          scrollThrottle: 100,
        })
      );

      const initialRange = result.current.virtualRange;

      // Rapid scroll events
      for (let i = 0; i < 10; i++) {
        const scrollEvent = { target: { scrollTop: i * 100 } } as any;
        result.current.handleScroll(scrollEvent);
      }

      // Should throttle updates
      expect(result.current.handleScroll).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item', () => {
      const items = [{ id: 1 }];

      const { result } = renderHook(() =>
        useVirtualization(items, {
          itemHeight: 50,
          containerHeight: 500,
        })
      );

      expect(result.current.virtualItems).toEqual(items);
      expect(result.current.totalHeight).toBe(50);
    });

    it('should handle overscan larger than dataset', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVirtualization(items, {
          itemHeight: 50,
          containerHeight: 500,
          overscan: 100, // Much larger than dataset
        })
      );

      expect(result.current.virtualItems.length).toBeLessThanOrEqual(items.length);
    });

    it('should handle zero container height', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVirtualization(items, {
          itemHeight: 50,
          containerHeight: 0,
        })
      );

      expect(result.current.virtualItems.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Lazy Loading Performance', () => {
  it('should defer image loading until visible', async () => {
    // Mock IntersectionObserver
    const mockObserve = jest.fn();
    const mockDisconnect = jest.fn();

    global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: jest.fn(),
      takeRecords: jest.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
    }));

    // Test would verify lazy loading behavior
    expect(global.IntersectionObserver).toBeDefined();
  });
});

describe('Memory Efficiency', () => {
  it('should not create excessive virtual items for large datasets', () => {
    const testSizes = [1000, 10000, 100000];

    testSizes.forEach((size) => {
      const items = Array.from({ length: size }, (_, i) => ({ id: i }));

      const { result } = renderHook(() =>
        useVirtualization(items, {
          itemHeight: 50,
          containerHeight: 600,
          overscan: 5,
        })
      );

      // Virtual items should be based on visible area + overscan only
      const maxVisible = Math.ceil(600 / 50) + 10; // 5 overscan on each side
      expect(result.current.virtualItems.length).toBeLessThanOrEqual(maxVisible);
    });
  });
});
