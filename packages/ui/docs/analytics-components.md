# Data Analytics Components

Advanced data analytics UI components with filtering, aggregation, and export capabilities for the Noa UI Design System.

## Overview

The analytics components provide an Excel-like experience for working with large datasets in React applications. Built with performance and user experience in mind, these components can handle 10,000+ rows efficiently using virtual scrolling.

## Components

### DataTable

The main data table component with advanced features.

```tsx
import { DataTable } from '@noa/ui';
import type { ColumnConfig } from '@noa/ui';

const columns: ColumnConfig[] = [
  {
    id: 'id',
    header: 'ID',
    accessorKey: 'id',
    visible: true,
    sortable: true,
    width: 80,
  },
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    visible: true,
    sortable: true,
    width: 200,
  },
  {
    id: 'revenue',
    header: 'Revenue',
    accessorKey: 'revenue',
    visible: true,
    sortable: true,
    width: 120,
    format: {
      type: 'currency',
      decimals: 2,
      currencySymbol: '$',
    },
  },
];

function MyApp() {
  return (
    <DataTable
      data={myData}
      columns={columns}
      enableFiltering
      enableAggregation
      enableExport
      height={800}
    />
  );
}
```

**Features:**
- Virtual scrolling for 10k+ rows
- Multi-column sorting
- Column resizing
- Row selection
- Column pinning
- Cell formatting

### FilterPanel

Advanced filtering UI with multiple operators and presets.

```tsx
import { FilterPanel } from '@noa/ui';

<FilterPanel columns={columns} onClose={() => {}} />
```

**Operators:**
- Text: equals, contains, starts with, ends with
- Number: <, >, <=, >=, between
- Date: before, after, between
- Common: isEmpty, isNotEmpty

**Features:**
- Filter presets
- Enable/disable filters
- Multi-column filtering
- Type-specific operators

### AggregationPanel

Configure grouping and aggregation functions.

```tsx
import { AggregationPanel } from '@noa/ui';

<AggregationPanel columns={columns} onClose={() => {}} />
```

**Aggregation Functions:**
- Sum
- Average
- Count
- Min/Max
- Median
- Mode

**Features:**
- Group by columns
- Multiple aggregations
- Subtotals
- Grand totals

### ExportDialog

Export data to various formats.

```tsx
import { ExportDialog } from '@noa/ui';

<ExportDialog
  data={data}
  columns={columns}
  selectedRowCount={5}
  onClose={() => {}}
/>
```

**Export Formats:**
- CSV (with custom delimiters)
- JSON (with indentation)
- Excel (XLSX with formatting)
- Clipboard (tab-separated)

**Options:**
- Include headers
- Export selected rows only
- Export visible columns only

## Hooks

### useDataAnalytics

Process data with filters, sorting, and grouping.

```tsx
import { useDataAnalytics, useAnalyticsStore } from '@noa/ui';

function MyComponent({ data }) {
  const { filters, groupBy, sortBy } = useAnalyticsStore();

  const { processedData, stats } = useDataAnalytics({
    data,
    filters,
    groupBy,
    sortBy,
  });

  return (
    <div>
      <p>Total: {stats.totalRows}</p>
      <p>Filtered: {stats.filteredRows}</p>
      {/* Render processedData */}
    </div>
  );
}
```

### useColumnManagement

Manage column visibility and ordering.

```tsx
import { useColumnManagement } from '@noa/ui';

function MyComponent({ initialColumns }) {
  const {
    columns,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    pinColumn,
  } = useColumnManagement(initialColumns);

  return (
    // Your UI
  );
}
```

## State Management

The analytics components use Zustand for state management with localStorage persistence.

```tsx
import { useAnalyticsStore } from '@noa/ui';

function MyComponent() {
  const {
    // State
    filters,
    filterPresets,
    groupBy,
    selectedRows,
    sortBy,

    // Filter actions
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    saveFilterPreset,
    loadFilterPreset,

    // Grouping
    setGroupBy,

    // Selection
    toggleRowSelection,
    selectAllRows,
    clearRowSelection,

    // Sorting
    setSortBy,
  } = useAnalyticsStore();

  // Your logic
}
```

## Utilities

### exportData

Export data programmatically.

```tsx
import { exportData } from '@noa/ui';

const handleExport = async () => {
  await exportData(data, columns, {
    format: 'xlsx',
    filename: 'my-data.xlsx',
    includeHeaders: true,
    selectedRowsOnly: false,
    visibleColumnsOnly: true,
    xlsxSheetName: 'Sales Data',
  });
};
```

### calculateAggregations

Calculate aggregations for data.

```tsx
import { calculateAggregations } from '@noa/ui';

const results = calculateAggregations(
  data,
  'revenue',
  ['sum', 'avg', 'max']
);

console.log(results); // { sum: 10000, avg: 500, max: 2000 }
```

