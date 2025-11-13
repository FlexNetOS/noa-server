# Model Management System - Quick Start Guide

## Installation

The Model Management System is included in the `@noa/ai-provider` package.

```bash
# Install dependencies
pnpm install

# Build the packages
pnpm run build:all
```

## 5-Minute Setup

### 1. Environment Configuration

Create a `.env` file in your project root:

```bash
# Provider API Keys
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...

# Optional: llama.cpp server
LLAMA_CPP_BASE_URL=http://localhost:8080

# Model Manager Settings
MODEL_MANAGER_MAX_LOADED=10
MODEL_MANAGER_PERSISTENCE_PATH=./data/model-manager-state.json
```

### 2. Basic Usage

```typescript
import {
  EnhancedModelManager,
  ProviderFactory,
  ConfigurationManager,
  ProviderType
} from '@noa/ai-provider';

// Initialize
const factory = ProviderFactory.getInstance();
const config = ConfigurationManager.getInstance();

// Load configuration from environment
config.loadFromEnvironment('AI_');

// Create manager
const manager = new EnhancedModelManager(factory, config, {
  enablePersistence: true,
  enablePerformanceTracking: true,
  maxLoadedModels: 5
});

// Initialize (discovers models, restores state)
await manager.initialize();

// Load a model
const providerConfig = config.getProviderConfig(ProviderType.OPENAI);
const modelKey = await manager.loadModel(providerConfig!, 'gpt-4', {
  warmup: true
});

console.log(`Loaded model: ${modelKey}`);

// Get current model
const current = manager.getCurrentModel();
console.log('Active model:', current?.model.name);

// List all loaded models
const loaded = manager.getLoadedModels();
console.log(`${loaded.length} models loaded`);
```

### 3. Start the API Server

```bash
cd packages/ai-inference-api
npm run start:dev
```

The API will be available at `http://localhost:3001`

## Common Operations

### Load and Switch Models

```bash
# Load a model
curl -X POST http://localhost:3001/api/v1/models/load \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "model": "gpt-4"}'

# Switch to a different model
curl -X POST http://localhost:3001/api/v1/models/switch \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "model": "gpt-3.5-turbo"}'

# Get current model
curl http://localhost:3001/api/v1/models/current
```

### List and Search Models

```bash
# List all models
curl http://localhost:3001/api/v1/models

# List loaded models
curl http://localhost:3001/api/v1/models/loaded

# Filter by provider
curl "http://localhost:3001/api/v1/models?provider=openai"

# Filter by capability
curl "http://localhost:3001/api/v1/models?capability=chat_completion"
```

### Performance Profiling

```bash
# Profile a model
curl -X POST http://localhost:3001/api/v1/models/openai:gpt-4/profile \
  -H "Content-Type: application/json" \
  -d '{"testCount": 10}'

# Get model capabilities
curl http://localhost:3001/api/v1/models/openai:gpt-4/capabilities

# Get statistics
curl http://localhost:3001/api/v1/models/statistics
```

## Integration Patterns

### Pattern 1: Express Middleware

```typescript
import { Request, Response, NextFunction } from 'express';
import { EnhancedModelManager } from '@noa/ai-provider';

let modelManager: EnhancedModelManager;

// Middleware to ensure model is loaded
export const ensureModelLoaded = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const current = modelManager.getCurrentModel();

  if (!current) {
    // Load default model
    const config = ConfigurationManager.getInstance();
    const providerConfig = config.getDefaultProviderConfig();
    if (providerConfig?.defaultModel) {
      await modelManager.loadModel(
        providerConfig,
        providerConfig.defaultModel
      );
    } else {
      return res.status(503).json({
        error: 'No model available'
      });
    }
  }

  next();
};

// Use in routes
app.post('/chat', ensureModelLoaded, async (req, res) => {
  // Use current model for inference
  const current = modelManager.getCurrentModel();
  // ... inference logic
});
```

### Pattern 2: Model Selection Strategy

