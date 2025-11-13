/**
 * File Browser Example
 * Example usage of the FileBrowser component
 */

import React, { useState } from 'react';
import { FileBrowser } from './FileBrowser';
import type { FileItem } from '../../types/fileBrowser';

/**
 * Mock file data generator
 */
const generateMockFiles = (): FileItem[] => {
  const now = Date.now();
  const files: FileItem[] = [];

  // Root folder
  files.push({
    id: 'root-1',
    name: 'Documents',
    type: 'folder',
    size: 0,
    created_at: now - 86400000 * 30,
    updated_at: now - 86400000 * 5,
    path: '/Documents',
  });

  // Documents subfolder
  files.push({
    id: 'folder-1',
    name: 'Reports',
    type: 'folder',
    size: 0,
    created_at: now - 86400000 * 20,
    updated_at: now - 86400000 * 2,
    parent_id: 'root-1',
    path: '/Documents/Reports',
  });

  // Files in Reports
  files.push({
    id: 'file-1',
    name: 'Q4-2024-Report.pdf',
    type: 'file',
    size: 2048576,
    created_at: now - 86400000 * 10,
    updated_at: now - 86400000 * 2,
    mime_type: 'application/pdf',
    parent_id: 'folder-1',
    path: '/Documents/Reports/Q4-2024-Report.pdf',
  });

  files.push({
    id: 'file-2',
    name: 'Annual-Summary.docx',
    type: 'file',
    size: 1024000,
    created_at: now - 86400000 * 15,
    updated_at: now - 86400000 * 3,
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    parent_id: 'folder-1',
    path: '/Documents/Reports/Annual-Summary.docx',
  });

  // Images folder
  files.push({
    id: 'root-2',
    name: 'Images',
    type: 'folder',
    size: 0,
    created_at: now - 86400000 * 60,
    updated_at: now - 86400000 * 1,
    path: '/Images',
  });

  // Images
  files.push({
    id: 'file-3',
    name: 'screenshot-2024.png',
    type: 'file',
    size: 3145728,
    created_at: now - 86400000 * 5,
    updated_at: now - 86400000 * 1,
    mime_type: 'image/png',
    parent_id: 'root-2',
    path: '/Images/screenshot-2024.png',
  });

  files.push({
    id: 'file-4',
    name: 'profile-photo.jpg',
    type: 'file',
    size: 512000,
    created_at: now - 86400000 * 30,
    updated_at: now - 86400000 * 20,
    mime_type: 'image/jpeg',
    parent_id: 'root-2',
    path: '/Images/profile-photo.jpg',
  });

  // Code folder
  files.push({
    id: 'root-3',
    name: 'Projects',
    type: 'folder',
    size: 0,
    created_at: now - 86400000 * 90,
    updated_at: now - 86400000,
    path: '/Projects',
  });

  files.push({
    id: 'folder-2',
    name: 'my-app',
    type: 'folder',
    size: 0,
    created_at: now - 86400000 * 60,
    updated_at: now - 86400000,
    parent_id: 'root-3',
    path: '/Projects/my-app',
  });

  // Code files
  files.push({
    id: 'file-5',
    name: 'index.tsx',
    type: 'file',
    size: 8192,
    created_at: now - 86400000 * 7,
    updated_at: now - 86400000,
    mime_type: 'text/typescript',
    parent_id: 'folder-2',
    path: '/Projects/my-app/index.tsx',
  });

  files.push({
    id: 'file-6',
    name: 'package.json',
    type: 'file',
    size: 4096,
    created_at: now - 86400000 * 60,
    updated_at: now - 86400000 * 5,
    mime_type: 'application/json',
    parent_id: 'folder-2',
    path: '/Projects/my-app/package.json',
  });

  files.push({
    id: 'file-7',
    name: 'README.md',
    type: 'file',
    size: 2048,
    created_at: now - 86400000 * 60,
    updated_at: now - 86400000 * 10,
    mime_type: 'text/plain',
    parent_id: 'folder-2',
    path: '/Projects/my-app/README.md',
  });

  // Videos folder
  files.push({
    id: 'root-4',
    name: 'Videos',
    type: 'folder',
    size: 0,
    created_at: now - 86400000 * 40,
    updated_at: now - 86400000 * 8,
    path: '/Videos',
  });

  files.push({
    id: 'file-8',
    name: 'demo-recording.mp4',
    type: 'file',
    size: 52428800,
    created_at: now - 86400000 * 15,
    updated_at: now - 86400000 * 8,
    mime_type: 'video/mp4',
    parent_id: 'root-4',
    path: '/Videos/demo-recording.mp4',
  });

  // Add many more files to test virtual scrolling (10k files)
  for (let i = 0; i < 100; i++) {
    const folderId = `test-folder-${i}`;
    files.push({
      id: folderId,
      name: `TestFolder${i}`,
      type: 'folder',
      size: 0,
      created_at: now - 86400000 * i,
      updated_at: now - 86400000 * (i / 2),
      path: `/TestFolder${i}`,
    });

    // Add 50 files to each folder
    for (let j = 0; j < 50; j++) {
      files.push({
        id: `test-file-${i}-${j}`,
        name: `test-file-${j}.txt`,
        type: 'file',
        size: Math.floor(Math.random() * 1000000),
        created_at: now - 86400000 * j,
        updated_at: now - 86400000 * (j / 2),
        mime_type: 'text/plain',
        parent_id: folderId,
        path: `/TestFolder${i}/test-file-${j}.txt`,
      });
    }
  }

  return files;
};

