import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { StreamMessage } from '../StreamMessage';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClaudeStreamMessage } from '../AgentExecution';

interface MessageListProps {
  messages: ClaudeStreamMessage[];
  projectPath: string;
  isStreaming: boolean;
  onLinkDetected?: (url: string) => void;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = React.memo(
  ({ messages, projectPath, isStreaming, onLinkDetected, className }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const userHasScrolledRef = useRef(false);

    // Virtual scrolling setup
    const virtualizer = useVirtualizer({
      count: messages.length,
      getScrollElement: () => scrollContainerRef.current,
      estimateSize: () => 100, // Estimated height of each message
      overscan: 5,
    });

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
      if (shouldAutoScrollRef.current && scrollContainerRef.current) {
        const scrollElement = scrollContainerRef.current;
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }, [messages]);

    // Handle scroll events to detect user scrolling
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const scrollElement = scrollContainerRef.current;
      const isAtBottom =
        Math.abs(
          scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight
        ) < 50;

      if (!isAtBottom) {
        userHasScrolledRef.current = true;
        shouldAutoScrollRef.current = false;
      } else if (userHasScrolledRef.current) {
        shouldAutoScrollRef.current = true;
        userHasScrolledRef.current = false;
      }
    };

    // Reset auto-scroll when streaming stops
    useEffect(() => {
      if (!isStreaming) {
        shouldAutoScrollRef.current = true;
        userHasScrolledRef.current = false;
      }
    }, [isStreaming]);

    if (messages.length === 0) {
      return (
        <div className={cn('flex flex-1 items-center justify-center', className)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md space-y-4 text-center"
          >
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <Terminal className="text-primary h-8 w-8" />
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold">Ready to start coding</h3>
              <p className="text-muted-foreground text-sm">
                {projectPath
                  ? 'Enter a prompt below to begin your Claude Code session'
                  : 'Select a project folder to begin'}
              </p>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn('flex-1 overflow-y-auto scroll-smooth', className)}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <AnimatePresence mode="popLayout">
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const message = messages[virtualItem.index];
              const key = `msg-${virtualItem.index}-${message.type}`;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="px-4 py-2">
                    <StreamMessage
                      message={message}
                      streamMessages={messages}
                      onLinkDetected={onLinkDetected}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Streaming indicator */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="from-background sticky right-0 bottom-0 left-0 bg-gradient-to-t to-transparent p-2"
          >
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
              <span>Claude is thinking...</span>
            </div>
          </motion.div>
        )}
      </div>
    );
  }
);
