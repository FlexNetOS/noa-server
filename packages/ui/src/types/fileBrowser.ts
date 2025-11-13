/**
 * File Browser Types
 * Type definitions for file browser components
 */

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  created_at: number;
  updated_at: number;
  mime_type?: string;
  parent_id?: string;
  path: string;
  children?: FileItem[];
  isExpanded?: boolean;
  depth?: number;
}

export type SortField = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

export type FileFilter =
  | 'all'
  | 'images'
  | 'documents'
  | 'code'
  | 'pdfs'
  | 'videos'
  | 'audio';

export interface FileBrowserState {
  files: FileItem[];
  flattenedFiles: FileItem[];
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  filter: FileFilter;
  contextMenuOpen: boolean;
  contextMenuPosition: { x: number; y: number } | null;
  contextMenuTargetId: string | null;
}

export interface FileBrowserActions {
  setFiles: (files: FileItem[]) => void;
  toggleExpanded: (id: string) => void;
  toggleSelected: (id: string, multiSelect?: boolean) => void;
  selectRange: (startId: string, endId: string) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  setFilter: (filter: FileFilter) => void;
  openContextMenu: (x: number, y: number, targetId: string) => void;
  closeContextMenu: () => void;
  expandAll: () => void;
  collapseAll: () => void;
}

export interface FileTreeNode extends FileItem {
  children?: FileTreeNode[];
  isExpanded?: boolean;
  depth: number;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (fileId: string) => void;
  danger?: boolean;
  disabled?: boolean;
}

export const MIME_TYPE_CATEGORIES: Record<FileFilter, string[]> = {
  all: [],
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  code: [
    'text/javascript',
    'text/typescript',
    'text/jsx',
    'text/tsx',
    'text/html',
    'text/css',
    'application/json',
    'text/x-python',
    'text/x-java',
  ],
  pdfs: ['application/pdf'],
  videos: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

export const FILE_EXTENSIONS: Record<string, string[]> = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.rtf'],
  code: [
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.html',
    '.css',
    '.scss',
    '.json',
    '.py',
    '.java',
    '.cpp',
    '.c',
    '.go',
    '.rs',
    '.php',
    '.rb',
  ],
  pdfs: ['.pdf'],
  videos: ['.mp4', '.webm', '.ogg', '.avi', '.mov'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
};
