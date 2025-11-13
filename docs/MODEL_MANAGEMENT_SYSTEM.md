# Model Management System Documentation

## Overview

The Model Management System provides a comprehensive solution for loading, switching, and managing AI models across multiple providers (OpenAI, Claude, llama.cpp). It features dynamic model loading, runtime switching, capability detection, performance profiling, and persistent state management.

## Architecture

### Components

1. **ModelRegistry**: Central repository for model metadata and discovery
2. **EnhancedModelManager**: Advanced model lifecycle management with hot-swapping
3. **AI Inference API**: REST API endpoints for model operations
4. **State Persistence**: Automatic save/restore of manager state

### Directory Structure

```
packages/
├── ai-provider/
│   └── src/
│       └── managers/
│           ├── model-manager.ts          # Basic model manager
│           ├── model-registry.ts         # Model registry and metadata
│           └── enhanced-model-manager.ts # Advanced management features
└── ai-inference-api/
    └── src/
        └── routes/
            └── models.ts                  # Model management API endpoints
```

## Features

### 1. Model Registry

**Purpose**: Centralized model discovery and metadata storage

**Key Features**:
- Register models from multiple providers
- Track access patterns and usage statistics
- Search and filter models by capabilities, provider, status
- Performance metrics storage
- Automatic persistence to disk

**Usage**:

```typescript
import { ModelRegistry } from '@noa/ai-provider';

const registry = new ModelRegistry({
  persistencePath: './data/model-registry.json',
  autoSave: true,
  autoSaveInterval: 60000 // 1 minute
});

// Register a model
const key = registry.registerModel({
  id: 'gpt-4',
  name: 'GPT-4',
  provider: ProviderType.OPENAI,
  contextWindow: 8192,
  maxTokens: 4096,
  capabilities: [
    ModelCapability.CHAT_COMPLETION,
    ModelCapability.FUNCTION_CALLING
  ]
});

// Search models
const chatModels = registry.getModelsByCapability(
  ModelCapability.CHAT_COMPLETION
);

// Get statistics
const stats = registry.getStatistics();
console.log(`Total models: ${stats.totalModels}`);
console.log(`Total accesses: ${stats.totalAccesses}`);
```

### 2. Enhanced Model Manager

**Purpose**: Advanced model lifecycle management with hot-swapping

**Key Features**:
- Dynamic model loading without restart
- Model switching with zero downtime
- Performance profiling and benchmarking
- Automatic capability detection
- LRU eviction policy for memory management
- State persistence and recovery

**Usage**:

```typescript
import {
  EnhancedModelManager,
  ProviderFactory,
  ConfigurationManager
} from '@noa/ai-provider';

const factory = ProviderFactory.getInstance();
const config = ConfigurationManager.getInstance();

const manager = new EnhancedModelManager(factory, config, {
  enablePersistence: true,
  enablePerformanceTracking: true,
  enableAutoSwitch: false,
  maxLoadedModels: 10
});

// Initialize (discovers models, restores state)
await manager.initialize();

// Load a model
const providerConfig = config.getProviderConfig(ProviderType.OPENAI);
const key = await manager.loadModel(providerConfig, 'gpt-4', {
  warmup: true
});

// Switch models at runtime
await manager.switchModel(key, 'user_preference');

// Profile performance
const metrics = await manager.profileModel(key, 10);
console.log(`Average latency: ${metrics.averageLatency}ms`);
console.log(`Tokens/sec: ${metrics.tokensPerSecond}`);

// Get current model
const current = manager.getCurrentModel();
console.log(`Active model: ${current?.model.name}`);
```

### 3. Model Status Lifecycle

```
AVAILABLE → LOADING → LOADED → UNLOADED
                 ↓
              FAILED
```

**Status Descriptions**:
- `AVAILABLE`: Model is registered but not loaded
- `LOADING`: Model is being loaded into memory
- `LOADED`: Model is active and ready for inference
- `FAILED`: Model failed to load
- `UNLOADED`: Model was previously loaded but has been removed

### 4. Performance Metrics

