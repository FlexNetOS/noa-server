/**
 * Aggregation Panel Component
 *
 * Configure grouping and aggregation functions
 */

import { useState } from 'react';
import type {
  GroupByConfig,
  AggregationConfig,
  AggregationFunction,
  ColumnConfig,
} from '../../types/analytics';
import { useAnalyticsStore } from '../../stores/analyticsStore';

interface AggregationPanelProps {
  columns: ColumnConfig[];
  onClose?: () => void;
}

const AGGREGATION_FUNCTIONS: Array<{ value: AggregationFunction; label: string }> = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'median', label: 'Median' },
  { value: 'mode', label: 'Mode' },
];

export function AggregationPanel({ columns, onClose }: AggregationPanelProps) {
  const { groupBy, setGroupBy } = useAnalyticsStore();

  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    groupBy?.columns || []
  );
  const [aggregations, setAggregations] = useState<AggregationConfig[]>(
    groupBy?.aggregations || []
  );
  const [showSubtotals, setShowSubtotals] = useState(groupBy?.showSubtotals ?? true);
  const [showGrandTotal, setShowGrandTotal] = useState(groupBy?.showGrandTotal ?? true);

  const handleToggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((c) => c !== columnId)
        : [...prev, columnId]
    );
  };

  const handleAddAggregation = () => {
    const newAgg: AggregationConfig = {
      id: `agg-${Date.now()}`,
      column: '',
      function: 'sum',
    };
    setAggregations((prev) => [...prev, newAgg]);
  };

  const handleUpdateAggregation = (
    id: string,
    updates: Partial<AggregationConfig>
  ) => {
    setAggregations((prev) =>
      prev.map((agg) => (agg.id === id ? { ...agg, ...updates } : agg))
    );
  };

  const handleRemoveAggregation = (id: string) => {
    setAggregations((prev) => prev.filter((agg) => agg.id !== id));
  };

  const handleApply = () => {
    if (selectedColumns.length === 0) {
      setGroupBy(null);
    } else {
      const config: GroupByConfig = {
        columns: selectedColumns,
        aggregations,
        showSubtotals,
        showGrandTotal,
      };
      setGroupBy(config);
    }
  };

  const handleClear = () => {
    setSelectedColumns([]);
    setAggregations([]);
    setGroupBy(null);
  };

  return (
    <div className="aggregation-panel">
      <div className="panel-header">
        <h3>Group & Aggregate</h3>
        <button onClick={onClose} className="close-button">
          ×
        </button>
      </div>

      <div className="panel-content">
        {/* Group By Columns */}
        <section className="section">
          <h4>Group By Columns</h4>
          <div className="column-list">
            {columns.map((col) => (
              <label key={col.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col.id)}
                  onChange={() => handleToggleColumn(col.id)}
                />
                <span>{col.header}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Aggregations */}
        <section className="section">
          <div className="section-header">
            <h4>Aggregations</h4>
            <button onClick={handleAddAggregation} className="button-small">
              + Add
            </button>
          </div>

          {aggregations.length === 0 ? (
            <p className="empty-state">No aggregations configured</p>
          ) : (
            <div className="aggregation-list">
              {aggregations.map((agg) => (
                <div key={agg.id} className="aggregation-item">
                  <select
                    value={agg.column}
                    onChange={(e) =>
                      handleUpdateAggregation(agg.id, { column: e.target.value })
                    }
                    className="select-column"
                  >
                    <option value="">-- Select Column --</option>
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.header}
                      </option>
                    ))}
                  </select>

                  <select
                    value={agg.function}
                    onChange={(e) =>
                      handleUpdateAggregation(agg.id, {
                        function: e.target.value as AggregationFunction,
                      })
                    }
                    className="select-function"
                  >
                    {AGGREGATION_FUNCTIONS.map((func) => (
                      <option key={func.value} value={func.value}>
                        {func.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={agg.label || ''}
                    onChange={(e) =>
                      handleUpdateAggregation(agg.id, { label: e.target.value })
                    }
                    placeholder="Label (optional)"
                    className="input-label"
                  />

                  <button
                    onClick={() => handleRemoveAggregation(agg.id)}
                    className="button-icon"
                    title="Remove aggregation"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Options */}
        <section className="section">
          <h4>Display Options</h4>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showSubtotals}
              onChange={(e) => setShowSubtotals(e.target.checked)}
            />
            <span>Show subtotals for each group</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showGrandTotal}
              onChange={(e) => setShowGrandTotal(e.target.checked)}
            />
            <span>Show grand total</span>
          </label>
        </section>
      </div>

      <div className="panel-footer">
        <button onClick={handleClear} className="button-secondary">
          Clear
        </button>
        <button onClick={handleApply} className="button-primary">
          Apply
        </button>
      </div>

      <style>{`
        .aggregation-panel {
          width: 400px;
          height: 100%;
          background: white;
          border-left: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        .panel-footer {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          padding: 1rem;
          border-top: 1px solid #e0e0e0;
        }

        .section {
          margin-bottom: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .column-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .aggregation-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .aggregation-item {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 0.5rem;
          align-items: center;
        }

        .select-column,
        .select-function,
        .input-label {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        .empty-state {
          color: #999;
          font-style: italic;
          text-align: center;
          padding: 1rem;
        }

        .close-button,
        .button-icon {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .button-small {
          background: #f5f5f5;
          border: 1px solid #ccc;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .button-primary {
          background: #2196f3;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .button-secondary {
          background: white;
          color: #333;
          border: 1px solid #ccc;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }

        h3 {
          margin: 0;
        }

        h4 {
          margin: 0 0 0.5rem 0;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          color: #666;
        }
      `}</style>
    </div>
  );
}
