# Model Registry Documentation

## Overview

The Model Registry provides centralized management for AI models across multiple providers (OpenAI, Claude, llama.cpp, custom providers) with comprehensive features including:

- **Model metadata management** with versioning
- **Cost tracking** for usage monitoring and budgeting
- **Rate limit enforcement** to prevent quota violations
- **Performance metrics** tracking and benchmarking
- **Hot-reload** configuration support
- **Search and filtering** capabilities

## Installation

```bash
npm install @noa/ai-provider
# or
pnpm add @noa/ai-provider
```

## Quick Start

### Basic Usage

```typescript
import { EnhancedModelRegistry, ProviderType, ModelCapability } from '@noa/ai-provider';

// Initialize registry
const registry = new EnhancedModelRegistry({
  persistencePath: './data/model-registry.json',
  autoSave: true,
  autoSaveInterval: 60000, // 1 minute
  modelsConfigPath: './config/models-config.json',
  autoLoadConfig: true
});

// Register a model
const model = {
  id: 'gpt-4-turbo-preview',
  name: 'GPT-4 Turbo',
  provider: ProviderType.OPENAI,
  version: '1.0.0',
  contextWindow: 128000,
  maxTokens: 4096,
  capabilities: [
    ModelCapability.CHAT_COMPLETION,
    ModelCapability.FUNCTION_CALLING,
    ModelCapability.JSON_MODE
  ],
  cost: {
    inputTokens: 0.01,
    outputTokens: 0.03,
    currency: 'USD',
    per: 1000
  },
  rateLimit: {
    requestsPerMinute: 500,
    tokensPerMinute: 150000,
    requestsPerDay: 10000
  }
};

const modelKey = registry.registerModel(model);
console.log(`Registered model: ${modelKey}`);
```

### Loading from Configuration

```typescript
// Load models from models-config.json
await registry.loadFromConfig('./config/models-config.json');

// Get model by provider and ID
const gpt4 = registry.getModelByProviderAndId(ProviderType.OPENAI, 'gpt-4-turbo-preview');
console.log(`Found model: ${gpt4?.name}`);
```

## API Reference

### EnhancedModelRegistry

#### Constructor

```typescript
constructor(config?: EnhancedModelRegistryConfig)
```

**Config Options:**
- `persistencePath?: string` - Path to save registry state (default: `./data/enhanced-model-registry.json`)
- `autoSave?: boolean` - Enable automatic saving (default: `true`)
- `autoSaveInterval?: number` - Auto-save interval in milliseconds (default: `60000`)
- `modelsConfigPath?: string` - Path to models-config.json (default: `./config/models-config.json`)
- `autoLoadConfig?: boolean` - Auto-load config on initialization (default: `false`)

#### Model Management

##### registerModel(model: ExtendedModelInfo): string

Register a single model in the registry.

```typescript
const key = registry.registerModel({
  id: 'claude-3-opus-20240229',
  name: 'Claude 3 Opus',
  provider: ProviderType.CLAUDE,
  version: '3.0.0',
  contextWindow: 200000,
  maxTokens: 4096,
  capabilities: [ModelCapability.CHAT_COMPLETION, ModelCapability.VISION],
  cost: {
    inputTokens: 0.015,
    outputTokens: 0.075,
    currency: 'USD',
    per: 1000
  },
  rateLimit: {
    requestsPerMinute: 50,
    tokensPerMinute: 40000
  }
});
```

##### registerModels(models: ExtendedModelInfo[]): string[]

Register multiple models at once.

```typescript
const keys = registry.registerModels([model1, model2, model3]);
```

##### getModel(key: string): EnhancedModelRegistryEntry | undefined

Get a model by its unique key. Automatically records access for tracking.

```typescript
const model = registry.getModel('openai:gpt-4');
console.log(`Context window: ${model?.contextWindow}`);
```

##### getModelByProviderAndId(provider: ProviderType, modelId: string): EnhancedModelRegistryEntry | undefined

Get a model by provider and ID.

```typescript
const claude = registry.getModelByProviderAndId(ProviderType.CLAUDE, 'claude-3-opus-20240229');
```

##### updateModel(key: string, updates: Partial<EnhancedModelRegistryEntry>): void

Update model metadata.

```typescript
registry.updateModel('openai:gpt-4', {
  metadata: {
    tags: ['production', 'recommended'],
    customField: 'value'
  }
});
```

##### updateModelStatus(key: string, status: ModelStatus): void

Update model availability status.

```typescript
import { ModelStatus } from '@noa/ai-provider';

registry.updateModelStatus('openai:gpt-3', ModelStatus.DEPRECATED);
```

