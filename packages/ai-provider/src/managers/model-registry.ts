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

/**
 * Model Registry Entry with extended metadata
 */
export interface ModelRegistryEntry extends ModelInfo {
  registeredAt: Date;
  lastAccessed: Date;
  accessCount: number;
  status: ModelStatus;
  performanceMetrics?: ModelPerformanceMetrics;
  filePath?: string;
  fileSize?: number;
  checksum?: string;
}

export enum ModelStatus {
  AVAILABLE = 'available',
  LOADING = 'loading',
  LOADED = 'loaded',
  FAILED = 'failed',
  UNLOADED = 'unloaded'
}

export interface ModelPerformanceMetrics {
  averageLatency: number; // milliseconds
  tokensPerSecond: number;
  totalInferences: number;
  successRate: number;
  lastBenchmarked: Date;
  memoryUsage?: number; // MB
}

export interface ModelSearchQuery {
  provider?: ProviderType;
  capability?: ModelCapability;
  minContextWindow?: number;
  maxContextWindow?: number;
  namePattern?: string;
  tags?: string[];
  status?: ModelStatus;
}

export interface ModelRegistryConfig {
  persistencePath?: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
}

/**
 * Model Registry - Central repository for all available models
 * Provides discovery, metadata storage, and performance tracking
 */
export class ModelRegistry extends EventEmitter {
  private models: Map<string, ModelRegistryEntry> = new Map();
  private config: ModelRegistryConfig;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(config: ModelRegistryConfig = {}) {
    super();
    this.config = {
      persistencePath: config.persistencePath || './data/model-registry.json',
      autoSave: config.autoSave ?? true,
      autoSaveInterval: config.autoSaveInterval || 60000 // 1 minute
    };

    if (this.config.autoSave) {
      this.startAutoSave();
    }
  }

  /**
   * Register a new model in the registry
   */
  registerModel(model: ModelInfo): string {
    const key = this.generateModelKey(model.provider, model.id);

    const entry: ModelRegistryEntry = {
      ...model,
      registeredAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      status: ModelStatus.AVAILABLE
    };

    this.models.set(key, entry);
    this.emit('model-registered', { key, model: entry });

    return key;
  }

  /**
   * Register multiple models at once
   */
  registerModels(models: ModelInfo[]): string[] {
    return models.map(model => this.registerModel(model));
  }

  /**
   * Update model metadata
   */
  updateModel(key: string, updates: Partial<ModelRegistryEntry>): void {
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
  getModel(key: string): ModelRegistryEntry | undefined {
    const model = this.models.get(key);
    if (model) {
      this.recordAccess(key);
    }
    return model;
  }

  /**
   * Get model by provider and ID
   */
  getModelByProviderAndId(provider: ProviderType, modelId: string): ModelRegistryEntry | undefined {
    const key = this.generateModelKey(provider, modelId);
    return this.getModel(key);
  }

  /**
   * List all registered models
   */
  listModels(): ModelRegistryEntry[] {
    return Array.from(this.models.values());
  }

  /**
   * Search models by query
   */
  searchModels(query: ModelSearchQuery): ModelRegistryEntry[] {
    let results = this.listModels();

    if (query.provider) {
      results = results.filter(m => m.provider === query.provider);
    }

    if (query.capability) {
      results = results.filter(m => query.capability !== undefined && m.capabilities.includes(query.capability));
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

    return results;
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: ProviderType): ModelRegistryEntry[] {
    return this.searchModels({ provider });
  }

  /**
   * Get models by capability
   */
  getModelsByCapability(capability: ModelCapability): ModelRegistryEntry[] {
    return this.searchModels({ capability });
  }

  /**
   * Get top performing models
   */
  getTopPerformingModels(limit: number = 10): ModelRegistryEntry[] {
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
  getMostUsedModels(limit: number = 10): ModelRegistryEntry[] {
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
  getStatistics(): RegistryStatistics {
    const models = this.listModels();
    const providerCounts: Record<string, number> = {};
    const capabilityCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    models.forEach(model => {
      // Count by provider
      providerCounts[model.provider] = (providerCounts[model.provider] || 0) + 1;

      // Count by status
      statusCounts[model.status] = (statusCounts[model.status] || 0) + 1;

      // Count by capability
      model.capabilities.forEach(cap => {
        capabilityCounts[cap] = (capabilityCounts[cap] || 0) + 1;
      });
    });

    return {
      totalModels: models.length,
      providerCounts,
      capabilityCounts,
      statusCounts,
      totalAccesses: models.reduce((sum, m) => sum + m.accessCount, 0),
      averageAccessCount: models.length > 0
        ? models.reduce((sum, m) => sum + m.accessCount, 0) / models.length
        : 0
    };
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
        const entry: ModelRegistryEntry = {
          ...item,
          registeredAt: new Date(item.registeredAt),
          lastAccessed: new Date(item.lastAccessed),
          performanceMetrics: item.performanceMetrics ? {
            ...item.performanceMetrics,
            lastBenchmarked: new Date(item.performanceMetrics.lastBenchmarked)
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
    const models = JSON.parse(json) as ModelInfo[];
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

export interface RegistryStatistics {
  totalModels: number;
  providerCounts: Record<string, number>;
  capabilityCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  totalAccesses: number;
  averageAccessCount: number;
}
