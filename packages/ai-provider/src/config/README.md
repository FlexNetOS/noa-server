# Model Configuration Files

This directory contains model registry configuration files for the Enhanced Model Registry system.

## Files

### models-config.json

Complete model definitions for all supported AI providers:

**Providers Included:**
- **OpenAI**: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Claude (Anthropic)**: Claude 3 Opus, Sonnet, Haiku
- **llama.cpp (Self-Hosted)**: Llama 3.1, Phi-3.5, Qwen2, custom models

**Model Configuration Structure:**
```json
{
  "id": "model-identifier",
  "name": "Model Display Name",
  "provider": "openai|claude|llama.cpp",
  "version": "1.0.0",
  "contextWindow": 128000,
  "maxTokens": 4096,
  "capabilities": ["chat_completion", "function_calling", "vision", ...],
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
    "description": "Model description",
    "apiEndpoint": "https://api.provider.com/v1/..."
  }
}
```

### models-config.schema.json

JSON Schema for validating model configurations. Use this to validate custom model definitions.

**Validation Features:**
- Semantic versioning enforcement
- Cost configuration validation
- Rate limit specifications
- Capability enumerations
- Provider-specific settings

## Usage

### Load Configuration in Code

```typescript
import { EnhancedModelRegistry } from '@noa/ai-provider';

const registry = new EnhancedModelRegistry({
  modelsConfigPath: './src/config/models-config.json',
  autoLoadConfig: true
});

// Models are automatically loaded on initialization
```

### Add Custom Models

1. Copy an existing model definition
2. Update the `id`, `name`, `provider`, and `version`
3. Adjust `cost` and `rateLimit` for your setup
4. Add to the `models` array in `models-config.json`
5. Registry will hot-reload on file save (if enabled)

### Self-Hosted Models (llama.cpp)

For self-hosted models, set costs to 0:

```json
{
  "cost": {
    "inputTokens": 0,
    "outputTokens": 0,
    "currency": "USD",
    "per": 1000,
    "note": "Self-hosted, no API costs"
  }
}
```

Include model file information in metadata:

```json
{
  "metadata": {
    "modelFile": "/path/to/model.gguf",
    "quantization": "Q4_K_M",
    "fileSize": "4.5GB",
    "requiredRAM": "8GB"
  }
}
```

## Validation

Validate your configuration against the schema:

```bash
# Using ajv-cli
npx ajv validate -s models-config.schema.json -d models-config.json

# Or in code
import { ExtendedModelInfoSchema } from '@noa/ai-provider';

const model = { /* your model config */ };
const result = ExtendedModelInfoSchema.safeParse(model);

if (!result.success) {
  console.error('Validation errors:', result.error);
}
```

## Provider-Specific Notes

### OpenAI

- Rate limits vary by account tier
- Context windows updated frequently (check OpenAI docs)
- Vision capability requires GPT-4 Turbo or GPT-4V

### Claude (Anthropic)

- Large context windows (200K tokens)
- Higher per-token costs but excellent quality
- Vision capability in Opus and Sonnet

### llama.cpp (Self-Hosted)

- No API costs
- Rate limits based on hardware
- Requires local model files (GGUF format)
- Context window depends on model and available VRAM
- Quantization affects quality and speed

## Best Practices

1. **Keep Costs Updated**: Check provider pricing regularly
2. **Tag Strategically**: Use tags for filtering (`production`, `testing`, `recommended`)
3. **Version Properly**: Use semantic versioning (MAJOR.MINOR.PATCH)
4. **Document Changes**: Add notes for custom models
5. **Backup Config**: Version control this file
6. **Test After Changes**: Validate schema and test registry loading

## Hot-Reload

Enable hot-reload to automatically update registry when config changes:

```typescript
const registry = new EnhancedModelRegistry({
  modelsConfigPath: './config/models-config.json',
  autoLoadConfig: true
});

// Watch for file changes
import { watch } from 'fs';

watch('./config/models-config.json', async () => {
  console.log('Config changed, reloading...');
  registry.clearRegistry();
  await registry.loadFromConfig();
});
```

## Support

For issues or questions:
- See main documentation: `docs/model-registry.md`
- GitHub: https://github.com/your-org/noa-server
