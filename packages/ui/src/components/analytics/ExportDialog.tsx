/**
 * Export Dialog Component
 *
 * Dialog for configuring and executing data exports
 */

import { useState } from 'react';
import type { ExportConfig, ExportFormat, ColumnConfig } from '../../types/analytics';
import { exportData } from '../../utils/dataExport';

interface ExportDialogProps {
  data: any[];
  columns: ColumnConfig[];
  selectedRowCount: number;
  onClose: () => void;
}

export function ExportDialog({
  data,
  columns,
  selectedRowCount,
  onClose,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [filename, setFilename] = useState('data-export');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [selectedRowsOnly, setSelectedRowsOnly] = useState(false);
  const [visibleColumnsOnly, setVisibleColumnsOnly] = useState(true);
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const [jsonIndent, setJsonIndent] = useState(2);
  const [xlsxSheetName, setXlsxSheetName] = useState('Sheet1');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const getFileExtension = (): string => {
    switch (format) {
      case 'csv':
        return 'csv';
      case 'json':
        return 'json';
      case 'xlsx':
        return 'xlsx';
      default:
        return 'txt';
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const config: ExportConfig = {
        format,
        filename: `${filename}.${getFileExtension()}`,
        includeHeaders,
        selectedRowsOnly,
        visibleColumnsOnly,
        csvDelimiter,
        jsonIndent,
        xlsxSheetName,
      };

      // In a real implementation, you would filter data based on selectedRowsOnly
      await exportData(data, columns, config);

      setExportSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const rowCount = selectedRowsOnly ? selectedRowCount : data.length;
  const columnCount = visibleColumnsOnly
    ? columns.filter((c) => c.visible).length
    : columns.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Export Data</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="dialog-content">
          {/* Format Selection */}
          <section className="section">
            <h3>Export Format</h3>
            <div className="format-options">
              <label className="format-option">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                />
                <div className="format-label">
                  <strong>CSV</strong>
                  <span>Comma-separated values</span>
                </div>
              </label>

              <label className="format-option">
                <input
                  type="radio"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                />
                <div className="format-label">
                  <strong>JSON</strong>
                  <span>JavaScript Object Notation</span>
                </div>
              </label>

              <label className="format-option">
                <input
                  type="radio"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                />
                <div className="format-label">
                  <strong>Excel</strong>
                  <span>Microsoft Excel spreadsheet</span>
                </div>
              </label>

              <label className="format-option">
                <input
                  type="radio"
                  value="clipboard"
                  checked={format === 'clipboard'}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                />
                <div className="format-label">
                  <strong>Clipboard</strong>
                  <span>Copy to clipboard (tab-separated)</span>
                </div>
              </label>
            </div>
          </section>

          {/* General Options */}
          <section className="section">
            <h3>Options</h3>

            {format !== 'clipboard' && (
              <div className="form-group">
                <label>Filename</label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="Enter filename"
                />
              </div>
            )}

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
              />
              <span>Include column headers</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedRowsOnly}
                onChange={(e) => setSelectedRowsOnly(e.target.checked)}
                disabled={selectedRowCount === 0}
              />
              <span>
                Export selected rows only ({selectedRowCount} selected)
              </span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={visibleColumnsOnly}
                onChange={(e) => setVisibleColumnsOnly(e.target.checked)}
              />
              <span>Export visible columns only</span>
            </label>
          </section>

          {/* Format-specific Options */}
          {format === 'csv' && (
            <section className="section">
              <h3>CSV Options</h3>
              <div className="form-group">
                <label>Delimiter</label>
                <select
                  value={csvDelimiter}
                  onChange={(e) => setCsvDelimiter(e.target.value)}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>
            </section>
          )}

          {format === 'json' && (
            <section className="section">
              <h3>JSON Options</h3>
              <div className="form-group">
                <label>Indentation</label>
                <select
                  value={jsonIndent}
                  onChange={(e) => setJsonIndent(Number(e.target.value))}
                >
                  <option value={0}>Minified</option>
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                </select>
              </div>
            </section>
          )}

          {format === 'xlsx' && (
            <section className="section">
              <h3>Excel Options</h3>
              <div className="form-group">
                <label>Sheet Name</label>
                <input
                  type="text"
                  value={xlsxSheetName}
                  onChange={(e) => setXlsxSheetName(e.target.value)}
                  placeholder="Sheet name"
                />
              </div>
            </section>
          )}

          {/* Summary */}
          <section className="section summary">
            <h3>Export Summary</h3>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Rows:</span>
                <span className="stat-value">{rowCount.toLocaleString()}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Columns:</span>
                <span className="stat-value">{columnCount}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Format:</span>
                <span className="stat-value">{format.toUpperCase()}</span>
              </div>
            </div>
          </section>

          {/* Status Messages */}
          {exportSuccess && (
            <div className="alert alert-success">
              Export completed successfully!
            </div>
          )}

          {exportError && (
            <div className="alert alert-error">
              Export failed: {exportError}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button onClick={onClose} className="button-secondary">
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="button-primary"
            disabled={exporting || !filename.trim()}
          >
            {exporting ? 'Exporting...' : format === 'clipboard' ? 'Copy' : 'Export'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .export-dialog {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .dialog-content {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .dialog-footer {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          padding: 1.5rem;
          border-top: 1px solid #e0e0e0;
        }

        .section {
          margin-bottom: 1.5rem;
        }

        .section h3 {
          margin: 0 0 1rem 0;
          font-size: 16px;
          font-weight: 600;
        }

        .format-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .format-option {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .format-option:hover {
          border-color: #2196f3;
          background: #f5f9ff;
        }

        .format-option input[type='radio']:checked + .format-label {
          color: #2196f3;
        }

        .format-label {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .format-label strong {
          font-size: 14px;
        }

        .format-label span {
          font-size: 12px;
          color: #666;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
        }

        .summary {
          background: #f5f5f5;
          padding: 1rem;
          border-radius: 4px;
        }

        .summary-stats {
          display: flex;
          gap: 2rem;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: #2196f3;
        }

        .alert {
          padding: 1rem;
          border-radius: 4px;
          margin-top: 1rem;
        }

        .alert-success {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .alert-error {
          background: #ffebee;
          color: #c62828;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          color: #666;
        }

        .button-primary {
          background: #2196f3;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .button-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .button-secondary {
          background: white;
          color: #333;
          border: 1px solid #ccc;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        h2 {
          margin: 0;
          font-size: 24px;
        }
      `}</style>
    </div>
  );
}