The system tracks comprehensive performance metrics for each model:

```typescript
interface ModelPerformanceMetrics {
  averageLatency: number;        // milliseconds
  tokensPerSecond: number;       // generation speed
  totalInferences: number;       // usage count
  successRate: number;           // 0.0 to 1.0
  lastBenchmarked: Date;
  memoryUsage?: number;          // MB
}
```

### 5. Capability Detection

Automatic and intelligent capability detection:

**Declared Capabilities** (from provider):
- `TEXT_GENERATION`
- `CHAT_COMPLETION`
- `EMBEDDINGS`
- `FUNCTION_CALLING`
- `VISION`
- `STREAMING`
- `JSON_MODE`

**Detection Methods**:
1. Provider-declared capabilities
2. Metadata analysis
3. Model name pattern matching
4. Feature probing (optional)

```typescript
// Detect all capabilities
const capabilities = await manager.detectCapabilities(modelKey);

// Check specific capability
const supportsVision = manager.supportsCapability(
  modelKey,
  ModelCapability.VISION
);
```

## API Endpoints

### Base URL
```
http://localhost:3001/api/v1/models
```

### Endpoints

#### 1. List All Models

```http
GET /api/v1/models
```

**Query Parameters**:
- `provider` (optional): Filter by provider (openai, claude, llama.cpp)
- `capability` (optional): Filter by capability
- `status` (optional): Filter by status

**Response**:
```json
{
  "models": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "openai",
      "contextWindow": 8192,
      "maxTokens": 4096,
      "capabilities": ["chat_completion", "function_calling"]
    }
  ],
  "count": 1
}
```

#### 2. Get Loaded Models

```http
GET /api/v1/models/loaded
```

**Response**:
```json
{
  "models": [...],
  "count": 2,
  "currentModel": {
    "id": "gpt-4",
    "name": "GPT-4",
    "provider": "openai"
  }
}
```

#### 3. Get Current Active Model

```http
GET /api/v1/models/current
```

**Response**:
```json
{
  "model": {
    "key": "openai:gpt-4",
    "model": {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "openai"
    },
    "loadedAt": "2025-10-23T14:30:00Z",
    "totalInferences": 150,
    "performanceMetrics": {
      "averageLatency": 250,
      "tokensPerSecond": 45,
      "successRate": 0.99
    }
  }
}
```

#### 4. Load Model

```http
POST /api/v1/models/load
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4"
}
```

**Response**:
```json
{
  "message": "Model loaded successfully",
  "provider": "openai",
  "model": "gpt-4"
}
```

#### 5. Switch Model

```http
POST /api/v1/models/switch
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-4"
}
```

**Response**:
```json
{
  "message": "Model switched successfully",
  "provider": "openai",
  "model": "gpt-4",
  "currentModel": {...}
}
```

#### 6. Unload Model

```http
POST /api/v1/models/unload
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-3.5-turbo"
}
```

**Response**:
```json
{
  "message": "Model unloaded successfully",
  "provider": "openai",
  "model": "gpt-3.5-turbo"
}
```

#### 7. Get Models by Provider

```http
GET /api/v1/models/{provider}
```

**Example**:
```http
GET /api/v1/models/openai
```

#### 8. Discover Models

```http
POST /api/v1/models/discover
```

Triggers discovery of available models from all configured providers.

#### 9. Profile Model Performance

```http
POST /api/v1/models/{key}/profile
Content-Type: application/json

{
  "testCount": 10
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profiling completed",
  "metrics": {
    "averageLatency": 245,
    "tokensPerSecond": 48,
    "totalInferences": 10,
    "successRate": 1.0,
    "lastBenchmarked": "2025-10-23T14:35:00Z"
  }
}
```

#### 10. Get Model Capabilities

```http
GET /api/v1/models/{key}/capabilities
```

**Response**:
```json
{
  "success": true,
  "key": "openai:gpt-4",
  "capabilities": [
    "chat_completion",
    "function_calling",
    "streaming",
    "json_mode"
  ]
}
```

