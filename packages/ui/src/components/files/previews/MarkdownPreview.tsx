/**
 * MarkdownPreview Component
 * Markdown renderer with syntax highlighting using remark and rehype
 */

import React, { useMemo } from 'react';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import type { FileItem } from '../../../types/fileBrowser';
import 'highlight.js/styles/github-dark.css';

export interface MarkdownPreviewProps {
  file: FileItem;
  content: string | null;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  // Process markdown to HTML
  const processedHtml = useMemo(() => {
    if (!content) return '';

    try {
      const processor = remark()
        .use(remarkGfm) // GitHub Flavored Markdown
        .use(remarkBreaks) // Convert line breaks to <br>
        .use(remarkRehype, { allowDangerousHtml: false }) // Convert to rehype
        .use(rehypeHighlight) // Syntax highlighting
        .use(rehypeStringify); // Convert to HTML

      const result = processor.processSync(content);
      return String(result);
    } catch (error) {
      console.error('Markdown processing error:', error);
      return `<pre>${content}</pre>`;
    }
  }, [content]);

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>No content to display</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-8 py-6">
        <div
          className="markdown-content prose prose-slate dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
          style={{
            // Custom markdown styles
            fontSize: '16px',
            lineHeight: '1.7',
          }}
        />
      </div>

      <style>{`
        .markdown-content {
          /* Headings */
          h1 {
            font-size: 2em;
            font-weight: 700;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.3em;
          }

          h2 {
            font-size: 1.5em;
            font-weight: 600;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }

          h3 {
            font-size: 1.25em;
            font-weight: 600;
            margin-top: 1em;
            margin-bottom: 0.5em;
          }

          /* Code blocks */
          pre {
            background-color: #1e1e1e;
            border-radius: 0.5rem;
            padding: 1rem;
            overflow-x: auto;
            margin: 1em 0;
          }

          pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            font-size: 0.9em;
          }

          /* Inline code */
          code {
            background-color: #f3f4f6;
            color: #e83e8c;
            padding: 0.2em 0.4em;
            border-radius: 0.25rem;
            font-size: 0.9em;
            font-family: 'Monaco', 'Consolas', monospace;
          }

          .dark code {
            background-color: #374151;
            color: #f472b6;
          }

          /* Tables */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
          }

          table th,
          table td {
            border: 1px solid #e5e7eb;
            padding: 0.5em 1em;
            text-align: left;
          }

          .dark table th,
          .dark table td {
            border-color: #374151;
          }

          table th {
            background-color: #f9fafb;
            font-weight: 600;
          }

          .dark table th {
            background-color: #1f2937;
          }

          /* Links */
          a {
            color: #3b82f6;
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }

          /* Lists */
          ul, ol {
            padding-left: 2em;
            margin: 1em 0;
          }

          li {
            margin: 0.5em 0;
          }

          /* Blockquotes */
          blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1em;
            margin: 1em 0;
            color: #6b7280;
            font-style: italic;
          }

          .dark blockquote {
            border-left-color: #374151;
            color: #9ca3af;
          }

          /* Horizontal rules */
          hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 2em 0;
          }

          .dark hr {
            border-top-color: #374151;
          }

          /* Images */
          img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1em 0;
          }
        }
      `}</style>
    </div>
  );
};

export default MarkdownPreview;
