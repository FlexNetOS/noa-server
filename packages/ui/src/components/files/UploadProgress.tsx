/**
 * UploadProgress Component
 *
 * Displays upload progress with percentage, speed, and remaining time.
 */

import { motion } from 'framer-motion';
import { UploadProgressProps } from '../../types/files';
import { formatFileSize } from '../../utils/fileValidation';

export const UploadProgress: React.FC<UploadProgressProps> = ({
  file,
  onCancel,
  showDetails = true,
}) => {
  const progressPercentage = Math.min(100, Math.max(0, file.progress));

  return (
    <div className="mt-2 space-y-1">
      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Progress Details */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-3">
            <span className="font-medium text-blue-600">
              {progressPercentage}%
            </span>
            <span>
              {formatFileSize(file.uploadedBytes)} / {formatFileSize(file.size)}
            </span>
          </div>

          {onCancel && (
            <button
              onClick={() => onCancel(file.id)}
              className="
                text-red-500 hover:text-red-700 font-medium
                transition-colors
              "
              title="Cancel upload"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};
