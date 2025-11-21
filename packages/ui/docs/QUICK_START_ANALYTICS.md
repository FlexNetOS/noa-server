# Quick Start: Data Analytics Components

Get started with the advanced data analytics UI in 5 minutes.

## Installation

The analytics components are part of `@noa/ui`. All dependencies are already included:

```bash
# Already installed in the UI package
pnpm install
```

## Basic Usage

### 1. Import Components

```tsx
import { DataTable } from '@noa/ui';
import type { ColumnConfig } from '@noa/ui';
```

### 2. Define Columns

```tsx
const columns: ColumnConfig[] = [
  {
    id: 'id',
    header: 'ID',
    accessorKey: 'id',
    visible: true,
    width: 80,
  },
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    visible: true,
    width: 200,
  },
  {
    id: 'revenue',
    header: 'Revenue',
    accessorKey: 'revenue',
    visible: true,
    width: 120,
    format: {
      type: 'currency',
      decimals: 2,
    },
  },
];
```

### 3. Prepare Data

```tsx
const data = [
  { id: 1, name: 'Product A', revenue: 12500 },
  { id: 2, name: 'Product B', revenue: 8750 },
  { id: 3, name: 'Product C', revenue: 15200 },
];
```

### 4. Render Table

```tsx
function App() {
  return (
    <DataTable
      data={data}
      columns={columns}
      height={600}
    />
  );
}
```

## Common Use Cases

### Financial Dashboard

```tsx
const financialColumns: ColumnConfig[] = [
  { id: 'date', header: 'Date', accessorKey: 'date', visible: true,
    format: { type: 'date' } },
  { id: 'revenue', header: 'Revenue', accessorKey: 'revenue', visible: true,
    format: { type: 'currency', decimals: 2 } },
  { id: 'expenses', header: 'Expenses', accessorKey: 'expenses', visible: true,
    format: { type: 'currency', decimals: 2 } },
  { id: 'profit', header: 'Profit Margin', accessorKey: 'profitMargin', visible: true,
    format: { type: 'percentage', decimals: 1 } },
];

<DataTable
  data={financialData}
  columns={financialColumns}
  enableFiltering
  enableAggregation
  enableExport
/>
```

### Employee Directory

```tsx
const employeeColumns: ColumnConfig[] = [
  { id: 'name', header: 'Name', accessorKey: 'name', visible: true, pinned: 'left' },
  { id: 'department', header: 'Department', accessorKey: 'department', visible: true },
  { id: 'salary', header: 'Salary', accessorKey: 'salary', visible: true,
    format: { type: 'currency', decimals: 0 } },
  { id: 'startDate', header: 'Start Date', accessorKey: 'startDate', visible: true,
    format: { type: 'date' } },
  { id: 'active', header: 'Active', accessorKey: 'active', visible: true,
    format: { type: 'boolean' } },
];

<DataTable
  data={employees}
  columns={employeeColumns}
  enableRowSelection
  enableColumnCustomization
/>
```

### Sales Report with Grouping

```tsx
import { useAnalyticsStore } from '@noa/ui';

function SalesReport() {
  const { setGroupBy } = useAnalyticsStore();

  useEffect(() => {
    setGroupBy({
      columns: ['region', 'product'],
      aggregations: [
        { id: 'agg-1', column: 'sales', function: 'sum', label: 'Total Sales' },
        { id: 'agg-2', column: 'units', function: 'count', label: 'Units Sold' },
      ],
      showSubtotals: true,
      showGrandTotal: true,
    });
  }, []);

  return <DataTable data={salesData} columns={salesColumns} />;
}
```

## Programmatic Filtering

```tsx
import { useAnalyticsStore } from '@noa/ui';

function FilteredView() {
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
      <button onClick={handleHighValue}>Show High Value Items</button>
      <DataTable data={data} columns={columns} />
    </div>
  );
}
```

## Export Data

```tsx
import { exportData } from '@noa/ui';

async function handleExport() {
  // Export to Excel
  await exportData(data, columns, {
    format: 'xlsx',
    filename: 'sales-report.xlsx',
    includeHeaders: true,
    visibleColumnsOnly: true,
    xlsxSheetName: 'Q4 Sales',
  });

  // Export to CSV
  await exportData(data, columns, {
    format: 'csv',
    filename: 'sales-report.csv',
    includeHeaders: true,
    csvDelimiter: ',',
  });
}
```

## Column Formatting

### Currency

```tsx
{
  id: 'price',
  header: 'Price',
  accessorKey: 'price',
  visible: true,
  format: {
    type: 'currency',
    decimals: 2,
    currencySymbol: '$',
    locale: 'en-US',
  }
}
```

### Percentage

```tsx
{
  id: 'growth',
  header: 'Growth Rate',
  accessorKey: 'growth',
  visible: true,
  format: {
    type: 'percentage',
    decimals: 1,
  }
}
```

### Date

```tsx
{
  id: 'createdAt',
  header: 'Created',
  accessorKey: 'createdAt',
  visible: true,
  format: {
    type: 'date',
    locale: 'en-US',
  }
}
```

### Number

```tsx
{
  id: 'quantity',
  header: 'Quantity',
  accessorKey: 'quantity',
  visible: true,
  format: {
    type: 'number',
    decimals: 0,
    locale: 'en-US',
  }
}
```

## Performance Tips

### Large Datasets

For 10,000+ rows, enable virtualization:

```tsx
<DataTable
  data={largeDataset}
  columns={columns}
  enableVirtualization={true}
  height={800}
/>
```

### Memoize Data

```tsx
const memoizedData = useMemo(() => fetchData(), [dependencies]);
const memoizedColumns = useMemo(() => defineColumns(), []);

<DataTable data={memoizedData} columns={memoizedColumns} />
```

## Keyboard Shortcuts

When focused on table:
- `Arrow Keys` - Navigate cells
- `Tab` - Next cell
- `Shift+Tab` - Previous cell
- `Space` - Toggle row selection
- `Ctrl+A` - Select all rows
- `Escape` - Clear selection

## Troubleshooting

### Table not rendering

Check that:
1. Data is an array
2. Columns have unique `id` values
3. `accessorKey` matches data properties
4. Height is set (required for virtualization)

### Filters not working

Ensure:
1. `enableFiltering={true}`
2. Column has `filterable: true` (or not explicitly false)
3. Operator matches column type

### Virtual scrolling issues

Requirements:
1. Set fixed `height` prop
2. Enable virtualization: `enableVirtualization={true}`
3. Data must be array (not null/undefined)

## Next Steps

- Read full documentation: `/docs/analytics-components.md`
- View examples: `/src/components/analytics/examples/`
- API reference: See type definitions in `/src/types/analytics.ts`

## Support

- GitHub Issues: [Create Issue](link-to-repo)
- Documentation: [Full Docs](/docs/analytics-components.md)
- Examples: [View Examples](/src/components/analytics/examples/)
