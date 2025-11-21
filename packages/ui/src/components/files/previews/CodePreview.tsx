/**
 * CodePreview Component
 * Code viewer with syntax highlighting and line numbers using highlight.js
 */

import React, { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import { Copy, Check } from 'lucide-react';
import type { FileItem } from '../../../types/fileBrowser';
import 'highlight.js/styles/github-dark.css';

export interface CodePreviewProps {
  file: FileItem;
  content: string | null;
}

/**
 * Get language from file extension
 */
const getLanguageFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'cs': 'csharp',
    'php': 'php',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'md': 'markdown',
    'markdown': 'markdown',
  };

  return languageMap[ext || ''] || 'plaintext';
};

const CodePreview: React.FC<CodePreviewProps> = ({ file, content }) => {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [lineCount, setLineCount] = useState(0);

  const language = getLanguageFromExtension(file.name);

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current && content) {
      hljs.highlightElement(codeRef.current);
      setLineCount(content.split('\n').length);
    }
  }, [content]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No content to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">
            {language.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">
            {lineCount} lines
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Code
            </>
          )}
        </button>
      </div>

      {/* Code Container */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Line Numbers */}
          <div className="flex-shrink-0 px-4 py-4 bg-gray-800 border-r border-gray-700 text-gray-500 text-right select-none">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="leading-6 font-mono text-sm">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code */}
          <pre className="flex-1 p-4 m-0 overflow-x-auto">
            <code
              ref={codeRef}
              className={`language-${language} text-sm leading-6`}
            >
              {content}
            </code>
          </pre>
        </div>
      </div>

      <style>{`
        /* Override highlight.js theme for better contrast */
        pre code.hljs {
          background-color: #1e1e1e;
          padding: 0;
        }

        /* Smooth scrolling */
        .overflow-auto {
          scroll-behavior: smooth;
        }

        /* Font settings for better code readability */
        pre, code {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
          font-variant-ligatures: none;
        }

        /* Selection styling */
        pre code::selection {
          background-color: rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
};

export default CodePreview;
