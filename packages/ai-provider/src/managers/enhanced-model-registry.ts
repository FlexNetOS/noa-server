import {
  ModelInfo,
  ProviderType,
  ModelCapability,
  AIProviderError,
  ModelNotFoundError
} from '../types';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

/**
 * Cost configuration for model usage
 */
export interface ModelCostConfig {
  inputTokens: number; // Cost per input token
  outputTokens: number; // Cost per output token
  currency: string; // Currency code (e.g., 'USD')
  per: number; // Cost is per this many tokens (e.g., 1000)
  note?: string; // Additional cost information
}

/**
 * Rate limit configuration for model requests
 */
export interface ModelRateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay?: number;
  note?: string;
}

/**
 * Extended Model Info with versioning, costs, and rate limits
 */
export interface ExtendedModelInfo extends ModelInfo {
  version: string; // Semantic version (e.g., '3.0.0')
  cost: ModelCostConfig;
  rateLimit: ModelRateLimitConfig;
}

/**
 * Enhanced Model Registry Entry with all tracking features
 */
export interface EnhancedModelRegistryEntry extends ExtendedModelInfo {
  registeredAt: Date;
  lastAccessed: Date;
  accessCount: number;
  status: ModelStatus;
  performanceMetrics?: ModelPerformanceMetrics;
  usageStats?: ModelUsageStats;
  filePath?: string;
  fileSize?: number;
  checksum?: string;
}

export enum ModelStatus {
  AVAILABLE = 'available',
  LOADING = 'loading',
  LOADED = 'loaded',
  FAILED = 'failed',
  UNLOADED = 'unloaded',
  DEPRECATED = 'deprecated'
}

export interface ModelPerformanceMetrics {
  averageLatency: number; // milliseconds
  tokensPerSecond: number;
  totalInferences: number;
  successRate: number;
  lastBenchmarked: Date;
  memoryUsage?: number; // MB
}

/**
 * Usage statistics for cost tracking
 */
export interface ModelUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  currency: string;
  lastReset: Date;
  requestCount: number;
  successfulRequests: number;
  failedRequests: number;
}

/**
 * Enhanced search query with cost and version filters
 */
export interface EnhancedModelSearchQuery {
  provider?: ProviderType;
  capability?: ModelCapability;
  minContextWindow?: number;
  maxContextWindow?: number;
  namePattern?: string;
  tags?: string[];
  status?: ModelStatus;
  maxCostPerToken?: number;
  minVersion?: string;
  maxVersion?: string;
  excludeDeprecated?: boolean;
}

export interface EnhancedModelRegistryConfig {
  persistencePath?: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
  modelsConfigPath?: string; // Path to models-config.json
  autoLoadConfig?: boolean;
}

/**
 * Zod schemas for validation
 */
const ModelCostConfigSchema = z.object({
  inputTokens: z.number().min(0),
  outputTokens: z.number().min(0),
  currency: z.string().default('USD'),
  per: z.number().positive().default(1000),
  note: z.string().optional()
});

const ModelRateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().positive(),
  tokensPerMinute: z.number().positive(),
  requestsPerDay: z.number().positive().optional(),
  note: z.string().optional()
});

export const ExtendedModelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.nativeEnum(ProviderType),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semantic version'),
  contextWindow: z.number().positive(),
  maxTokens: z.number().positive(),
  capabilities: z.array(z.nativeEnum(ModelCapability)),
  cost: ModelCostConfigSchema,
  rateLimit: ModelRateLimitConfigSchema,
  metadata: z.record(z.any()).optional()
});

/**
 * Enhanced Model Registry - Extended version with cost tracking, rate limits, and versioning
 */
