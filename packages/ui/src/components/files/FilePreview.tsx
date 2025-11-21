/**
 * FilePreview Component
 *
 * Displays a preview card for an uploaded file with thumbnail, metadata,
 * and action buttons.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileUploadStatus,
  FILE_TYPE_ICONS,
  FilePreviewProps,
} from '../../types/files';
import { formatFileSize } from '../../utils/fileValidation';
import { UploadProgress } from './UploadProgress';

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  onRetry,
  showProgress = true,
  compact = false,
}) => {
  const isUploading = file.status === FileUploadStatus.UPLOADING;
  const isError = file.status === FileUploadStatus.ERROR;
  const isSuccess = file.status === FileUploadStatus.SUCCESS;
  const isCancelled = file.status === FileUploadStatus.CANCELLED;

  const statusColors = {
    [FileUploadStatus.PENDING]: 'bg-gray-100 border-gray-300',
    [FileUploadStatus.UPLOADING]: 'bg-blue-50 border-blue-300',
    [FileUploadStatus.SUCCESS]: 'bg-green-50 border-green-300',
    [FileUploadStatus.ERROR]: 'bg-red-50 border-red-300',
    [FileUploadStatus.CANCELLED]: 'bg-gray-100 border-gray-400',
  };

  const statusIcons = {
    [FileUploadStatus.PENDING]: '⏳',
    [FileUploadStatus.UPLOADING]: '⬆️',
    [FileUploadStatus.SUCCESS]: '✅',
    [FileUploadStatus.ERROR]: '❌',
    [FileUploadStatus.CANCELLED]: '🚫',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        relative rounded-lg border-2 p-3 transition-all
        ${statusColors[file.status]}
        ${compact ? 'flex items-center gap-3' : 'flex flex-col gap-2'}
      `}
    >
      {/* Thumbnail or Icon */}
      <div className={`${compact ? 'w-12 h-12' : 'w-full h-32'} flex-shrink-0`}>
        {file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className={`
              w-full h-full object-cover rounded
              ${compact ? 'rounded-md' : 'rounded-lg'}
            `}
          />
        ) : (
          <div
            className={`
              w-full h-full flex items-center justify-center
              bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg
              text-4xl
            `}
          >
            {FILE_TYPE_ICONS[file.category]}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4
              className="font-medium text-sm truncate text-gray-900"
              title={file.name}
            >
              {file.name}
            </h4>
            <p className="text-xs text-gray-600 mt-0.5">
              {formatFileSize(file.size)}
              {file.type && ` • ${file.type.split('/')[1]}`}
            </p>
          </div>

          {/* Status Icon */}
          <span className="text-xl flex-shrink-0" title={file.status}>
            {statusIcons[file.status]}
          </span>
        </div>

        {/* Progress Bar (if uploading) */}
        {showProgress && isUploading && (
          <UploadProgress
            file={file}
            onCancel={onRemove}
            showDetails={!compact}
          />
        )}

        {/* Error Message */}
        {isError && file.error && (
          <p className="text-xs text-red-600 mt-2">{file.error}</p>
        )}

        {/* Text Content Preview (for small text files) */}
        {!compact && file.textContent && file.textContent.length < 200 && (
          <pre className="text-xs text-gray-700 mt-2 p-2 bg-white rounded overflow-x-auto">
            {file.textContent}
          </pre>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {(isError || isCancelled) && onRetry && (
          <button
            onClick={() => onRetry(file.id)}
            className="
              px-3 py-1 text-xs font-medium rounded
              bg-blue-500 text-white hover:bg-blue-600
              transition-colors
            "
            title="Retry upload"
          >
            Retry
          </button>
        )}

        {onRemove && !isUploading && (
          <button
            onClick={() => onRemove(file.id)}
            className="
              px-3 py-1 text-xs font-medium rounded
              bg-red-500 text-white hover:bg-red-600
              transition-colors
            "
            title="Remove file"
          >
            Remove
          </button>
        )}

        {isSuccess && (
          <span className="text-xs text-green-600 font-medium">Uploaded</span>
        )}
      </div>
    </motion.div>
  );
};
