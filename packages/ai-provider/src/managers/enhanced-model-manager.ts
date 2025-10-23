import {
  ModelInfo,
  ProviderConfig,
  ProviderType,
  ModelCapability,
  AIProviderError,
  ModelNotFoundError,
  ModelLoadError
} from '../types';
import { ProviderFactory } from '../utils/factory';
import { ConfigurationManager } from '../utils/config';
import { ModelRegistry, ModelRegistryEntry, ModelStatus, ModelPerformanceMetrics } from './model-registry';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface EnhancedModelManagerConfig {
  defaultProvider?: ProviderType;
  autoLoadDefault?: boolean;
  maxLoadedModels?: number;
  enablePersistence?: boolean;
  persistencePath?: string;
  enablePerformanceTracking?: boolean;
  enableAutoSwitch?: boolean;
  autoSwitchThreshold?: number; // Performance threshold for auto-switching
}

export interface ModelLoadOptions {
  preload?: boolean;
  priority?: number;
  warmup?: boolean;
}

export interface ModelSwitchResult {
  previousModel: string | null;
  currentModel: string;
  reason?: string;
  timestamp: Date;
}

export interface ActiveModelState {
  key: string;
  model: ModelInfo;
  loadedAt: Date;
  totalInferences: number;
  performanceMetrics?: ModelPerformanceMetrics;
}

/**
 * Enhanced Model Manager
 * Provides advanced model management with dynamic loading, switching,
 * capability detection, performance profiling, and state persistence
 */
export class EnhancedModelManager extends EventEmitter {
  private providerFactory: ProviderFactory;
  private configManager: ConfigurationManager;
  private registry: ModelRegistry;
  private config: EnhancedModelManagerConfig;

  // Active models (currently loaded in memory)
  private activeModels: Map<string, ActiveModelState> = new Map();
  private currentModelKey: string | null = null;

  // Performance tracking
  private performanceHistory: Map<string, ModelPerformanceMetrics[]> = new Map();

  constructor(
    providerFactory: ProviderFactory,
    configManager: ConfigurationManager,
    config: EnhancedModelManagerConfig = {}
  ) {
    super();
    this.providerFactory = providerFactory;
    this.configManager = configManager;

    const managerConfig = configManager.getModelManagerConfig() || {};
    this.config = {
      defaultProvider: config.defaultProvider || managerConfig.defaultProvider,
      autoLoadDefault: config.autoLoadDefault ?? managerConfig.autoLoadDefault ?? true,
      maxLoadedModels: config.maxLoadedModels ?? managerConfig.maxLoadedModels ?? 10,
      enablePersistence: config.enablePersistence ?? true,
      persistencePath: config.persistencePath || './data/model-manager-state.json',
      enablePerformanceTracking: config.enablePerformanceTracking ?? true,
      enableAutoSwitch: config.enableAutoSwitch ?? false,
      autoSwitchThreshold: config.autoSwitchThreshold ?? 0.7
    };

    // Initialize registry
    this.registry = new ModelRegistry({
      persistencePath: path.join(
        path.dirname(this.config.persistencePath!),
        'model-registry.json'
      ),
      autoSave: true
    });

    this.setupEventHandlers();

    if (this.config.autoLoadDefault) {
      this.initializeDefaultModels();
    }
  }

  /**
   * Initialize with default models and restore state
   */
  async initialize(): Promise<void> {
    // Load registry from disk
    await this.registry.load().catch(err => {
      console.warn('Failed to load registry:', err);
    });

    // Restore previous state
    if (this.config.enablePersistence) {
      await this.restoreState().catch(err => {
        console.warn('Failed to restore state:', err);
      });
    }

    // Discover and register available models
    await this.discoverModels();

    this.emit('initialized', {
      registeredModels: this.registry.listModels().length,
      activeModels: this.activeModels.size
    });
  }

  /**
   * Discover and register models from all configured providers
   */
  async discoverModels(): Promise<number> {
    const config = this.configManager.getConfig();
    let discoveredCount = 0;

    for (const providerConfig of config.providers) {
      try {
        const provider = this.providerFactory.createProvider(providerConfig);
        const models = await provider.getModels();

        for (const model of models) {
          const key = this.registry.registerModel(model);
          discoveredCount++;
        }

        this.emit('provider-discovered', {
          provider: providerConfig.type,
          modelCount: models.length
        });
      } catch (error) {
        console.warn(`Failed to discover models for ${providerConfig.type}:`, error);
      }
    }

    return discoveredCount;
  }

