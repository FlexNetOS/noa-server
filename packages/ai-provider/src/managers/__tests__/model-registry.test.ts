import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModelRegistry, ModelStatus } from '../model-registry';
import { ModelInfo, ProviderType, ModelCapability } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

describe('ModelRegistry', () => {
  let registry: ModelRegistry;
  const testPersistencePath = './test-data/model-registry.json';

  const mockModel: ModelInfo = {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: ProviderType.OPENAI,
    contextWindow: 8192,
    maxTokens: 4096,
    capabilities: [
      ModelCapability.CHAT_COMPLETION,
      ModelCapability.FUNCTION_CALLING
    ]
  };

  beforeEach(() => {
    registry = new ModelRegistry({
      persistencePath: testPersistencePath,
      autoSave: false
    });
  });

  afterEach(() => {
    registry.destroy();
    if (fs.existsSync(testPersistencePath)) {
      fs.unlinkSync(testPersistencePath);
    }
    const dir = path.dirname(testPersistencePath);
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir, { recursive: true });
    }
  });

  describe('registerModel', () => {
    it('should register a model and return a key', () => {
      const key = registry.registerModel(mockModel);
      expect(key).toBe('openai:gpt-4');
    });

    it('should set initial status to AVAILABLE', () => {
      const key = registry.registerModel(mockModel);
      const model = registry.getModel(key);
      expect(model?.status).toBe(ModelStatus.AVAILABLE);
    });

    it('should initialize access tracking', () => {
      const key = registry.registerModel(mockModel);
      const model = registry.getModel(key);
      expect(model?.accessCount).toBe(0);
      expect(model?.registeredAt).toBeInstanceOf(Date);
      expect(model?.lastAccessed).toBeInstanceOf(Date);
    });
  });

  describe('getModel', () => {
    it('should retrieve a registered model', () => {
      const key = registry.registerModel(mockModel);
      const retrieved = registry.getModel(key);
      expect(retrieved?.id).toBe(mockModel.id);
      expect(retrieved?.name).toBe(mockModel.name);
    });

    it('should increment access count on retrieval', () => {
      const key = registry.registerModel(mockModel);
      registry.getModel(key);
      registry.getModel(key);
      const model = registry.getModel(key);
      expect(model?.accessCount).toBe(3); // Including this call
    });

    it('should return undefined for non-existent model', () => {
      const model = registry.getModel('non-existent:model');
      expect(model).toBeUndefined();
    });
  });

  describe('searchModels', () => {
    beforeEach(() => {
      registry.registerModel(mockModel);
      registry.registerModel({
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: ProviderType.OPENAI,
        contextWindow: 4096,
        maxTokens: 4096,
        capabilities: [ModelCapability.CHAT_COMPLETION]
      });
      registry.registerModel({
        id: 'claude-3',
        name: 'Claude 3',
        provider: ProviderType.CLAUDE,
        contextWindow: 200000,
        maxTokens: 4096,
        capabilities: [
          ModelCapability.CHAT_COMPLETION,
          ModelCapability.VISION
        ]
      });
    });

    it('should filter by provider', () => {
      const models = registry.searchModels({
        provider: ProviderType.OPENAI
      });
      expect(models).toHaveLength(2);
      expect(models.every(m => m.provider === ProviderType.OPENAI)).toBe(true);
    });

    it('should filter by capability', () => {
      const models = registry.searchModels({
        capability: ModelCapability.FUNCTION_CALLING
      });
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('gpt-4');
    });

    it('should filter by context window', () => {
      const models = registry.searchModels({
        minContextWindow: 8000
      });
      expect(models).toHaveLength(2); // gpt-4 and claude-3
    });

    it('should filter by name pattern', () => {
      const models = registry.searchModels({
        namePattern: 'gpt'
      });
      expect(models).toHaveLength(2);
    });

    it('should apply multiple filters', () => {
      const models = registry.searchModels({
        provider: ProviderType.OPENAI,
        capability: ModelCapability.FUNCTION_CALLING,
        minContextWindow: 8000
      });
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('gpt-4');
    });
  });

  describe('updateModel', () => {
    it('should update model metadata', () => {
      const key = registry.registerModel(mockModel);
      registry.updateModel(key, {
        metadata: { custom: 'data' }
      });
      const model = registry.getModel(key);
      expect(model?.metadata?.custom).toBe('data');
    });

    it('should throw error for non-existent model', () => {
      expect(() => {
        registry.updateModel('non-existent:model', {});
      }).toThrow();
    });
  });

  describe('updateModelStatus', () => {
    it('should update model status', () => {
      const key = registry.registerModel(mockModel);
      registry.updateModelStatus(key, ModelStatus.LOADED);
      const model = registry.getModel(key);
      expect(model?.status).toBe(ModelStatus.LOADED);
    });
  });

  describe('updatePerformanceMetrics', () => {
    it('should update performance metrics', () => {
      const key = registry.registerModel(mockModel);
      const metrics = {
        averageLatency: 250,
        tokensPerSecond: 45,
        totalInferences: 100,
        successRate: 0.99
      };
      registry.updatePerformanceMetrics(key, metrics);
      const model = registry.getModel(key);
      expect(model?.performanceMetrics?.averageLatency).toBe(250);
      expect(model?.performanceMetrics?.tokensPerSecond).toBe(45);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      registry.registerModel(mockModel);
      registry.registerModel({
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: ProviderType.OPENAI,
        contextWindow: 4096,
        maxTokens: 4096,
        capabilities: [ModelCapability.CHAT_COMPLETION]
      });
    });

    it('should return accurate statistics', () => {
      const stats = registry.getStatistics();
      expect(stats.totalModels).toBe(2);
      expect(stats.providerCounts[ProviderType.OPENAI]).toBe(2);
      expect(stats.capabilityCounts[ModelCapability.CHAT_COMPLETION]).toBe(2);
      expect(stats.capabilityCounts[ModelCapability.FUNCTION_CALLING]).toBe(1);
    });

    it('should track access statistics', () => {
      const key = registry.registerModel(mockModel);
      registry.getModel(key);
      registry.getModel(key);
      const stats = registry.getStatistics();
      expect(stats.totalAccesses).toBeGreaterThan(0);
    });
  });

  describe('persistence', () => {
    it('should save registry to disk', async () => {
      registry.registerModel(mockModel);
      await registry.save();
      expect(fs.existsSync(testPersistencePath)).toBe(true);
    });

    it('should load registry from disk', async () => {
      registry.registerModel(mockModel);
      await registry.save();

      const newRegistry = new ModelRegistry({
        persistencePath: testPersistencePath,
        autoSave: false
      });
      await newRegistry.load();

      const models = newRegistry.listModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe(mockModel.id);

      newRegistry.destroy();
    });

    it('should preserve performance metrics on save/load', async () => {
      const key = registry.registerModel(mockModel);
      registry.updatePerformanceMetrics(key, {
        averageLatency: 250,
        tokensPerSecond: 45,
        totalInferences: 100,
        successRate: 0.99,
        lastBenchmarked: new Date()
      });
      await registry.save();

      const newRegistry = new ModelRegistry({
        persistencePath: testPersistencePath
      });
      await newRegistry.load();

      const model = newRegistry.getModel(key);
      expect(model?.performanceMetrics?.averageLatency).toBe(250);

      newRegistry.destroy();
    });
  });

  describe('getTopPerformingModels', () => {
    beforeEach(() => {
      const key1 = registry.registerModel(mockModel);
      registry.updatePerformanceMetrics(key1, {
        averageLatency: 250,
        tokensPerSecond: 45,
        totalInferences: 100,
        successRate: 0.99,
        lastBenchmarked: new Date()
      });

      const key2 = registry.registerModel({
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: ProviderType.OPENAI,
        contextWindow: 4096,
        maxTokens: 4096,
        capabilities: [ModelCapability.CHAT_COMPLETION]
      });
      registry.updatePerformanceMetrics(key2, {
        averageLatency: 150,
        tokensPerSecond: 80,
        totalInferences: 200,
        successRate: 0.95,
        lastBenchmarked: new Date()
      });
    });

    it('should return models sorted by performance', () => {
      const topModels = registry.getTopPerformingModels(2);
      expect(topModels).toHaveLength(2);
      // Higher performance score should be first
      expect(topModels[0].performanceMetrics?.tokensPerSecond).toBeGreaterThan(
        topModels[1].performanceMetrics?.tokensPerSecond || 0
      );
    });
  });

  describe('getMostUsedModels', () => {
    it('should return models sorted by access count', () => {
      const key1 = registry.registerModel(mockModel);
      const key2 = registry.registerModel({
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: ProviderType.OPENAI,
        contextWindow: 4096,
        maxTokens: 4096,
        capabilities: [ModelCapability.CHAT_COMPLETION]
      });

      // Access first model more times
      registry.getModel(key1);
      registry.getModel(key1);
      registry.getModel(key1);
      registry.getModel(key2);

      const mostUsed = registry.getMostUsedModels(2);
      expect(mostUsed[0].accessCount).toBeGreaterThan(mostUsed[1].accessCount);
      expect(mostUsed[0].id).toBe('gpt-4');
    });
  });

  describe('unregisterModel', () => {
    it('should remove model from registry', () => {
      const key = registry.registerModel(mockModel);
      const removed = registry.unregisterModel(key);
      expect(removed).toBe(true);
      expect(registry.getModel(key)).toBeUndefined();
    });

    it('should return false for non-existent model', () => {
      const removed = registry.unregisterModel('non-existent:model');
      expect(removed).toBe(false);
    });
  });

  describe('clearRegistry', () => {
    it('should remove all models', () => {
      registry.registerModel(mockModel);
      registry.registerModel({
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: ProviderType.OPENAI,
        contextWindow: 4096,
        maxTokens: 4096,
        capabilities: [ModelCapability.CHAT_COMPLETION]
      });

      registry.clearRegistry();
      expect(registry.listModels()).toHaveLength(0);
    });
  });

  describe('events', () => {
    it('should emit model-registered event', (done) => {
      registry.on('model-registered', (event) => {
        expect(event.key).toBe('openai:gpt-4');
        expect(event.model.id).toBe('gpt-4');
        done();
      });
      registry.registerModel(mockModel);
    });

    it('should emit model-updated event', (done) => {
      const key = registry.registerModel(mockModel);
      registry.on('model-updated', (event) => {
        expect(event.key).toBe(key);
        done();
      });
      registry.updateModel(key, { metadata: { test: true } });
    });

    it('should emit model-unregistered event', (done) => {
      const key = registry.registerModel(mockModel);
      registry.on('model-unregistered', (event) => {
        expect(event.key).toBe(key);
        done();
      });
      registry.unregisterModel(key);
    });
  });
});
