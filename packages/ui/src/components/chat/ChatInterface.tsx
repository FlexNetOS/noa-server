/**
 * ChatInterface Component
 * Production-grade chat interface with markdown, code highlighting, and real-time streaming
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Message from './Message';
import TypingIndicator from './TypingIndicator';
import type { ChatInterfaceProps } from '../../types/chat';

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage: _onSendMessage,
  onDeleteMessage,
  onEditMessage,
  onCopyMessage,
  onRegenerateMessage,
  isLoading = false,
  className = '',
  showTimestamps = true,
  showModelInfo = false,
  enableMarkdown = true,
  autoScroll = true
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, [autoScroll]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      scrollToBottom('smooth');
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Scroll to bottom on initial render
  useEffect(() => {
    scrollToBottom('auto');
  }, [scrollToBottom]);

  // Handle scroll to bottom button visibility
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    setShowScrollButton(!isNearBottom);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className={`chat-interface ${className}`} role="main" aria-label="Chat interface">
      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="messages-container"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 ? (
          <div className="empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="empty-icon"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h2 className="empty-title">No messages yet</h2>
            <p className="empty-description">Start a conversation by sending a message</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onCopy={onCopyMessage}
                onDelete={onDeleteMessage}
                onEdit={onEditMessage}
                onRegenerate={onRegenerateMessage}
                showTimestamp={showTimestamps}
                showModelInfo={showModelInfo}
                enableMarkdown={enableMarkdown}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Loading indicator */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div
            className="message message-assistant"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="message-header">
              <div className="message-role-badge">
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
                <span className="role-text">Assistant</span>
              </div>
            </div>
            <div className="message-content">
              <TypingIndicator variant="dots" />
            </div>
          </motion.div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            className="scroll-to-bottom-btn"
            onClick={() => scrollToBottom('smooth')}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 15-6 6-6-6" />
              <path d="M12 9v12" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;
