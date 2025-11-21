/**
 * Large Dataset Example
 *
 * Demonstrates virtual scrolling with 10,000+ rows
 */

import { useMemo } from 'react';
import { DataTable } from '../DataTable';
import type { ColumnConfig } from '../../../types/analytics';

/**
 * Generate large dataset
 */
function generateLargeDataset(count: number = 10000) {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations', 'Finance'];
  const positions = [
    'Junior',
    'Mid-level',
    'Senior',
    'Lead',
    'Manager',
    'Director',
    'VP',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Employee ${i + 1}`,
    department: departments[Math.floor(Math.random() * departments.length)],
    position: positions[Math.floor(Math.random() * positions.length)],
    salary: Math.floor(Math.random() * 100000) + 50000,
    startDate: new Date(
      2015 + Math.floor(Math.random() * 9),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    ),
    performance: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
    active: Math.random() > 0.1, // 90% active
    projects: Math.floor(Math.random() * 20),
    hoursPerWeek: Math.floor(Math.random() * 20) + 30,
  }));
}

const columns: ColumnConfig[] = [
  {
    id: 'id',
    header: 'ID',
    accessorKey: 'id',
    visible: true,
    sortable: true,
    width: 80,
    pinned: 'left',
  },
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    visible: true,
    sortable: true,
    width: 150,
    pinned: 'left',
  },
  {
    id: 'department',
    header: 'Department',
    accessorKey: 'department',
    visible: true,
    sortable: true,
    filterable: true,
    pinned: false,
    width: 140,
  },
  {
    id: 'position',
    header: 'Position',
    accessorKey: 'position',
    visible: true,
    sortable: true,
    filterable: true,
    pinned: false,
    width: 120,
  },
  {
    id: 'salary',
    header: 'Annual Salary',
    accessorKey: 'salary',
    visible: true,
    sortable: true,
    filterable: true,
    pinned: false,
    width: 140,
    format: {
      type: 'currency',
      decimals: 0,
      currencySymbol: '$',
    },
  },
  {
    id: 'startDate',
    header: 'Start Date',
    accessorKey: 'startDate',
    visible: true,
    sortable: true,
    pinned: false,
    width: 120,
    format: {
      type: 'date',
    },
  },
  {
    id: 'performance',
    header: 'Performance',
    accessorKey: 'performance',
    visible: true,
    sortable: true,
    pinned: false,
    width: 120,
    format: {
      type: 'percentage',
      decimals: 1,
    },
  },
  {
    id: 'projects',
    header: 'Projects',
    accessorKey: 'projects',
    visible: true,
    sortable: true,
    pinned: false,
    width: 100,
    format: {
      type: 'number',
      decimals: 0,
    },
  },
  {
    id: 'hoursPerWeek',
    header: 'Hours/Week',
    accessorKey: 'hoursPerWeek',
    visible: true,
    sortable: true,
    pinned: false,
    width: 120,
    format: {
      type: 'number',
      decimals: 0,
    },
  },
  {
    id: 'active',
    header: 'Status',
    accessorKey: 'active',
    visible: true,
    sortable: true,
    pinned: false,
    width: 100,
    format: {
      type: 'boolean',
    },
  },
];

/**
 * Large Dataset Example Component
 */
export function LargeDatasetExample() {
  // Generate data once using useMemo
  const data = useMemo(() => generateLargeDataset(10000), []);

  return (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>
          Large Dataset Example - 10,000 Employees
        </h1>
        <p style={{ color: '#666' }}>
          This example demonstrates virtual scrolling performance with 10,000 rows.
          Notice the smooth scrolling and instant filtering/sorting.
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', fontSize: '14px' }}>
          <span>
            <strong>Total Records:</strong> {data.length.toLocaleString()}
          </span>
          <span>
            <strong>Virtual Scrolling:</strong> Enabled
          </span>
          <span>
            <strong>Performance:</strong> Only visible rows rendered
          </span>
        </div>
      </div>

      <DataTable
        data={data}
        columns={columns}
        enableFiltering={true}
        enableAggregation={true}
        enableGrouping={true}
        enableSorting={true}
        enableRowSelection={true}
        enableVirtualization={true}
        enableExport={true}
        enableColumnCustomization={true}
        height={700}
      />

      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Performance Tips:</h3>
        <ul style={{ marginLeft: '1.5rem', fontSize: '14px', color: '#666' }}>
          <li>Virtual scrolling renders only visible rows (~20-30 rows at a time)</li>
          <li>Filtering and sorting are optimized with memoization</li>
          <li>Column pinning keeps important columns in view during horizontal scroll</li>
          <li>Try grouping by department and aggregating salaries</li>
          <li>Export supports all 10,000 rows to CSV, JSON, or Excel</li>
        </ul>
      </div>
    </div>
  );
}

export default LargeDatasetExample;
