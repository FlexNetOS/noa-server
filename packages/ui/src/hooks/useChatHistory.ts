/**
 * React Hook for Chat History
 *
 * Zustand-powered React integration for chat history management
 * Provides reactive state management for conversations and messages
 */

import { create } from 'zustand';
import { chatHistoryDB } from '../stores/chatHistory.js';
import type {
  Conversation,
  Message,
  SearchOptions,
  SearchResult,
  PaginationOptions,
  PaginatedResult,
  DatabaseStats,
} from '../types/chatHistory.js';

/**
 * Chat History Store State
 */
interface ChatHistoryState {
  // Current state
  currentConversation: Conversation | null;
  conversations: Conversation[];
  messages: Message[];
  searchResults: SearchResult[];
  stats: DatabaseStats | null;

  // Loading states
  loading: boolean;
  searchLoading: boolean;

  // Error state
  error: string | null;

  // Actions - Conversations
  createConversation: (title: string, options?: {
    model?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }) => Promise<Conversation>;

  loadConversation: (id: string) => Promise<void>;

  loadConversations: (options?: PaginationOptions) => Promise<PaginatedResult<Conversation>>;

  updateConversation: (id: string, updates: Partial<Omit<Conversation, 'id' | 'created_at'>>) => Promise<void>;

  deleteConversation: (id: string) => Promise<void>;

  // Actions - Messages
  addMessage: (
    conversationId: string,
    role: Message['role'],
    content: string,
    metadata?: Message['metadata']
  ) => Promise<Message>;

  loadMessages: (conversationId: string, options?: PaginationOptions) => Promise<PaginatedResult<Message>>;

  // Actions - Search
  search: (options: SearchOptions) => Promise<SearchResult[]>;

  clearSearch: () => void;

  // Actions - Stats
  loadStats: () => Promise<DatabaseStats>;

  // Actions - Utility
  setCurrentConversation: (conversation: Conversation | null) => void;

  clearError: () => void;

  cleanup: () => Promise<void>;
}

/**
 * Chat History Zustand Store
 */
export const useChatHistory = create<ChatHistoryState>((set, get) => ({
  // Initial state
  currentConversation: null,
  conversations: [],
  messages: [],
  searchResults: [],
  stats: null,
  loading: false,
  searchLoading: false,
  error: null,

  // Create conversation
  createConversation: async (title, options) => {
    try {
      set({ loading: true, error: null });
      const conversation = await chatHistoryDB.createConversation(title, options);

      // Add to conversations list
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversation: conversation,
        loading: false,
      }));

      return conversation;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create conversation';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  // Load single conversation
  loadConversation: async (id) => {
    try {
      set({ loading: true, error: null });
      const conversation = await chatHistoryDB.getConversation(id);

      if (!conversation) {
        throw new Error(`Conversation ${id} not found`);
      }

      // Load messages for this conversation
      const messagesResult = await chatHistoryDB.getMessages(id);

      set({
        currentConversation: conversation,
        messages: messagesResult.items,
        loading: false,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load conversation';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  // Load conversations list
  loadConversations: async (options) => {
    try {
      set({ loading: true, error: null });
      const result = await chatHistoryDB.getConversations(options);

      set({
        conversations: result.items,
        loading: false,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load conversations';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  // Update conversation
  updateConversation: async (id, updates) => {
    try {
      set({ loading: true, error: null });
      await chatHistoryDB.updateConversation(id, updates);

      // Update in state
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, ...updates, updated_at: Date.now() } : c
        ),
        currentConversation:
          state.currentConversation?.id === id
            ? { ...state.currentConversation, ...updates, updated_at: Date.now() }
            : state.currentConversation,
        loading: false,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update conversation';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  // Delete conversation
  deleteConversation: async (id) => {
    try {
      set({ loading: true, error: null });
      await chatHistoryDB.deleteConversation(id);

      // Remove from state
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        currentConversation:
          state.currentConversation?.id === id ? null : state.currentConversation,
        messages: state.currentConversation?.id === id ? [] : state.messages,
        loading: false,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete conversation';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  // Add message
  addMessage: async (conversationId, role, content, metadata) => {
    try {
      const message = await chatHistoryDB.addMessage(conversationId, role, content, metadata);

      // Add to messages if this is the current conversation
      const state = get();
      if (state.currentConversation?.id === conversationId) {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      }

      // Update conversation's updated_at in list
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, updated_at: Date.now() } : c
        ),
      }));

      return message;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add message';
      set({ error: errorMsg });
      throw error;
    }
  },

  // Load messages
  loadMessages: async (conversationId, options) => {
    try {
      set({ loading: true, error: null });
      const result = await chatHistoryDB.getMessages(conversationId, options);

      set({
        messages: result.items,
        loading: false,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load messages';
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },

  // Search
  search: async (options) => {
    try {
      set({ searchLoading: true, error: null });
      const results = await chatHistoryDB.search(options);

      set({
        searchResults: results,
        searchLoading: false,
      });

      return results;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Search failed';
      set({ error: errorMsg, searchLoading: false });
      throw error;
    }
  },

  // Clear search
  clearSearch: () => {
    set({ searchResults: [] });
  },

  // Load stats
  loadStats: async () => {
    try {
      const stats = await chatHistoryDB.getStats();
      set({ stats });
      return stats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load stats';
      set({ error: errorMsg });
      throw error;
    }
  },

  // Set current conversation
  setCurrentConversation: (conversation) => {
    set({ currentConversation: conversation, messages: [] });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Cleanup
  cleanup: async () => {
    try {
      const deleted = await chatHistoryDB.cleanupOrphans();
      console.log(`Cleaned up ${deleted} orphaned messages`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  },
}));
