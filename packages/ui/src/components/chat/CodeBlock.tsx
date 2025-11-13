/**
 * CodeBlock Component
 * Syntax-highlighted code block with copy functionality
 */

import React, { useState, useCallback } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import type { Language } from 'prism-react-renderer';
import { motion } from 'framer-motion';
import type { CodeBlockProps } from '../../types/chat';

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  showLineNumbers = true,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [code]);

  const normalizedLanguage = (language.toLowerCase() || 'text') as Language;

  return (
    <div className={`code-block-wrapper ${className}`}>
      {/* Code block header */}
      <div className="code-block-header">
        <span className="code-language">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="copy-code-btn"
          aria-label="Copy code"
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <motion.svg
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          )}
        </button>
      </div>

      {/* Syntax highlighted code */}
      <Highlight theme={themes.vsDark} code={code.trim()} language={normalizedLanguage}>
        {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={highlightClassName} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {showLineNumbers && (
                  <span className="line-number" aria-hidden="true">
                    {i + 1}
                  </span>
                )}
                <span className="line-content">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};

export default CodeBlock;