**Available Statuses:**
- `AVAILABLE` - Model is ready for use
- `LOADING` - Model is being loaded
- `LOADED` - Model is loaded in memory
- `FAILED` - Model loading failed
- `UNLOADED` - Model is unloaded
- `DEPRECATED` - Model is deprecated

##### unregisterModel(key: string): boolean

Remove a model from the registry.

```typescript
const removed = registry.unregisterModel('openai:old-model');
```

#### Cost Tracking

##### recordUsage(key: string, inputTokens: number, outputTokens: number, success: boolean): void

Record model usage for cost tracking.

```typescript
// Record successful request
registry.recordUsage('openai:gpt-4', 1500, 800, true);

// Record failed request
registry.recordUsage('openai:gpt-4', 100, 0, false);
```

##### getUsageStats(key: string): ModelUsageStats | undefined

Get usage statistics for a model.

```typescript
const stats = registry.getUsageStats('openai:gpt-4');
console.log(`Total cost: $${stats?.totalCost.toFixed(4)}`);
console.log(`Input tokens: ${stats?.totalInputTokens}`);
console.log(`Output tokens: ${stats?.totalOutputTokens}`);
console.log(`Success rate: ${(stats?.successfulRequests / stats?.requestCount * 100).toFixed(2)}%`);
```

**ModelUsageStats Interface:**
```typescript
interface ModelUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  currency: string;
  lastReset: Date;
  requestCount: number;
  successfulRequests: number;
  failedRequests: number;
}
```

##### estimateCost(key: string, inputTokens: number, outputTokens: number): number

Calculate estimated cost for a request before making it.

```typescript
const estimatedCost = registry.estimateCost('openai:gpt-4', 2000, 1000);
console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`);
```

##### resetUsageStats(key: string): void

Reset usage statistics for a model.

```typescript
registry.resetUsageStats('openai:gpt-4');
```

#### Rate Limiting

##### checkRateLimit(key: string, tokensToSend: number): { allowed: boolean; reason?: string }

Check if a request is within rate limits.

```typescript
const check = registry.checkRateLimit('openai:gpt-4', 10000);

