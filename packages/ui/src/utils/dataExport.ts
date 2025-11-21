/**
 * Data Export Utilities
 *
 * Utilities for exporting data to various formats (CSV, JSON, Excel)
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ColumnConfig, ExportConfig } from '../types/analytics';

/**
 * Export data to CSV format
 */
export function exportToCSV<T = any>(
  data: T[],
  columns: ColumnConfig[],
  config: ExportConfig
): void {
  const visibleColumns = config.visibleColumnsOnly
    ? columns.filter((c) => c.visible)
    : columns;

  const headers = config.includeHeaders
    ? visibleColumns.map((c) => c.header)
    : [];

  const rows = data.map((row: any) =>
    visibleColumns.map((col) => {
      const value = row[col.accessorKey];
      return formatCellValue(value, col.format);
    })
  );

  const csvData = config.includeHeaders ? [headers, ...rows] : rows;

  const csv = Papa.unparse(csvData, {
    delimiter: config.csvDelimiter || ',',
    quotes: true,
  });

  downloadFile(csv, config.filename, 'text/csv');
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T = any>(
  data: T[],
  columns: ColumnConfig[],
  config: ExportConfig
): void {
  const visibleColumns = config.visibleColumnsOnly
    ? columns.filter((c) => c.visible)
    : columns;

  const jsonData = data.map((row: any) => {
    const obj: Record<string, any> = {};
    visibleColumns.forEach((col) => {
      obj[col.accessorKey] = row[col.accessorKey];
    });
    return obj;
  });

  const json = JSON.stringify(jsonData, null, config.jsonIndent || 2);
  downloadFile(json, config.filename, 'application/json');
}

/**
 * Export data to Excel format
 */
export function exportToExcel<T = any>(
  data: T[],
  columns: ColumnConfig[],
  config: ExportConfig
): void {
  const visibleColumns = config.visibleColumnsOnly
    ? columns.filter((c) => c.visible)
    : columns;

  // Create worksheet data
  const wsData: any[][] = [];

  // Add headers
  if (config.includeHeaders) {
    wsData.push(visibleColumns.map((c) => c.header));
  }

  // Add data rows
  data.forEach((row: any) => {
    const rowData = visibleColumns.map((col) => {
      const value = row[col.accessorKey];
      return formatCellValue(value, col.format);
    });
    wsData.push(rowData);
  });

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Apply column widths
  ws['!cols'] = visibleColumns.map((col) => ({
    wch: col.width ? col.width / 10 : 15,
  }));

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, config.xlsxSheetName || 'Data');

  // Generate and download file
  XLSX.writeFile(wb, config.filename);
}

/**
 * Copy data to clipboard
 */
export async function copyToClipboard<T = any>(
  data: T[],
  columns: ColumnConfig[],
  config: ExportConfig
): Promise<void> {
  const visibleColumns = config.visibleColumnsOnly
    ? columns.filter((c) => c.visible)
    : columns;

  const headers = config.includeHeaders
    ? visibleColumns.map((c) => c.header).join('\t')
    : '';

  const rows = data
    .map((row: any) =>
      visibleColumns
        .map((col) => {
          const value = row[col.accessorKey];
          return formatCellValue(value, col.format);
        })
        .join('\t')
    )
    .join('\n');

  const text = config.includeHeaders ? `${headers}\n${rows}` : rows;

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Main export function that routes to the appropriate export method
 */
export async function exportData<T = any>(
  data: T[],
  columns: ColumnConfig[],
  config: ExportConfig
): Promise<void> {
  switch (config.format) {
    case 'csv':
      exportToCSV(data, columns, config);
      break;
    case 'json':
      exportToJSON(data, columns, config);
      break;
    case 'xlsx':
      exportToExcel(data, columns, config);
      break;
    case 'clipboard':
      await copyToClipboard(data, columns, config);
      break;
    default:
      throw new Error(`Unsupported export format: ${config.format}`);
  }
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
        ? value.toFixed(format.decimals ?? 0)
        : String(value);

    case 'currency':
      return typeof value === 'number'
        ? `${format.currencySymbol || '$'}${value.toFixed(format.decimals ?? 2)}`
        : String(value);

    case 'percentage':
      return typeof value === 'number'
        ? `${(value * 100).toFixed(format.decimals ?? 1)}%`
        : String(value);

    case 'date':
    case 'datetime':
      if (value instanceof Date) {
        return value.toLocaleDateString(format.locale);
      }
      return String(value);

    case 'boolean':
      return value ? 'Yes' : 'No';

    default:
      return String(value);
  }
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Calculate aggregations for grouped data
 */
export function calculateAggregations<T = any>(
  data: T[],
  column: string,
  functions: string[]
): Record<string, number> {
  const values = data.map((row: any) => row[column]).filter((v) => v != null);
  const numericValues = values.filter((v) => typeof v === 'number');

  const results: Record<string, number> = {};

  functions.forEach((func) => {
    switch (func) {
      case 'sum':
        results.sum = numericValues.reduce((acc, val) => acc + val, 0);
        break;
      case 'avg':
        results.avg = numericValues.length > 0
          ? numericValues.reduce((acc, val) => acc + val, 0) / numericValues.length
          : 0;
        break;
      case 'count':
        results.count = values.length;
        break;
      case 'min':
        results.min = numericValues.length > 0
          ? Math.min(...numericValues)
          : 0;
        break;
      case 'max':
        results.max = numericValues.length > 0
          ? Math.max(...numericValues)
          : 0;
        break;
      case 'median':
        if (numericValues.length > 0) {
          const sorted = [...numericValues].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          results.median = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
        } else {
          results.median = 0;
        }
        break;
      case 'mode':
        if (values.length > 0) {
          const frequency: Record<string, number> = {};
          let maxFreq = 0;
          let mode = values[0];

          values.forEach((val) => {
            const key = String(val);
            frequency[key] = (frequency[key] || 0) + 1;
            if (frequency[key] > maxFreq) {
              maxFreq = frequency[key];
              mode = val;
            }
          });

          results.mode = typeof mode === 'number' ? mode : 0;
        } else {
          results.mode = 0;
        }
        break;
    }
  });

  return results;
}
