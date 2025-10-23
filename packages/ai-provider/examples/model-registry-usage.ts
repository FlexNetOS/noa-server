/**
 * Model Registry Usage Examples
 *
 * This file demonstrates practical usage patterns for the Enhanced Model Registry.
 */

import {
  EnhancedModelRegistry,
  ExtendedModelInfo,
  ProviderType,
  ModelCapability,
  ModelStatus
} from '../src';

// ============================================================================
// Example 1: Initialize and Register Models
// ============================================================================

async function example1_BasicRegistration() {
  console.log('\n=== Example 1: Basic Model Registration ===\n');

  const registry = new EnhancedModelRegistry({
    persistencePath: './data/model-registry.json',
    autoSave: true,
    autoLoadConfig: false
  });

  // Register GPT-4
  const gpt4: ExtendedModelInfo = {
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
    },
    metadata: {
      tags: ['recommended', 'production'],
      description: 'Most capable GPT-4 model with 128K context'
    }
  };

  const gpt4Key = registry.registerModel(gpt4);
  console.log(`Registered: ${gpt4Key}`);

  // Register Claude
  const claude: ExtendedModelInfo = {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: ProviderType.CLAUDE,
    version: '3.0.0',
    contextWindow: 200000,
    maxTokens: 4096,
    capabilities: [
      ModelCapability.CHAT_COMPLETION,
      ModelCapability.VISION,
      ModelCapability.FUNCTION_CALLING
    ],
    cost: {
      inputTokens: 0.015,
      outputTokens: 0.075,
      currency: 'USD',
      per: 1000
    },
    rateLimit: {
      requestsPerMinute: 50,
      tokensPerMinute: 40000
    },
    metadata: {
      tags: ['flagship', 'high-performance']
    }
  };

  const claudeKey = registry.registerModel(claude);
  console.log(`Registered: ${claudeKey}`);

  console.log(`\nTotal models: ${registry.listModels().length}`);

  registry.destroy();
}

// ============================================================================
// Example 2: Cost Tracking
// ============================================================================

async function example2_CostTracking() {
  console.log('\n=== Example 2: Cost Tracking ===\n');

  const registry = new EnhancedModelRegistry({ autoSave: false });

  // Register a model
  const model: ExtendedModelInfo = {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: ProviderType.OPENAI,
    version: '1.0.0',
    contextWindow: 8192,
    maxTokens: 4096,
    capabilities: [ModelCapability.CHAT_COMPLETION],
    cost: {
      inputTokens: 0.03,
      outputTokens: 0.06,
      currency: 'USD',
      per: 1000
    },
    rateLimit: {
      requestsPerMinute: 200,
      tokensPerMinute: 40000
    }
  };

  const key = registry.registerModel(model);

  // Simulate API requests
  console.log('Simulating 5 API requests...\n');

  const requests = [
    { input: 1500, output: 800, success: true },
    { input: 2000, output: 1200, success: true },
    { input: 1000, output: 500, success: true },
    { input: 500, output: 300, success: false }, // Failed request
    { input: 3000, output: 1500, success: true }
  ];

  requests.forEach(({ input, output, success }) => {
    registry.recordUsage(key, input, output, success);
    const cost = registry.estimateCost(key, input, output);
    console.log(
      `Request: ${input} in, ${output} out, ${success ? 'SUCCESS' : 'FAILED'}, Cost: $${cost.toFixed(4)}`
    );
  });

  // Get usage statistics
  const stats = registry.getUsageStats(key);
  console.log('\n--- Usage Statistics ---');
  console.log(`Total Requests: ${stats?.requestCount}`);
  console.log(`Successful: ${stats?.successfulRequests}`);
  console.log(`Failed: ${stats?.failedRequests}`);
  console.log(`Total Input Tokens: ${stats?.totalInputTokens.toLocaleString()}`);
  console.log(`Total Output Tokens: ${stats?.totalOutputTokens.toLocaleString()}`);
  console.log(`Total Cost: $${stats?.totalCost.toFixed(4)}`);
  console.log(`Success Rate: ${((stats?.successfulRequests || 0) / (stats?.requestCount || 1) * 100).toFixed(2)}%`);

  registry.destroy();
}

// ============================================================================
// Example 3: Rate Limiting
// ============================================================================

