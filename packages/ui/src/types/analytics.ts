/**
 * Data Analytics Types
 *
 * Type definitions for advanced data analytics components
 */

// Filter Types
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'between'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty';

export interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: unknown;
  value2?: unknown; // For 'between' operator
  enabled: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterCondition[];
  createdAt: Date;
  updatedAt: Date;
}

// Aggregation Types
export type AggregationFunction = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'mode';

export interface AggregationConfig {
  id: string;
  column: string;
  function: AggregationFunction;
  label?: string;
}

export interface GroupByConfig {
  columns: string[];
  aggregations: AggregationConfig[];
  showSubtotals: boolean;
  showGrandTotal: boolean;
}

// Column Types
export interface ColumnFormat {
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime' | 'boolean';
  decimals?: number;
  currencySymbol?: string;
  dateFormat?: string;
  locale?: string;
}

export interface ColumnConfig {
  id: string;
  header: string;
  accessorKey: string;
  visible: boolean;
  pinned: 'left' | 'right' | false;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  format?: ColumnFormat;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  editable?: boolean;
}

export interface ColumnPreset {
  id: string;
  name: string;
  columns: ColumnConfig[];
  createdAt: Date;
  updatedAt: Date;
}

// Export Types
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'clipboard';

export interface ExportConfig {
  format: ExportFormat;
  filename: string;
  includeHeaders: boolean;
  selectedRowsOnly: boolean;
  visibleColumnsOnly: boolean;
  csvDelimiter?: string;
  jsonIndent?: number;
  xlsxSheetName?: string;
}

// Data Table Types
export interface DataTableProps<TData = any> {
  data: TData[];
  columns: ColumnConfig[];
  onDataChange?: (data: TData[]) => void;
  enableFiltering?: boolean;
  enableAggregation?: boolean;
  enableGrouping?: boolean;
  enableSorting?: boolean;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  enableVirtualization?: boolean;
  enableExport?: boolean;
  enableColumnCustomization?: boolean;
  pageSize?: number;
  height?: number;
  loading?: boolean;
  error?: Error | null;
}

// Store State Types
export interface AnalyticsState {
  filters: FilterCondition[];
  filterPresets: FilterPreset[];
  activePresetId: string | null;
  groupBy: GroupByConfig | null;
  columnConfigs: ColumnConfig[];
  columnPresets: ColumnPreset[];
  activeColumnPresetId: string | null;
  selectedRows: Set<string>;
  sortBy: Array<{ id: string; desc: boolean }>;

  // Actions
  addFilter: (filter: FilterCondition) => void;
  updateFilter: (id: string, filter: Partial<FilterCondition>) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;
  saveFilterPreset: (name: string) => void;
  loadFilterPreset: (id: string) => void;
  deleteFilterPreset: (id: string) => void;

  setGroupBy: (config: GroupByConfig | null) => void;

  updateColumnConfig: (id: string, config: Partial<ColumnConfig>) => void;
  reorderColumns: (columnIds: string[]) => void;
  saveColumnPreset: (name: string) => void;
  loadColumnPreset: (id: string) => void;
  deleteColumnPreset: (id: string) => void;

  toggleRowSelection: (rowId: string) => void;
  selectAllRows: (rowIds: string[]) => void;
  clearRowSelection: () => void;

  setSortBy: (sortBy: Array<{ id: string; desc: boolean }>) => void;
}

// Utility Types
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

export interface AggregationResult {
  groupKey: string;
  values: Record<string, number>;
  count: number;
  subtotal?: Record<string, number>;
}