export class EnhancedModelRegistry extends EventEmitter {
  private models: Map<string, EnhancedModelRegistryEntry> = new Map();
  private config: EnhancedModelRegistryConfig;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(config: EnhancedModelRegistryConfig = {}) {
    super();
    this.config = {
      persistencePath: config.persistencePath || './data/enhanced-model-registry.json',
      autoSave: config.autoSave ?? true,
      autoSaveInterval: config.autoSaveInterval || 60000, // 1 minute
      modelsConfigPath: config.modelsConfigPath || './config/models-config.json',
      autoLoadConfig: config.autoLoadConfig ?? false
    };

    if (this.config.autoSave) {
      this.startAutoSave();
    }

    if (this.config.autoLoadConfig && this.config.modelsConfigPath) {
      this.loadFromConfig().catch(err => {
        console.error('Failed to auto-load models config:', err);
      });
    }
  }

  /**
   * Register a new model in the registry
   */
  registerModel(model: ExtendedModelInfo): string {
    // Validate model with Zod schema
    ExtendedModelInfoSchema.parse(model);

    const key = this.generateModelKey(model.provider, model.id);

    const entry: EnhancedModelRegistryEntry = {
      ...model,
      registeredAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      status: ModelStatus.AVAILABLE,
      usageStats: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        currency: model.cost.currency,
        lastReset: new Date(),
        requestCount: 0,
        successfulRequests: 0,
        failedRequests: 0
      }
    };

    this.models.set(key, entry);
    this.emit('model-registered', { key, model: entry });