```typescript
import { ModelCapability } from '@noa/ai-provider';

class ModelSelector {
  constructor(private manager: EnhancedModelManager) {}

  async selectBestForTask(
    task: 'chat' | 'embedding' | 'vision'
  ): Promise<string> {
    const capability = this.mapTaskToCapability(task);
    const registry = this.manager.getRegistry();

    // Find best performing model for capability
    const candidates = registry
      .getModelsByCapability(capability)
      .filter(m => m.performanceMetrics);

    if (candidates.length === 0) {
      throw new Error(`No model found for task: ${task}`);
    }

    // Sort by performance score
    candidates.sort((a, b) => {
      const scoreA = this.calculateScore(a);
      const scoreB = this.calculateScore(b);
      return scoreB - scoreA;
    });

    const best = candidates[0];
    const key = `${best.provider}:${best.id}`;

    // Load if not already loaded
    const loaded = this.manager.getLoadedModels();
    if (!loaded.find(m => m.key === key)) {
      const config = ConfigurationManager.getInstance();
      const providerConfig = config.getProviderConfig(best.provider);
      if (providerConfig) {
        await this.manager.loadModel(providerConfig, best.id);
      }
    }

    return key;
  }

  private mapTaskToCapability(task: string): ModelCapability {
    switch (task) {
      case 'chat':
        return ModelCapability.CHAT_COMPLETION;
      case 'embedding':
        return ModelCapability.EMBEDDINGS;
      case 'vision':
        return ModelCapability.VISION;
      default:
        return ModelCapability.TEXT_GENERATION;
    }
  }

  private calculateScore(model: any): number {
    if (!model.performanceMetrics) return 0;
    const m = model.performanceMetrics;
    return m.successRate * 0.5 + Math.min(m.tokensPerSecond / 100, 1) * 0.5;
  }
}

// Usage
const selector = new ModelSelector(manager);
const bestChatModel = await selector.selectBestForTask('chat');
await manager.switchModel(bestChatModel);
```

### Pattern 3: Cost-Optimized Selection

```typescript
interface ModelCost {
  provider: string;
  modelId: string;
  costPerToken: number;
}

const modelCosts: ModelCost[] = [
  { provider: 'openai', modelId: 'gpt-4', costPerToken: 0.00003 },
  { provider: 'openai', modelId: 'gpt-3.5-turbo', costPerToken: 0.000002 },
  { provider: 'claude', modelId: 'claude-3', costPerToken: 0.00002 }
];

async function selectCostEffectiveModel(
  maxBudgetPerRequest: number,
  estimatedTokens: number
): Promise<string> {
  const registry = manager.getRegistry();

  // Filter models within budget
  const affordableModels = modelCosts.filter(
    cost => cost.costPerToken * estimatedTokens <= maxBudgetPerRequest
  );

  // Find best performing affordable model
  for (const cost of affordableModels) {
    const key = `${cost.provider}:${cost.modelId}`;
    const model = registry.getModel(key);

    if (model?.performanceMetrics &&
        model.performanceMetrics.successRate > 0.95) {
      return key;
    }
  }

  // Fallback to cheapest
  affordableModels.sort((a, b) => a.costPerToken - b.costPerToken);
  return `${affordableModels[0].provider}:${affordableModels[0].modelId}`;
}
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run model manager tests
pnpm test packages/ai-provider/src/managers/__tests__

# Watch mode
pnpm test:watch
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { EnhancedModelManager } from '@noa/ai-provider';

describe('Model Manager Integration', () => {
  it('should load and switch models', async () => {
    const manager = new EnhancedModelManager(factory, config);
    await manager.initialize();

    // Load first model
    const key1 = await manager.loadModel(openaiConfig, 'gpt-4');
    expect(manager.getCurrentModel()?.key).toBe(key1);

    // Load second model
    const key2 = await manager.loadModel(openaiConfig, 'gpt-3.5-turbo');

    // Switch
    await manager.switchModel(key2);
    expect(manager.getCurrentModel()?.key).toBe(key2);

    // Cleanup
    await manager.destroy();
  });
});
```

## Monitoring and Observability

### Log Important Events