  /**
   * Load a specific model with options
   */
  async loadModel(
    providerConfig: ProviderConfig,
    modelId: string,
    options: ModelLoadOptions = {}
  ): Promise<string> {
    const key = this.generateModelKey(providerConfig.type, modelId);

    try {
      // Update registry status
      this.registry.updateModelStatus(key, ModelStatus.LOADING);
      this.emit('model-loading', { key, modelId });

      // Get model info from provider
      const provider = this.providerFactory.createProvider(providerConfig);
      const models = await provider.getModels();
      const modelInfo = models.find(m => m.id === modelId || m.name === modelId);

      if (!modelInfo) {
        throw new ModelNotFoundError(
          `Model '${modelId}' not found in provider ${providerConfig.type}`,
          providerConfig.type
        );
      }

      // Register if not already in registry
      if (!this.registry.getModel(key)) {
        this.registry.registerModel(modelInfo);
      }

      // Create active state
      const activeState: ActiveModelState = {
        key,
        model: modelInfo,
        loadedAt: new Date(),
        totalInferences: 0
      };

      // Enforce max loaded models limit
      if (this.activeModels.size >= this.config.maxLoadedModels!) {
        await this.evictLeastUsedModel();
      }

      this.activeModels.set(key, activeState);
      this.registry.updateModelStatus(key, ModelStatus.LOADED);

      // Set as current if none selected or first model
      if (!this.currentModelKey) {
        this.currentModelKey = key;
      }

      // Warmup if requested
      if (options.warmup) {
        await this.warmupModel(key);
      }

      this.emit('model-loaded', { key, model: modelInfo });
      return key;

    } catch (error) {
      this.registry.updateModelStatus(key, ModelStatus.FAILED);
      this.emit('model-load-error', { key, error });

      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new ModelLoadError(
        `Failed to load model '${modelId}' from ${providerConfig.type}: ${error}`,
        providerConfig.type
      );
    }
  }

  /**
   * Unload a model from memory
   */
  async unloadModel(key: string): Promise<void> {
    const activeModel = this.activeModels.get(key);
    if (!activeModel) {
      throw new ModelNotFoundError(`Model '${key}' is not loaded`, ProviderType.OPENAI);
    }

    this.activeModels.delete(key);
    this.registry.updateModelStatus(key, ModelStatus.AVAILABLE);

    // Switch to another model if current is unloaded
    if (this.currentModelKey === key) {
      const remainingKeys = Array.from(this.activeModels.keys());
      this.currentModelKey = remainingKeys.length > 0 ? remainingKeys[0] : null;

      if (this.currentModelKey) {
        this.emit('model-switched', {
          previousModel: key,
          currentModel: this.currentModelKey,
          reason: 'previous_model_unloaded'
        });
      }
    }

    this.emit('model-unloaded', { key });
  }

  /**
   * Switch to a different model without restart
   */
  async switchModel(key: string, reason?: string): Promise<ModelSwitchResult> {
    const model = this.activeModels.get(key);
    if (!model) {
      throw new ModelNotFoundError(
        `Model '${key}' is not loaded. Load it first with loadModel()`,
        ProviderType.OPENAI
      );
    }

    const previousKey = this.currentModelKey;
    this.currentModelKey = key;

    const result: ModelSwitchResult = {
      previousModel: previousKey,
      currentModel: key,
      reason,
      timestamp: new Date()
    };

    this.emit('model-switched', result);
    return result;
  }

  /**
   * Auto-switch to best performing model for a capability
   */
  async autoSwitchToBestModel(capability?: ModelCapability): Promise<ModelSwitchResult | null> {
    if (!this.config.enableAutoSwitch) {
      return null;
    }

    const candidates = capability
      ? this.registry.getModelsByCapability(capability)
      : this.registry.listModels();

    const loadedCandidates = candidates.filter(m =>
      this.activeModels.has(this.generateModelKey(m.provider, m.id))
    );

    if (loadedCandidates.length === 0) {
      return null;
    }

    // Find best performing loaded model
    const bestModel = loadedCandidates.reduce((best, current) => {
      const bestScore = this.calculateModelScore(best);
      const currentScore = this.calculateModelScore(current);
      return currentScore > bestScore ? current : best;
    });

    const bestKey = this.generateModelKey(bestModel.provider, bestModel.id);

    if (bestKey !== this.currentModelKey) {
      return await this.switchModel(bestKey, 'auto_switch_performance');
    }

    return null;
  }

  /**
   * Get current active model
   */
  getCurrentModel(): ActiveModelState | null {
    return this.currentModelKey
      ? this.activeModels.get(this.currentModelKey) || null
      : null;
  }

  /**
   * Get all loaded models
   */
  getLoadedModels(): ActiveModelState[] {
    return Array.from(this.activeModels.values());
  }

