/**
 * FileUpload Component Usage Examples
 *
 * Demonstrates various use cases and configurations for the FileUpload component.
 */

import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { FilePreview } from './FilePreview';
import { useFileUpload } from '../../hooks/useFileUpload';
import {
  FileUploadConfig,
  UploadedFile,
  FileUploadStatus,
} from '../../types/files';

// Example 1: Basic Usage
export function BasicFileUpload() {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Basic File Upload</h2>
      <FileUpload
        config={{
          maxFileSize: 100 * 1024 * 1024, // 100MB
          maxTotalSize: 500 * 1024 * 1024, // 500MB
          multiple: true,
        }}
        callbacks={{
          onFileAdded: (file) => {
            console.log('File added:', file.name);
          },
          onUploadComplete: (_fileId, response) => {
            console.log('Upload complete:', _fileId, response);
          },
          onUploadError: (_fileId, error) => {
            console.error('Upload error:', _fileId, error);
          },
        }}
      />
    </div>
  );
}

// Example 2: Auto-Upload with Custom URL
export function AutoUploadExample() {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Auto-Upload File Upload</h2>
      <FileUpload
        config={{
          autoUpload: true,
          uploadUrl: '/api/files/upload',
          maxFileSize: 50 * 1024 * 1024, // 50MB
          allowedTypes: ['image/*', 'application/pdf'],
        }}
        callbacks={{
          onUploadStart: (fileId) => {
            console.log('Starting upload:', fileId);
          },
          onUploadProgress: (fileId, progress) => {
            console.log(
              `Upload ${fileId}: ${progress.percentage}% (${progress.speed} bytes/s)`
            );
          },
          onAllComplete: () => {
            alert('All files uploaded successfully!');
          },
        }}
      />
    </div>
  );
}

