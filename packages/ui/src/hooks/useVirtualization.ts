/**
 * Virtual Scrolling Hooks for Large Lists and Tables
 *
 * Optimized for rendering 10k+ rows with minimal DOM nodes
 * Uses Intersection Observer and requestAnimationFrame
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
  estimateItemHeight?: (index: number) => number;
  scrollThrottle?: number; // Throttle scroll events (ms)
}

export interface VirtualRange {
  start: number;
  end: number;
  offsetTop: number;
  visibleItems: number;
}

/**
 * Virtual scrolling hook for fixed-height items
 */
export function useVirtualization<T>(items: T[], config: VirtualizationConfig) {
  const {
    itemHeight,
    containerHeight,
    overscan = 3,
    scrollThrottle = 16, // ~60fps
  } = config;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollTimeoutRef = useRef<number>();
  const lastScrollTop = useRef(0);

  // Calculate virtual range
  const virtualRange = useMemo((): VirtualRange => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(items.length, visibleEnd + overscan);
    const offsetTop = start * itemHeight;
    const visibleItems = end - start;

    return { start, end, offsetTop, visibleItems };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items slice
  const virtualItems = useMemo(
    () => items.slice(virtualRange.start, virtualRange.end),
    [items, virtualRange.start, virtualRange.end]
  );

  // Throttled scroll handler
  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement;
      const newScrollTop = target.scrollTop;

      // Skip if scroll hasn't changed significantly
      if (Math.abs(newScrollTop - lastScrollTop.current) < itemHeight / 2) {
        return;
      }

      lastScrollTop.current = newScrollTop;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = window.setTimeout(() => {
        setScrollTop(newScrollTop);
      }, scrollThrottle);
    },
    [itemHeight, scrollThrottle]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const totalHeight = items.length * itemHeight;

  return {
    virtualItems,
    virtualRange,
    totalHeight,
    handleScroll,
  };
}

/**
 * Virtual scrolling hook for variable-height items
 */
export function useVariableVirtualization<T>(
  items: T[],
  config: VirtualizationConfig & { estimateItemHeight: (index: number) => number }
) {
  const { containerHeight, overscan = 3, estimateItemHeight, scrollThrottle = 16 } = config;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollTimeoutRef = useRef<number>();
  const measurementsRef = useRef<Map<number, number>>(new Map());

  // Calculate item offsets
  const itemOffsets = useMemo(() => {
    const offsets: number[] = [0];
    for (let i = 0; i < items.length; i++) {
      const height = measurementsRef.current.get(i) || estimateItemHeight(i);
      offsets.push(offsets[i] + height);
    }
    return offsets;
  }, [items.length, estimateItemHeight]);

  // Binary search to find visible range
  const virtualRange = useMemo((): VirtualRange => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    // Binary search for start
    let start = 0;
    let end = items.length;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemOffsets[mid] < viewportTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    start = Math.max(0, start - overscan);

    // Find end
    let endIdx = start;
    while (endIdx < items.length && itemOffsets[endIdx] < viewportBottom) {
      endIdx++;
    }
    endIdx = Math.min(items.length, endIdx + overscan);

    return {
      start,
      end: endIdx,
      offsetTop: itemOffsets[start],
      visibleItems: endIdx - start,
    };
  }, [scrollTop, containerHeight, overscan, itemOffsets, items.length]);

  const virtualItems = useMemo(
    () => items.slice(virtualRange.start, virtualRange.end),
    [items, virtualRange.start, virtualRange.end]
  );

  const handleScroll = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement;
      const newScrollTop = target.scrollTop;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = window.setTimeout(() => {
        setScrollTop(newScrollTop);
      }, scrollThrottle);
    },
    [scrollThrottle]
  );

  // Measure item height after render
  const measureItem = useCallback((index: number, element: HTMLElement) => {
    const height = element.getBoundingClientRect().height;
    if (measurementsRef.current.get(index) !== height) {
      measurementsRef.current.set(index, height);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const totalHeight = itemOffsets[items.length] || 0;

  return {
    virtualItems,
    virtualRange,
    totalHeight,
    handleScroll,
    measureItem,
  };
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefCallback<Element>, IntersectionObserverEntry | undefined] {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const observerRef = useRef<IntersectionObserver>();

  const ref = useCallback(
    (element: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (element) {
        observerRef.current = new IntersectionObserver(([entry]) => {
          setEntry(entry);
        }, options);

        observerRef.current.observe(element);
      }
    },
    [options]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [ref, entry];
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [ref, entry] = useIntersectionObserver({
    threshold: 0.01,
    rootMargin: '50px',
  });

  useEffect(() => {
    if (entry?.isIntersecting && !isLoaded) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
    }
  }, [entry, isLoaded, src]);

  return { ref, src: imageSrc, isLoaded };
}

/**
 * Windowed virtualization for grid layouts
 */
export function useGridVirtualization<T>(
  items: T[],
  config: {
    itemWidth: number;
    itemHeight: number;
    containerWidth: number;
    containerHeight: number;
    gap?: number;
    overscan?: number;
  }
) {
  const { itemWidth, itemHeight, containerWidth, containerHeight, gap = 0, overscan = 1 } = config;

  const [scrollTop, setScrollTop] = useState(0);
  const [_scrollLeft, setScrollLeft] = useState(0);

  const columns = Math.floor(containerWidth / (itemWidth + gap));
  const rows = Math.ceil(items.length / columns);

  const virtualRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(rows, Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan);

    const start = startRow * columns;
    const end = Math.min(items.length, endRow * columns);

    return {
      start,
      end,
      startRow,
      endRow,
      offsetTop: startRow * (itemHeight + gap),
    };
  }, [scrollTop, itemHeight, containerHeight, gap, overscan, columns, rows, items.length]);

  const virtualItems = useMemo(
    () => items.slice(virtualRange.start, virtualRange.end),
    [items, virtualRange.start, virtualRange.end]
  );

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
  }, []);

  const totalHeight = rows * (itemHeight + gap);
  const totalWidth = columns * (itemWidth + gap);

  return {
    virtualItems,
    virtualRange,
    totalHeight,
    totalWidth,
    columns,
    handleScroll,
  };
}

