/**
 * File Item Component
 * Individual file/folder item with icon, name, and interactions
 */

import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileImage,
  FileCode,
  FileVideo,
  FileAudio,
} from 'lucide-react';
import type { FileItem as FileItemType } from '../../types/fileBrowser';

interface FileItemProps {
  file: FileItemType;
  isSelected: boolean;
  isExpanded: boolean;
  onClick: (file: FileItemType, event: React.MouseEvent) => void;
  onToggle: (id: string, event: React.MouseEvent) => void;
  onContextMenu: (file: FileItemType, event: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

/**
 * Get appropriate icon for file type
 */
const getFileIcon = (file: FileItemType) => {
  if (file.type === 'folder') {
    return file.isExpanded ? FolderOpen : Folder;
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  const mime = file.mime_type?.toLowerCase();

  // Images
  if (mime?.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(`.${ext}`)) {
    return FileImage;
  }

  // Videos
  if (mime?.startsWith('video/') || ['.mp4', '.webm', '.ogg', '.avi'].includes(`.${ext}`)) {
    return FileVideo;
  }

  // Audio
  if (mime?.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a'].includes(`.${ext}`)) {
    return FileAudio;
  }

  // PDFs
  if (mime === 'application/pdf' || ext === 'pdf') {
    return FileText;
  }

  // Code files
  if (['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.py', '.java'].includes(`.${ext}`)) {
    return FileCode;
  }

  // Documents
  if (['.txt', '.doc', '.docx', '.md'].includes(`.${ext}`)) {
    return FileText;
  }

  return File;
};

/**
 * Format file size
 */
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Format date
 */
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const FileItem: React.FC<FileItemProps> = ({
  file,
  isSelected,
  isExpanded,
  onClick,
  onToggle,
  onContextMenu,
  style,
}) => {
  const Icon = getFileIcon(file);
  const depth = file.depth || 0;
  const paddingLeft = depth * 16 + 8;

  return (
    <div
      style={style}
      className={`
        flex items-center px-2 py-1.5 cursor-pointer select-none
        hover:bg-gray-100 dark:hover:bg-gray-800
        ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
        transition-colors duration-150
      `}
      onClick={(e) => onClick(file, e)}
      onContextMenu={(e) => onContextMenu(file, e)}
    >
      {/* Indentation */}
      <div style={{ width: paddingLeft }} />

      {/* Folder toggle chevron */}
      {file.type === 'folder' ? (
        <button
          onClick={(e) => onToggle(file.id, e)}
          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      ) : (
        <div className="w-5" />
      )}

      {/* File icon */}
      <Icon
        className={`
          w-4 h-4 ml-1 mr-2 flex-shrink-0
          ${file.type === 'folder'
            ? 'text-yellow-600 dark:text-yellow-500'
            : 'text-gray-500 dark:text-gray-400'
          }
        `}
      />

      {/* File name */}
      <span
        className={`
          flex-1 truncate text-sm
          ${isSelected
            ? 'text-blue-900 dark:text-blue-100 font-medium'
            : 'text-gray-900 dark:text-gray-100'
          }
        `}
      >
        {file.name}
      </span>

      {/* File metadata */}
      <div className="flex items-center gap-4 ml-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="w-20 text-right">{formatDate(file.updated_at)}</span>
        <span className="w-16 text-right">
          {file.type === 'file' ? formatSize(file.size) : '-'}
        </span>
      </div>
    </div>
  );
};
