/**
 * File Tree Component
 * Virtual scrolled tree view with react-window
 */

import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FileItem } from './FileItem';
import type { FileItem as FileItemType } from '../../types/fileBrowser';

interface FileTreeProps {
  files: FileItemType[];
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  onFileClick: (file: FileItemType, event: React.MouseEvent) => void;
  onFolderToggle: (id: string, event: React.MouseEvent) => void;
  onContextMenu: (file: FileItemType, event: React.MouseEvent) => void;
  itemHeight?: number;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedIds,
  expandedIds,
  onFileClick,
  onFolderToggle,
  onContextMenu,
  itemHeight = 32,
}) => {
  // Row renderer for react-window
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const file = files[index];
      if (!file) return null;

      return (
        <FileItem
          key={file.id}
          file={file}
          isSelected={selectedIds.has(file.id)}
          isExpanded={expandedIds.has(file.id)}
          onClick={onFileClick}
          onToggle={onFolderToggle}
          onContextMenu={onContextMenu}
          style={style}
        />
      );
    },
    [files, selectedIds, expandedIds, onFileClick, onFolderToggle, onContextMenu]
  );

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium">No files found</p>
          <p className="text-sm mt-1">Try adjusting your search or filter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-gray-900">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={files.length}
            itemSize={itemHeight}
            overscanCount={10}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};