```typescript
manager.on('model-loaded', (event) => {
  console.log(`[MODEL] Loaded: ${event.model.name}`);
  console.log(`[MODEL] Provider: ${event.model.provider}`);
  console.log(`[MODEL] Capabilities: ${event.model.capabilities.join(', ')}`);
});

manager.on('model-switched', (event) => {
  console.log(`[MODEL] Switched from ${event.previousModel} to ${event.currentModel}`);
  console.log(`[MODEL] Reason: ${event.reason}`);
});

manager.on('profiling-completed', (event) => {
  console.log(`[PROFILE] Model: ${event.key}`);
  console.log(`[PROFILE] Latency: ${event.metrics.averageLatency}ms`);
  console.log(`[PROFILE] Speed: ${event.metrics.tokensPerSecond} tok/s`);
  console.log(`[PROFILE] Success Rate: ${event.metrics.successRate * 100}%`);
});
```

### Prometheus Metrics

```typescript
import { Counter, Gauge, Histogram } from 'prom-client';

const modelLoadsCounter = new Counter({
  name: 'model_loads_total',
  help: 'Total number of model loads',
  labelNames: ['provider', 'model']
});

const modelSwitchesCounter = new Counter({
  name: 'model_switches_total',
  help: 'Total number of model switches'
});

const loadedModelsGauge = new Gauge({
  name: 'models_loaded',
  help: 'Number of currently loaded models'
});

const inferenceLatency = new Histogram({
  name: 'inference_latency_seconds',
  help: 'Inference latency in seconds',
  labelNames: ['model']
});

// Update metrics on events
manager.on('model-loaded', (event) => {
  modelLoadsCounter.inc({
    provider: event.model.provider,
    model: event.model.id
  });
  loadedModelsGauge.set(manager.getLoadedModels().length);
});

manager.on('model-switched', () => {
  modelSwitchesCounter.inc();
});

// Record inference metrics
manager.on('inference-complete', (event) => {
  inferenceLatency.observe(
    { model: event.modelKey },
    event.latency / 1000
  );
  manager.recordInference(
    event.modelKey,
    event.latency,
    event.tokensGenerated,
    true
  );
});
```

## Troubleshooting

### Problem: Model not loading

```typescript
// Enable debug logging
manager.on('model-load-error', (event) => {
  console.error('Failed to load model:', event.key);
  console.error('Error:', event.error);
});

// Check provider configuration
const providerConfig = config.getProviderConfig(ProviderType.OPENAI);
console.log('Provider config:', providerConfig);

// Verify API keys
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not set');
}
```

### Problem: Performance degradation

```typescript
// Profile all loaded models
for (const model of manager.getLoadedModels()) {
  const metrics = await manager.profileModel(model.key, 5);
  console.log(`${model.key}:`, metrics);
}

// Check statistics
const stats = manager.getStatistics();
console.log('Total inferences:', stats.totalInferences);
console.log('Loaded models:', stats.loadedModels);
```

### Problem: State not persisting

```typescript
// Manually save state
await manager.saveState();

// Check file permissions
const fs = require('fs');
const path = manager.config.persistencePath;
try {
  fs.accessSync(path, fs.constants.W_OK);
  console.log('Persistence path writable');
} catch (err) {
  console.error('Cannot write to persistence path:', err);
}
```

## Next Steps

1. **Read Full Documentation**: See [MODEL_MANAGEMENT_SYSTEM.md](./MODEL_MANAGEMENT_SYSTEM.md)
2. **Explore API Reference**: Visit http://localhost:3001/api-docs
3. **Review Examples**: Check `/examples` directory
4. **Join Community**: GitHub Discussions

## Resources

- **Documentation**: `/docs`
- **API Reference**: `/api-docs`
- **Examples**: `/examples`
- **Tests**: `/packages/ai-provider/src/managers/__tests__`

## Support

For issues and questions:
- GitHub Issues: Report bugs and feature requests
- Documentation: Comprehensive guides in `/docs`
- API Docs: Interactive API documentation at `/api-docs`