## Type Definitions

### ColumnConfig

```typescript
interface ColumnConfig {
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
```

### ColumnFormat

```typescript
interface ColumnFormat {
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'datetime' | 'boolean';
  decimals?: number;
  currencySymbol?: string;
  dateFormat?: string;
  locale?: string;
}
```

### FilterCondition

```typescript
interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: unknown;
  value2?: unknown; // For 'between' operator
  enabled: boolean;
}
```

### GroupByConfig

```typescript
interface GroupByConfig {
  columns: string[];
  aggregations: AggregationConfig[];
  showSubtotals: boolean;
  showGrandTotal: boolean;
}
```

## Examples

### Basic Table

```tsx
import { DataTable } from '@noa/ui';

const data = [
  { id: 1, name: 'Alice', age: 30, salary: 75000 },
  { id: 2, name: 'Bob', age: 25, salary: 65000 },
  { id: 3, name: 'Charlie', age: 35, salary: 85000 },
];

const columns = [
  { id: 'id', header: 'ID', accessorKey: 'id', visible: true },
  { id: 'name', header: 'Name', accessorKey: 'name', visible: true },
  { id: 'age', header: 'Age', accessorKey: 'age', visible: true },
  {
    id: 'salary',
    header: 'Salary',
    accessorKey: 'salary',
    visible: true,
    format: { type: 'currency', decimals: 2 },
  },
];

<DataTable data={data} columns={columns} height={400} />
```

### With Programmatic Filters

```tsx
import { DataTable, useAnalyticsStore } from '@noa/ui';

function SalesReport() {
  const { addFilter } = useAnalyticsStore();

  const handleHighValue = () => {
    addFilter({
      id: `filter-${Date.now()}`,
      column: 'amount',
      operator: 'greaterThan',
      value: 10000,
      enabled: true,
    });
  };

  return (
    <div>
      <button onClick={handleHighValue}>Show High Value Only</button>
      <DataTable data={salesData} columns={columns} />
    </div>
  );
}
```

### With Grouping

```tsx
import { DataTable, useAnalyticsStore } from '@noa/ui';

function GroupedReport() {
  const { setGroupBy } = useAnalyticsStore();

  useEffect(() => {
    setGroupBy({
      columns: ['region', 'category'],
      aggregations: [
        { id: 'agg-1', column: 'revenue', function: 'sum' },
        { id: 'agg-2', column: 'units', function: 'count' },
      ],
      showSubtotals: true,
      showGrandTotal: true,
    });
  }, [setGroupBy]);

  return <DataTable data={salesData} columns={columns} />;
}
```

### Custom Export

```tsx
import { exportData } from '@noa/ui';

function ExportButtons() {
  const handleExportCSV = async () => {
    await exportData(data, columns, {
      format: 'csv',
      filename: 'report.csv',
      includeHeaders: true,
      csvDelimiter: ';',
    });
  };

  const handleExportExcel = async () => {
    await exportData(data, columns, {
      format: 'xlsx',
      filename: 'report.xlsx',
      includeHeaders: true,
      xlsxSheetName: 'Q4 Report',
    });
  };

  return (
    <div>
      <button onClick={handleExportCSV}>Export CSV</button>
      <button onClick={handleExportExcel}>Export Excel</button>
    </div>
  );
}
```

## Performance

### Virtual Scrolling

The DataTable uses `react-window` for efficient rendering:
- Only visible rows are rendered
- Smooth scrolling even with 10k+ rows
- Minimal memory footprint

### Memoization

Heavy computations are memoized:
- Data filtering
- Sorting
- Aggregations
- Column visibility

### Optimized Re-renders

Using React Table's optimization:
- Minimal re-renders on state changes
- Efficient column resizing
- Smart selection handling

## Accessibility

All components follow WCAG 2.1 AA standards:
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA labels

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Migration Guide

If migrating from an older analytics library:

1. **Update imports:**
   ```tsx
   // Before
   import { Table } from 'old-library';

   // After
   import { DataTable } from '@noa/ui';
   ```

2. **Update column definitions:**
   ```tsx
   // Before
   { field: 'name', headerName: 'Name' }

   // After
   { id: 'name', header: 'Name', accessorKey: 'name', visible: true }
   ```

3. **Use Zustand store instead of local state:**
   ```tsx
   // Before
   const [filters, setFilters] = useState([]);

   // After
   const { filters, addFilter } = useAnalyticsStore();
   ```

## Troubleshooting

### Virtual scrolling not working
- Ensure `enableVirtualization={true}`
- Set a fixed `height` prop
- Check that data is an array

### Filters not applying
- Verify filter operators match column types
- Check that filters are enabled
- Ensure column is filterable

### Export fails
- Check browser permissions for downloads
- Verify data format
- Ensure filename doesn't contain special characters

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT
