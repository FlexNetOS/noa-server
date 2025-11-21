/**
 * Filter Panel Component
 *
 * Advanced filtering UI with multiple operators and filter presets
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FilterCondition, FilterOperator, ColumnConfig } from '../../types/analytics';
import { useAnalyticsStore } from '../../stores/analyticsStore';

interface FilterPanelProps {
  columns: ColumnConfig[];
  onClose?: () => void;
}

const FILTER_OPERATORS: Array<{ value: FilterOperator; label: string; types: string[] }> = [
  { value: 'equals', label: 'Equals', types: ['text', 'number', 'date'] },
  { value: 'notEquals', label: 'Not Equals', types: ['text', 'number', 'date'] },
  { value: 'contains', label: 'Contains', types: ['text'] },
  { value: 'notContains', label: 'Does Not Contain', types: ['text'] },
  { value: 'startsWith', label: 'Starts With', types: ['text'] },
  { value: 'endsWith', label: 'Ends With', types: ['text'] },
  { value: 'lessThan', label: 'Less Than', types: ['number', 'date'] },
  { value: 'lessThanOrEqual', label: 'Less Than or Equal', types: ['number', 'date'] },
  { value: 'greaterThan', label: 'Greater Than', types: ['number', 'date'] },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal', types: ['number', 'date'] },
  { value: 'between', label: 'Between', types: ['number', 'date'] },
  { value: 'isEmpty', label: 'Is Empty', types: ['text', 'number', 'date'] },
  { value: 'isNotEmpty', label: 'Is Not Empty', types: ['text', 'number', 'date'] },
];

export function FilterPanel({ columns, onClose }: FilterPanelProps) {
  const {
    filters,
    filterPresets,
    activePresetId,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    saveFilterPreset,
    loadFilterPreset,
  } = useAnalyticsStore();

  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  const { register, handleSubmit, watch, reset } = useForm<FilterCondition>({
    defaultValues: {
      id: '',
      column: '',
      operator: 'equals',
      value: '',
      enabled: true,
    },
  });

  const selectedColumn = watch('column');
  const selectedOperator = watch('operator');

  const columnConfig = columns.find((c) => c.id === selectedColumn);
  const columnType = columnConfig?.format?.type || 'text';

  const availableOperators = FILTER_OPERATORS.filter((op) =>
    op.types.includes(columnType)
  );

  const onAddFilter = (data: FilterCondition) => {
    const filter: FilterCondition = {
      ...data,
      id: `filter-${Date.now()}`,
    };
    addFilter(filter);
    reset();
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      saveFilterPreset(presetName);
      setPresetName('');
      setShowPresetDialog(false);
    }
  };

  const needsSecondValue = selectedOperator === 'between';

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <h3>Filters</h3>
        <button onClick={onClose} className="close-button">
          ×
        </button>
      </div>

      {/* Filter Presets */}
      <div className="filter-presets">
        <div className="preset-actions">
          <button
            onClick={() => setShowPresetDialog(true)}
            disabled={filters.length === 0}
            className="button-secondary"
          >
            Save Preset
          </button>
          <button
            onClick={clearFilters}
            disabled={filters.length === 0}
            className="button-secondary"
          >
            Clear All
          </button>
        </div>

        {filterPresets.length > 0 && (
          <div className="preset-list">
            <label>Load Preset:</label>
            <select
              value={activePresetId || ''}
              onChange={(e) => loadFilterPreset(e.target.value)}
            >
              <option value="">-- Select Preset --</option>
              {filterPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.filters.length} filters)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Active Filters */}
      <div className="active-filters">
        <h4>Active Filters ({filters.length})</h4>
        {filters.map((filter) => {
          const column = columns.find((c) => c.id === filter.column);
          return (
            <div key={filter.id} className="filter-item">
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={(e) =>
                  updateFilter(filter.id, { enabled: e.target.checked })
                }
              />
              <span className="filter-summary">
                <strong>{column?.header}</strong>{' '}
                {FILTER_OPERATORS.find((op) => op.value === filter.operator)?.label}{' '}
                <em>{String(filter.value)}</em>
              </span>
              <button
                onClick={() => removeFilter(filter.id)}
                className="button-icon"
                title="Remove filter"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Add New Filter */}
      <div className="add-filter">
        <h4>Add Filter</h4>
        <form onSubmit={handleSubmit(onAddFilter)}>
          <div className="form-group">
            <label>Column</label>
            <select {...register('column')} required>
              <option value="">-- Select Column --</option>
              {columns
                .filter((c) => c.filterable !== false)
                .map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.header}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Operator</label>
            <select {...register('operator')} required>
              {availableOperators.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {!['isEmpty', 'isNotEmpty'].includes(selectedOperator) && (
            <>
              <div className="form-group">
                <label>Value</label>
                <input
                  type={columnType === 'number' ? 'number' : 'text'}
                  {...register('value')}
                  required
                />
              </div>

              {needsSecondValue && (
                <div className="form-group">
                  <label>To Value</label>
                  <input
                    type={columnType === 'number' ? 'number' : 'text'}
                    {...register('value2')}
                    required
                  />
                </div>
              )}
            </>
          )}

          <button type="submit" className="button-primary">
            Add Filter
          </button>
        </form>
      </div>

      {/* Save Preset Dialog */}
      {showPresetDialog && (
        <div className="modal-overlay" onClick={() => setShowPresetDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Save Filter Preset</h3>
            <div className="form-group">
              <label>Preset Name</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleSavePreset} className="button-primary">
                Save
              </button>
              <button
                onClick={() => setShowPresetDialog(false)}
                className="button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .filter-panel {
          width: 400px;
          height: 100%;
          background: white;
          border-left: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .filter-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
        }

        .filter-presets,
        .active-filters,
        .add-filter {
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .preset-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .preset-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: #f5f5f5;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .filter-summary {
          flex: 1;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.25rem;
          font-weight: 500;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
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

        .button-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          min-width: 400px;
        }

        .modal-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
