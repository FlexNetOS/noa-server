/**
 * File Browser Component
 * Main file browser with tree view, search, filtering, and sorting
 */

import React, { useEffect } from 'react';
import { FileTree } from './FileTree';
import { FileSearch } from './FileSearch';
import { useFileBrowser } from '../../hooks/useFileBrowser';
import type { FileItem, ContextMenuAction } from '../../types/fileBrowser';
import {
  Download,
  Trash2,
  Edit,
  Share2,
} from 'lucide-react';

export interface FileBrowserProps {
  files: FileItem[];
  onFileClick?: (file: FileItem) => void;
  onFileDoubleClick?: (file: FileItem) => void;
  onFileDownload?: (file: FileItem) => void;
  onFileDelete?: (file: FileItem) => void;
  onFileRename?: (file: FileItem, newName: string) => void;
  onFileShare?: (file: FileItem) => void;
  className?: string;
  height?: string | number;
  enableKeyboardNavigation?: boolean;
}

/**
 * Context Menu Component
 */
const ContextMenu: React.FC<{
  position: { x: number; y: number };
  actions: ContextMenuAction[];
  targetId: string;
}> = ({ position, actions, targetId }) => {
  const iconMap = {
    download: Download,
    rename: Edit,
    share: Share2,
    delete: Trash2,
  };

  return (
    <div
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[180px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((action, index) => {
        const Icon = action.icon || iconMap[action.id as keyof typeof iconMap];

        return (
          <React.Fragment key={action.id}>
            {index > 0 && action.danger && (
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            )}
            <button
              onClick={() => action.onClick(targetId)}
              disabled={action.disabled}
              className={`
                w-full flex items-center gap-3 px-4 py-2 text-left text-sm
                transition-colors
                ${action.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : action.danger
                  ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{action.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * Main File Browser Component
 */
export const FileBrowser: React.FC<FileBrowserProps> = ({
  files,
  onFileClick,
  onFileDoubleClick,
  onFileDownload,
  onFileDelete,
  onFileRename,
  onFileShare,
  className = '',
  height = '100%',
  enableKeyboardNavigation = true,
}) => {
  const {
    flattenedFiles,
    selectedIds,
    expandedIds,
    searchQuery,
    sortField,
    sortOrder,
    filter,
    contextMenuOpen,
    contextMenuPosition,
    contextMenuTargetId,
    setFiles,
    setSearchQuery,
    setSortField,
    setSortOrder,
    setFilter,
    expandAll,
    collapseAll,
    handleFileClick,
    handleFolderToggle,
    handleContextMenu,
    contextMenuActions,
  } = useFileBrowser({
    onFileClick,
    onFileDoubleClick,
    onFileDownload,
    onFileDelete,
    onFileRename,
    onFileShare,
    enableKeyboardNavigation,
  });

  // Load files into store
  useEffect(() => {
    setFiles(files);
  }, [files, setFiles]);

  return (
    <div
      className={`flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* Search and controls */}
      <FileSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortFieldChange={setSortField}
        onSortOrderChange={setSortOrder}
        filter={filter}
        onFilterChange={setFilter}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {/* File tree */}
      <FileTree
        files={flattenedFiles}
        selectedIds={selectedIds}
        expandedIds={expandedIds}
        onFileClick={handleFileClick}
        onFolderToggle={handleFolderToggle}
        onContextMenu={handleContextMenu}
      />

      {/* Context menu */}
      {contextMenuOpen && contextMenuPosition && contextMenuTargetId && (
        <ContextMenu
          position={contextMenuPosition}
          actions={contextMenuActions}
          targetId={contextMenuTargetId}
        />
      )}

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-gray-700 text-sm text-blue-700 dark:text-blue-300">
          {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
        </div>
      )}
    </div>
  );
};
