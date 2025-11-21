/**
 * FileUpload Component
 *
 * Main file upload component with drag-drop zone, file selection,
 * and upload management.
 */

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploadProps } from '../../types/files';
import { useFileUpload } from '../../hooks/useFileUpload';
import { FilePreview } from './FilePreview';
import { formatFileSize } from '../../utils/fileValidation';

export const FileUpload: React.FC<FileUploadProps> = ({
  config,
  callbacks,
  className = '',
  disabled = false,
  children,
}) => {
  const {
    files,
    addFiles,
    removeFile,
    uploadAll,
    retryUpload,
    clearAll,
    isUploading,
    totalProgress,
  } = useFileUpload({ config, callbacks });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;
      addFiles(acceptedFiles);
    },
    [addFiles, disabled]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    disabled,
    multiple: config?.multiple ?? true,
    maxSize: config?.maxFileSize,
  });

  const hasFiles = files.length > 0;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drag-Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-all duration-200 cursor-pointer
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50 scale-[1.02]'
              : isDragReject
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Drop Zone Content */}
        <div className="text-center space-y-4">
          {/* Upload Icon */}
          <motion.div
            animate={{
              y: isDragActive ? -10 : 0,
              scale: isDragActive ? 1.1 : 1,
            }}
            className="flex justify-center"
          >
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                text-3xl
                ${
                  isDragActive
                    ? 'bg-blue-100'
                    : isDragReject
                      ? 'bg-red-100'
                      : 'bg-gray-200'
                }
              `}
            >
              {isDragActive ? '⬇️' : isDragReject ? '❌' : '📁'}
            </div>
          </motion.div>

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {isDragActive
                ? 'Drop files here'
                : isDragReject
                  ? 'Invalid file type'
                  : 'Upload Files'}
            </h3>
            <p className="text-sm text-gray-600">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              Max file size: {formatFileSize(config?.maxFileSize ?? 100 * 1024 * 1024)}
              {' • '}
              Max total: {formatFileSize(config?.maxTotalSize ?? 500 * 1024 * 1024)}
            </p>
          </div>

          {/* Allowed Types */}
          <div className="flex flex-wrap justify-center gap-2">
            {['Images', 'PDFs', 'Text', 'Code', 'Documents'].map((type) => (
              <span
                key={type}
                className="px-2 py-1 text-xs rounded-full bg-white border border-gray-300 text-gray-700"
              >
                {type}
              </span>
            ))}
          </div>

          {/* Custom Children */}
          {children}
        </div>
      </div>

      {/* File List */}
      {hasFiles && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className="font-semibold text-gray-900">
                Files ({files.length})
              </h4>
              <span className="text-sm text-gray-600">
                {formatFileSize(totalSize)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Total Progress */}
              {isUploading && (
                <span className="text-sm font-medium text-blue-600">
                  {totalProgress}%
                </span>
              )}

              {/* Action Buttons */}
              <button
                onClick={uploadAll}
                disabled={isUploading || files.every(f => f.status === 'success')}
                className="
                  px-4 py-2 text-sm font-medium rounded
                  bg-blue-500 text-white hover:bg-blue-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                {isUploading ? 'Uploading...' : 'Upload All'}
              </button>

              <button
                onClick={clearAll}
                className="
                  px-4 py-2 text-sm font-medium rounded
                  bg-gray-500 text-white hover:bg-gray-600
                  transition-colors
                "
              >
                Clear All
              </button>
            </div>
          </div>

          {/* File Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {files.map((file) => (
                <FilePreview
                  key={file.id}
                  file={file}
                  onRemove={removeFile}
                  onRetry={retryUpload}
                  showProgress={true}
                  compact={false}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