async function example3_RateLimiting() {
  console.log('\n=== Example 3: Rate Limiting ===\n');

  const registry = new EnhancedModelRegistry({ autoSave: false });

  const model: ExtendedModelInfo = {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: ProviderType.OPENAI,
    version: '1.1.0',
    contextWindow: 16385,
    maxTokens: 4096,
    capabilities: [ModelCapability.CHAT_COMPLETION],
    cost: {
      inputTokens: 0.0005,
      outputTokens: 0.0015,
      currency: 'USD',
      per: 1000
    },
    rateLimit: {
      requestsPerMinute: 3500,
      tokensPerMinute: 250000,
      requestsPerDay: 10000
    }
  };

  const key = registry.registerModel(model);

  // Test various token counts
  const testCases = [
    { tokens: 100000, shouldPass: true },
    { tokens: 200000, shouldPass: true },
    { tokens: 300000, shouldPass: false } // Exceeds limit
  ];

  testCases.forEach(({ tokens, shouldPass }) => {
    const result = registry.checkRateLimit(key, tokens);
    const status = result.allowed ? 'ALLOWED' : 'BLOCKED';
    console.log(`${tokens.toLocaleString()} tokens: ${status}`);
    if (!result.allowed) {
      console.log(`  Reason: ${result.reason}`);
    }
  });

  registry.destroy();
}

// ============================================================================
// Example 4: Version Management
// ============================================================================

async function example4_VersionManagement() {
  console.log('\n=== Example 4: Version Management ===\n');

  const registry = new EnhancedModelRegistry({ autoSave: false });

  // Register multiple versions
  const models: ExtendedModelInfo[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4 v1.0',
      provider: ProviderType.OPENAI,
      version: '1.0.0',
      contextWindow: 8192,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION],
      cost: { inputTokens: 0.03, outputTokens: 0.06, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 200, tokensPerMinute: 40000 }
    },
    {
      id: 'gpt-4-v2',
      name: 'GPT-4 v2.0',
      provider: ProviderType.OPENAI,
      version: '2.0.0',
      contextWindow: 32000,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION],
      cost: { inputTokens: 0.02, outputTokens: 0.04, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 300, tokensPerMinute: 60000 }
    },
    {
      id: 'gpt-4-v3',
      name: 'GPT-4 v3.0',
      provider: ProviderType.OPENAI,
      version: '3.0.0',
      contextWindow: 128000,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION],
      cost: { inputTokens: 0.01, outputTokens: 0.03, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 500, tokensPerMinute: 150000 }
    }
  ];

  registry.registerModels(models);

  // Version comparison
  console.log('Version Comparisons:');
  console.log(`v2.0.0 vs v1.0.0: ${registry.compareVersions('2.0.0', '1.0.0')}`);
  console.log(`v1.0.0 vs v3.0.0: ${registry.compareVersions('1.0.0', '3.0.0')}`);

  // Get models by version range
  console.log('\nModels between v1.5.0 and v2.5.0:');
  const rangeModels = registry.getModelsByVersionRange('1.5.0', '2.5.0');
  rangeModels.forEach(m => console.log(`  - ${m.name} (v${m.version})`));

  // Search by minimum version
  console.log('\nModels v2.0.0 or newer:');
  const newModels = registry.searchModels({ minVersion: '2.0.0' });
  newModels.forEach(m => console.log(`  - ${m.name} (v${m.version})`));

  registry.destroy();
}

// ============================================================================
// Example 5: Advanced Search
// ============================================================================

async function example5_AdvancedSearch() {
  console.log('\n=== Example 5: Advanced Search ===\n');

  const registry = new EnhancedModelRegistry({ autoSave: false });

  // Register diverse models
  const models: ExtendedModelInfo[] = [
    {
      id: 'gpt-4-expensive',
      name: 'GPT-4 Expensive',
      provider: ProviderType.OPENAI,
      version: '1.0.0',
      contextWindow: 8192,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION, ModelCapability.FUNCTION_CALLING],
      cost: { inputTokens: 0.1, outputTokens: 0.3, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 100, tokensPerMinute: 20000 },
      metadata: { tags: ['premium', 'high-quality'] }
    },
    {
      id: 'gpt-3.5-cheap',
      name: 'GPT-3.5 Cheap',
      provider: ProviderType.OPENAI,
      version: '1.1.0',
      contextWindow: 16385,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION],
      cost: { inputTokens: 0.001, outputTokens: 0.002, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 3500, tokensPerMinute: 250000 },
      metadata: { tags: ['cost-effective', 'fast'] }
    },
    {
      id: 'claude-vision',
      name: 'Claude Vision',
      provider: ProviderType.CLAUDE,
      version: '3.0.0',
      contextWindow: 200000,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION, ModelCapability.VISION],
      cost: { inputTokens: 0.015, outputTokens: 0.075, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 },
      metadata: { tags: ['vision', 'multimodal'] }
    }
  ];

  registry.registerModels(models);

  // Search 1: Cost-effective models
  console.log('Cost-Effective Models (max $0.002 per token):');
  const cheapModels = registry.searchModels({ maxCostPerToken: 0.002 });
  cheapModels.forEach(m => {
    const avgCost = (m.cost.inputTokens + m.cost.outputTokens) / (2 * m.cost.per);
    console.log(`  - ${m.name}: $${avgCost.toFixed(6)} per token`);
  });

  // Search 2: Vision-capable models
  console.log('\nVision-Capable Models:');
  const visionModels = registry.searchModels({
    capability: ModelCapability.VISION
  });
  visionModels.forEach(m => console.log(`  - ${m.name}`));

  // Search 3: OpenAI models with large context
  console.log('\nOpenAI models with 16K+ context:');
  const largeContext = registry.searchModels({
    provider: ProviderType.OPENAI,
    minContextWindow: 16000
  });
  largeContext.forEach(m => console.log(`  - ${m.name}: ${m.contextWindow.toLocaleString()} tokens`));

  // Search 4: Models by tag
  console.log('\nModels tagged "cost-effective":');
  const tagged = registry.searchModels({ tags: ['cost-effective'] });
  tagged.forEach(m => console.log(`  - ${m.name}`));

  registry.destroy();
}