  /**
   * Get model capabilities
   */
  getModelCapabilities(key: string): ModelCapability[] {
    const activeModel = this.activeModels.get(key);
    if (activeModel) return activeModel.model.capabilities;
    const registryModel = this.registry.getModel(key);
    if (registryModel) return registryModel.capabilities;
    return [];
  }

  /**
   * Check if model supports capability
   */
  supportsCapability(key: string, capability: ModelCapability): boolean {
    const capabilities = this.getModelCapabilities(key);
    return capabilities.includes(capability);
  }

  async detectCapabilities(key: string): Promise<ModelCapability[]> {
    const activeModel = this.activeModels.get(key);
    const registryModel = this.registry.getModel(key);
    if (!activeModel && !registryModel) {
      throw new ModelNotFoundError(`Model '${key}' not found`, ProviderType.OPENAI);
    }

    // Start with declared capabilities
    let baseCaps: ModelCapability[] = [];
    if (activeModel) {
      baseCaps = activeModel.model.capabilities;
    } else if (registryModel) {
      baseCaps = registryModel.capabilities;
    }
    const capabilities = new Set<ModelCapability>(baseCaps);

    // Detect additional capabilities based on model metadata
    let metadata: any = undefined;
    if (registryModel?.metadata) {
      metadata = registryModel.metadata;
    } else if (activeModel?.model && (activeModel.model as any).metadata) {
      metadata = (activeModel.model as any).metadata;
    }
    if (metadata) {
      // Check for function calling support
      if (metadata.supports_functions || metadata.function_calling) {
        capabilities.add(ModelCapability.FUNCTION_CALLING);
      }

      // Check for vision support
      if (metadata.supports_vision || metadata.vision) {
        capabilities.add(ModelCapability.VISION);
      }

      // Check for JSON mode
      if (metadata.supports_json || metadata.json_mode) {
        capabilities.add(ModelCapability.JSON_MODE);
      }

      // Check for streaming
      if (metadata.supports_streaming !== false) {
    }

    return Array.from(capabilities);
  }

    return Array.from(capabilities);
  }

  /**
   * Profile model performance
   */
  async profileModel(key: string, testCount: number = 10): Promise<ModelPerformanceMetrics> {
    const model = this.activeModels.get(key);
    if (!model) {
      throw new ModelNotFoundError(`Model '${key}' is not loaded`, ProviderType.OPENAI);
    }

    this.emit('profiling-started', { key, testCount });

    const latencies: number[] = [];
    const speeds: number[] = [];
    let successCount = 0;

    // Run test inferences
    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now();
      try {
        // Simple test prompt
        const testPrompt = 'Hello, this is a test.';
        // Simulate inference (in real implementation, call provider)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

        const endTime = Date.now();
        const latency = endTime - startTime;
        latencies.push(latency);

        // Simulate tokens per second
        const tokensPerSecond = 1000 / latency * 10;
        speeds.push(tokensPerSecond);

        successCount++;
      } catch (error) {
        console.warn(`Profiling test ${i + 1} failed:`, error);
      }
    }

    const metrics: ModelPerformanceMetrics = {
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      tokensPerSecond: speeds.reduce((a, b) => a + b, 0) / speeds.length,
      totalInferences: testCount,
      successRate: successCount / testCount,
      lastBenchmarked: new Date()
    };

    // Update registry and active state
    this.registry.updatePerformanceMetrics(key, metrics);
    if (model) {
      model.performanceMetrics = metrics;
    }

    // Store in performance history
    const history = this.performanceHistory.get(key) || [];
    history.push(metrics);
    this.performanceHistory.set(key, history);