#### 11. Get Statistics

```http
GET /api/v1/models/statistics
```

**Response**:
```json
{
  "success": true,
  "statistics": {
    "totalModels": 15,
    "loadedModels": 3,
    "currentModel": "openai:gpt-4",
    "totalInferences": 1250,
    "providerCounts": {
      "openai": 8,
      "claude": 4,
      "llama.cpp": 3
    },
    "capabilityCounts": {
      "chat_completion": 15,
      "function_calling": 8,
      "vision": 2
    },
    "statusCounts": {
      "available": 12,
      "loaded": 3
    }
  }
}
```

#### 12. Save State

```http
POST /api/v1/models/save-state
```

Manually trigger state persistence.

## Configuration

### Environment Variables

```bash
# Provider configurations
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
LLAMA_CPP_BASE_URL=http://localhost:8080

# Model manager settings
MODEL_MANAGER_MAX_LOADED=10
MODEL_MANAGER_PERSISTENCE_PATH=./data/model-manager-state.json
MODEL_MANAGER_AUTO_LOAD_DEFAULT=true
MODEL_MANAGER_ENABLE_PERFORMANCE_TRACKING=true
```

### Programmatic Configuration

```typescript
const manager = new EnhancedModelManager(factory, config, {
  defaultProvider: ProviderType.OPENAI,
  autoLoadDefault: true,
  maxLoadedModels: 10,
  enablePersistence: true,
  persistencePath: './data/model-manager-state.json',
  enablePerformanceTracking: true,
  enableAutoSwitch: false,
  autoSwitchThreshold: 0.7
});
```

## Events

The Enhanced Model Manager emits events for monitoring and integration:

```typescript
manager.on('initialized', (event) => {
  console.log('Manager initialized', event);
});

manager.on('model-loading', (event) => {
  console.log('Loading model:', event.key);
});

manager.on('model-loaded', (event) => {
  console.log('Model loaded:', event.model.name);
});

manager.on('model-switched', (event) => {
  console.log(`Switched from ${event.previousModel} to ${event.currentModel}`);
});

manager.on('model-unloaded', (event) => {
  console.log('Model unloaded:', event.key);
});

manager.on('profiling-started', (event) => {
  console.log(`Profiling ${event.key} with ${event.testCount} tests`);
});

manager.on('profiling-completed', (event) => {
  console.log('Profiling results:', event.metrics);
});

manager.on('model-evicted', (event) => {
  console.log('Model evicted (LRU):', event.key);
});

manager.on('state-saved', (event) => {
  console.log('State saved to:', event.path);
});
```

## Best Practices

### 1. Model Loading Strategy

**Preload frequently used models**:
```typescript
// At startup
await manager.loadModel(openaiConfig, 'gpt-4', { warmup: true });
await manager.loadModel(openaiConfig, 'gpt-3.5-turbo', { warmup: true });
```

**Lazy load on-demand**:
```typescript
// Load only when needed
if (!manager.getLoadedModels().find(m => m.key === modelKey)) {
  await manager.loadModel(providerConfig, modelId);
}
```

### 2. Performance Monitoring

**Profile models periodically**:
```typescript
setInterval(async () => {
  for (const model of manager.getLoadedModels()) {
    await manager.profileModel(model.key, 5);
  }
}, 3600000); // Every hour
```

### 3. Memory Management

**Set appropriate limits**:
```typescript
const manager = new EnhancedModelManager(factory, config, {
  maxLoadedModels: 5, // Adjust based on available memory
});
```

**Monitor and unload unused models**:
```typescript
// Unload models not accessed in 1 hour
const oneHourAgo = Date.now() - 3600000;
for (const model of registry.listModels()) {
  if (model.lastAccessed.getTime() < oneHourAgo) {
    await manager.unloadModel(`${model.provider}:${model.id}`);
  }
}
```

### 4. Error Handling