if (check.allowed) {
  // Proceed with request
  await makeRequest();
} else {
  console.error(`Rate limit exceeded: ${check.reason}`);
}
```

#### Version Management

##### compareVersions(version1: string, version2: string): number

Compare two semantic versions.

```typescript
const result = registry.compareVersions('2.0.0', '1.5.0');
// Returns: 1 (v1 > v2), 0 (equal), -1 (v1 < v2)
```

##### getModelsByVersionRange(minVersion: string, maxVersion: string): EnhancedModelRegistryEntry[]

Get models within a version range.

```typescript
const models = registry.getModelsByVersionRange('2.0.0', '3.0.0');
```

#### Search and Filtering

##### searchModels(query: EnhancedModelSearchQuery): EnhancedModelRegistryEntry[]

Search models with comprehensive filters.

```typescript
const models = registry.searchModels({
  provider: ProviderType.OPENAI,
  capability: ModelCapability.FUNCTION_CALLING,
  minContextWindow: 8000,
  maxCostPerToken: 0.02,
  minVersion: '1.0.0',
  excludeDeprecated: true,
  tags: ['recommended', 'production']
});
```

**Query Options:**
```typescript
interface EnhancedModelSearchQuery {
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
```

##### getModelsByProvider(provider: ProviderType): EnhancedModelRegistryEntry[]

Get all models from a specific provider.

```typescript
const claudeModels = registry.getModelsByProvider(ProviderType.CLAUDE);
```

##### getModelsByCapability(capability: ModelCapability): EnhancedModelRegistryEntry[]

Get all models with a specific capability.

```typescript
const visionModels = registry.getModelsByCapability(ModelCapability.VISION);
```

##### getMostCostEffectiveModels(limit?: number): EnhancedModelRegistryEntry[]

Get models sorted by cost-effectiveness.

```typescript
const cheapModels = registry.getMostCostEffectiveModels(5);
cheapModels.forEach(model => {
  const avgCost = (model.cost.inputTokens + model.cost.outputTokens) / (2 * model.cost.per);
  console.log(`${model.name}: $${avgCost.toFixed(6)} per token`);
});
```

##### getTopPerformingModels(limit?: number): EnhancedModelRegistryEntry[]

Get top-performing models based on metrics.

```typescript
const topModels = registry.getTopPerformingModels(10);
```

##### getMostUsedModels(limit?: number): EnhancedModelRegistryEntry[]

Get most frequently used models.

```typescript
const popularModels = registry.getMostUsedModels(5);
```

#### Statistics

##### getStatistics(): EnhancedRegistryStatistics

Get comprehensive registry statistics.

```typescript
const stats = registry.getStatistics();

console.log(`Total models: ${stats.totalModels}`);
console.log(`Total cost: $${stats.totalCost.toFixed(2)}`);
console.log(`Total tokens: ${stats.totalInputTokens + stats.totalOutputTokens}`);
console.log(`Providers:`, stats.providerCounts);
console.log(`Capabilities:`, stats.capabilityCounts);
```

**EnhancedRegistryStatistics Interface:**
```typescript
interface EnhancedRegistryStatistics {
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
```

#### Performance Tracking

##### updatePerformanceMetrics(key: string, metrics: Partial<ModelPerformanceMetrics>): void

Update performance metrics for a model.

```typescript
registry.updatePerformanceMetrics('openai:gpt-4', {
  averageLatency: 250,
  tokensPerSecond: 45,
  totalInferences: 1000,
  successRate: 0.99,
  memoryUsage: 512
});
```

#### Persistence

##### save(): Promise<void>

Save registry to disk.

```typescript
await registry.save();
```

##### load(): Promise<void>

Load registry from disk.

```typescript
await registry.load();
```

##### loadFromConfig(configPath?: string): Promise<void>

Load models from a configuration file.

```typescript
await registry.loadFromConfig('./config/models-config.json');
```

##### exportToJSON(): string

Export registry as JSON string.

```typescript
const json = registry.exportToJSON();
fs.writeFileSync('backup.json', json);
```

##### importFromJSON(json: string): number

Import models from JSON string.

```typescript
const json = fs.readFileSync('backup.json', 'utf-8');
const count = registry.importFromJSON(json);
console.log(`Imported ${count} models`);
```

## Configuration Examples

### OpenAI Models

```json
{
  "id": "gpt-4-turbo-preview",
  "name": "GPT-4 Turbo",
  "provider": "openai",
  "version": "1.0.0",
  "contextWindow": 128000,
  "maxTokens": 4096,
  "capabilities": ["chat_completion", "function_calling", "json_mode"],
  "cost": {
    "inputTokens": 0.01,
    "outputTokens": 0.03,
    "currency": "USD",
    "per": 1000
  },
  "rateLimit": {
    "requestsPerMinute": 500,
    "tokensPerMinute": 150000,
    "requestsPerDay": 10000
  },
  "metadata": {
    "tags": ["recommended", "production"],
    "apiEndpoint": "https://api.openai.com/v1/chat/completions"
  }
}
```

### Claude Models

```json
{
  "id": "claude-3-opus-20240229",
  "name": "Claude 3 Opus",
  "provider": "claude",
  "version": "3.0.0",
  "contextWindow": 200000,
  "maxTokens": 4096,
  "capabilities": ["chat_completion", "vision", "function_calling"],
  "cost": {
    "inputTokens": 0.015,
    "outputTokens": 0.075,
    "currency": "USD",
    "per": 1000
  },
  "rateLimit": {
    "requestsPerMinute": 50,
    "tokensPerMinute": 40000,
    "requestsPerDay": 1000
  },
  "metadata": {
    "tags": ["flagship", "high-performance"],
    "apiEndpoint": "https://api.anthropic.com/v1/messages"
  }
}
```

### llama.cpp (Self-Hosted) Models

```json
{
  "id": "llama-3.1-8b-instruct",
  "name": "Llama 3.1 8B Instruct",
  "provider": "llama.cpp",
  "version": "3.1.0",
  "contextWindow": 128000,
  "maxTokens": 4096,
  "capabilities": ["chat_completion", "text_generation"],
  "cost": {
    "inputTokens": 0,
    "outputTokens": 0,
    "currency": "USD",
    "per": 1000,
    "note": "Self-hosted, no API costs"
  },
  "rateLimit": {
    "requestsPerMinute": 1000,
    "tokensPerMinute": 100000,
    "note": "Limited by hardware capabilities"
  },
  "metadata": {
    "tags": ["self-hosted", "open-source", "local"],
    "modelFile": "llama-3.1-8b-instruct-q5_k_m.gguf",
    "quantization": "Q5_K_M",
    "fileSize": "5.73GB",
    "requiredRAM": "8GB",
    "apiEndpoint": "http://localhost:8080/v1/chat/completions"
  }
}
```

### Custom Models

```json
{
  "id": "my-custom-model",
  "name": "My Custom Model",
  "provider": "llama.cpp",
  "version": "1.0.0",
  "contextWindow": 8192,
  "maxTokens": 2048,
  "capabilities": ["chat_completion"],
  "cost": {
    "inputTokens": 0,
    "outputTokens": 0,
    "currency": "USD",
    "per": 1000
  },
  "rateLimit": {
    "requestsPerMinute": 500,
    "tokensPerMinute": 50000
  },
  "metadata": {
    "tags": ["custom"],
    "modelFile": "/path/to/my-model.gguf",
    "apiEndpoint": "http://localhost:8080/v1/chat/completions"
  }
}
```

## Usage Examples

### Cost Monitoring Dashboard

```typescript
import { EnhancedModelRegistry, ProviderType } from '@noa/ai-provider';

const registry = new EnhancedModelRegistry({
  persistencePath: './data/model-registry.json'
});

// Load existing registry
await registry.load();

// Generate cost report
function generateCostReport() {
  const stats = registry.getStatistics();
  const models = registry.listModels();

  console.log('\n=== Cost Report ===');
  console.log(`Total Cost: $${stats.totalCost.toFixed(2)}`);
  console.log(`Total Input Tokens: ${stats.totalInputTokens.toLocaleString()}`);
  console.log(`Total Output Tokens: ${stats.totalOutputTokens.toLocaleString()}`);

  console.log('\n=== Cost by Model ===');
  models
    .sort((a, b) => (b.usageStats?.totalCost || 0) - (a.usageStats?.totalCost || 0))
    .forEach(model => {
      const usage = model.usageStats;
      if (usage && usage.totalCost > 0) {
        console.log(`${model.name}: $${usage.totalCost.toFixed(4)} (${usage.requestCount} requests)`);
      }
    });
}

generateCostReport();
```

### Rate Limit Protection

```typescript
async function makeSafeRequest(
  modelKey: string,
  inputTokens: number,
  outputTokens: number
) {
  // Check rate limits
  const rateLimitCheck = registry.checkRateLimit(modelKey, inputTokens);

  if (!rateLimitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
  }

  // Estimate cost
  const estimatedCost = registry.estimateCost(modelKey, inputTokens, outputTokens);

  if (estimatedCost > BUDGET_THRESHOLD) {
    throw new Error(`Cost $${estimatedCost.toFixed(4)} exceeds budget`);
  }

  try {
    // Make actual API request
    const response = await makeAPIRequest(modelKey, inputTokens);

    // Record successful usage
    registry.recordUsage(modelKey, inputTokens, response.outputTokens, true);

    return response;
  } catch (error) {
    // Record failed usage
    registry.recordUsage(modelKey, inputTokens, 0, false);
    throw error;
  }
}
```

### Model Selection Based on Cost and Performance

```typescript
function selectOptimalModel(
  requiredCapability: ModelCapability,
  maxCostPerToken: number,
  minContextWindow: number
) {
  // Find models matching requirements
  const candidates = registry.searchModels({
    capability: requiredCapability,
    maxCostPerToken,
    minContextWindow,
    excludeDeprecated: true,
    status: ModelStatus.AVAILABLE
  });

  if (candidates.length === 0) {
    throw new Error('No suitable models found');
  }

  // Sort by performance score (if metrics available) or cost
  const ranked = candidates.sort((a, b) => {
    if (a.performanceMetrics && b.performanceMetrics) {
      const scoreA = calculateScore(a);
      const scoreB = calculateScore(b);
      return scoreB - scoreA;
    }
    // Fallback to cost comparison
    const costA = (a.cost.inputTokens + a.cost.outputTokens) / (2 * a.cost.per);
    const costB = (b.cost.inputTokens + b.cost.outputTokens) / (2 * b.cost.per);
    return costA - costB;
  });

  return ranked[0];
}

function calculateScore(model: EnhancedModelRegistryEntry): number {
  const metrics = model.performanceMetrics!;
  const successScore = metrics.successRate * 0.4;
  const speedScore = Math.min(metrics.tokensPerSecond / 100, 1) * 0.3;
  const usageScore = Math.min(metrics.totalInferences / 1000, 1) * 0.3;
  return successScore + speedScore + usageScore;
}
```

### Hot-Reload Configuration

```typescript
import { watch } from 'fs';

const registry = new EnhancedModelRegistry({
  modelsConfigPath: './config/models-config.json',
  autoSave: true
});

// Initial load
await registry.loadFromConfig();

// Watch for config changes
watch('./config/models-config.json', async (eventType) => {
  if (eventType === 'change') {
    console.log('Config file changed, reloading...');

    // Clear and reload
    registry.clearRegistry();
    await registry.loadFromConfig();

    console.log('Registry reloaded successfully');
  }
});
```

## Migration Guide

### From Hardcoded Models

**Before:**
```typescript
const MODELS = {
  GPT4: { id: 'gpt-4', provider: 'openai', contextWindow: 8192 },
  CLAUDE: { id: 'claude-3-opus', provider: 'claude', contextWindow: 200000 }
};

function getModel(name: string) {
  return MODELS[name];
}
```

**After:**
```typescript
import { EnhancedModelRegistry, ProviderType } from '@noa/ai-provider';

const registry = new EnhancedModelRegistry({
  modelsConfigPath: './config/models-config.json',
  autoLoadConfig: true
});

function getModel(provider: ProviderType, id: string) {
  return registry.getModelByProviderAndId(provider, id);
}

// Benefits:
// - Centralized configuration
// - Cost tracking
// - Rate limit enforcement
// - Performance metrics
// - Hot-reload support
```

### From Legacy ModelRegistry to EnhancedModelRegistry

```typescript
import { ModelRegistry, EnhancedModelRegistry } from '@noa/ai-provider';

// Old registry
const oldRegistry = new ModelRegistry();

// Export data
const data = oldRegistry.exportToJSON();
const models = JSON.parse(data);

// Migrate to enhanced registry
const newRegistry = new EnhancedModelRegistry();

// Add cost and rate limit info during migration
const enhancedModels = models.map(model => ({
  ...model,
  version: model.version || '1.0.0',
  cost: {
    inputTokens: 0.01,
    outputTokens: 0.03,
    currency: 'USD',
    per: 1000
  },
  rateLimit: {
    requestsPerMinute: 500,
    tokensPerMinute: 100000
  }
}));

newRegistry.registerModels(enhancedModels);
await newRegistry.save();
```

## Best Practices

1. **Use Configuration Files**: Store model definitions in `models-config.json` for centralized management

2. **Enable Auto-Save**: Set `autoSave: true` to automatically persist state

3. **Track Usage**: Always call `recordUsage()` after API requests for accurate cost tracking

4. **Check Rate Limits**: Use `checkRateLimit()` before making requests to prevent quota violations

5. **Monitor Costs**: Regularly check usage statistics and set budget alerts

6. **Version Models**: Use semantic versioning to track model updates

7. **Tag Models**: Use metadata tags for easier filtering (e.g., 'production', 'testing', 'recommended')

8. **Performance Tracking**: Update performance metrics periodically for optimal model selection

9. **Backup Registry**: Periodically export registry to backup files

10. **Handle Deprecation**: Mark old models as `DEPRECATED` instead of removing them immediately

## Events

The registry emits events for monitoring and integration:

```typescript
registry.on('model-registered', ({ key, model }) => {
  console.log(`Model registered: ${key}`);
});

registry.on('model-updated', ({ key, model }) => {
  console.log(`Model updated: ${key}`);
});

registry.on('model-unregistered', ({ key }) => {
  console.log(`Model unregistered: ${key}`);
});

registry.on('usage-recorded', ({ key, inputTokens, outputTokens, totalCost }) => {
  console.log(`Usage: ${key} - $${totalCost.toFixed(4)}`);
});

registry.on('usage-reset', ({ key }) => {
  console.log(`Usage reset: ${key}`);
});

registry.on('config-loaded', ({ path, modelCount }) => {
  console.log(`Config loaded: ${modelCount} models from ${path}`);
});

registry.on('registry-saved', ({ path }) => {
  console.log(`Registry saved to ${path}`);
});

registry.on('registry-loaded', ({ path, modelCount }) => {
  console.log(`Registry loaded: ${modelCount} models from ${path}`);
});
```

## Troubleshooting

### Registry not persisting

Ensure the `persistencePath` directory exists and has write permissions:

```typescript
import { mkdirSync } from 'fs';

const dataDir = './data';
mkdirSync(dataDir, { recursive: true });

const registry = new EnhancedModelRegistry({
  persistencePath: `${dataDir}/model-registry.json`
});
```

### Config file not loading

Check file path and JSON syntax:

```typescript
try {
  await registry.loadFromConfig('./config/models-config.json');
} catch (error) {
  console.error('Failed to load config:', error);
  // Validate JSON syntax in models-config.json
}
```

### High memory usage

Limit the number of models or disable auto-save:

```typescript
const registry = new EnhancedModelRegistry({
  autoSave: false // Manually save when needed
});

// Save periodically
setInterval(() => {
  registry.save().catch(console.error);
}, 300000); // Every 5 minutes
```

## License

MIT

## Support

For issues and questions, please visit:
- GitHub: https://github.com/your-org/noa-server
- Documentation: https://docs.noa-server.com
