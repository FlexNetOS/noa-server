/**
 * File Browser Store
 * Zustand store for file browser state management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  MIME_TYPE_CATEGORIES,
  FILE_EXTENSIONS,
} from '../types/fileBrowser';
import type {
  FileItem,
  FileBrowserState,
  FileBrowserActions,
  SortField,
  SortOrder,
  FileFilter,
} from '../types/fileBrowser';

interface FileBrowserStore extends FileBrowserState, FileBrowserActions {}

/**
 * Flatten tree structure for virtual scrolling
 */
const flattenFiles = (
  files: FileItem[],
  expandedIds: Set<string>,
  depth = 0
): FileItem[] => {
  const result: FileItem[] = [];

  for (const file of files) {
    result.push({ ...file, depth });

    if (file.type === 'folder' && expandedIds.has(file.id) && file.children) {
      result.push(...flattenFiles(file.children, expandedIds, depth + 1));
    }
  }

  return result;
};

/**
 * Build tree structure from flat file list
 */
const buildTree = (files: FileItem[]): FileItem[] => {
  const fileMap = new Map<string, FileItem>();
  const rootFiles: FileItem[] = [];

  // Create map of all files
  files.forEach((file) => {
    fileMap.set(file.id, { ...file, children: [] });
  });

  // Build tree structure
  files.forEach((file) => {
    const node = fileMap.get(file.id)!;
    if (file.parent_id) {
      const parent = fileMap.get(file.parent_id);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        rootFiles.push(node);
      }
    } else {
      rootFiles.push(node);
    }
  });

  return rootFiles;
};

/**
 * Filter files by search query and filter type
 */
const filterFiles = (
  files: FileItem[],
  searchQuery: string,
  filter: FileFilter
): FileItem[] => {
  const lowerQuery = searchQuery.toLowerCase();

  const matchesSearch = (file: FileItem): boolean => {
    if (!searchQuery) return true;
    return file.name.toLowerCase().includes(lowerQuery) ||
           file.path.toLowerCase().includes(lowerQuery);
  };

  const matchesFilter = (file: FileItem): boolean => {
    if (filter === 'all') return true;
    if (file.type === 'folder') return true;

    // Check by MIME type
    const mimeTypes = (MIME_TYPE_CATEGORIES as any)[filter];
    if (file.mime_type && mimeTypes.includes(file.mime_type)) return true;

    // Check by extension
    const extensions = (FILE_EXTENSIONS as any)[filter];
    if (extensions) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return extensions.includes(ext);
    }

    return false;
  };

  const filterRecursive = (file: FileItem): FileItem | null => {
    if (file.type === 'file') {
      return matchesSearch(file) && matchesFilter(file) ? file : null;
    }

    // For folders, recursively filter children
    const filteredChildren = file.children
      ?.map(filterRecursive)
      .filter((child): child is FileItem => child !== null);

    // Include folder if it has matching children or matches search itself
    if (filteredChildren && filteredChildren.length > 0) {
      return { ...file, children: filteredChildren };
    }

    if (matchesSearch(file)) {
      return { ...file, children: filteredChildren || [] };
    }

    return null;
  };

  return files
    .map(filterRecursive)
    .filter((file): file is FileItem => file !== null);
};

/**
 * Sort files
 */
const sortFiles = (
  files: FileItem[],
  sortField: SortField,
  sortOrder: SortOrder
): FileItem[] => {
  const compare = (a: FileItem, b: FileItem): number => {
    // Always put folders first
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        comparison = b.updated_at - a.updated_at;
        break;
      case 'size':
        comparison = b.size - a.size;
        break;
      case 'type':
        const extA = a.name.split('.').pop() || '';
        const extB = b.name.split('.').pop() || '';
        comparison = extA.localeCompare(extB);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  };

  const sortRecursive = (file: FileItem): FileItem => {
    if (file.children && file.children.length > 0) {
      return {
        ...file,
        children: file.children.map(sortRecursive).sort(compare),
      };
    }
    return file;
  };

  return files.map(sortRecursive).sort(compare);
};

