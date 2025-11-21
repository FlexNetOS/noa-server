/**
 * Chat UI Type Definitions
 * Comprehensive types for the chat interface components
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  thinking?: string;
  timestamp?: number;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage extends Message {
  isStreaming?: boolean;
  error?: string;
  parentId?: string | null;
  siblings?: string[];
}

export interface CodeBlock {
  language: string;
  code: string;
  id: string;
}

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage?: (content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onCopyMessage?: (message: ChatMessage) => void;
  onRegenerateMessage?: (messageId: string) => void;
  isLoading?: boolean;
  className?: string;
  showTimestamps?: boolean;
  showModelInfo?: boolean;
  enableMarkdown?: boolean;
  autoScroll?: boolean;
}

export interface MessageProps {
  message: ChatMessage;
  onCopy?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string) => void;
  showTimestamp?: boolean;
  showModelInfo?: boolean;
  enableMarkdown?: boolean;
  className?: string;
}

export interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  className?: string;
}

export interface TypingIndicatorProps {
  className?: string;
  variant?: 'dots' | 'pulse' | 'wave';
}

export interface MessageActionsProps {
  message: ChatMessage;
  onCopy?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  className?: string;
}
