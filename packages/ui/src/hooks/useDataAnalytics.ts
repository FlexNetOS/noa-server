/**
 * useDataAnalytics Hook
 *
 * Custom hook for data analytics operations including filtering,
 * sorting, grouping, and aggregation
 */

import { useState, useMemo, useCallback } from 'react';
import type {
  FilterCondition,
  GroupByConfig,
  ColumnConfig,
  AggregationResult,
} from '../types/analytics';
import { calculateAggregations } from '../utils/dataExport';

interface UseDataAnalyticsProps<T> {
  data: T[];
  filters: FilterCondition[];
  groupBy: GroupByConfig | null;
  sortBy: Array<{ id: string; desc: boolean }>;
}

interface UseDataAnalyticsReturn<T> {
  data: T[] | AggregationResult[];
  filteredData: T[];
  groupedData: AggregationResult[] | null;
  sortedData: T[];
  processedData: T[] | AggregationResult[];
  loading: boolean;
  stats: {
    totalRows: number;
    filteredRows: number;
    selectedRows: number;
  };
}

export function useDataAnalytics<T = any>({
  data,
  filters,
  groupBy,
  sortBy,
}: UseDataAnalyticsProps<T>): UseDataAnalyticsReturn<T> {
  // Apply filters
  const filteredData = useMemo(() => {
    if (!filters.length) return data;

    return data.filter((row: any) => {
      return filters.every((filter) => {
        if (!filter.enabled) return true;

        const value = row[filter.column];
        return evaluateFilter(value, filter);
      });
    });
  }, [data, filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortBy.length) return filteredData;

    return [...filteredData].sort((a: any, b: any) => {
      for (const sort of sortBy) {
        const aVal = a[sort.id];
        const bVal = b[sort.id];

        const comparison = compareValues(aVal, bVal);
        if (comparison !== 0) {
          return sort.desc ? -comparison : comparison;
        }
      }
      return 0;
    });
  }, [filteredData, sortBy]);

  // Apply grouping and aggregation
  const groupedData = useMemo(() => {
    if (!groupBy) return null;

    const groups = new Map<string, T[]>();

    // Group data
    sortedData.forEach((row: any) => {
      const groupKey = groupBy.columns
        .map((col) => row[col])
        .join('|');

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    });

    // Calculate aggregations
    const results: AggregationResult[] = [];

    groups.forEach((groupRows, groupKey) => {
      const aggregationValues: Record<string, number> = {};

      groupBy.aggregations.forEach((agg) => {
        const aggResults = calculateAggregations(
          groupRows,
          agg.column,
          [agg.function]
        );
        aggregationValues[agg.column] = aggResults[agg.function];
      });

      results.push({
        groupKey,
        values: aggregationValues,
        count: groupRows.length,
      });
    });

    // Calculate grand totals if needed
    if (groupBy.showGrandTotal) {
      const grandTotals: Record<string, number> = {};

      groupBy.aggregations.forEach((agg) => {
        const aggResults = calculateAggregations(
          sortedData,
          agg.column,
          [agg.function]
        );
        grandTotals[agg.column] = aggResults[agg.function];
      });

      results.push({
        groupKey: 'GRAND_TOTAL',
        values: grandTotals,
        count: sortedData.length,
      });
    }

    return results;
  }, [sortedData, groupBy]);

  // Determine final processed data
  const processedData = groupedData || sortedData;

  // Calculate statistics
  const stats = useMemo(() => ({
    totalRows: data.length,
    filteredRows: filteredData.length,
    selectedRows: 0, // This would be updated by the component
  }), [data.length, filteredData.length]);

  return {
    data: processedData,
    filteredData,
    groupedData,
    sortedData,
    processedData,
    loading: false,
    stats,
  };
}

/**
 * Evaluate a single filter condition
 */
function evaluateFilter(value: any, filter: FilterCondition): boolean {
  const { operator, value: filterValue, value2 } = filter;

  // Handle null/undefined values
  if (operator === 'isEmpty') {
    return value == null || value === '';
  }
  if (operator === 'isNotEmpty') {
    return value != null && value !== '';
  }

  // Convert to string for text operations
  const valueStr = String(value ?? '').toLowerCase();
  const filterStr = String(filterValue ?? '').toLowerCase();

  switch (operator) {
    case 'equals':
      return value === filterValue;

    case 'notEquals':
      return value !== filterValue;

    case 'contains':
      return valueStr.includes(filterStr);

    case 'notContains':
      return !valueStr.includes(filterStr);

    case 'startsWith':
      return valueStr.startsWith(filterStr);

    case 'endsWith':
      return valueStr.endsWith(filterStr);

    case 'lessThan':
      return Number(value) < Number(filterValue);

    case 'lessThanOrEqual':
      return Number(value) <= Number(filterValue);

    case 'greaterThan':
      return Number(value) > Number(filterValue);

    case 'greaterThanOrEqual':
      return Number(value) >= Number(filterValue);

    case 'between':
      return Number(value) >= Number(filterValue) && Number(value) <= Number(value2);

    case 'in':
      if (Array.isArray(filterValue)) {
        return filterValue.includes(value);
      }
      return false;

    case 'notIn':
      if (Array.isArray(filterValue)) {
        return !filterValue.includes(value);
      }
      return true;

    default:
      return true;
  }
}

/**
 * Compare two values for sorting
 */
function compareValues(a: any, b: any): number {
  // Handle null/undefined
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  // Handle numbers
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // Handle strings
  return String(a).localeCompare(String(b));
}

/**
 * Hook for managing column visibility and ordering
 */
export function useColumnManagement(initialColumns: ColumnConfig[]) {
  const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns);

  const toggleColumn = useCallback((columnId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  const reorderColumns = useCallback((columnIds: string[]) => {
    setColumns((prev) => {
      const columnsMap = new Map(prev.map((c) => [c.id, c]));
      return columnIds
        .map((id) => columnsMap.get(id))
        .filter(Boolean) as ColumnConfig[];
    });
  }, []);

  const pinColumn = useCallback((columnId: string, position: 'left' | 'right' | false) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, pinned: position } : col
      )
    );
  }, []);

  const resizeColumn = useCallback((columnId: string, width: number) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, width } : col
      )
    );
  }, []);

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible),
    [columns]
  );

  const pinnedLeft = useMemo(
    () => columns.filter((c) => c.pinned === 'left' && c.visible),
    [columns]
  );

  const pinnedRight = useMemo(
    () => columns.filter((c) => c.pinned === 'right' && c.visible),
    [columns]
  );

  const centerColumns = useMemo(
    () => columns.filter((c) => !c.pinned && c.visible),
    [columns]
  );

  return {
    columns,
    visibleColumns,
    pinnedLeft,
    pinnedRight,
    centerColumns,
    toggleColumn,
    reorderColumns,
    pinColumn,
    resizeColumn,
  };
}