export const useFileBrowserStore = create<FileBrowserStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      files: [],
      flattenedFiles: [],
      selectedIds: new Set(),
      expandedIds: new Set(),
      searchQuery: '',
      sortField: 'name',
      sortOrder: 'asc',
      filter: 'all',
      contextMenuOpen: false,
      contextMenuPosition: null,
      contextMenuTargetId: null,

      // Actions
      setFiles: (files) => {
        const tree = buildTree(files);
        const filtered = filterFiles(tree, get().searchQuery, get().filter);
        const sorted = sortFiles(filtered, get().sortField, get().sortOrder);
        const flattened = flattenFiles(sorted, get().expandedIds);

        set({
          files: sorted,
          flattenedFiles: flattened,
        });
      },

      toggleExpanded: (id) => {
        const expandedIds = new Set(get().expandedIds);
        if (expandedIds.has(id)) {
          expandedIds.delete(id);
        } else {
          expandedIds.add(id);
        }

        const flattened = flattenFiles(get().files, expandedIds);
        set({ expandedIds, flattenedFiles: flattened });
      },

      toggleSelected: (id, multiSelect = false) => {
        const selectedIds = new Set(get().selectedIds);

        if (multiSelect) {
          if (selectedIds.has(id)) {
            selectedIds.delete(id);
          } else {
            selectedIds.add(id);
          }
        } else {
          selectedIds.clear();
          selectedIds.add(id);
        }

        set({ selectedIds });
      },

      selectRange: (startId, endId) => {
        const flattened = get().flattenedFiles;
        const startIndex = flattened.findIndex((f) => f.id === startId);
        const endIndex = flattened.findIndex((f) => f.id === endId);

        if (startIndex === -1 || endIndex === -1) return;

        const [from, to] = startIndex < endIndex
          ? [startIndex, endIndex]
          : [endIndex, startIndex];

        const selectedIds = new Set(get().selectedIds);
        for (let i = from; i <= to; i++) {
          selectedIds.add(flattened[i].id);
        }

        set({ selectedIds });
      },

      clearSelection: () => {
        set({ selectedIds: new Set() });
      },

      setSearchQuery: (searchQuery) => {
        const tree = buildTree(get().files);
        const filtered = filterFiles(tree, searchQuery, get().filter);
        const sorted = sortFiles(filtered, get().sortField, get().sortOrder);
        const flattened = flattenFiles(sorted, get().expandedIds);

        set({
          searchQuery,
          files: sorted,
          flattenedFiles: flattened,
        });
      },

      setSortField: (sortField) => {
        const sorted = sortFiles(get().files, sortField, get().sortOrder);
        const flattened = flattenFiles(sorted, get().expandedIds);

        set({
          sortField,
          files: sorted,
          flattenedFiles: flattened,
        });
      },

      setSortOrder: (sortOrder) => {
        const sorted = sortFiles(get().files, get().sortField, sortOrder);
        const flattened = flattenFiles(sorted, get().expandedIds);

        set({
          sortOrder,
          files: sorted,
          flattenedFiles: flattened,
        });
      },

      setFilter: (filter) => {
        const tree = buildTree(get().files);
        const filtered = filterFiles(tree, get().searchQuery, filter);
        const sorted = sortFiles(filtered, get().sortField, get().sortOrder);
        const flattened = flattenFiles(sorted, get().expandedIds);

        set({
          filter,
          files: sorted,
          flattenedFiles: flattened,
        });
      },

      openContextMenu: (x, y, targetId) => {
        set({
          contextMenuOpen: true,
          contextMenuPosition: { x, y },
          contextMenuTargetId: targetId,
        });
      },

      closeContextMenu: () => {
        set({
          contextMenuOpen: false,
          contextMenuPosition: null,
          contextMenuTargetId: null,
        });
      },

      expandAll: () => {
        const expandedIds = new Set<string>();

        const expandRecursive = (files: FileItem[]) => {
          files.forEach((file) => {
            if (file.type === 'folder') {
              expandedIds.add(file.id);
              if (file.children) {
                expandRecursive(file.children);
              }
            }
          });
        };

        expandRecursive(get().files);
        const flattened = flattenFiles(get().files, expandedIds);

        set({ expandedIds, flattenedFiles: flattened });
      },

      collapseAll: () => {
        const flattened = flattenFiles(get().files, new Set());
        set({ expandedIds: new Set(), flattenedFiles: flattened });
      },
    }),
    { name: 'file-browser-store' }
  )
);
