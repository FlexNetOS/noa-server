/**
 * Basic DataTable Example
 *
 * Demonstrates the basic usage of the DataTable component
 */

import { DataTable } from '../DataTable';
import type { ColumnConfig } from '../../../types/analytics';

// Sample data
const sampleData = [
  {
    id: 1,
    name: 'Alice Johnson',
    department: 'Engineering',
    position: 'Senior Developer',
    salary: 95000,
    startDate: new Date('2020-03-15'),
    performance: 0.92,
    active: true,
  },
  {
    id: 2,
    name: 'Bob Smith',
    department: 'Sales',
    position: 'Account Manager',
    salary: 75000,
    startDate: new Date('2021-06-01'),
    performance: 0.88,
    active: true,
  },
  {
    id: 3,
    name: 'Charlie Brown',
    department: 'Engineering',
    position: 'Tech Lead',
    salary: 120000,
    startDate: new Date('2019-01-10'),
    performance: 0.95,
    active: true,
  },
  {
    id: 4,
    name: 'Diana Prince',
    department: 'Marketing',
    position: 'Marketing Manager',
    salary: 85000,
    startDate: new Date('2020-09-20'),
    performance: 0.90,
    active: false,
  },
  {
    id: 5,
    name: 'Ethan Hunt',
    department: 'Operations',
    position: 'Operations Specialist',
    salary: 65000,
    startDate: new Date('2022-02-14'),
    performance: 0.85,
    active: true,
  },
  {
    id: 6,
    name: 'Fiona Green',
    department: 'HR',
    position: 'HR Manager',
    salary: 78000,
    startDate: new Date('2021-11-05'),
    performance: 0.87,
    active: true,
  },
  {
    id: 7,
    name: 'George Wilson',
    department: 'Engineering',
    position: 'Junior Developer',
    salary: 62000,
    startDate: new Date('2023-01-15'),
    performance: 0.82,
    active: true,
  },
  {
    id: 8,
    name: 'Hannah Lee',
    department: 'Sales',
    position: 'Sales Director',
    salary: 110000,
    startDate: new Date('2018-07-20'),
    performance: 0.93,
    active: true,
  },
];

// Column configuration
const columns: ColumnConfig[] = [
  {
    id: 'id',
    header: 'ID',
    accessorKey: 'id',
    visible: true,
    sortable: true,
    pinned: false,
    width: 80,
    minWidth: 60,
    maxWidth: 120,
  },
  {
    id: 'name',
    header: 'Employee Name',
    accessorKey: 'name',
    visible: true,
    sortable: true,
    pinned: false,
    width: 200,
    minWidth: 150,
  },
  {
    id: 'department',
    header: 'Department',
    accessorKey: 'department',
    visible: true,
    sortable: true,
    filterable: true,
    pinned: false,
    width: 150,
  },
  {
    id: 'position',
    header: 'Position',
    accessorKey: 'position',
    visible: true,
    sortable: true,
    pinned: false,
    width: 180,
  },
  {
    id: 'salary',
    header: 'Salary',
    accessorKey: 'salary',
    visible: true,
    sortable: true,
    filterable: true,
    pinned: false,
    width: 120,
    format: {
      type: 'currency',
      decimals: 0,
      currencySymbol: '$',
      locale: 'en-US',
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
      locale: 'en-US',
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
    id: 'active',
    header: 'Active',
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
 * Basic Example Component
 */
export function BasicExample() {
  return (
    <div style={{ padding: '2rem', height: '100vh' }}>
      <h1 style={{ marginBottom: '1rem' }}>Employee Data - Basic Example</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        This example demonstrates the DataTable component with all features enabled.
        Try filtering by department, sorting by salary, or exporting the data.
      </p>

      <DataTable
        data={sampleData}
        columns={columns}
        enableFiltering={true}
        enableAggregation={true}
        enableGrouping={true}
        enableSorting={true}
        enableRowSelection={true}
        enableVirtualization={true}
        enableExport={true}
        enableColumnCustomization={true}
        height={600}
      />
    </div>
  );
}

export default BasicExample;
