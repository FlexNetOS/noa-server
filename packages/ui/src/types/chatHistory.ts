/**
 * Chat History Type Definitions
 *
 * Comprehensive type system for chat history management
 * Supports conversations, messages, search, and export functionality
 */

/**
 * Conversation entity representing a chat session
 */
export interface Conversation {
  /** Unique identifier (CUID or UUID) */
  id: string;

  /** Human-readable conversation title */
  title: string;

  /** Unix timestamp (milliseconds) when created */
  created_at: number;

  /** Unix timestamp (milliseconds) when last updated */
  updated_at: number;

  /** Optional model identifier (e.g., "claude-3-opus-20240229") */
  model?: string;

  /** Optional tags for categorization */
  tags?: string[];

  /** Optional metadata for extensibility */
  metadata?: Record<string, any>;
}

/**
 * Message entity representing a single message in a conversation
 */
export interface Message {
  /** Unique identifier (CUID or UUID) */
  id: string;

  /** Foreign key to conversation */
  conversation_id: string;

  /** Message role (user, assistant, system) */
  role: 'user' | 'assistant' | 'system';

  /** Message content (text or structured data) */
  content: string;

  /** Unix timestamp (milliseconds) when created */
  timestamp: number;

  /** Optional metadata (tokens, latency, etc.) */
  metadata?: MessageMetadata;
}

/**
 * Message metadata for tracking performance and context
 */
export interface MessageMetadata {
  /** Token count for this message */
  tokens?: number;

  /** Response latency in milliseconds */
  latency?: number;

  /** Model used for this specific message */
  model?: string;

  /** Temperature setting */
  temperature?: number;

  /** Whether message was cached */
  cached?: boolean;

  /** Error information if message failed */
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
  };

  /** Extensible metadata */
  [key: string]: any;
}

/**
 * Search result with highlighted matches
 */
export interface SearchResult {
  /** Matching conversation */
  conversation: Conversation;

  /** Matching messages */
  messages: Message[];

  /** Relevance score (0-1) */
  score: number;

  /** Highlighted snippets */
  highlights: SearchHighlight[];
}

/**
 * Search highlight for result presentation
 */
export interface SearchHighlight {
  /** Message ID containing the match */
  message_id: string;

  /** Text snippet with match */
  snippet: string;

  /** Start position of match in content */
  start: number;

  /** End position of match in content */
  end: number;
}

/**
 * Search query options
 */
export interface SearchOptions {
  /** Search query string */
  query: string;

  /** Limit number of results */
  limit?: number;

  /** Case-sensitive search */
  caseSensitive?: boolean;

  /** Use regex pattern */
  useRegex?: boolean;

  /** Filter by conversation IDs */
  conversationIds?: string[];

  /** Filter by date range */
  dateRange?: {
    start: number;
    end: number;
  };

  /** Filter by model */
  model?: string;

  /** Filter by tags */
  tags?: string[];
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'markdown' | 'text' | 'csv';

/**
 * Export options for conversations
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;

  /** Include metadata in export */
  includeMetadata?: boolean;

  /** Include system messages */
  includeSystemMessages?: boolean;

  /** Pretty-print JSON */
  prettyPrint?: boolean;

  /** Markdown template options */
  markdownOptions?: {
    includeTimestamps?: boolean;
    includeTokenCounts?: boolean;
    includeModelInfo?: boolean;
  };
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Page number (1-indexed) */
  page: number;

  /** Items per page */
  pageSize: number;

  /** Sort field */
  sortBy?: 'created_at' | 'updated_at' | 'title';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated result set
 */
export interface PaginatedResult<T> {
  /** Items in current page */
  items: T[];

  /** Total number of items */
  total: number;

  /** Current page number */
  page: number;

  /** Items per page */
  pageSize: number;

  /** Total number of pages */
  totalPages: number;

  /** Whether there's a next page */
  hasNext: boolean;

  /** Whether there's a previous page */
  hasPrevious: boolean;
}

/**
 * Database statistics
 */
export interface DatabaseStats {
  /** Total number of conversations */
  conversationCount: number;

  /** Total number of messages */
  messageCount: number;

  /** Total database size in bytes */
  totalSize: number;

  /** Average messages per conversation */
  avgMessagesPerConversation: number;

  /** Oldest conversation timestamp */
  oldestConversation?: number;

  /** Newest conversation timestamp */
  newestConversation?: number;

  /** Most active model */
  mostUsedModel?: string;
}

/**
 * Migration information
 */
export interface MigrationInfo {
  /** Migration version */
  version: number;

  /** Migration description */
  description: string;

  /** Timestamp when applied */
  appliedAt: number;
}

/**
 * Database health status
 */
export interface DatabaseHealth {
  /** Whether database is healthy */
  healthy: boolean;

  /** Current schema version */
  version: number;

  /** Any pending migrations */
  pendingMigrations: number;

  /** Database size in bytes */
  size: number;

  /** Last backup timestamp */
  lastBackup?: number;

  /** Any errors or warnings */
  issues: string[];
}
