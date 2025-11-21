/**
 * Files Page
 * File browser and management interface
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileBrowser } from '../components/files/FileBrowser';
import { useRouteStateMultiple } from '../hooks/useRouteState';
import type { FileItem } from '../types/fileBrowser';

const FilesPage: React.FC = () => {
  const navigate = useNavigate();

  // Sync multiple state values with URL
  const [state, setState] = useRouteStateMultiple({
    view: { defaultValue: 'grid' as 'grid' | 'list' },
    sort: { defaultValue: 'name' as 'name' | 'size' | 'date' },
    search: { defaultValue: '' },
  });

  // Sample files data
  const sampleFiles: FileItem[] = [
    {
      id: '1',
      name: 'Document.pdf',
      type: 'file',
      size: 1024 * 1024 * 2,
      created_at: Date.now() - 86400000,
      updated_at: Date.now() - 86400000,
      path: '/files/1',
      mime_type: 'application/pdf',
    },
    {
      id: '2',
      name: 'Projects',
      type: 'folder',
      size: 0,
      created_at: Date.now() - 172800000,
      updated_at: Date.now() - 172800000,
      path: '/files/2',
    },
  ];

  const handleFileSelect = (file: FileItem) => {
    if (file.type === 'file') {
      navigate(`/files/${file.id}`);
    }
  };

  return (
    <div className="page-container h-full flex flex-col">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Files</h1>
            <p className="page-description">
              Manage and organize your files
            </p>
          </div>

          {/* View controls */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search files..."
              value={state.search}
              onChange={(e) => setState({ search: e.target.value })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={state.sort}
              onChange={(e) => setState({ sort: e.target.value as any })}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="date">Date</option>
            </select>

            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button
                onClick={() => setState({ view: 'grid' })}
                className={`p-2 rounded transition-colors ${
                  state.view === 'grid'
                    ? 'bg-white dark:bg-gray-700'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Grid view"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setState({ view: 'list' })}
                className={`p-2 rounded transition-colors ${
                  state.view === 'list'
                    ? 'bg-white dark:bg-gray-700'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="List view"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-6 overflow-hidden">
        <FileBrowser
          files={sampleFiles}
          onFileClick={handleFileSelect}
          onFileDoubleClick={handleFileSelect}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default FilesPage;
