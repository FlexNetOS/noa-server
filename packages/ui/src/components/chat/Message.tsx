/**
 * Message Component
 * Individual message bubble with role-based styling and actions
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MarkdownContent from './MarkdownContent';
import MessageActions from './MessageActions';
import TypingIndicator from './TypingIndicator';
import type { MessageProps } from '../../types/chat';

const Message: React.FC<MessageProps> = ({
  message,
  onCopy,
  onDelete,
  onEdit,
  onRegenerate,
  showTimestamp = false,
  showModelInfo = false,
  enableMarkdown = true,
  className = ''
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      onCopy?.(message);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, [message, onCopy]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete?.(message.id);
    }
  }, [message.id, onDelete]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditedContent(message.content);
  }, [message.content]);

  const handleSaveEdit = useCallback(() => {
    if (editedContent.trim() && editedContent !== message.content) {
      onEdit?.(message.id, editedContent.trim());
    }
    setIsEditing(false);
  }, [editedContent, message.id, message.content, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedContent(message.content);
  }, [message.content]);

  const handleRegenerate = useCallback(() => {
    onRegenerate?.(message.id);
  }, [message.id, onRegenerate]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.15 }
    }
  };

  return (
    <motion.div
      className={`message message-${message.role} ${className}`}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      role="article"
      aria-label={`${message.role} message`}
    >
      <div className="message-header">
        <div className="message-role-badge">
          {message.role === 'user' ? (
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
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
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
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
          )}
          <span className="role-text">{message.role === 'user' ? 'You' : 'Assistant'}</span>
        </div>

        {showTimestamp && message.timestamp && (
          <span className="message-timestamp" aria-label={`Sent at ${formatTimestamp(message.timestamp)}`}>
            {formatTimestamp(message.timestamp)}
          </span>
        )}
      </div>

      <div className="message-content">
        {isEditing ? (
          <div className="message-edit">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="edit-textarea"
              rows={5}
              autoFocus
              aria-label="Edit message content"
            />
            <div className="edit-actions">
              <button onClick={handleCancelEdit} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="btn btn-primary"
                disabled={!editedContent.trim()}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.thinking && (
              <details className="thinking-block">
                <summary>Thinking...</summary>
                <div className="thinking-content">
                  {enableMarkdown ? (
                    <MarkdownContent content={message.thinking} />
                  ) : (
                    <pre>{message.thinking}</pre>
                  )}
                </div>
              </details>
            )}

            {message.isStreaming && !message.content.trim() ? (
              <TypingIndicator variant="dots" />
            ) : enableMarkdown ? (
              <MarkdownContent content={message.content} />
            ) : (
              <div className="message-text">{message.content}</div>
            )}

            {message.error && (
              <div className="message-error" role="alert">
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                <span>{message.error}</span>
              </div>
            )}
          </>
        )}
      </div>

      {showModelInfo && message.model && (
        <div className="message-model-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          </svg>
          <span>Model: {message.model}</span>
        </div>
      )}

      <AnimatePresence>
        {showActions && !isEditing && message.timestamp && (
          <MessageActions
            message={message}
            onCopy={handleCopy}
            onDelete={onDelete ? handleDelete : undefined}
            onEdit={onEdit ? handleEdit : undefined}
            onRegenerate={message.role === 'assistant' && onRegenerate ? handleRegenerate : undefined}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Message;