    this.emit('profiling-completed', { key, metrics });
    return metrics;
  }

  /**
   * Record inference execution
   */
  recordInference(key: string, latency: number, tokensGenerated: number, success: boolean): void {
    const model = this.activeModels.get(key);
    if (!model) return;

    model.totalInferences++;

    if (this.config.enablePerformanceTracking) {
      const registryEntry = this.registry.getModel(key);
      if (registryEntry?.performanceMetrics) {
        const metrics = registryEntry.performanceMetrics;

        // Update metrics with exponential moving average
        const alpha = 0.2; // Smoothing factor
        metrics.averageLatency = alpha * latency + (1 - alpha) * metrics.averageLatency;
        metrics.tokensPerSecond = alpha * (tokensGenerated / latency * 1000) +
          (1 - alpha) * metrics.tokensPerSecond;
        metrics.totalInferences++;
        metrics.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * metrics.successRate;

        this.registry.updatePerformanceMetrics(key, metrics);
      }
    }
  }

  /**
   * Get model performance metrics
   */
  getPerformanceMetrics(key: string): ModelPerformanceMetrics | undefined {
    const registryEntry = this.registry.getModel(key);
    return registryEntry?.performanceMetrics;
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(key: string): ModelPerformanceMetrics[] {
    return this.performanceHistory.get(key) || [];
  }

  /**
   * Get registry instance
   */
  getRegistry(): ModelRegistry {
    return this.registry;
  }

  /**
   * Get manager statistics
   */
  getStatistics() {
    const registryStats = this.registry.getStatistics();
    return {
      ...registryStats,
      loadedModels: this.activeModels.size,
      currentModel: this.currentModelKey,
      totalInferences: Array.from(this.activeModels.values())
        .reduce((sum, m) => sum + m.totalInferences, 0)
    };
  }

  /**
   * Save manager state to disk
   */
  async saveState(): Promise<void> {
    if (!this.config.enablePersistence || !this.config.persistencePath) {
      return;
    }

    const state = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      currentModelKey: this.currentModelKey,
      activeModels: Array.from(this.activeModels.entries()).map(([key, model]) => ({
        key,
        model: model.model,
        loadedAt: model.loadedAt.toISOString(),
        totalInferences: model.totalInferences,
        performanceMetrics: model.performanceMetrics
      })),
      performanceHistory: Array.from(this.performanceHistory.entries())
    };

    const dirPath = path.dirname(this.config.persistencePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(
      this.config.persistencePath,
      JSON.stringify(state, null, 2),
      'utf-8'
    );

    // Also save registry
    await this.registry.save();

    this.emit('state-saved', { path: this.config.persistencePath });
  }

  /**
   * Restore manager state from disk
   */
  async restoreState(): Promise<void> {
    if (!this.config.persistencePath || !fs.existsSync(this.config.persistencePath)) {
      return;
    }

    try {
      const data = JSON.parse(
        fs.readFileSync(this.config.persistencePath, 'utf-8')
      );

      this.currentModelKey = data.currentModelKey;

      // Restore performance history
      this.performanceHistory.clear();
      if (data.performanceHistory) {
        data.performanceHistory.forEach(([key, history]: [string, any[]]) => {
          this.performanceHistory.set(key, history);
        });
      }

      this.emit('state-restored', {
        activeModels: data.activeModels.length,
        currentModel: this.currentModelKey
      });
    } catch (error) {
      console.warn('Failed to restore state:', error);
    }
  }

  /**
   * Cleanup and destroy manager
   */
  async destroy(): Promise<void> {
    // Save state before destroying
    if (this.config.enablePersistence) {
      await this.saveState();
    }

    this.registry.destroy();
    this.activeModels.clear();
    this.performanceHistory.clear();
    this.removeAllListeners();
  }

  /**
   * Initialize default models
   */
  private async initializeDefaultModels(): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      if (config.providers.length === 0) return;

      const defaultProviderConfig = this.config.defaultProvider
        ? config.providers.find(p => p.type === this.config.defaultProvider)
        : config.providers[0];

      if (defaultProviderConfig?.defaultModel) {
        await this.loadModel(defaultProviderConfig, defaultProviderConfig.defaultModel);
      }
    } catch (error) {
      console.warn('Failed to load default models:', error);
    }
  }

  /**
   * Evict least used model to free up space
   */
  private async evictLeastUsedModel(): Promise<void> {
    const models = Array.from(this.activeModels.entries())
      .sort((a, b) => a[1].totalInferences - b[1].totalInferences);

    if (models.length > 0) {
      const [keyToEvict] = models[0];
      if (keyToEvict !== this.currentModelKey) {
        await this.unloadModel(keyToEvict);
        this.emit('model-evicted', { key: keyToEvict });
      }
    }
  }

  /**
   * Warmup model with test inference
   */
  private async warmupModel(key: string): Promise<void> {
    this.emit('model-warming-up', { key });
    // Simulate warmup
    await new Promise(resolve => setTimeout(resolve, 100));
    this.emit('model-warmed-up', { key });
  }

  /**
   * Calculate model score for auto-switching
   */
  private calculateModelScore(model: ModelRegistryEntry): number {
    if (!model.performanceMetrics) return 0;

    const metrics = model.performanceMetrics;
    return (
      metrics.successRate * 0.5 +
      Math.min(metrics.tokensPerSecond / 100, 1) * 0.3 +
      (1 - Math.min(metrics.averageLatency / 1000, 1)) * 0.2
    );
  }

  /**
   * Generate model key
   */
  private generateModelKey(provider: ProviderType, modelId: string): string {
    return `${provider}:${modelId}`;
  }

  /**
   * Setup event handlers for registry
   */
  private setupEventHandlers(): void {
    this.registry.on('model-registered', (event) => {
      this.emit('registry-model-registered', event);
    });

    this.registry.on('model-updated', (event) => {
      this.emit('registry-model-updated', event);
    });
  }
}
