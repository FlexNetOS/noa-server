/**
 * Virtual Table Component for Large Datasets
 *
 * Efficiently renders tables with 10k+ rows using virtualization
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useVirtualization } from '../../hooks/useVirtualization';

export interface Column<T> {
  key: string;
  label: string;
  width?: number;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  containerHeight?: number;
  overscan?: number;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  emptyMessage?: string;
}

/**
 * High-performance virtual table component
 */
function VirtualTableInner<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 48,
  containerHeight = 600,
  overscan = 5,
  onRowClick,
  className = '',
  emptyMessage = 'No data available',
}: VirtualTableProps<T>) {
  // Use virtualization hook
  const { virtualItems, virtualRange, totalHeight, handleScroll } = useVirtualization(data, {
    itemHeight: rowHeight,
    containerHeight,
    overscan,
  });

  const handleRowClick = useCallback(
    (item: T, index: number) => {
      if (onRowClick) {
        onRowClick(item, virtualRange.start + index);
      }
    },
    [onRowClick, virtualRange.start]
  );

  // Convert Event handler to React.UIEvent handler
  const handleScrollReact = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      // Cast the synthetic event's nativeEvent to Event
      handleScroll(event.nativeEvent);
    },
    [handleScroll]
  );

  // Memoize table header
  const tableHeader = useMemo(
    () => (
      <div
        className="sticky top-0 z-10 flex border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
        style={{ height: rowHeight }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="flex items-center px-4 font-semibold text-gray-700 dark:text-gray-200"
            style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
          >
            {column.label}
          </div>
        ))}
      </div>
    ),
    [columns, rowHeight]
  );

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-auto ${className}`} style={{ height: containerHeight }} onScroll={handleScrollReact}>
      {tableHeader}

      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Virtual items */}
        <div style={{ transform: `translateY(${virtualRange.offsetTop}px)` }}>
          {virtualItems.map((item, index) => (
            <VirtualTableRow
              key={virtualRange.start + index}
              item={item}
              index={index}
              columns={columns}
              rowHeight={rowHeight}
              onClick={handleRowClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const VirtualTable = memo(VirtualTableInner) as typeof VirtualTableInner;

/**
 * Memoized table row component
 */
function VirtualTableRowInner<T extends Record<string, any>>({
  item,
  index,
  columns,
  rowHeight,
  onClick,
}: {
  item: T;
  index: number;
  columns: Column<T>[];
  rowHeight: number;
  onClick?: (item: T, index: number) => void;
}) {
  const handleClick = useCallback(() => {
    onClick?.(item, index);
  }, [onClick, item, index]);

  return (
    <div
      className="flex border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
      style={{ height: rowHeight, cursor: onClick ? 'pointer' : 'default' }}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {columns.map((column) => (
        <div
          key={column.key}
          className="flex items-center px-4 text-sm text-gray-900 dark:text-gray-100"
          style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
        >
          {column.render
            ? column.render(item[column.key], item, index)
            : item[column.key]?.toString() || '-'}
        </div>
      ))}
    </div>
  );
}

const VirtualTableRow = memo(VirtualTableRowInner) as typeof VirtualTableRowInner;

/**
 * Virtual Grid Component for Image Galleries
 */
export interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  gap?: number;
  containerHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualGridInner<T>({
  items,
  itemWidth,
  itemHeight,
  gap = 16,
  containerHeight = 600,
  renderItem,
  className = '',
}: VirtualGridProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(800);

  // Calculate columns
  const columns = Math.floor(containerWidth / (itemWidth + gap));

  // Use virtualization
  const { virtualItems, virtualRange, totalHeight, handleScroll } = useVirtualization(items, {
    itemHeight: itemHeight + gap,
    containerHeight,
    overscan: Math.ceil(columns * 1.5),
  });

  // Convert Event handler to React.UIEvent handler
  const handleScrollReact = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      handleScroll(event.nativeEvent);
    },
    [handleScroll]
  );

  // Observe container width
  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScrollReact}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${virtualRange.offsetTop}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
            gap: `${gap}px`,
          }}
        >
          {virtualItems.map((item, index) => (
            <div key={virtualRange.start + index} style={{ width: itemWidth, height: itemHeight }}>
              {renderItem(item, virtualRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const VirtualGrid = memo(VirtualGridInner) as typeof VirtualGridInner;
