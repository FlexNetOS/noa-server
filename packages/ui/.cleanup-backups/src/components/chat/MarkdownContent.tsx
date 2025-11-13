/**
 * MarkdownContent Component
 * Renders markdown with syntax highlighting, math support, and enhanced formatting
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import CodeBlock from './CodeBlock';
import 'highlight.js/styles/github-dark.css';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
      return content.replace(/\n/g, '<br>');
    }
  }, [content]);

  // Enhance links to open in new tabs
  const enhanceLinks = useCallback((html: string): string => {
    if (!html.includes('<a')) return html;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const links = tempDiv.querySelectorAll('a[href]');
    links.forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    return tempDiv.innerHTML;
  }, []);

  // Setup copy buttons for code blocks
  useEffect(() => {
    if (!containerRef.current) return;

    const copyButtons = containerRef.current.querySelectorAll('.copy-code-btn');

    const handleCopy = async (event: Event) => {
      const button = event.currentTarget as HTMLButtonElement;
      const wrapper = button.closest('.code-block-wrapper');
      if (!wrapper) return;

      const codeElement = wrapper.querySelector('code');
      if (!codeElement) return;

      try {
        await navigator.clipboard.writeText(codeElement.textContent || '');
        button.classList.add('copied');
        setTimeout(() => button.classList.remove('copied'), 2000);
      } catch (error) {
        console.error('Failed to copy code:', error);
      }
    };

    copyButtons.forEach((button) => {
      button.addEventListener('click', handleCopy);
    });

    return () => {
      copyButtons.forEach((button) => {
        button.removeEventListener('click', handleCopy);
      });
    };
  }, [processedHtml]);

  const enhancedHtml = useMemo(() => {
    return enhanceLinks(processedHtml);
  }, [processedHtml, enhanceLinks]);

  return (
    <div
      ref={containerRef}
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: enhancedHtml }}
    />
  );
};

export default MarkdownContent;