    return key;
  }

  /**
   * Register multiple models at once
   */
  registerModels(models: ExtendedModelInfo[]): string[] {
    return models.map(model => this.registerModel(model));
  }

  /**
   * Update model metadata
   */
  updateModel(key: string, updates: Partial<EnhancedModelRegistryEntry>): void {
    const existing = this.models.get(key);
    if (!existing) {
      throw new ModelNotFoundError(`Model with key '${key}' not found`, ProviderType.OPENAI);
    }

    const updated = { ...existing, ...updates };
    this.models.set(key, updated);
    this.emit('model-updated', { key, model: updated });
  }

  /**
   * Update model status
   */
  updateModelStatus(key: string, status: ModelStatus): void {
    this.updateModel(key, { status });
  }

  /**
   * Update model performance metrics
   */
  updatePerformanceMetrics(key: string, metrics: Partial<ModelPerformanceMetrics>): void {
    const existing = this.models.get(key);
    if (!existing) {
      throw new ModelNotFoundError(`Model with key '${key}' not found`, ProviderType.OPENAI);
    }

    const updatedMetrics: ModelPerformanceMetrics = {
      ...existing.performanceMetrics,
      ...metrics,
      lastBenchmarked: new Date()
    } as ModelPerformanceMetrics;

    this.updateModel(key, { performanceMetrics: updatedMetrics });
  }

  /**
   * Record model usage for cost tracking
   */
  recordUsage(key: string, inputTokens: number, outputTokens: number, success: boolean = true): void {
    const model = this.models.get(key);
    if (!model || !model.usageStats) {
      return;
    }

    // Calculate cost
    const inputCost = (inputTokens / model.cost.per) * model.cost.inputTokens;
    const outputCost = (outputTokens / model.cost.per) * model.cost.outputTokens;
    const totalCost = inputCost + outputCost;

    // Update usage stats
    model.usageStats.totalInputTokens += inputTokens;
    model.usageStats.totalOutputTokens += outputTokens;
    model.usageStats.totalCost += totalCost;
    model.usageStats.requestCount++;

    if (success) {
      model.usageStats.successfulRequests++;
    } else {
      model.usageStats.failedRequests++;
    }

    model.lastAccessed = new Date();
    model.accessCount++;

    this.models.set(key, model);
    this.emit('usage-recorded', { key, inputTokens, outputTokens, totalCost });
  }

  /**
   * Reset usage statistics for a model
   */
  resetUsageStats(key: string): void {
    const model = this.models.get(key);
    if (!model) {
      throw new ModelNotFoundError(`Model with key '${key}' not found`, ProviderType.OPENAI);
    }

    model.usageStats = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      currency: model.cost.currency,
      lastReset: new Date(),
      requestCount: 0,
      successfulRequests: 0,
      failedRequests: 0
    };

    this.models.set(key, model);
    this.emit('usage-reset', { key });
  }

  /**
   * Get usage statistics for a model
   */
  getUsageStats(key: string): ModelUsageStats | undefined {
    const model = this.models.get(key);
    return model?.usageStats;
  }

  /**
   * Calculate estimated cost for a request
   */
  estimateCost(key: string, inputTokens: number, outputTokens: number): number {
    const model = this.models.get(key);
    if (!model) {
      throw new ModelNotFoundError(`Model with key '${key}' not found`, ProviderType.OPENAI);
    }

    const inputCost = (inputTokens / model.cost.per) * model.cost.inputTokens;
    const outputCost = (outputTokens / model.cost.per) * model.cost.outputTokens;

    return inputCost + outputCost;
  }

  /**
   * Check if model is within rate limits
   */
  checkRateLimit(key: string, tokensToSend: number): { allowed: boolean; reason?: string } {
    const model = this.models.get(key);
    if (!model) {
      return { allowed: false, reason: 'Model not found' };
    }

    // In a production environment, this would check against actual rate limit tracking
    // For now, we just return the configured limits
    if (tokensToSend > model.rateLimit.tokensPerMinute) {
      return {
        allowed: false,
        reason: `Token count ${tokensToSend} exceeds rate limit of ${model.rateLimit.tokensPerMinute} tokens/minute`
      };
    }

    return { allowed: true };
  }

  /**
   * Compare model versions
   */
  compareVersions(version1: string, version2: string): number {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (v1[i] > v2[i]) return 1;
      if (v1[i] < v2[i]) return -1;
    }

    return 0;
  }

  /**
   * Get models by version range
   */
  getModelsByVersionRange(minVersion: string, maxVersion: string): EnhancedModelRegistryEntry[] {
    return this.listModels().filter(model => {
      return this.compareVersions(model.version, minVersion) >= 0 &&
             this.compareVersions(model.version, maxVersion) <= 0;
    });
  }

  /**
   * Record model access
   */
  recordAccess(key: string): void {
    const model = this.models.get(key);
    if (model) {
      model.lastAccessed = new Date();
      model.accessCount++;
      this.models.set(key, model);
    }
  }

  /**
   * Get a model by key
   */
  getModel(key: string): EnhancedModelRegistryEntry | undefined {
    const model = this.models.get(key);
    if (model) {
      this.recordAccess(key);
    }
    return model;
  }

  /**
   * Get model by provider and ID
   */
  getModelByProviderAndId(provider: ProviderType, modelId: string): EnhancedModelRegistryEntry | undefined {
    const key = this.generateModelKey(provider, modelId);
    return this.getModel(key);
  }

  /**
   * List all registered models
   */
  listModels(): EnhancedModelRegistryEntry[] {
    return Array.from(this.models.values());
  }

  /**
   * Enhanced search models with cost and version filters
   */
  searchModels(query: EnhancedModelSearchQuery): EnhancedModelRegistryEntry[] {
    let results = this.listModels();

    if (query.provider) {
      results = results.filter(m => m.provider === query.provider);
    }

    if (query.capability) {
      results = results.filter(m => m.capabilities.includes(query.capability!));
    }

    if (query.minContextWindow !== undefined) {
      results = results.filter(m => m.contextWindow >= query.minContextWindow!);
    }

    if (query.maxContextWindow !== undefined) {
      results = results.filter(m => m.contextWindow <= query.maxContextWindow!);
    }

    if (query.namePattern) {
      const pattern = new RegExp(query.namePattern, 'i');
      results = results.filter(m => pattern.test(m.name) || pattern.test(m.id));
    }

    if (query.status) {
      results = results.filter(m => m.status === query.status);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(m =>
        query.tags!.some(tag =>
          m.metadata?.tags && m.metadata.tags.includes(tag)
        )
      );
    }

    if (query.maxCostPerToken !== undefined) {
      results = results.filter(m => {
        const avgCost = (m.cost.inputTokens + m.cost.outputTokens) / (2 * m.cost.per);
        return avgCost <= query.maxCostPerToken!;
      });
    }

    if (query.minVersion) {
      results = results.filter(m => this.compareVersions(m.version, query.minVersion!) >= 0);
    }

    if (query.maxVersion) {
      results = results.filter(m => this.compareVersions(m.version, query.maxVersion!) <= 0);
    }

    if (query.excludeDeprecated) {
      results = results.filter(m => m.status !== ModelStatus.DEPRECATED);
    }

    return results;
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: ProviderType): EnhancedModelRegistryEntry[] {
    return this.searchModels({ provider });
  }

  /**
   * Get models by capability
   */
  getModelsByCapability(capability: ModelCapability): EnhancedModelRegistryEntry[] {
    return this.searchModels({ capability });
  }

  /**
   * Get most cost-effective models
   */
  getMostCostEffectiveModels(limit: number = 10): EnhancedModelRegistryEntry[] {
    return this.listModels()
      .sort((a, b) => {
        const avgCostA = (a.cost.inputTokens + a.cost.outputTokens) / (2 * a.cost.per);
        const avgCostB = (b.cost.inputTokens + b.cost.outputTokens) / (2 * b.cost.per);
        return avgCostA - avgCostB;
      })
      .slice(0, limit);
  }

  /**
   * Get top performing models
   */
  getTopPerformingModels(limit: number = 10): EnhancedModelRegistryEntry[] {
    return this.listModels()
      .filter(m => m.performanceMetrics)
      .sort((a, b) => {
        const scoreA = this.calculatePerformanceScore(a.performanceMetrics!);
        const scoreB = this.calculatePerformanceScore(b.performanceMetrics!);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get most used models
   */
  getMostUsedModels(limit: number = 10): EnhancedModelRegistryEntry[] {
    return this.listModels()
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Remove a model from registry
   */
  unregisterModel(key: string): boolean {
    const removed = this.models.delete(key);
    if (removed) {
      this.emit('model-unregistered', { key });
    }
    return removed;
  }

  /**
   * Clear all models
   */
  clearRegistry(): void {
    this.models.clear();
    this.emit('registry-cleared');
  }

  /**
   * Get registry statistics
   */
  getStatistics(): EnhancedRegistryStatistics {
    const models = this.listModels();
    const providerCounts: Record<string, number> = {};
    const capabilityCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    models.forEach(model => {
      providerCounts[model.provider] = (providerCounts[model.provider] || 0) + 1;
      statusCounts[model.status] = (statusCounts[model.status] || 0) + 1;

      model.capabilities.forEach(cap => {
        capabilityCounts[cap] = (capabilityCounts[cap] || 0) + 1;
      });

      if (model.usageStats) {
        totalCost += model.usageStats.totalCost;
        totalInputTokens += model.usageStats.totalInputTokens;
        totalOutputTokens += model.usageStats.totalOutputTokens;
      }
    });

    return {
      totalModels: models.length,
      providerCounts,
      capabilityCounts,
      statusCounts,
      totalAccesses: models.reduce((sum, m) => sum + m.accessCount, 0),
      averageAccessCount: models.length > 0
        ? models.reduce((sum, m) => sum + m.accessCount, 0) / models.length
        : 0,
      totalCost,
      totalInputTokens,
      totalOutputTokens
    };
  }

  /**
   * Load models from config file (models-config.json)
   */
  async loadFromConfig(configPath?: string): Promise<void> {
    const path = configPath || this.config.modelsConfigPath;
    if (!path || !fs.existsSync(path)) {
      throw new AIProviderError(
        `Config file not found: ${path}`,
        ProviderType.OPENAI,
        'CONFIG_NOT_FOUND'
      );
    }

    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
      const models = data.models as ExtendedModelInfo[];

      this.registerModels(models);

      this.emit('config-loaded', {
        path,
        modelCount: models.length
      });
    } catch (error) {
      throw new AIProviderError(
        `Failed to load config: ${error}`,
        ProviderType.OPENAI,
        'CONFIG_LOAD_ERROR'
      );
    }
  }

  /**
   * Save registry to disk
   */
  async save(): Promise<void> {
    if (!this.config.persistencePath) {
      return;
    }

    try {
      const data = {
        version: '1.0.0',
        savedAt: new Date().toISOString(),
        models: Array.from(this.models.entries()).map(([key, model]) => ({
          key,
          ...model,
          registeredAt: model.registeredAt.toISOString(),
          lastAccessed: model.lastAccessed.toISOString(),
          performanceMetrics: model.performanceMetrics ? {
            ...model.performanceMetrics,
            lastBenchmarked: model.performanceMetrics.lastBenchmarked.toISOString()
          } : undefined,
          usageStats: model.usageStats ? {
            ...model.usageStats,
            lastReset: model.usageStats.lastReset.toISOString()
          } : undefined
        }))
      };

      const dirPath = path.dirname(this.config.persistencePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(
        this.config.persistencePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      this.emit('registry-saved', { path: this.config.persistencePath });
    } catch (error) {
      this.emit('registry-save-error', { error });
      throw new AIProviderError(
        `Failed to save registry: ${error}`,
        ProviderType.OPENAI,
        'REGISTRY_SAVE_ERROR'
      );
    }
  }

  /**
   * Load registry from disk
   */
  async load(): Promise<void> {
    if (!this.config.persistencePath || !fs.existsSync(this.config.persistencePath)) {
      return;
    }

    try {
      const data = JSON.parse(
        fs.readFileSync(this.config.persistencePath, 'utf-8')
      );

      this.models.clear();

      data.models.forEach((item: any) => {
        const entry: EnhancedModelRegistryEntry = {
          ...item,
          registeredAt: new Date(item.registeredAt),
          lastAccessed: new Date(item.lastAccessed),
          performanceMetrics: item.performanceMetrics ? {
            ...item.performanceMetrics,
            lastBenchmarked: new Date(item.performanceMetrics.lastBenchmarked)
          } : undefined,
          usageStats: item.usageStats ? {
            ...item.usageStats,
            lastReset: new Date(item.usageStats.lastReset)
          } : undefined
        };
        this.models.set(item.key, entry);
      });

      this.emit('registry-loaded', {
        path: this.config.persistencePath,
        modelCount: this.models.size
      });
    } catch (error) {
      this.emit('registry-load-error', { error });
      throw new AIProviderError(
        `Failed to load registry: ${error}`,
        ProviderType.OPENAI,
        'REGISTRY_LOAD_ERROR'
      );
    }
  }

  /**
   * Export registry to JSON
   */
  exportToJSON(): string {
    const models = this.listModels();
    return JSON.stringify(models, null, 2);
  }

  /**
   * Import models from JSON
   */
  importFromJSON(json: string): number {
    const models = JSON.parse(json) as ExtendedModelInfo[];
    return this.registerModels(models).length;
  }

  /**
   * Destroy registry and cleanup
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.removeAllListeners();
  }

  /**
   * Generate unique key for a model
   */
  private generateModelKey(provider: ProviderType, modelId: string): string {
    return `${provider}:${modelId}`;
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(metrics: ModelPerformanceMetrics): number {
    // Weighted score: 40% success rate, 30% speed, 30% usage
    const successScore = metrics.successRate * 0.4;
    const speedScore = Math.min(metrics.tokensPerSecond / 100, 1) * 0.3;
    const usageScore = Math.min(metrics.totalInferences / 1000, 1) * 0.3;
    return successScore + speedScore + usageScore;
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.save().catch(err => {
        console.error('Auto-save failed:', err);
      });
    }, this.config.autoSaveInterval);
  }
}

export interface EnhancedRegistryStatistics {
  totalModels: number;
  providerCounts: Record<string, number>;
  capabilityCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  totalAccesses: number;
  averageAccessCount: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}
