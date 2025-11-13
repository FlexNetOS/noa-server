/**
 * Chat History Database - Dexie.js Implementation
 *
 * Persistent chat session manager using IndexedDB via Dexie.js
 * Features:
 * - CRUD operations for conversations and messages
 * - Full-text search with highlighting
 * - Export to JSON/Markdown
 * - Pagination support
 * - Migration system
 * - Performance optimizations
 */

import Dexie, { Table } from 'dexie';
import type {
  Conversation,
  Message,
  SearchOptions,
  SearchResult,
  SearchHighlight,
  PaginationOptions,
  PaginatedResult,
  DatabaseStats,
  DatabaseHealth,
  MigrationInfo,
} from '../types/chatHistory.js';

/**
 * Chat History Database Class
 * Extends Dexie for IndexedDB operations
 */
export class ChatHistoryDB extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, string>;
  migrations!: Table<MigrationInfo, number>;

  constructor() {
    super('ChatHistoryDB');

    // Version 1: Initial schema
    this.version(1).stores({
      conversations: 'id, created_at, updated_at, title, model, *tags',
      messages: 'id, conversation_id, timestamp, role, [conversation_id+timestamp]',
      migrations: 'version, appliedAt',
    });

    // Version 2: Add full-text search indexes
    this.version(2).stores({
      conversations: 'id, created_at, updated_at, title, model, *tags',
      messages: 'id, conversation_id, timestamp, role, content, [conversation_id+timestamp]',
      migrations: 'version, appliedAt',
    }).upgrade(async (trans) => {
      // Record migration
      await trans.table('migrations').add({
        version: 2,
        description: 'Added full-text search indexes',
        appliedAt: Date.now(),
      });
    });

    // Version 3: Add metadata indexes for advanced filtering
    this.version(3).stores({
      conversations: 'id, created_at, updated_at, title, model, *tags',
      messages: 'id, conversation_id, timestamp, role, content, [conversation_id+timestamp], [conversation_id+role]',
      migrations: 'version, appliedAt',
    }).upgrade(async (trans) => {
      await trans.table('migrations').add({
        version: 3,
        description: 'Added metadata indexes for filtering',
        appliedAt: Date.now(),
      });
    });
  }

  /**
   * Generate unique ID for entities
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    title: string,
    options?: {
      model?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<Conversation> {
    const now = Date.now();
    const conversation: Conversation = {
      id: this.generateId(),
      title: title || 'New Conversation',
      created_at: now,
      updated_at: now,
      model: options?.model,
      tags: options?.tags,
      metadata: options?.metadata,
    };

    await this.conversations.add(conversation);
    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | undefined> {
    return await this.conversations.get(id);
  }

  /**
   * Update conversation
   */
  async updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, 'id' | 'created_at'>>
  ): Promise<void> {
    await this.conversations.update(id, {
      ...updates,
      updated_at: Date.now(),
    });
  }

  /**
   * Delete conversation and all its messages (cascade)
   */
  async deleteConversation(id: string): Promise<void> {
    await this.transaction('rw', [this.conversations, this.messages], async () => {
      // Delete all messages first
      await this.messages.where('conversation_id').equals(id).delete();
      // Then delete conversation
      await this.conversations.delete(id);
    });
  }

  /**
   * Get all conversations with pagination
   */
  async getConversations(
    options?: PaginationOptions
  ): Promise<PaginatedResult<Conversation>> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'updated_at',
      sortDirection = 'desc',
    } = options || {};

    let query = this.conversations.orderBy(sortBy);

    if (sortDirection === 'desc') {
      query = query.reverse();
    }

    const total = await query.count();
    const offset = (page - 1) * pageSize;
    const items = await query.offset(offset).limit(pageSize).toArray();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    role: Message['role'],
    content: string,
    metadata?: Message['metadata']
  ): Promise<Message> {
    const message: Message = {
      id: this.generateId(),
      conversation_id: conversationId,
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };

    await this.transaction('rw', [this.messages, this.conversations], async () => {
      await this.messages.add(message);

      // Update conversation's updated_at timestamp
      await this.conversations.update(conversationId, {
        updated_at: Date.now(),
      });

      // Auto-generate title from first user message if title is default
      const conversation = await this.conversations.get(conversationId);
      if (conversation &&
          (conversation.title === 'New Conversation' || !conversation.title) &&
          role === 'user') {
        const title = this.generateTitleFromMessage(content);
        await this.conversations.update(conversationId, { title });
      }
    });

    return message;
  }

  /**
   * Generate conversation title from first message
   */
  private generateTitleFromMessage(content: string): string {
    // Take first 50 characters or first sentence
    const firstSentence = content.split(/[.!?]/)[0];
    const title = firstSentence.substring(0, 50).trim();
    return title || 'New Conversation';
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Message>> {
    const {
      page = 1,
      pageSize = 50,
      sortDirection = 'asc',
    } = options || {};

    let query = this.messages
      .where('conversation_id')
      .equals(conversationId)
      .sortBy('timestamp');

    if (sortDirection === 'desc') {
      query = query.then(msgs => msgs.reverse());
    }

    const allMessages = await query;
    const total = allMessages.length;
    const offset = (page - 1) * pageSize;
    const items = allMessages.slice(offset, offset + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrevious: page > 1,
    };
  }

  /**
   * Search across conversations and messages
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const {
      query,
      limit = 20,
      caseSensitive = false,
      useRegex = false,
      conversationIds,
      dateRange,
      model,
      tags,
    } = options;

    const results: SearchResult[] = [];
    const searchPattern = useRegex
      ? new RegExp(query, caseSensitive ? '' : 'i')
      : caseSensitive
      ? query
      : query.toLowerCase();

    // Search in messages
    let messagesQuery = this.messages.toCollection();

    // Apply conversation filter if specified
    if (conversationIds && conversationIds.length > 0) {
      messagesQuery = this.messages.where('conversation_id').anyOf(conversationIds);
    }

    const messages = await messagesQuery.toArray();
    const matchingMessages = messages.filter((msg) => {
      const content = caseSensitive ? msg.content : msg.content.toLowerCase();
      if (useRegex) {
        return searchPattern instanceof RegExp && searchPattern.test(content);
      }
      return content.includes(searchPattern as string);
    });

    // Group by conversation
    const conversationMatches = new Map<string, Message[]>();
    for (const msg of matchingMessages) {
      if (!conversationMatches.has(msg.conversation_id)) {
        conversationMatches.set(msg.conversation_id, []);
      }
      conversationMatches.get(msg.conversation_id)!.push(msg);
    }

    // Build results
    for (const [convId, msgs] of conversationMatches.entries()) {
      const conversation = await this.conversations.get(convId);
      if (!conversation) continue;

      // Apply filters
      if (dateRange) {
        if (conversation.created_at < dateRange.start ||
            conversation.created_at > dateRange.end) {
          continue;
        }
      }

      if (model && conversation.model !== model) {
        continue;
      }

      if (tags && tags.length > 0) {
        if (!conversation.tags ||
            !tags.some(tag => conversation.tags!.includes(tag))) {
          continue;
        }
      }

      // Generate highlights
      const highlights: SearchHighlight[] = [];
      for (const msg of msgs) {
        const content = msg.content;
        const searchStr = typeof searchPattern === 'string'
          ? searchPattern
          : query;

        const index = caseSensitive
          ? content.indexOf(searchStr)
          : content.toLowerCase().indexOf(searchStr.toLowerCase());

        if (index !== -1) {
          const start = Math.max(0, index - 40);
          const end = Math.min(content.length, index + searchStr.length + 40);
          const snippet = content.substring(start, end);

          highlights.push({
            message_id: msg.id,
            snippet: (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : ''),
            start: index,
            end: index + searchStr.length,
          });
        }
      }

      results.push({
        conversation,
        messages: msgs,
        score: msgs.length / matchingMessages.length,
        highlights,
      });
    }

    // Sort by score and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
    const [conversations, messages] = await Promise.all([
      this.conversations.toArray(),
      this.messages.count(),
    ]);

    const conversationCount = conversations.length;
    const messageCount = messages;

    // Calculate storage size (approximate)
    const totalSize = await this.calculateSize();

    // Find oldest and newest
    const sorted = [...conversations].sort((a, b) => a.created_at - b.created_at);
    const oldestConversation = sorted[0]?.created_at;
    const newestConversation = sorted[sorted.length - 1]?.created_at;

    // Most used model
    const modelCounts = new Map<string, number>();
    for (const conv of conversations) {
      if (conv.model) {
        modelCounts.set(conv.model, (modelCounts.get(conv.model) || 0) + 1);
      }
    }
    const mostUsedModel = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      conversationCount,
      messageCount,
      totalSize,
      avgMessagesPerConversation: conversationCount > 0
        ? messageCount / conversationCount
        : 0,
      oldestConversation,
      newestConversation,
      mostUsedModel,
    };
  }

  /**
   * Calculate approximate database size
   */
  private async calculateSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  }

  /**
   * Get database health status
   */
  async getHealth(): Promise<DatabaseHealth> {
    const issues: string[] = [];

    try {
      const currentVersion = this.verno;
      await this.migrations.toArray();
      const totalSize = await this.calculateSize();

      // Check for orphaned messages
      const messages = await this.messages.toArray();
      const conversationIds = new Set(
        (await this.conversations.toArray()).map(c => c.id)
      );

      const orphanedMessages = messages.filter(
        m => !conversationIds.has(m.conversation_id)
      );

      if (orphanedMessages.length > 0) {
        issues.push(`Found ${orphanedMessages.length} orphaned messages`);
      }

      return {
        healthy: issues.length === 0,
        version: currentVersion,
        pendingMigrations: 0,
        size: totalSize,
        issues,
      };
    } catch (error) {
      issues.push(`Health check failed: ${error}`);
      return {
        healthy: false,
        version: this.verno,
        pendingMigrations: 0,
        size: 0,
        issues,
      };
    }
  }

  /**
   * Clean up orphaned messages
   */
  async cleanupOrphans(): Promise<number> {
    const messages = await this.messages.toArray();
    const conversationIds = new Set(
      (await this.conversations.toArray()).map(c => c.id)
    );

    const orphanedIds = messages
      .filter(m => !conversationIds.has(m.conversation_id))
      .map(m => m.id);

    if (orphanedIds.length > 0) {
      await this.messages.bulkDelete(orphanedIds);
    }

    return orphanedIds.length;
  }

  /**
   * Clear all data (dangerous!)
   */
  async clearAll(): Promise<void> {
    await this.transaction('rw', [this.conversations, this.messages], async () => {
      await this.conversations.clear();
      await this.messages.clear();
    });
  }
}

// Singleton instance
export const chatHistoryDB = new ChatHistoryDB();