/**
 * Infinite scroll hook
 */
export function useInfiniteScroll(
  loadMore: () => void | Promise<void>,
  options: {
    threshold?: number;
    hasMore: boolean;
    isLoading: boolean;
  }
) {
  const { threshold = 100, hasMore, isLoading } = options;
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    rootMargin: `${threshold}px`,
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !isLoading) {
      loadMore();
    }
  }, [entry, hasMore, isLoading, loadMore]);

  return { ref, isIntersecting: entry?.isIntersecting };
}

/**
 * Virtual table hook with column virtualization
 */
export function useVirtualTable<T>(
  rows: T[],
  columns: { width: number; key: string }[],
  config: {
    rowHeight: number;
    containerWidth: number;
    containerHeight: number;
    overscan?: number;
  }
) {
  const { rowHeight, containerWidth, containerHeight, overscan = 3 } = config;

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculate visible rows
  const visibleRows = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(rows.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan);

    return {
      start: startRow,
      end: endRow,
      offsetTop: startRow * rowHeight,
    };
  }, [scrollTop, rowHeight, containerHeight, overscan, rows.length]);

  // Calculate visible columns
  const visibleColumns = useMemo(() => {
    let accumulatedWidth = 0;
    let startCol = 0;
    let endCol = columns.length;

    for (let i = 0; i < columns.length; i++) {
      if (accumulatedWidth < scrollLeft) {
        startCol = i;
      }
      if (accumulatedWidth < scrollLeft + containerWidth) {
        endCol = i + 1;
      }
      accumulatedWidth += columns[i].width;
    }

    const offsetLeft = columns.slice(0, startCol).reduce((sum, col) => sum + col.width, 0);

    return {
      start: Math.max(0, startCol - overscan),
      end: Math.min(columns.length, endCol + overscan),
      offsetLeft,
    };
  }, [scrollLeft, containerWidth, columns, overscan]);

  const visibleData = useMemo(
    () => rows.slice(visibleRows.start, visibleRows.end),
    [rows, visibleRows.start, visibleRows.end]
  );

  const visibleCols = useMemo(
    () => columns.slice(visibleColumns.start, visibleColumns.end),
    [columns, visibleColumns.start, visibleColumns.end]
  );

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
  }, []);

  const totalHeight = rows.length * rowHeight;
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  return {
    visibleData,
    visibleColumns: visibleCols,
    visibleRows,
    totalHeight,
    totalWidth,
    handleScroll,
  };
}
