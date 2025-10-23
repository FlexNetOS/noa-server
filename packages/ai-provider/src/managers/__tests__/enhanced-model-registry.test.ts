import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  EnhancedModelRegistry,
  ModelStatus,
  ExtendedModelInfo,
  ModelCostConfig,
  ModelRateLimitConfig
} from '../enhanced-model-registry';
import { ProviderType, ModelCapability } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

describe('EnhancedModelRegistry', () => {
  let registry: EnhancedModelRegistry;
  const testPersistencePath = './test-data/enhanced-model-registry.json';
  const testConfigPath = './test-data/test-models-config.json';

  const mockCost: ModelCostConfig = {
    inputTokens: 0.01,
    outputTokens: 0.03,
    currency: 'USD',
    per: 1000
  };

  const mockRateLimit: ModelRateLimitConfig = {
    requestsPerMinute: 500,
    tokensPerMinute: 150000,
    requestsPerDay: 10000
  };

  const mockModel: ExtendedModelInfo = {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: ProviderType.OPENAI,
    version: '1.0.0',
    contextWindow: 8192,
    maxTokens: 4096,
    capabilities: [
      ModelCapability.CHAT_COMPLETION,
      ModelCapability.FUNCTION_CALLING
    ],
    cost: mockCost,
    rateLimit: mockRateLimit
  };

  beforeEach(() => {
    registry = new EnhancedModelRegistry({
      persistencePath: testPersistencePath,
      autoSave: false,
      autoLoadConfig: false
    });
  });

  afterEach(() => {
    registry.destroy();

    // Clean up test files
    [testPersistencePath, testConfigPath].forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Clean up directories
    ['test-data'].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir, { recursive: true });
      }
    });
  });

  describe('Model Registration', () => {
    it('should register a model with cost and rate limit info', () => {
      const key = registry.registerModel(mockModel);
      expect(key).toBe('openai:gpt-4');

      const model = registry.getModel(key);
      expect(model?.cost).toEqual(mockCost);
      expect(model?.rateLimit).toEqual(mockRateLimit);
    });

    it('should initialize usage statistics on registration', () => {
      const key = registry.registerModel(mockModel);
      const model = registry.getModel(key);

      expect(model?.usageStats).toBeDefined();
      expect(model?.usageStats?.totalInputTokens).toBe(0);
      expect(model?.usageStats?.totalOutputTokens).toBe(0);
      expect(model?.usageStats?.totalCost).toBe(0);
      expect(model?.usageStats?.requestCount).toBe(0);
    });

    it('should validate semantic versioning', () => {
      const invalidModel = { ...mockModel, version: 'invalid' };

      expect(() => {
        registry.registerModel(invalidModel as ExtendedModelInfo);
      }).toThrow();
    });

    it('should register models with different versions', () => {
      const model1 = { ...mockModel, version: '1.0.0' };
      const model2 = { ...mockModel, id: 'gpt-4-v2', version: '2.0.0' };

      const key1 = registry.registerModel(model1);
      const key2 = registry.registerModel(model2);

      expect(key1).not.toBe(key2);
      expect(registry.listModels()).toHaveLength(2);
    });
  });

  describe('Cost Tracking', () => {
    it('should record usage and calculate costs correctly', () => {
      const key = registry.registerModel(mockModel);

      // Record 1000 input tokens and 500 output tokens
      registry.recordUsage(key, 1000, 500, true);

      const stats = registry.getUsageStats(key);
      expect(stats?.totalInputTokens).toBe(1000);
      expect(stats?.totalOutputTokens).toBe(500);

      // Cost = (1000/1000 * 0.01) + (500/1000 * 0.03) = 0.01 + 0.015 = 0.025
      expect(stats?.totalCost).toBeCloseTo(0.025, 5);
    });

    it('should track successful and failed requests', () => {
      const key = registry.registerModel(mockModel);

      registry.recordUsage(key, 100, 50, true);
      registry.recordUsage(key, 100, 50, true);
      registry.recordUsage(key, 100, 50, false);

      const stats = registry.getUsageStats(key);
      expect(stats?.successfulRequests).toBe(2);
      expect(stats?.failedRequests).toBe(1);
      expect(stats?.requestCount).toBe(3);
    });

    it('should estimate cost for a request', () => {
      const key = registry.registerModel(mockModel);

      const estimatedCost = registry.estimateCost(key, 1000, 500);

      // Cost = (1000/1000 * 0.01) + (500/1000 * 0.03) = 0.025
      expect(estimatedCost).toBeCloseTo(0.025, 5);
    });

    it('should reset usage statistics', () => {
      const key = registry.registerModel(mockModel);

      registry.recordUsage(key, 1000, 500, true);
      expect(registry.getUsageStats(key)?.totalCost).toBeGreaterThan(0);

      registry.resetUsageStats(key);

      const stats = registry.getUsageStats(key);
      expect(stats?.totalInputTokens).toBe(0);
      expect(stats?.totalOutputTokens).toBe(0);
      expect(stats?.totalCost).toBe(0);
      expect(stats?.requestCount).toBe(0);
    });

    it('should get most cost-effective models', () => {
      const expensiveModel: ExtendedModelInfo = {
        ...mockModel,
        id: 'gpt-4-expensive',
        cost: {
          inputTokens: 0.1,
          outputTokens: 0.3,
          currency: 'USD',
          per: 1000
        }
      };

      const cheapModel: ExtendedModelInfo = {
        ...mockModel,
        id: 'gpt-3.5-cheap',
        cost: {
          inputTokens: 0.001,
          outputTokens: 0.002,
          currency: 'USD',
          per: 1000
        }
      };

      registry.registerModel(mockModel);
      registry.registerModel(expensiveModel);
      registry.registerModel(cheapModel);

      const costEffective = registry.getMostCostEffectiveModels(3);
      expect(costEffective[0].id).toBe('gpt-3.5-cheap');
      expect(costEffective[2].id).toBe('gpt-4-expensive');
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limits', () => {
      const key = registry.registerModel(mockModel);

      const result1 = registry.checkRateLimit(key, 100000);
      expect(result1.allowed).toBe(true);

      const result2 = registry.checkRateLimit(key, 200000);
      expect(result2.allowed).toBe(false);
      expect(result2.reason).toContain('rate limit');
    });

    it('should return false for non-existent model', () => {
      const result = registry.checkRateLimit('non-existent:model', 1000);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Model not found');
    });
  });

  describe('Version Management', () => {
    it('should compare versions correctly', () => {
      expect(registry.compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(registry.compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(registry.compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(registry.compareVersions('1.2.3', '1.2.4')).toBe(-1);
      expect(registry.compareVersions('2.0.0', '1.9.9')).toBe(1);
    });

    it('should filter models by version range', () => {
      registry.registerModel({ ...mockModel, version: '1.0.0' });
      registry.registerModel({ ...mockModel, id: 'gpt-4-v2', version: '2.0.0' });
      registry.registerModel({ ...mockModel, id: 'gpt-4-v3', version: '3.0.0' });

      const models = registry.getModelsByVersionRange('1.5.0', '2.5.0');
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('gpt-4-v2');
    });

    it('should search models with version filters', () => {
      registry.registerModel({ ...mockModel, version: '1.0.0' });
      registry.registerModel({ ...mockModel, id: 'gpt-4-v2', version: '2.0.0' });
      registry.registerModel({ ...mockModel, id: 'gpt-4-v3', version: '3.0.0' });

      const models = registry.searchModels({
        minVersion: '2.0.0'
      });

      expect(models).toHaveLength(2);
      expect(models.every(m => registry.compareVersions(m.version, '2.0.0') >= 0)).toBe(true);
    });
  });

  describe('Enhanced Search', () => {
    beforeEach(() => {
      registry.registerModel(mockModel);

      registry.registerModel({
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: ProviderType.OPENAI,
        version: '1.1.0',
        contextWindow: 4096,
        maxTokens: 4096,
        capabilities: [ModelCapability.CHAT_COMPLETION],
        cost: {
          inputTokens: 0.001,
          outputTokens: 0.002,
          currency: 'USD',
          per: 1000
        },
        rateLimit: mockRateLimit
      });

      registry.registerModel({
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: ProviderType.CLAUDE,
        version: '3.0.0',
        contextWindow: 200000,
        maxTokens: 4096,
        capabilities: [
          ModelCapability.CHAT_COMPLETION,
          ModelCapability.VISION
        ],
        cost: {
          inputTokens: 0.015,
          outputTokens: 0.075,
          currency: 'USD',
          per: 1000
        },
        rateLimit: mockRateLimit,
        metadata: {
          tags: ['flagship', 'recommended']
        }
      });
    });

    it('should filter by max cost per token', () => {
      const models = registry.searchModels({
        maxCostPerToken: 0.002
      });

      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('gpt-3.5-turbo');
    });

    it('should exclude deprecated models', () => {
      const key = registry.registerModel({
        ...mockModel,
        id: 'old-model',
        version: '0.1.0'
      });
      registry.updateModelStatus(key, ModelStatus.DEPRECATED);

      const models = registry.searchModels({
        excludeDeprecated: true
      });

      expect(models.every(m => m.status !== ModelStatus.DEPRECATED)).toBe(true);
    });

    it('should combine multiple filters', () => {
      const models = registry.searchModels({
        provider: ProviderType.OPENAI,
        maxCostPerToken: 0.02,
        minContextWindow: 4000,
        excludeDeprecated: true
      });

      expect(models).toHaveLength(2);
      expect(models.every(m => m.provider === ProviderType.OPENAI)).toBe(true);
    });

    it('should filter by tags', () => {
      const models = registry.searchModels({
        tags: ['flagship']
      });

      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('claude-3-opus');
    });
  });

  describe('Statistics', () => {
    it('should return enhanced statistics with cost tracking', () => {
      const key1 = registry.registerModel(mockModel);
      const key2 = registry.registerModel({
        ...mockModel,
        id: 'gpt-3.5',
        provider: ProviderType.OPENAI
      });

      registry.recordUsage(key1, 1000, 500, true);
      registry.recordUsage(key2, 2000, 1000, true);

      const stats = registry.getStatistics();

      expect(stats.totalModels).toBe(2);
      expect(stats.totalInputTokens).toBe(3000);
      expect(stats.totalOutputTokens).toBe(1500);
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    it('should track provider and capability counts', () => {
      registry.registerModel(mockModel);
      registry.registerModel({
        ...mockModel,
        id: 'claude',
        provider: ProviderType.CLAUDE
      });

      const stats = registry.getStatistics();

      expect(stats.providerCounts[ProviderType.OPENAI]).toBe(1);
      expect(stats.providerCounts[ProviderType.CLAUDE]).toBe(1);
      expect(stats.capabilityCounts[ModelCapability.CHAT_COMPLETION]).toBe(2);
    });
  });

  describe('Config Loading', () => {
    it('should load models from config file', async () => {
      const config = {
        version: '1.0.0',
        models: [
          mockModel,
          {
            ...mockModel,
            id: 'gpt-3.5',
            version: '1.1.0'
          }
        ]
      };

      // Create test config file
      const dir = path.dirname(testConfigPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testConfigPath, JSON.stringify(config));

      await registry.loadFromConfig(testConfigPath);

      expect(registry.listModels()).toHaveLength(2);
    });

    it('should throw error if config file not found', async () => {
      await expect(
        registry.loadFromConfig('./non-existent-config.json')
      ).rejects.toThrow('Config file not found');
    });
  });

  describe('Persistence', () => {
    it('should save and load registry with usage stats', async () => {
      const key = registry.registerModel(mockModel);
      registry.recordUsage(key, 1000, 500, true);

      await registry.save();
      expect(fs.existsSync(testPersistencePath)).toBe(true);

      const newRegistry = new EnhancedModelRegistry({
        persistencePath: testPersistencePath,
        autoSave: false
      });
      await newRegistry.load();

      const model = newRegistry.getModel(key);
      expect(model?.usageStats?.totalInputTokens).toBe(1000);
      expect(model?.usageStats?.totalOutputTokens).toBe(500);

      newRegistry.destroy();
    });

    it('should preserve cost and rate limit info on save/load', async () => {
      registry.registerModel(mockModel);
      await registry.save();

      const newRegistry = new EnhancedModelRegistry({
        persistencePath: testPersistencePath
      });
      await newRegistry.load();

      const models = newRegistry.listModels();
      expect(models[0].cost).toEqual(mockCost);
      expect(models[0].rateLimit).toEqual(mockRateLimit);

      newRegistry.destroy();
    });
  });

  describe('Model Status', () => {
    it('should update model status including deprecated', () => {
      const key = registry.registerModel(mockModel);

      registry.updateModelStatus(key, ModelStatus.DEPRECATED);

      const model = registry.getModel(key);
      expect(model?.status).toBe(ModelStatus.DEPRECATED);
    });

    it('should filter by status', () => {
      const key1 = registry.registerModel(mockModel);
      const key2 = registry.registerModel({
        ...mockModel,
        id: 'old-model'
      });

      registry.updateModelStatus(key2, ModelStatus.DEPRECATED);

      const availableModels = registry.searchModels({
        status: ModelStatus.AVAILABLE
      });

      expect(availableModels).toHaveLength(1);
      expect(availableModels[0].id).toBe('gpt-4');
    });
  });

  describe('Events', () => {
    it('should emit usage-recorded event', (done) => {
      const key = registry.registerModel(mockModel);

      registry.on('usage-recorded', (event) => {
        expect(event.key).toBe(key);
        expect(event.inputTokens).toBe(1000);
        expect(event.outputTokens).toBe(500);
        expect(event.totalCost).toBeGreaterThan(0);
        done();
      });

      registry.recordUsage(key, 1000, 500, true);
    });

    it('should emit usage-reset event', (done) => {
      const key = registry.registerModel(mockModel);

      registry.on('usage-reset', (event) => {
        expect(event.key).toBe(key);
        done();
      });

      registry.resetUsageStats(key);
    });

    it('should emit config-loaded event', (done) => {
      const config = {
        version: '1.0.0',
        models: [mockModel]
      };

      const dir = path.dirname(testConfigPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testConfigPath, JSON.stringify(config));

      registry.on('config-loaded', (event) => {
        expect(event.path).toBe(testConfigPath);
        expect(event.modelCount).toBe(1);
        done();
      });

      registry.loadFromConfig(testConfigPath);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero cost models (self-hosted)', () => {
      const selfHostedModel: ExtendedModelInfo = {
        ...mockModel,
        id: 'llama-local',
        provider: ProviderType.LLAMA_CPP,
        cost: {
          inputTokens: 0,
          outputTokens: 0,
          currency: 'USD',
          per: 1000,
          note: 'Self-hosted'
        }
      };

      const key = registry.registerModel(selfHostedModel);
      registry.recordUsage(key, 10000, 5000, true);

      const stats = registry.getUsageStats(key);
      expect(stats?.totalCost).toBe(0);
    });

    it('should handle large token counts', () => {
      const key = registry.registerModel(mockModel);

      registry.recordUsage(key, 1000000, 500000, true);

      const stats = registry.getUsageStats(key);
      expect(stats?.totalInputTokens).toBe(1000000);
      expect(stats?.totalCost).toBeGreaterThan(0);
    });

    it('should handle invalid model key gracefully', () => {
      expect(() => {
        registry.estimateCost('invalid:key', 1000, 500);
      }).toThrow('Model with key');
    });
  });
});
