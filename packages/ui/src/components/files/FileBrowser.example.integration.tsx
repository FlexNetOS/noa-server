/**
 * FileBrowser with Preview Integration Example
 * Demonstrates how to use FileBrowser with FilePreviewModal
 */

import React, { useState } from 'react';
import { FileBrowser } from './FileBrowser';
import { FilePreviewModal } from './previews/FilePreviewModal';
import type { FileItem } from '../../types/fileBrowser';

// Example file data
const exampleFiles: FileItem[] = [
  {
    id: '1',
    name: 'documents',
    type: 'folder',
    size: 0,
    mime_type: undefined,
    created_at: Date.now() - 86400000 * 7,
    updated_at: Date.now() - 86400000 * 2,
    path: '/documents',
    depth: 0,
    children: [
      {
        id: '2',
        name: 'report.pdf',
        type: 'file',
        size: 1024 * 500, // 500 KB
        mime_type: 'application/pdf',
        created_at: Date.now() - 86400000 * 5,
        updated_at: Date.now() - 86400000 * 1,
        path: '/documents/report.pdf',
        depth: 1,
      },
      {
        id: '3',
        name: 'README.md',
        type: 'file',
        size: 1024 * 10, // 10 KB
        mime_type: 'text/markdown',
        created_at: Date.now() - 86400000 * 3,
        updated_at: Date.now() - 86400000 * 1,
        path: '/documents/README.md',
        depth: 1,
      },
    ],
  },
  {
    id: '4',
    name: 'images',
    type: 'folder',
    size: 0,
    mime_type: undefined,
    created_at: Date.now() - 86400000 * 10,
    updated_at: Date.now() - 86400000 * 3,
    path: '/images',
    depth: 0,
    children: [
      {
        id: '5',
        name: 'logo.png',
        type: 'file',
        size: 1024 * 200, // 200 KB
        mime_type: 'image/png',
        created_at: Date.now() - 86400000 * 8,
        updated_at: Date.now() - 86400000 * 3,
        path: '/images/logo.png',
        depth: 1,
      },
      {
        id: '6',
        name: 'banner.jpg',
        type: 'file',
        size: 1024 * 350, // 350 KB
        mime_type: 'image/jpeg',
        created_at: Date.now() - 86400000 * 6,
        updated_at: Date.now() - 86400000 * 2,
        path: '/images/banner.jpg',
        depth: 1,
      },
    ],
  },
  {
    id: '7',
    name: 'code',
    type: 'folder',
    size: 0,
    mime_type: undefined,
    created_at: Date.now() - 86400000 * 15,
    updated_at: Date.now() - 86400000 * 1,
    path: '/code',
    depth: 0,
    children: [
      {
        id: '8',
        name: 'app.tsx',
        type: 'file',
        size: 1024 * 15, // 15 KB
        mime_type: 'text/typescript',
        created_at: Date.now() - 86400000 * 2,
        updated_at: Date.now() - 86400000 * 1,
        path: '/code/app.tsx',
        depth: 1,
      },
      {
        id: '9',
        name: 'utils.js',
        type: 'file',
        size: 1024 * 8, // 8 KB
        mime_type: 'text/javascript',
        created_at: Date.now() - 86400000 * 4,
        updated_at: Date.now() - 86400000 * 2,
        path: '/code/utils.js',
        depth: 1,
      },
      {
        id: '10',
        name: 'config.json',
        type: 'file',
        size: 1024 * 2, // 2 KB
        mime_type: 'application/json',
        created_at: Date.now() - 86400000 * 5,
        updated_at: Date.now() - 86400000 * 3,
        path: '/code/config.json',
        depth: 1,
      },
    ],
  },
  {
    id: '11',
    name: 'notes.txt',
    type: 'file',
    size: 1024 * 5, // 5 KB
    mime_type: 'text/plain',
    created_at: Date.now() - 86400000 * 1,
    updated_at: Date.now() - 3600000, // 1 hour ago
    path: '/notes.txt',
    depth: 0,
  },
];

export const FileBrowserWithPreviewExample: React.FC = () => {
  const [previewFile, setPreviewFile] = useState<FileItem | undefined>(undefined);

  // Simulate fetching file content
  const fetchFileContent = async (file: FileItem): Promise<string | ArrayBuffer> => {
    // In a real application, this would fetch from an API
    const ext = file.name.split('.').pop()?.toLowerCase();

    // Simulate different file types
    if (ext === 'pdf') {
      // Return empty ArrayBuffer for demo (would normally fetch PDF data)
      return new ArrayBuffer(0);
    }

    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      // Return placeholder image URL
      return `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(file.name)}`;
    }

    if (ext === 'md') {
      return `# ${file.name.replace('.md', '')}\n\nThis is a markdown file.\n\n## Features\n\n- Syntax highlighting\n- GitHub Flavored Markdown\n- Tables and more\n\n\`\`\`typescript\nconst example = "code block";\n\`\`\``;
    }

    if (ext === 'tsx' || ext === 'ts') {
      return `import React from 'react';\n\ninterface Props {\n  name: string;\n}\n\nexport const Component: React.FC<Props> = ({ name }) => {\n  return <div>Hello, {name}!</div>;\n};\n`;
    }

    if (ext === 'js') {
      return `function greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nmodule.exports = { greet };\n`;
    }

    if (ext === 'json') {
      return JSON.stringify(
        {
          name: file.name,
          version: '1.0.0',
          description: 'Example configuration file',
          settings: {
            theme: 'dark',
            fontSize: 14,
          },
        },
        null,
        2
      );
    }

    // Default text content
    return `This is the content of ${file.name}.\n\nLine 2\nLine 3\nLine 4`;
  };

  const handleFileDoubleClick = (file: FileItem) => {
    if (file.type === 'file') {
      setPreviewFile(file);
    }
  };

  const handleFileDownload = (file: FileItem) => {
    console.log('Download file:', file.name);
    // Implement download logic
  };

  const handleFileDelete = (file: FileItem) => {
    console.log('Delete file:', file.name);
    // Implement delete logic
  };

  const handleFileRename = (file: FileItem, newName: string) => {
    console.log('Rename file:', file.name, 'to', newName);
    // Implement rename logic
  };

  const handleFileShare = (file: FileItem) => {
    console.log('Share file:', file.name);
    // Implement share logic
  };

  return (
    <div className="h-screen p-8 bg-gray-100 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          File Browser with Preview
        </h1>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <FileBrowser
            files={exampleFiles}
            onFileDoubleClick={handleFileDoubleClick}
            onFileDownload={handleFileDownload}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
            onFileShare={handleFileShare}
            height="calc(100vh - 200px)"
            enableKeyboardNavigation
          />
        </div>

        {/* File Preview Modal */}
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(undefined)}
            onDownload={handleFileDownload}
            fetchContent={fetchFileContent}
          />
        )}
      </div>
    </div>
  );
};

export default FileBrowserWithPreviewExample;
