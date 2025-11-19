/**
 * Data Table Component
 *
 * Advanced data table with virtual scrolling, filtering, sorting,
 * aggregation, and export capabilities
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
  ColumnResizeMode,
} from '@tanstack/react-table';
import { FixedSizeList as List } from 'react-window';
import type { DataTableProps, ColumnConfig } from '../../types/analytics';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useDataAnalytics } from '../../hooks/useDataAnalytics';
import { FilterPanel } from './FilterPanel';
import { AggregationPanel } from './AggregationPanel';
import { ExportDialog } from './ExportDialog';

export function DataTable<TData extends Record<string, any> = any>({
  data,
  columns: columnConfigs,
  enableFiltering = true,
  enableAggregation = true,
  enableGrouping = true,
  enableSorting = true,
  enableRowSelection = true,
  enableVirtualization = true,
  enableExport = true,
  enableColumnCustomization = true,
  height = 600,
  loading = false,
  error = null,
}: DataTableProps<TData>) {
  // Store state
  const {
    filters,
    groupBy,
    selectedRows,
    sortBy,
    clearRowSelection,
    setSortBy,
  } = useAnalyticsStore();

  // Local state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showAggregationPanel, setShowAggregationPanel] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  // Refs
  const tableRef = useRef<HTMLDivElement>(null);

  // Process data with analytics
  const { processedData, stats } = useDataAnalytics({
    data,
    filters,
    groupBy,
    sortBy,
  });

  // Convert column configs to TanStack Table columns
  const columns = useMemo<ColumnDef<TData>[]>(() => {
    const visibleColumns = columnConfigs.filter((c) => c.visible);

    // Add selection column if enabled
    const cols: ColumnDef<TData>[] = enableRowSelection
      ? [
          {
            id: 'select',
            header: ({ table }) => {
              const checkboxRef = useRef<HTMLInputElement>(null);
              const isIndeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();

              useEffect(() => {
                if (checkboxRef.current) {
                  checkboxRef.current.indeterminate = isIndeterminate;
                }
              }, [isIndeterminate]);

              return (
                <input
                  ref={checkboxRef}
                  type="checkbox"
                  checked={table.getIsAllRowsSelected()}
                  onChange={table.getToggleAllRowsSelectedHandler()}
                />
              );
            },
            cell: ({ row }) => (
              <input
                type="checkbox"
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
              />
            ),
            size: 50,
            enableSorting: false,
            enableResizing: false,
          },
        ]
      : [];

    // Add data columns
    visibleColumns.forEach((col) => {
      cols.push({
        id: col.id,
        accessorKey: col.accessorKey,
        header: col.header,
        size: col.width,
        minSize: col.minWidth,
        maxSize: col.maxWidth,
        enableSorting: col.sortable !== false && enableSorting,
        enableResizing: col.resizable !== false,
        cell: ({ getValue }) => {
          const value = getValue();
          return formatCellValue(value, col.format);
        },
      });
    });

    return cols;
  }, [columnConfigs, enableRowSelection, enableSorting]);

  // Table instance
  const table = useReactTable({
    data: processedData as TData[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection,
    enableSorting,
    enableColumnResizing: true,
    columnResizeMode,
    state: {
      sorting: sortBy,
      rowSelection: Array.from(selectedRows).reduce((acc, id) => {
        acc[id] = true;
        return acc;
      }, {} as RowSelectionState),
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sortBy) : updater;
      setSortBy(newSorting);
    },
  });

  // Virtual scrolling
  const { rows } = table.getRowModel();
  const rowVirtualizer = enableVirtualization
    ? useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableRef.current,
        estimateSize: () => 40,
        overscan: 10,
      })
    : null;

  // Render virtual row
  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = rows[index];
      return (
        <div style={style} className="table-row">
          {row.getVisibleCells().map((cell) => (
            <div
              key={cell.id}
              className="table-cell"
              style={{ width: cell.column.getSize() }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ))}
        </div>
      );
    },
    [rows]
  );

  // Toolbar actions
  const handleExport = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  const handleClearSelection = useCallback(() => {
    clearRowSelection();
  }, [clearRowSelection]);

  if (error) {
    return (
      <div className="table-error">
        <h3>Error loading data</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <div className="stats">
            <span>
              {stats.filteredRows.toLocaleString()} of {stats.totalRows.toLocaleString()} rows
            </span>
            {selectedRows.size > 0 && (
              <span className="selected-count">
                {selectedRows.size} selected
              </span>
            )}
          </div>
        </div>

        <div className="toolbar-right">
          {enableFiltering && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`toolbar-button ${filters.length > 0 ? 'active' : ''}`}
              title="Filters"
            >
              Filters {filters.length > 0 && `(${filters.length})`}
            </button>
          )}

          {enableAggregation && enableGrouping && (
            <button
              onClick={() => setShowAggregationPanel(!showAggregationPanel)}
              className={`toolbar-button ${groupBy ? 'active' : ''}`}
              title="Group & Aggregate"
            >
              Group & Aggregate
            </button>
          )}

          {enableColumnCustomization && (
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="toolbar-button"
              title="Columns"
            >
              Columns
            </button>
          )}

          {enableExport && (
            <button
              onClick={handleExport}
              className="toolbar-button"
              title="Export"
            >
              Export
            </button>
          )}

          {selectedRows.size > 0 && (
            <button
              onClick={handleClearSelection}
              className="toolbar-button"
              title="Clear selection"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="table-content">
        {/* Table */}
        <div
          ref={tableRef}
          className="table-wrapper"
          style={{ height: `${height}px` }}
        >
          {loading ? (
            <div className="table-loading">
              <div className="spinner" />
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="table-header">
                {table.getHeaderGroups().map((headerGroup) => (
                  <div key={headerGroup.id} className="table-row header-row">
                    {headerGroup.headers.map((header) => (
                      <div
                        key={header.id}
                        className="table-cell header-cell"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`header-content ${
                              header.column.getCanSort() ? 'sortable' : ''
                            }`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getIsSorted() && (
                              <span className="sort-indicator">
                                {header.column.getIsSorted() === 'asc' ? ' ▲' : ' ▼'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Column Resizer */}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`resizer ${
                              header.column.getIsResizing() ? 'isResizing' : ''
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Body */}
              <div className="table-body">
                {enableVirtualization && rowVirtualizer ? (
                  <List
                    height={height - 50}
                    itemCount={rows.length}
                    itemSize={40}
                    width="100%"
                  >
                    {renderRow}
                  </List>
                ) : (
                  rows.map((row) => (
                    <div key={row.id} className="table-row">
                      {row.getVisibleCells().map((cell) => (
                        <div
                          key={cell.id}
                          className="table-cell"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Side Panels */}
        {showFilterPanel && (
          <FilterPanel
            columns={columnConfigs}
            onClose={() => setShowFilterPanel(false)}
          />
        )}

        {showAggregationPanel && (
          <AggregationPanel
            columns={columnConfigs}
            onClose={() => setShowAggregationPanel(false)}
          />
        )}
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          data={processedData}
          columns={columnConfigs}
          selectedRowCount={selectedRows.size}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      <style>{`
        .data-table-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .table-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
          background: #f9f9f9;
        }

        .toolbar-left,
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stats {
          display: flex;
          gap: 1rem;
          font-size: 14px;
          color: #666;
        }

        .selected-count {
          color: #2196f3;
          font-weight: 600;
        }

        .toolbar-button {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .toolbar-button:hover {
          background: #f5f5f5;
          border-color: #999;
        }

        .toolbar-button.active {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .table-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .table-wrapper {
          flex: 1;
          overflow: auto;
          position: relative;
        }

        .table-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #f5f5f5;
          border-bottom: 2px solid #e0e0e0;
        }

        .table-row {
          display: flex;
          border-bottom: 1px solid #e0e0e0;
        }

        .header-row {
          font-weight: 600;
        }

        .table-cell {
          padding: 0.75rem;
          flex-shrink: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border-right: 1px solid #e0e0e0;
        }

        .header-cell {
          position: relative;
          background: #f5f5f5;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
        }

        .header-content.sortable {
          cursor: pointer;
        }

        .header-content.sortable:hover {
          background: #e8e8e8;
        }

        .sort-indicator {
          margin-left: 0.5rem;
          color: #2196f3;
        }

        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: 5px;
          background: transparent;
          cursor: col-resize;
          user-select: none;
          touch-action: none;
        }

        .resizer:hover,
        .resizer.isResizing {
          background: #2196f3;
        }

        .table-body {
          flex: 1;
        }

        .table-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #2196f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .table-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #c62828;
        }
      `}</style>
    </div>
  );
}

/**
 * Format cell value based on column format
 */
function formatCellValue(value: any, format?: ColumnConfig['format']): string {
  if (value == null) return '';

  if (!format) return String(value);

  switch (format.type) {
    case 'number':
      return typeof value === 'number'
        ? value.toLocaleString(format.locale, {
            minimumFractionDigits: format.decimals ?? 0,
            maximumFractionDigits: format.decimals ?? 0,
          })
        : String(value);

    case 'currency':
      return typeof value === 'number'
        ? new Intl.NumberFormat(format.locale, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: format.decimals ?? 2,
            maximumFractionDigits: format.decimals ?? 2,
          }).format(value)
        : String(value);

    case 'percentage':
      return typeof value === 'number'
        ? `${(value * 100).toFixed(format.decimals ?? 1)}%`
        : String(value);

    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString(format.locale);
      }
      return String(value);

    case 'datetime':
      if (value instanceof Date) {
        return value.toLocaleString(format.locale);
      }
      return String(value);

    case 'boolean':
      return value ? 'Yes' : 'No';

    default:
      return String(value);
  }
}

// Virtual scrolling hook (simplified version)
function useVirtualizer(_config: any) {
  // This is a placeholder - in real implementation, use react-window
  return null;
}