/**
 * Example component
 */
export const FileBrowserExample: React.FC = () => {
  const [files] = useState<FileItem[]>(() => generateMockFiles());

  const handleFileClick = (file: FileItem) => {
    console.log('File clicked:', file.name);
  };

  const handleFileDoubleClick = (file: FileItem) => {
    console.log('File double-clicked:', file.name);
    if (file.type === 'file') {
      alert(`Opening file: ${file.name}`);
    }
  };

  const handleFileDownload = (file: FileItem) => {
    console.log('Download file:', file.name);
    alert(`Downloading: ${file.name}`);
  };

  const handleFileDelete = (file: FileItem) => {
    console.log('Delete file:', file.name);
    alert(`Deleted: ${file.name}`);
  };

  const handleFileRename = (file: FileItem, newName: string) => {
    console.log('Rename file:', file.name, 'to', newName);
    alert(`Renamed "${file.name}" to "${newName}"`);
  };

  const handleFileShare = (file: FileItem) => {
    console.log('Share file:', file.name);
    alert(`Sharing: ${file.name}`);
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          File Browser Demo
        </h1>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <FileBrowser
            files={files}
            onFileClick={handleFileClick}
            onFileDoubleClick={handleFileDoubleClick}
            onFileDownload={handleFileDownload}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
            onFileShare={handleFileShare}
            height="800px"
            enableKeyboardNavigation
          />
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Features Demonstrated:
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Tree view with folder expansion/collapse</li>
            <li>Virtual scrolling (handling 5000+ files)</li>
            <li>Search across file names and paths</li>
            <li>Filtering by file type (Images, Documents, Code, PDFs, Videos, Audio)</li>
            <li>Sorting by name, date, size, type</li>
            <li>Multi-select with Ctrl+Click and Shift+Click</li>
            <li>Keyboard navigation (Arrow keys, Enter, Delete, Ctrl+A, Escape)</li>
            <li>Right-click context menu (Download, Rename, Share, Delete)</li>
            <li>Double-click to open files or toggle folders</li>
            <li>Expand All / Collapse All buttons</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Keyboard Shortcuts:
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Arrow Up/Down
              </span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">Navigate files</span>
            </div>
            <div>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Arrow Right/Left
              </span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">Expand/Collapse folders</span>
            </div>
            <div>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Shift + Click
              </span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">Range select</span>
            </div>
            <div>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Ctrl/Cmd + Click
              </span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">Multi-select</span>
            </div>
            <div>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Enter
              </span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">Open file/folder</span>
            </div>
            <div>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Delete
              </span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">Delete selected</span>
            </div>
            <div>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Ctrl/Cmd + A
              </span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">Select all</span>
            </div>
            <div>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Escape
              </span>
              <span className="ml-2 text-gray-700 dark:text-gray-300">Clear selection</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileBrowserExample;
