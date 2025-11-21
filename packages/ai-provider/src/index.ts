// Main exports for the AI Provider package

// Types and interfaces
export * from './types';

// Provider implementations
export { BaseProvider } from './providers/base';
export { ClaudeProvider } from './providers/claude';
export { LlamaCppProvider } from './providers/llama-cpp';
export { OpenAIProvider } from './providers/openai';

// Factory and configuration utilities
export {
  createProvider,
  createProviderFromEnv,
  createProviders,
  createProvidersFromEnv,
  ProviderFactory,
} from './utils/factory';

export {
  ConfigurationManager,
  createDefaultConfig,
  createProviderConfig,
  DEFAULT_PROVIDER_CONFIGS,
  getConfig,
  getProviderConfig,
  loadConfigFromEnvironment,
  loadConfigFromFile,
  getModelManagerConfig,
  ModelManagerConfig,
} from './utils/config';

// Model management
export { ModelManager } from './managers/model-manager';

// Convenience re-exports for common use cases
export { ModelCapability, ProviderType } from './types';
