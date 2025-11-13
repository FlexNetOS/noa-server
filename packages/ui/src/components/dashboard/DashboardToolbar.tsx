/**
 * Dashboard Toolbar Component
 *
 * Control panel for dashboard operations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';

export interface DashboardToolbarProps {
  isEditing: boolean;
  isLocked: boolean;
  onToggleEditing?: () => void;
  onToggleLocked: () => void;
  onAddWidget: () => void;
  showEditControls?: boolean;
}

export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  isEditing,
  isLocked,
  onToggleEditing,
  onToggleLocked,
  onAddWidget,
  showEditControls = true,
}) => {
  const {
    currentLayout,
    savedLayouts,
    createLayout,
    switchLayout,
    duplicateLayout,
    deleteLayout,
    exportLayout,
    importLayout,
    resetToDefault,
  } = useDashboard();

  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const handleCreateLayout = () => {
    const name = prompt('Enter layout name:');
    if (name) {
      createLayout(name);
      setShowLayoutMenu(false);
    }
  };

  const handleDuplicateLayout = () => {
    if (!currentLayout) return;
    const name = prompt('Enter new layout name:', `${currentLayout.name} (Copy)`);
    if (name) {
      duplicateLayout(currentLayout.id, name);
      setShowLayoutMenu(false);
    }
  };

  const handleDeleteLayout = () => {
    if (!currentLayout) return;
    if (confirm(`Delete layout "${currentLayout.name}"?`)) {
      deleteLayout(currentLayout.id);
      setShowLayoutMenu(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportLayout();
      setShowExportModal(false);
    } catch (error) {
      alert('Export failed: ' + (error as Error).message);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importLayout(file);
      alert('Layout imported successfully!');
    } catch (error) {
      alert('Import failed: ' + (error as Error).message);
    }
  };

  return (
    <div className="dashboard-toolbar bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Layout Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span className="font-medium">{currentLayout?.name || 'No Layout'}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Layout Menu */}
          {showLayoutMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-10"
            >
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Saved Layouts</div>
                {savedLayouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => {
                      switchLayout(layout.id);
                      setShowLayoutMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors ${
                      currentLayout?.id === layout.id ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    <div className="font-medium">{layout.name}</div>
                    <div className="text-xs text-gray-500">{layout.widgets.length} widgets</div>
                  </button>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button
                    onClick={handleCreateLayout}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors text-blue-600"
                  >
                    + Create New Layout
                  </button>
                  <button
                    onClick={handleDuplicateLayout}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors"
                  >
                    Duplicate Current
                  </button>
                  {savedLayouts.length > 1 && (
                    <button
                      onClick={handleDeleteLayout}
                      className="w-full text-left px-3 py-2 rounded hover:bg-red-50 transition-colors text-red-600"
                    >
                      Delete Current
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Widget Count */}
        <div className="text-sm text-gray-600">
          {currentLayout?.widgets.length || 0} widget{currentLayout?.widgets.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Edit Mode Toggle */}
        {showEditControls && onToggleEditing && (
          <button
            onClick={onToggleEditing}
            className={`px-3 py-2 rounded-lg transition-colors ${
              isEditing
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={isEditing ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        )}

        {/* Lock Toggle */}
        <button
          onClick={onToggleLocked}
          className={`px-3 py-2 rounded-lg transition-colors ${
            isLocked
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          title={isLocked ? 'Unlock Layout' : 'Lock Layout'}
        >
          {isLocked ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>

        {/* Add Widget */}
        {isEditing && (
          <button
            onClick={onAddWidget}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Widget
          </button>
        )}

        {/* Export/Import */}
        <div className="relative">
          <button
            onClick={() => setShowExportModal(!showExportModal)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Export/Import"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          </button>

          {showExportModal && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10 p-2"
            >
              <button
                onClick={handleExport}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors"
              >
                Export Layout
              </button>
              <label className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                Import Layout
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button
                onClick={() => {
                  if (confirm('Reset to default layout?')) {
                    resetToDefault();
                    setShowExportModal(false);
                  }
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-red-50 transition-colors text-red-600"
              >
                Reset to Default
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardToolbar;
