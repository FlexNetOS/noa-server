/**
 * File Upload Types
 *
 * Type definitions for the file upload system supporting multiple file types,
 * progress tracking, and validation.
 */

export enum FileUploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export enum FileTypeCategory {
  IMAGE = 'image',
  PDF = 'pdf',
  TEXT = 'text',
  CODE = 'code',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  UNKNOWN = 'unknown',
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  category: FileTypeCategory;
  status: FileUploadStatus;
  progress: number;
  uploadedBytes: number;
  error?: string;
  preview?: string;
  textContent?: string;
  thumbnailUrl?: string;
  cancelToken?: () => void;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  category?: FileTypeCategory;
}

export interface UploadProgressInfo {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  remaining: number; // seconds
}

export interface FileUploadConfig {
  maxFileSize: number; // bytes
  maxTotalSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  multiple: boolean;
  autoUpload: boolean;
  uploadUrl?: string;
}

export interface FileUploadCallbacks {
  onFileAdded?: (file: UploadedFile) => void;
  onFileRemoved?: (fileId: string) => void;
  onUploadStart?: (fileId: string) => void;
  onUploadProgress?: (fileId: string, progress: UploadProgressInfo) => void;
  onUploadComplete?: (fileId: string, response?: any) => void;
  onUploadError?: (fileId: string, error: string) => void;
  onAllComplete?: () => void;
}

export interface FilePreviewProps {
  file: UploadedFile;
  onRemove?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  showProgress?: boolean;
  compact?: boolean;
}

export interface UploadProgressProps {
  file: UploadedFile;
  onCancel?: (fileId: string) => void;
  showDetails?: boolean;
}

export interface FileUploadProps {
  config?: Partial<FileUploadConfig>;
  callbacks?: FileUploadCallbacks;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

// Default configuration
export const DEFAULT_UPLOAD_CONFIG: FileUploadConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxTotalSize: 500 * 1024 * 1024, // 500MB
  allowedTypes: [
    'image/*',
    'application/pdf',
    'text/*',
    'application/json',
    'application/javascript',
    'application/typescript',
  ],
  allowedExtensions: [
    '.md',
    '.txt',
    '.js',
    '.ts',
    '.tsx',
    '.jsx',
    '.json',
    '.csv',
    '.xml',
    '.html',
    '.css',
    '.py',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.go',
    '.rs',
    '.rb',
    '.php',
  ],
  multiple: true,
  autoUpload: false,
};

// File type MIME mappings
export const FILE_TYPE_ICONS: Record<FileTypeCategory, string> = {
  [FileTypeCategory.IMAGE]: '🖼️',
  [FileTypeCategory.PDF]: '📄',
  [FileTypeCategory.TEXT]: '📝',
  [FileTypeCategory.CODE]: '💻',
  [FileTypeCategory.DOCUMENT]: '📋',
  [FileTypeCategory.AUDIO]: '🎵',
  [FileTypeCategory.VIDEO]: '🎬',
  [FileTypeCategory.UNKNOWN]: '📎',
};
