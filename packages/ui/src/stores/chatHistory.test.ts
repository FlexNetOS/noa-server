/**
 * Chat History Database Tests
 *
 * Comprehensive test suite for Dexie.js chat history manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatHistoryDB } from './chatHistory.js';

describe('ChatHistoryDB', () => {
  let db: ChatHistoryDB;

  beforeEach(async () => {
    db = new ChatHistoryDB();
    await db.open();
    await db.clearAll();
  });

  afterEach(async () => {
    await db.clearAll();
    await db.close();
  });

  describe('Conversation Management', () => {
    it('should create a conversation', async () => {
      const conv = await db.createConversation('Test Chat', {
        model: 'claude-3-opus-20240229',
        tags: ['test'],
      });

      expect(conv.id).toBeDefined();
      expect(conv.title).toBe('Test Chat');
      expect(conv.model).toBe('claude-3-opus-20240229');
      expect(conv.tags).toEqual(['test']);
      expect(conv.created_at).toBeDefined();
      expect(conv.updated_at).toBeDefined();
    });

    it('should get conversation by ID', async () => {
      const created = await db.createConversation('Test');
      const fetched = await db.getConversation(created.id);

      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(created.id);
      expect(fetched?.title).toBe('Test');
    });

    it('should update conversation', async () => {
      const conv = await db.createConversation('Old Title');
      await db.updateConversation(conv.id, {
        title: 'New Title',
        tags: ['updated'],
      });

      const updated = await db.getConversation(conv.id);
      expect(updated?.title).toBe('New Title');
      expect(updated?.tags).toEqual(['updated']);
      expect(updated?.updated_at).toBeGreaterThan(conv.updated_at);
    });

    it('should delete conversation with cascade', async () => {
      const conv = await db.createConversation('Test');
      await db.addMessage(conv.id, 'user', 'Hello');
      await db.addMessage(conv.id, 'assistant', 'Hi there');

      const messagesBefore = await db.getMessages(conv.id);
      expect(messagesBefore.total).toBe(2);

      await db.deleteConversation(conv.id);

      const deleted = await db.getConversation(conv.id);
      expect(deleted).toBeUndefined();

      const messagesAfter = await db.getMessages(conv.id);
      expect(messagesAfter.total).toBe(0);
    });

    it('should get paginated conversations', async () => {
      // Create 25 conversations
      for (let i = 0; i < 25; i++) {
        await db.createConversation(`Chat ${i}`);
      }

      const page1 = await db.getConversations({
        page: 1,
        pageSize: 10,
        sortBy: 'created_at',
        sortDirection: 'desc',
      });

      expect(page1.items.length).toBe(10);
      expect(page1.total).toBe(25);
      expect(page1.totalPages).toBe(3);
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrevious).toBe(false);

      const page2 = await db.getConversations({
        page: 2,
        pageSize: 10,
      });

      expect(page2.items.length).toBe(10);
      expect(page2.hasNext).toBe(true);
      expect(page2.hasPrevious).toBe(true);
    });
  });

  describe('Message Management', () => {
    it('should add message to conversation', async () => {
      const conv = await db.createConversation('Test');
      const msg = await db.addMessage(
        conv.id,
        'user',
        'Hello, world!',
        { tokens: 5 }
      );

      expect(msg.id).toBeDefined();
      expect(msg.conversation_id).toBe(conv.id);
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Hello, world!');
      expect(msg.metadata?.tokens).toBe(5);
    });

    it('should auto-generate title from first user message', async () => {
      const conv = await db.createConversation('New Conversation');
      await db.addMessage(
        conv.id,
        'user',
        'This is the first message that should become the title'
      );

      const updated = await db.getConversation(conv.id);
      expect(updated?.title).toBe('This is the first message that should become the');
    });

    it('should get paginated messages', async () => {
      const conv = await db.createConversation('Test');

      // Add 100 messages
      for (let i = 0; i < 100; i++) {
        await db.addMessage(conv.id, 'user', `Message ${i}`);
      }

      const page1 = await db.getMessages(conv.id, {
        page: 1,
        pageSize: 20,
        sortDirection: 'asc',
      });

      expect(page1.items.length).toBe(20);
      expect(page1.total).toBe(100);
      expect(page1.items[0].content).toBe('Message 0');
    });

    it('should update conversation timestamp when adding message', async () => {
      const conv = await db.createConversation('Test');
      const originalTime = conv.updated_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await db.addMessage(conv.id, 'user', 'New message');

      const updated = await db.getConversation(conv.id);
      expect(updated?.updated_at).toBeGreaterThan(originalTime);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Create test data
      const conv1 = await db.createConversation('AI Discussion', {
        model: 'claude-3-opus-20240229',
        tags: ['tech', 'ai'],
      });

      await db.addMessage(conv1.id, 'user', 'What is machine learning?');
      await db.addMessage(conv1.id, 'assistant', 'Machine learning is a subset of AI...');

      const conv2 = await db.createConversation('Cooking Tips');
      await db.addMessage(conv2.id, 'user', 'How do I make pasta?');
      await db.addMessage(conv2.id, 'assistant', 'Here are some tips for making pasta...');
    });

    it('should search messages by query', async () => {
      const results = await db.search({
        query: 'machine learning',
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].conversation.title).toBe('AI Discussion');
      expect(results[0].messages.length).toBeGreaterThan(0);
    });

    it('should search case-insensitively by default', async () => {
      const results = await db.search({
        query: 'MACHINE LEARNING',
        caseSensitive: false,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by model', async () => {
      const results = await db.search({
        query: 'machine',
        model: 'claude-3-opus-20240229',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].conversation.model).toBe('claude-3-opus-20240229');
    });

    it('should filter by tags', async () => {
      const results = await db.search({
        query: 'machine',
        tags: ['ai'],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].conversation.tags).toContain('ai');
    });

    it('should generate search highlights', async () => {
      const results = await db.search({
        query: 'machine learning',
      });

      expect(results[0].highlights.length).toBeGreaterThan(0);
      const highlight = results[0].highlights[0];
      expect(highlight.snippet).toContain('machine learning');
      expect(highlight.message_id).toBeDefined();
    });

    it('should filter by date range', async () => {
      const now = Date.now();
      const yesterday = now - 24 * 60 * 60 * 1000;

      const results = await db.search({
        query: 'machine',
        dateRange: {
          start: yesterday,
          end: now + 1000,
        },
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should get database stats', async () => {
      await db.createConversation('Chat 1');
      const conv2 = await db.createConversation('Chat 2', {
        model: 'claude-3-opus-20240229',
      });

      await db.addMessage(conv2.id, 'user', 'Hello');
      await db.addMessage(conv2.id, 'assistant', 'Hi');

      const stats = await db.getStats();

      expect(stats.conversationCount).toBe(2);
      expect(stats.messageCount).toBe(2);
      expect(stats.avgMessagesPerConversation).toBe(1);
      expect(stats.mostUsedModel).toBe('claude-3-opus-20240229');
    });
  });

  describe('Database Health', () => {
    it('should check database health', async () => {
      const health = await db.getHealth();

      expect(health.healthy).toBe(true);
      expect(health.version).toBeGreaterThan(0);
      expect(health.issues.length).toBe(0);
    });

    it('should detect orphaned messages', async () => {
      const conv = await db.createConversation('Test');
      await db.addMessage(conv.id, 'user', 'Message');

      // Manually delete conversation without cascade
      await db.conversations.delete(conv.id);

      const health = await db.getHealth();
      expect(health.healthy).toBe(false);
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues[0]).toContain('orphaned');
    });

    it('should cleanup orphaned messages', async () => {
      const conv = await db.createConversation('Test');
      await db.addMessage(conv.id, 'user', 'Message 1');
      await db.addMessage(conv.id, 'user', 'Message 2');

      // Manually delete conversation
      await db.conversations.delete(conv.id);

      const deleted = await db.cleanupOrphans();
      expect(deleted).toBe(2);

      const health = await db.getHealth();
      expect(health.healthy).toBe(true);
    });
  });
});
