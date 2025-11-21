/**
 * Table Widget
 *
 * Sortable data table with pagination
 */

import React, { useState, useMemo } from 'react';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

export const TableWidget: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 5;

  const fetchData = async (): Promise<WidgetData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      tableData: {
        columns: [
          { key: 'id', label: 'ID', sortable: true, width: '15%' },
          { key: 'name', label: 'Name', sortable: true, width: '35%' },
          { key: 'status', label: 'Status', sortable: true, width: '25%' },
          { key: 'value', label: 'Value', sortable: true, width: '25%' },
        ],
        rows: Array.from({ length: 15 }, (_, i) => ({
          id: `#${1000 + i}`,
          name: `Item ${i + 1}`,
          status: ['Active', 'Pending', 'Completed'][Math.floor(Math.random() * 3)],
          value: Math.floor(Math.random() * 1000),
        })),
      },
    };
  };

  const { data, isLoading } = useWidgetData(id, fetchData, settings.refreshInterval);
  const widgetData = propData || data;

  const tableData = widgetData?.tableData;

  // Sorting
  const sortedRows = useMemo(() => {
    if (!tableData?.rows || !sortColumn) return tableData?.rows || [];

    return [...tableData.rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [tableData?.rows, sortColumn, sortDirection]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = currentPage * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, currentPage]);

  const totalPages = Math.ceil((sortedRows?.length || 0) / rowsPerPage);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  if (isLoading && !widgetData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tableData) {
    return <div className="text-gray-500 text-center">No data available</div>;
  }

  return (
    <div className="table-widget h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {tableData.columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 border-b border-gray-100">
                {tableData.columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 text-gray-700">
                    {column.key === 'status' ? (
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row[column.key] === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : row[column.key] === 'Pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {row[column.key]}
                      </span>
                    ) : (
                      row[column.key]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <span>
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableWidget;
