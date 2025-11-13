/**
 * File Preview Page
 * View and interact with individual files
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { FilePreview } from '../components/files/FilePreview';
import type { FileItem } from '../types/fileBrowser';
import type { UploadedFile } from '../types/files';
import { FileUploadStatus, FileTypeCategory } from '../types/files';

const FilePreviewPage: React.FC = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fileId) return;

    // Simulate loading file data
    setTimeout(() => {
      setFile({
        id: fileId,
        name: `File ${fileId}.pdf`,
        type: 'file',
        size: 1024 * 1024 * 2.5, // 2.5 MB
        created_at: Date.now() - 86400000, // 1 day ago
        updated_at: Date.now() - 86400000,
        path: `/files/${fileId}`,
        mime_type: 'application/pdf',
      });
      setLoading(false);
    }, 500);
  }, [fileId]);

  const handleDownload = () => {
    console.log('Downloading file:', fileId);
    // TODO: Implement download
  };

  const handleDelete = () => {
    if (confirm('Delete this file?')) {
      // TODO: Implement delete
      navigate('/files');
    }
  };

  const handleShare = () => {
    console.log('Sharing file:', fileId);
    // TODO: Implement share
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-600 dark:border-blue-400 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading file...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">File not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The file you're looking for doesn't exist.
          </p>
          <Link
            to="/files"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Back to Files
          </Link>
        </div>
      </div>
    );
  }

  // Convert FileItem to UploadedFile for FilePreview component
  const uploadedFile: UploadedFile = {
    id: file.id,
    file: new File([], file.name, { type: file.mime_type || 'application/octet-stream' }),
    name: file.name,
    size: file.size,
    type: file.mime_type || 'application/octet-stream',
    category: FileTypeCategory.DOCUMENT,
    status: FileUploadStatus.SUCCESS,
    progress: 100,
    uploadedBytes: file.size,
  };

  return (
    <div className="page-container h-full flex flex-col">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/files"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <div>
              <h1 className="page-title">{file.name}</h1>
              <p className="page-description">
                {(file.size / 1024 / 1024).toFixed(2)} MB • Modified{' '}
                {new Date(file.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Download
            </button>
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Share"
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
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete"
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-6 overflow-hidden bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <FilePreview file={uploadedFile} />
      </div>
    </div>
  );
};

export default FilePreviewPage;
