/**
 * File Browser Hook
 * Custom hook for file browser interactions and logic
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFileBrowserStore } from '../stores/fileBrowser';
import type { FileItem, ContextMenuAction } from '../types/fileBrowser';

export interface UseFileBrowserOptions {
  onFileClick?: (file: FileItem) => void;
  onFileDoubleClick?: (file: FileItem) => void;
  onFileDownload?: (file: FileItem) => void;
  onFileDelete?: (file: FileItem) => void;
  onFileRename?: (file: FileItem, newName: string) => void;
  onFileShare?: (file: FileItem) => void;
  enableKeyboardNavigation?: boolean;
}

export const useFileBrowser = (options: UseFileBrowserOptions = {}) => {
  const {
    onFileClick,
    onFileDoubleClick,
    onFileDownload,
    onFileDelete,
    onFileRename,
    onFileShare,
    enableKeyboardNavigation = true,
  } = options;

  const store = useFileBrowserStore();
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle file click with double-click detection
   */
  const handleFileClick = useCallback(
    (file: FileItem, event: React.MouseEvent) => {
      const isMultiSelect = event.ctrlKey || event.metaKey;
      const isRangeSelect = event.shiftKey;

      if (isRangeSelect && lastSelectedId) {
        store.selectRange(lastSelectedId, file.id);
      } else {
        store.toggleSelected(file.id, isMultiSelect);
        setLastSelectedId(file.id);
      }

      // Handle double-click
      if (doubleClickTimeoutRef.current) {
        clearTimeout(doubleClickTimeoutRef.current);
        doubleClickTimeoutRef.current = null;

        if (file.type === 'folder') {
          store.toggleExpanded(file.id);
        }

        onFileDoubleClick?.(file);
      } else {
        doubleClickTimeoutRef.current = setTimeout(() => {
          doubleClickTimeoutRef.current = null;
          onFileClick?.(file);
        }, 300);
      }
    },
    [lastSelectedId, store, onFileClick, onFileDoubleClick]
  );

  /**
   * Handle folder toggle
   */
  const handleFolderToggle = useCallback(
    (folderId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      store.toggleExpanded(folderId);
    },
    [store]
  );

  /**
   * Handle context menu
   */
  const handleContextMenu = useCallback(
    (file: FileItem, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Select the file if not already selected
      if (!store.selectedIds.has(file.id)) {
        store.toggleSelected(file.id, false);
      }

      store.openContextMenu(event.clientX, event.clientY, file.id);
    },
    [store]
  );

  /**
   * Context menu actions
   */
  const contextMenuActions: ContextMenuAction[] = [
    {
      id: 'download',
      label: 'Download',
      onClick: (fileId) => {
        const file = store.flattenedFiles.find((f) => f.id === fileId);
        if (file && onFileDownload) {
          onFileDownload(file);
        }
        store.closeContextMenu();
      },
    },
    {
      id: 'rename',
      label: 'Rename',
      onClick: (fileId) => {
        const file = store.flattenedFiles.find((f) => f.id === fileId);
        if (file && onFileRename) {
          const newName = prompt('Enter new name:', file.name);
          if (newName && newName !== file.name) {
            onFileRename(file, newName);
          }
        }
        store.closeContextMenu();
      },
    },
    {
      id: 'share',
      label: 'Share',
      onClick: (fileId) => {
        const file = store.flattenedFiles.find((f) => f.id === fileId);
        if (file && onFileShare) {
          onFileShare(file);
        }
        store.closeContextMenu();
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      danger: true,
      onClick: (fileId) => {
        const file = store.flattenedFiles.find((f) => f.id === fileId);
        if (file && onFileDelete) {
          if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
            onFileDelete(file);
          }
        }
        store.closeContextMenu();
      },
    },
  ];

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    if (!enableKeyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { flattenedFiles, selectedIds } = store;
      const selectedArray = Array.from(selectedIds);

      if (selectedArray.length === 0) return;

      const currentId = selectedArray[selectedArray.length - 1];
      const currentIndex = flattenedFiles.findIndex((f) => f.id === currentId);

      if (currentIndex === -1) return;

      const currentFile = flattenedFiles[currentIndex];

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (currentIndex < flattenedFiles.length - 1) {
            const nextFile = flattenedFiles[currentIndex + 1];
            if (event.shiftKey) {
              store.selectRange(currentId, nextFile.id);
            } else {
              store.toggleSelected(nextFile.id, false);
            }
            setLastSelectedId(nextFile.id);
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (currentIndex > 0) {
            const prevFile = flattenedFiles[currentIndex - 1];
            if (event.shiftKey) {
              store.selectRange(currentId, prevFile.id);
            } else {
              store.toggleSelected(prevFile.id, false);
            }
            setLastSelectedId(prevFile.id);
          }
          break;

        case 'ArrowRight':
          event.preventDefault();
          if (currentFile.type === 'folder' && !store.expandedIds.has(currentId)) {
            store.toggleExpanded(currentId);
          }
          break;

        case 'ArrowLeft':
          event.preventDefault();
          if (currentFile.type === 'folder' && store.expandedIds.has(currentId)) {
            store.toggleExpanded(currentId);
          }
          break;

        case 'Enter':
          event.preventDefault();
          if (currentFile.type === 'folder') {
            store.toggleExpanded(currentId);
          } else {
            onFileDoubleClick?.(currentFile);
          }
          break;

        case 'Delete':
          event.preventDefault();
          if (onFileDelete && confirm(`Delete ${selectedArray.length} file(s)?`)) {
            selectedArray.forEach((id) => {
              const file = flattenedFiles.find((f) => f.id === id);
              if (file) onFileDelete(file);
            });
          }
          break;

        case 'a':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            flattenedFiles.forEach((file) => {
              store.toggleSelected(file.id, true);
            });
          }
          break;

        case 'Escape':
          event.preventDefault();
          store.clearSelection();
          store.closeContextMenu();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardNavigation, store, onFileDoubleClick, onFileDelete]);

  /**
   * Close context menu on outside click
   */
  useEffect(() => {
    const handleClickOutside = () => {
      if (store.contextMenuOpen) {
        store.closeContextMenu();
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [store.contextMenuOpen]);

  return {
    ...store,
    handleFileClick,
    handleFolderToggle,
    handleContextMenu,
    contextMenuActions,
  };
};
