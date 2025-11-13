/**
 * File Search Component
 * Search bar with debouncing and filtering controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
import type { SortField, SortOrder, FileFilter } from '../../types/fileBrowser';

interface FileSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortFieldChange: (field: SortField) => void;
  onSortOrderChange: (order: SortOrder) => void;
  filter: FileFilter;
  onFilterChange: (filter: FileFilter) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

const FILTER_OPTIONS: { value: FileFilter; label: string }[] = [
  { value: 'all', label: 'All Files' },
  { value: 'images', label: 'Images' },
  { value: 'documents', label: 'Documents' },
  { value: 'code', label: 'Code' },
  { value: 'pdfs', label: 'PDFs' },
  { value: 'videos', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date Modified' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' },
];

export const FileSearch: React.FC<FileSearchProps> = ({
  searchQuery,
  onSearchChange,
  sortField,
  sortOrder,
  onSortFieldChange,
  onSortOrderChange,
  filter,
  onFilterChange,
  onExpandAll,
  onCollapseAll,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, onSearchChange]);

  // Sync with external changes
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setLocalQuery('');
    onSearchChange('');
  }, [onSearchChange]);

  const toggleSortOrder = useCallback(() => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortOrder, onSortOrderChange]);

  return (
    <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Search input */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search files..."
          className="
            w-full pl-10 pr-8 py-2
            bg-gray-50 dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
          "
        />
        {localQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Filter dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className="
            flex items-center gap-2 px-3 py-2
            bg-gray-50 dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-lg text-sm font-medium
            hover:bg-gray-100 dark:hover:bg-gray-700
            text-gray-700 dark:text-gray-300
            transition-colors
          "
        >
          <Filter className="w-4 h-4" />
          <span>{FILTER_OPTIONS.find((opt) => opt.value === filter)?.label}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showFilterMenu && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onFilterChange(option.value);
                  setShowFilterMenu(false);
                }}
                className={`
                  w-full px-4 py-2 text-left text-sm
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  ${filter === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}
                  first:rounded-t-lg last:rounded-b-lg
                  transition-colors
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSortMenu(!showSortMenu)}
          className="
            flex items-center gap-2 px-3 py-2
            bg-gray-50 dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-lg text-sm font-medium
            hover:bg-gray-100 dark:hover:bg-gray-700
            text-gray-700 dark:text-gray-300
            transition-colors
          "
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>{SORT_OPTIONS.find((opt) => opt.value === sortField)?.label}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showSortMenu && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSortFieldChange(option.value);
                  setShowSortMenu(false);
                }}
                className={`
                  w-full px-4 py-2 text-left text-sm
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  ${sortField === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}
                  first:rounded-t-lg last:rounded-b-lg
                  transition-colors
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort order toggle */}
      <button
        onClick={toggleSortOrder}
        className="
          p-2
          bg-gray-50 dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          rounded-lg
          hover:bg-gray-100 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300
          transition-colors
        "
        title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
      >
        <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
      </button>

      {/* Expand/Collapse all */}
      {onExpandAll && onCollapseAll && (
        <div className="flex gap-1">
          <button
            onClick={onExpandAll}
            className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Expand all folders"
          >
            Expand All
          </button>
          <button
            onClick={onCollapseAll}
            className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Collapse all folders"
          >
            Collapse All
          </button>
        </div>
      )}
    </div>
  );
};