```typescript
try {
  await manager.loadModel(providerConfig, modelId);
} catch (error) {
  if (error instanceof ModelNotFoundError) {
    console.error('Model not found:', modelId);
  } else if (error instanceof ModelLoadError) {
    console.error('Failed to load model:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### 5. State Persistence

**Enable auto-save**:
```typescript
const registry = new ModelRegistry({
  autoSave: true,
  autoSaveInterval: 60000 // Save every minute
});
```

**Manual save on critical events**:
```typescript
manager.on('model-switched', async () => {
  await manager.saveState();
});
```

## Performance Considerations

### Memory Usage

- Each loaded model consumes memory based on model size
- Use `maxLoadedModels` to limit concurrent models
- Monitor system memory and adjust limits accordingly

### Latency

- **First load**: Higher latency (model initialization)
- **Warmup**: Reduces latency for first inference
- **Hot swap**: ~10-50ms switching time

### Throughput

- Multiple loaded models enable parallel inference
- Switch overhead is minimal (~10ms)
- Registry operations are O(1) for most lookups

## Troubleshooting

### Model Load Failures

**Symptom**: Model status shows `FAILED`

**Solutions**:
1. Check provider API keys and configuration
2. Verify model ID is correct
3. Check network connectivity
4. Review provider rate limits

### Memory Issues

**Symptom**: OOM errors or slow performance

**Solutions**:
1. Reduce `maxLoadedModels`
2. Unload unused models
3. Monitor with `manager.getStatistics()`
4. Profile memory usage

### Performance Degradation

**Symptom**: Slow inference times

**Solutions**:
1. Profile models: `await manager.profileModel(key)`
2. Check performance metrics
3. Consider switching to faster model
4. Review network latency to provider

### State Persistence Issues

**Symptom**: State not saving/loading

**Solutions**:
1. Check file permissions on persistence path
2. Verify disk space
3. Review error events: `manager.on('state-save-error', ...)`

## Integration Examples

### Express.js Application

```typescript
import express from 'express';
import {
  EnhancedModelManager,
  ProviderFactory,
  ConfigurationManager
} from '@noa/ai-provider';

const app = express();
const manager = new EnhancedModelManager(
  ProviderFactory.getInstance(),
  ConfigurationManager.getInstance()
);

await manager.initialize();

app.post('/inference', async (req, res) => {
  const current = manager.getCurrentModel();
  if (!current) {
    return res.status(400).json({ error: 'No model loaded' });
  }

  // Use current model for inference
  // ...
});

app.listen(3000);
```

### CLI Tool

```typescript
import { Command } from 'commander';
import { EnhancedModelManager } from '@noa/ai-provider';

const program = new Command();

program
  .command('load <provider> <model>')
  .action(async (provider, model) => {
    await manager.loadModel(providerConfig, model);
    console.log(`Loaded: ${model}`);
  });

program
  .command('list')
  .action(() => {
    const models = manager.getLoadedModels();
    console.table(models);
  });

program.parse();
```

## Migration Guide

### From Basic ModelManager

```typescript
// Before
import { ModelManager } from '@noa/ai-provider';
const manager = new ModelManager(factory, config);

// After
import { EnhancedModelManager } from '@noa/ai-provider';
const manager = new EnhancedModelManager(factory, config);
await manager.initialize();
```

**Key Differences**:
- Enhanced manager requires `await initialize()`
- Uses model keys instead of model IDs
- Additional features: profiling, capabilities, persistence

### API Compatibility

The Enhanced Model Manager maintains backward compatibility with the basic ModelManager API while adding new features.

## Future Enhancements

- [ ] Distributed model registry (multi-node)
- [ ] Model versioning and rollback
- [ ] A/B testing support
- [ ] Cost optimization (auto-switch to cheaper models)
- [ ] GPU memory management
- [ ] Model quantization on-the-fly
- [ ] Batch loading of model sets
- [ ] Health checks and auto-recovery
- [ ] Integration with model observability platforms

## Support

For issues and questions:
- GitHub Issues: [noa-server issues](https://github.com/yourusername/noa-server/issues)
- Documentation: `/docs`
- API Reference: `http://localhost:3001/api-docs`

## License

MIT License - See LICENSE file for details
