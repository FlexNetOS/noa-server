/**
 * File Validation Utilities
 *
 * Handles file type validation, size checks, and categorization.
 */

import {
  FileTypeCategory,
  FileValidationResult,
  FileUploadConfig,
  DEFAULT_UPLOAD_CONFIG,
} from '../types/files';

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

/**
 * Check if file extension is allowed
 */
export function isExtensionAllowed(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const extension = getFileExtension(filename);
  return allowedExtensions.some((ext) => ext.toLowerCase() === extension);
}

/**
 * Check if MIME type matches allowed patterns
 */
export function isMimeTypeAllowed(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some((pattern) => {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return mimeType.startsWith(prefix);
    }
    return mimeType === pattern;
  });
}

/**
 * Categorize file by MIME type and extension
 */
export function categorizeFile(file: File): FileTypeCategory {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  // Image files
  if (mimeType.startsWith('image/')) {
    return FileTypeCategory.IMAGE;
  }

  // PDF files
  if (mimeType === 'application/pdf' || extension === '.pdf') {
    return FileTypeCategory.PDF;
  }

  // Audio files
  if (mimeType.startsWith('audio/')) {
    return FileTypeCategory.AUDIO;
  }

  // Video files
  if (mimeType.startsWith('video/')) {
    return FileTypeCategory.VIDEO;
  }

  // Code files
  const codeExtensions = [
    '.js',
    '.ts',
    '.tsx',
    '.jsx',
    '.py',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.swift',
    '.kt',
    '.scala',
  ];
  if (codeExtensions.includes(extension)) {
    return FileTypeCategory.CODE;
  }

  // Text files
  if (
    mimeType.startsWith('text/') ||
    ['.md', '.txt', '.csv', '.log'].includes(extension)
  ) {
    return FileTypeCategory.TEXT;
  }

  // Document files
  const docExtensions = ['.doc', '.docx', '.odt', '.rtf'];
  if (docExtensions.includes(extension)) {
    return FileTypeCategory.DOCUMENT;
  }

  return FileTypeCategory.UNKNOWN;
}

/**
 * Validate a single file against configuration
 */
export function validateFile(
  file: File,
  config: FileUploadConfig = DEFAULT_UPLOAD_CONFIG
): FileValidationResult {
  // Check file size
  if (file.size > config.maxFileSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(config.maxFileSize)})`,
    };
  }

  // Check MIME type and extension
  const mimeAllowed = isMimeTypeAllowed(file.type, config.allowedTypes);
  const extensionAllowed = isExtensionAllowed(file.name, config.allowedExtensions);

  if (!mimeAllowed && !extensionAllowed) {
    return {
      valid: false,
      error: `File type "${file.type || getFileExtension(file.name)}" is not allowed`,
    };
  }

  const category = categorizeFile(file);

  return {
    valid: true,
    category,
  };
}

/**
 * Validate multiple files and total size
 */
export function validateFiles(
  files: File[],
  existingFiles: File[] = [],
  config: FileUploadConfig = DEFAULT_UPLOAD_CONFIG
): { validFiles: File[]; errors: string[] } {
  const errors: string[] = [];
  const validFiles: File[] = [];

  // Check total size
  const existingSize = existingFiles.reduce((sum, f) => sum + f.size, 0);
  const newSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalSize = existingSize + newSize;

  if (totalSize > config.maxTotalSize) {
    errors.push(
      `Total size (${formatFileSize(totalSize)}) exceeds maximum allowed (${formatFileSize(config.maxTotalSize)})`
    );
    return { validFiles: [], errors };
  }

  // Validate individual files
  for (const file of files) {
    const result = validateFile(file, config);
    if (result.valid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return { validFiles, errors };
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Format upload speed to human-readable string
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format remaining time to human-readable string
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/**
 * Check if file is text-based by name
 */
export function isTextFileByName(filename: string): boolean {
  const textExtensions = [
    '.txt',
    '.md',
    '.json',
    '.xml',
    '.html',
    '.css',
    '.js',
    '.ts',
    '.tsx',
    '.jsx',
    '.py',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.yaml',
    '.yml',
    '.toml',
    '.ini',
    '.cfg',
    '.conf',
  ];

  const extension = getFileExtension(filename);
  return textExtensions.includes(extension);
}

/**
 * Generate unique file ID
 */
export function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create thumbnail for image file
 */
export async function createImageThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Read file as data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Read file as UTF-8 text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Re-export FileTypeCategory for convenience
export { FileTypeCategory };
