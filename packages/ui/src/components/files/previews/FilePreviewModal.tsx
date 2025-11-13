/**
 * FilePreviewModal Component
 * Modal container that routes to specific file preview types
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import type { FileItem } from '../../../types/fileBrowser';

// Lazy load preview components for better performance
const PDFPreview = lazy(() => import('./PDFPreview'));
const ImagePreview = lazy(() => import('./ImagePreview'));
const MarkdownPreview = lazy(() => import('./MarkdownPreview'));
const CodePreview = lazy(() => import('./CodePreview'));
const TextPreview = lazy(() => import('./TextPreview'));

export interface FilePreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDownload?: (file: FileItem) => void;
  fetchContent?: (file: FileItem) => Promise<string | ArrayBuffer>;
}

/**
 * Get file category based on extension and MIME type
 */
const getFileCategory = (file: FileItem): 'pdf' | 'image' | 'markdown' | 'code' | 'text' => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mime = file.mime_type?.toLowerCase();

  // PDF files
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }

  // Image files
  if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext || '')) {
    return 'image';
  }

  // Markdown files
  if (ext === 'md' || ext === 'markdown') {
    return 'markdown';
  }

  // Code files
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss', 'sass',
    'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php', 'swift',
    'kt', 'scala', 'sh', 'bash', 'yaml', 'yml', 'toml', 'xml', 'sql'
  ];
  if (codeExtensions.includes(ext || '')) {
    return 'code';
  }

  // Default to text
  return 'text';
};

/**
 * Loading Spinner Component
 */
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * Error Display Component
 */
const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
  <div className="flex flex-col items-center justify-center h-full text-red-600 dark:text-red-400">
    <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p className="text-lg font-medium">Failed to load preview</p>
    <p className="text-sm mt-2">{error}</p>
  </div>
);

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onDownload,
  fetchContent,
}) => {
  const [content, setContent] = useState<string | ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load file content
  useEffect(() => {
    if (!file) return;

    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        if (fetchContent) {
          const data = await fetchContent(file);
          setContent(data);
        } else {
          // For demo purposes, simulate content loading
          setContent('');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [file, fetchContent]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!file) return null;

  const category = getFileCategory(file);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      {/* Modal Container */}
      <div className="relative w-full h-full max-w-7xl max-h-screen m-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {file.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {file.mime_type} • {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {onDownload && (
              <button
                onClick={() => onDownload(file)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Download file"
              >
                <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorDisplay error={error} />
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
              {category === 'pdf' && (
                <PDFPreview file={file} content={content as ArrayBuffer} />
              )}
              {category === 'image' && (
                <ImagePreview file={file} content={content as string} />
              )}
              {category === 'markdown' && (
                <MarkdownPreview file={file} content={content as string} />
              )}
              {category === 'code' && (
                <CodePreview file={file} content={content as string} />
              )}
              {category === 'text' && (
                <TextPreview file={file} content={content as string} />
              )}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
