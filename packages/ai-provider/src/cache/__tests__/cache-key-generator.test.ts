/**
 * AI Response Caching - Cache Key Generator Tests
 *
 * Tests for deterministic cache key generation with normalization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheKeyGenerator, createDefaultKeyGenerator } from '../cache-key-generator';
import { Message, ProviderType } from '../../types';

describe('CacheKeyGenerator', () => {
  let generator: CacheKeyGenerator;

  beforeEach(() => {
    generator = createDefaultKeyGenerator();
  });

  const createTestMessage = (content: string): Message[] => [
    { role: 'user', content }
  ];

  describe('Key Generation', () => {
    it('should generate deterministic keys for same inputs', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      const key2 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different prompts', () => {
      const messages1 = createTestMessage('Hello, world!');
      const messages2 = createTestMessage('Goodbye, world!');

      const key1 = generator.generateKey(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      const key2 = generator.generateKey(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different models', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      const key2 = generator.generateKey(
        messages,
        'gpt-4',
        ProviderType.OPENAI
      );

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different providers', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      const key2 = generator.generateKey(
        messages,
        'claude-3-sonnet',
        ProviderType.CLAUDE
      );

      expect(key1).not.toBe(key2);
    });

    it('should generate valid SHA-256 hash keys', () => {
      const messages = createTestMessage('Hello, world!');

      const key = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(generator.validateKey(key)).toBe(true);
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Prompt Normalization', () => {
    it('should normalize whitespace', () => {
      const messages1 = createTestMessage('Hello,   world!');
      const messages2 = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      const key2 = generator.generateKey(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(key1).toBe(key2);
    });

    it('should normalize case when caseSensitive is false', () => {
      const messages1 = createTestMessage('Hello, World!');
      const messages2 = createTestMessage('hello, world!');

      const key1 = generator.generateKey(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      const key2 = generator.generateKey(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(key1).toBe(key2);
    });

    it('should respect case when caseSensitive is true', () => {
      const caseSensitiveGenerator = createDefaultKeyGenerator({
        keyNormalization: {
          normalizeWhitespace: true,
          caseSensitive: true,
          ignorePunctuation: false,
          sortJsonKeys: true
        }
      });

      const messages1 = createTestMessage('Hello, World!');
      const messages2 = createTestMessage('hello, world!');

      const key1 = caseSensitiveGenerator.generateKey(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      const key2 = caseSensitiveGenerator.generateKey(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(key1).not.toBe(key2);
    });

    it('should handle multi-line prompts', () => {
      const messages = createTestMessage('Hello,\nworld!');

      const key = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(generator.validateKey(key)).toBe(true);
    });

    it('should handle multiple messages', () => {
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, world!' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ];

      const key = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(generator.validateKey(key)).toBe(true);
    });
  });

  describe('Parameter Sensitivity', () => {
    it('should include temperature in cache key', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        { temperature: 0.5 }
      );
      const key2 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        { temperature: 0.8 }
      );

      expect(key1).not.toBe(key2);
    });

    it('should include max_tokens in cache key', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        { max_tokens: 100 }
      );
      const key2 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        { max_tokens: 200 }
      );

      expect(key1).not.toBe(key2);
    });

    it('should include top_p in cache key', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        { top_p: 0.9 }
      );
      const key2 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        { top_p: 0.95 }
      );

      expect(key1).not.toBe(key2);
    });

    it('should round parameters for determinism', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        { temperature: 0.5000001 }
      );
      const key2 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        { temperature: 0.5000002 }
      );

      // Should be same after rounding to 2 decimals
      expect(key1).toBe(key2);
    });

    it('should handle missing parameters', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        {}
      );
      const key2 = generator.generateKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(key1).toBe(key2);
    });
  });

  describe('Similarity Key Generation', () => {
    it('should generate similarity keys without parameters', () => {
      const messages = createTestMessage('Hello, world!');

      const key1 = generator.generateSimilarityKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      const key2 = generator.generateSimilarityKey(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(key1).toBe(key2);
      expect(generator.validateKey(key1)).toBe(true);
    });

    it('should extract prompt text for semantic analysis', () => {
      const messages = createTestMessage('Hello, world!');

      const promptText = generator.extractPromptText(messages);

      expect(promptText).toContain('Hello, world!');
      expect(promptText).toContain('user:');
    });
  });

  describe('Key Validation', () => {
    it('should validate valid SHA-256 keys', () => {
      const validKey = 'a'.repeat(64);
      expect(generator.validateKey(validKey)).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(generator.validateKey('invalid')).toBe(false);
      expect(generator.validateKey('a'.repeat(63))).toBe(false);
      expect(generator.validateKey('a'.repeat(65))).toBe(false);
      expect(generator.validateKey('x'.repeat(64))).toBe(false);
    });
  });
});