// Example 3: Custom Hook Usage
export function CustomHookExample() {
  const {
    files,
    addFiles,
    removeFile,
    _uploadFile,
    uploadAll,
    retryUpload,
    clearAll,
    isUploading,
    totalProgress,
  } = useFileUpload({
    config: {
      maxFileSize: 100 * 1024 * 1024,
      uploadUrl: '/api/upload',
    },
    callbacks: {
      onUploadComplete: (_fileId, response) => {
        console.log('File uploaded:', response);
      },
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Custom Hook Example</h2>

      {/* Custom File Input */}
      <div className="mb-4">
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {/* Upload Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={uploadAll}
          disabled={isUploading || files.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded
            hover:bg-blue-600 disabled:opacity-50"
        >
          Upload All ({totalProgress}%)
        </button>
        <button
          onClick={clearAll}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear All
        </button>
      </div>

      {/* File List */}
      <div className="grid gap-4">
        {files.map((file) => (
          <FilePreview
            key={file.id}
            file={file}
            onRemove={removeFile}
            onRetry={retryUpload}
            showProgress={true}
          />
        ))}
      </div>
    </div>
  );
}

// Example 4: Image-Only Upload with Preview Grid
export function ImageUploadExample() {
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Image Gallery Upload</h2>

      <FileUpload
        config={{
          allowedTypes: ['image/*'],
          maxFileSize: 10 * 1024 * 1024, // 10MB
          multiple: true,
        }}
        callbacks={{
          onFileAdded: (file) => {
            setUploadedImages((prev) => [...prev, file]);
          },
          onFileRemoved: (fileId) => {
            setUploadedImages((prev) => prev.filter((f) => f.id !== fileId));
          },
          onUploadComplete: (_fileId, response) => {
            console.log('Image uploaded:', response);
          },
        }}
      />

      {/* Image Grid */}
      {uploadedImages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4">
            Uploaded Images ({uploadedImages.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages
              .filter((img) => img.status === FileUploadStatus.SUCCESS)
              .map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.thumbnailUrl || img.preview}
                    alt={img.name}
                    className="w-full h-48 object-cover rounded-lg shadow-md"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs truncate">{img.name}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Example 5: Compact File List
export function CompactFileListExample() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Compact File Upload</h2>
      <FileUpload
        config={{
          multiple: true,
          allowedTypes: ['text/*', 'application/pdf'],
        }}
        className="w-full"
      >
        {/* Custom Drop Zone Content */}
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            Supported formats: Text files, PDFs
          </p>
        </div>
      </FileUpload>
    </div>
  );
}

// Example 6: Code File Upload
export function CodeFileUploadExample() {
  const config: Partial<FileUploadConfig> = {
    allowedExtensions: [
      '.js',
      '.ts',
      '.tsx',
      '.jsx',
      '.py',
      '.java',
      '.cpp',
      '.go',
      '.rs',
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    multiple: true,
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Code File Upload</h2>
      <FileUpload
        config={config}
        callbacks={{
          onFileAdded: (file) => {
            if (file.textContent) {
              console.log('Code content:', file.textContent.substring(0, 100));
            }
          },
        }}
      />
    </div>
  );
}

// Example 7: With Progress Monitoring
export function ProgressMonitoringExample() {
  const [uploadStats, setUploadStats] = useState({
    totalFiles: 0,
    completedFiles: 0,
    totalSize: 0,
    uploadedSize: 0,
  });

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Upload Progress Monitor</h2>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {uploadStats.totalFiles}
          </div>
          <div className="text-xs text-gray-600">Total Files</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {uploadStats.completedFiles}
          </div>
          <div className="text-xs text-gray-600">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round((uploadStats.uploadedSize / uploadStats.totalSize) * 100) || 0}%
          </div>
          <div className="text-xs text-gray-600">Progress</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {(uploadStats.totalSize / 1024 / 1024).toFixed(2)} MB
          </div>
          <div className="text-xs text-gray-600">Total Size</div>
        </div>
      </div>

      <FileUpload
        config={{
          multiple: true,
          maxFileSize: 100 * 1024 * 1024,
        }}
        callbacks={{
          onFileAdded: (file) => {
            setUploadStats((prev) => ({
              ...prev,
              totalFiles: prev.totalFiles + 1,
              totalSize: prev.totalSize + file.size,
            }));
          },
          onUploadProgress: (_fileId, progress) => {
            setUploadStats((prev) => ({
              ...prev,
              uploadedSize: prev.uploadedSize + progress.loaded,
            }));
          },
          onUploadComplete: (_fileId) => {
            setUploadStats((prev) => ({
              ...prev,
              completedFiles: prev.completedFiles + 1,
            }));
          },
          onFileRemoved: (fileId) => {
            // Update stats when file is removed
            setUploadStats((prev) => ({
              ...prev,
              totalFiles: Math.max(0, prev.totalFiles - 1),
            }));
          },
        }}
      />
    </div>
  );
}

// Example 8: Disabled State
export function DisabledUploadExample() {
  const [isDisabled, setIsDisabled] = useState(true);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Disabled Upload Example</h2>

      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!isDisabled}
            onChange={(e) => setIsDisabled(!e.target.checked)}
            className="rounded"
          />
          <span>Enable file upload</span>
        </label>
      </div>

      <FileUpload disabled={isDisabled} config={{ multiple: true }} />
    </div>
  );
}

// Main demo component
export function FileUploadExamples() {
  const [activeExample, setActiveExample] = useState<string>('basic');

  const examples = [
    { id: 'basic', name: 'Basic Upload', component: BasicFileUpload },
    { id: 'auto', name: 'Auto Upload', component: AutoUploadExample },
    { id: 'hook', name: 'Custom Hook', component: CustomHookExample },
    { id: 'images', name: 'Image Gallery', component: ImageUploadExample },
    { id: 'compact', name: 'Compact List', component: CompactFileListExample },
    { id: 'code', name: 'Code Files', component: CodeFileUploadExample },
    { id: 'progress', name: 'Progress Monitor', component: ProgressMonitoringExample },
    { id: 'disabled', name: 'Disabled State', component: DisabledUploadExample },
  ];

  const ActiveComponent =
    examples.find((ex) => ex.id === activeExample)?.component || BasicFileUpload;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold mb-4">FileUpload Component Examples</h1>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example.id}
                onClick={() => setActiveExample(example.id)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors
                  ${
                    activeExample === example.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Example */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ActiveComponent />
      </div>
    </div>
  );
}

export default FileUploadExamples;