// ============================================================================
// Example 6: Cost Optimization
// ============================================================================

async function example6_CostOptimization() {
  console.log('\n=== Example 6: Cost Optimization ===\n');

  const registry = new EnhancedModelRegistry({ autoSave: false });

  // Register models
  const models: ExtendedModelInfo[] = [
    {
      id: 'premium-model',
      name: 'Premium Model',
      provider: ProviderType.OPENAI,
      version: '1.0.0',
      contextWindow: 8192,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION],
      cost: { inputTokens: 0.1, outputTokens: 0.3, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 100, tokensPerMinute: 20000 }
    },
    {
      id: 'balanced-model',
      name: 'Balanced Model',
      provider: ProviderType.OPENAI,
      version: '1.0.0',
      contextWindow: 8192,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION],
      cost: { inputTokens: 0.01, outputTokens: 0.03, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 500, tokensPerMinute: 100000 }
    },
    {
      id: 'budget-model',
      name: 'Budget Model',
      provider: ProviderType.OPENAI,
      version: '1.0.0',
      contextWindow: 8192,
      maxTokens: 4096,
      capabilities: [ModelCapability.CHAT_COMPLETION],
      cost: { inputTokens: 0.001, outputTokens: 0.002, currency: 'USD', per: 1000 },
      rateLimit: { requestsPerMinute: 3500, tokensPerMinute: 250000 }
    }
  ];

  registry.registerModels(models);

  // Get most cost-effective
  console.log('Most Cost-Effective Models:');
  const costEffective = registry.getMostCostEffectiveModels(3);
  costEffective.forEach((model, index) => {
    const avgCost = (model.cost.inputTokens + model.cost.outputTokens) / (2 * model.cost.per);
    console.log(`  ${index + 1}. ${model.name}: $${avgCost.toFixed(6)} per token`);
  });

  // Estimate costs for a typical request
  const inputTokens = 2000;
  const outputTokens = 1000;

  console.log(`\nCost Comparison for ${inputTokens} input + ${outputTokens} output tokens:`);
  registry.listModels().forEach(model => {
    const key = `${model.provider}:${model.id}`;
    const cost = registry.estimateCost(key, inputTokens, outputTokens);
    console.log(`  ${model.name}: $${cost.toFixed(4)}`);
  });

  registry.destroy();
}

// ============================================================================
// Example 7: Load from Configuration
// ============================================================================

async function example7_LoadFromConfig() {
  console.log('\n=== Example 7: Load from Configuration ===\n');

  const registry = new EnhancedModelRegistry({
    modelsConfigPath: './src/config/models-config.json',
    autoLoadConfig: false,
    autoSave: false
  });

  try {
    // Load models from config file
    await registry.loadFromConfig();

    console.log(`Loaded ${registry.listModels().length} models from config`);

    // Show loaded models
    console.log('\nLoaded Models:');
    registry.listModels().forEach(model => {
      console.log(`  - ${model.name} (${model.provider}:${model.id}) v${model.version}`);
    });

    // Show statistics
    const stats = registry.getStatistics();
    console.log('\nStatistics:');
    console.log(`  Total Models: ${stats.totalModels}`);
    console.log(`  Providers:`, stats.providerCounts);

  } catch (error) {
    console.error('Failed to load config:', error);
  }

  registry.destroy();
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('='.repeat(80));
  console.log('Enhanced Model Registry - Usage Examples');
  console.log('='.repeat(80));

  await example1_BasicRegistration();
  await example2_CostTracking();
  await example3_RateLimiting();
  await example4_VersionManagement();
  await example5_AdvancedSearch();
  await example6_CostOptimization();
  await example7_LoadFromConfig();

  console.log('\n' + '='.repeat(80));
  console.log('All examples completed!');
  console.log('='.repeat(80) + '\n');
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  example1_BasicRegistration,
  example2_CostTracking,
  example3_RateLimiting,
  example4_VersionManagement,
  example5_AdvancedSearch,
  example6_CostOptimization,
  example7_LoadFromConfig
};
