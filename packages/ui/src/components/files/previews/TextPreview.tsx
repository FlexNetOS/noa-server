/**
 * TextPreview Component
 * Simple plain text viewer with basic formatting and search
 */

import React, { useState, useMemo } from 'react';
import { Search, Type, Minimize2, Maximize2 } from 'lucide-react';
import type { FileItem } from '../../../types/fileBrowser';

export interface TextPreviewProps {
  file: FileItem;
  content: string | null;
}

const TextPreview: React.FC<TextPreviewProps> = ({ content }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [wrapText, setWrapText] = useState(true);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!content) return { lines: 0, words: 0, characters: 0 };

    const lines = content.split('\n').length;
    const words = content.trim().split(/\s+/).length;
    const characters = content.length;

    return { lines, words, characters };
  }, [content]);

  // Highlight search results
  const highlightedContent = useMemo(() => {
    if (!content || !searchQuery.trim()) return content || '';

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-600">$1</mark>');
  }, [content, searchQuery]);

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 2, 24));
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 2, 10));
  };

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No content to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in text..."
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Font size controls */}
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <button
              onClick={decreaseFontSize}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Decrease font size"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium w-8 text-center">
              {fontSize}
            </span>
            <button
              onClick={increaseFontSize}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Increase font size"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Wrap toggle */}
          <button
            onClick={() => setWrapText(!wrapText)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              wrapText
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title="Toggle text wrapping"
          >
            Wrap: {wrapText ? 'ON' : 'OFF'}
          </button>

          {/* Statistics */}
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 pl-4 border-l border-gray-300 dark:border-gray-600">
            <span>{stats.lines.toLocaleString()} lines</span>
            <span>{stats.words.toLocaleString()} words</span>
            <span>{stats.characters.toLocaleString()} chars</span>
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">
        <div className="p-6">
          <pre
            className={`font-mono text-gray-800 dark:text-gray-200 ${
              wrapText ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
            }`}
            style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{
              __html: highlightedContent,
            }}
          />
        </div>
      </div>

      <style>{`
        /* Custom scrollbar */
        .overflow-auto {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .dark .overflow-auto {
          scrollbar-color: #475569 #1e293b;
        }

        /* Selection styling */
        pre::selection {
          background-color: rgba(59, 130, 246, 0.3);
        }

        /* Search highlight animation */
        mark {
          animation: highlight 0.3s ease-in-out;
        }

        @keyframes highlight {
          from {
            background-color: transparent;
          }
          to {
            background-color: rgb(253 224 71);
          }
        }
      `}</style>
    </div>
  );
};

export default TextPreview;
