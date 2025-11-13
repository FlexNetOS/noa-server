# @noa/ai-provider

A unified AI provider package that provides a consistent interface for different
AI providers including OpenAI, Claude, and llama.cpp. This package abstracts
provider-specific APIs and offers consistent methods for inference, model
management, and capability detection.

## Features

- **Unified Interface**: Consistent API across all supported providers
- **Provider Abstraction**: Easy switching between different AI providers
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Error Handling**: Comprehensive error handling with retry logic
- **Configuration Management**: Flexible configuration via files or environment
  variables
- **Streaming Support**: Real-time streaming for all providers
- **Model Management**: Automatic model discovery and capability detection
- **Event System**: Event-driven architecture for monitoring and debugging

## Supported Providers

- **OpenAI**: GPT-4, GPT-3.5-turbo, text-embedding models
- **Claude**: Claude 3 Opus, Sonnet, and Haiku models
- **llama.cpp**: Local Llama model inference server

## Installation

```bash
npm install @noa/ai-provider
```

## Quick Start

### Basic Usage

```typescript
import { createProvider, ProviderType } from '@noa/ai-provider';

// Create an OpenAI provider
const openaiProvider = createProvider({
  type: ProviderType.OPENAI,
  apiKey: 'your-openai-api-key',
  defaultModel: 'gpt-4',
});

// Simple chat completion
const response = await openaiProvider.createChatCompletion({
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
  model: 'gpt-4',
});

console.log(response.choices[0].message?.content);
```

### Using the Factory Pattern

```typescript
import { ProviderFactory } from '@noa/ai-provider';

const factory = ProviderFactory.getInstance();

// Create multiple providers
const providers = [
  factory.createProvider({
    type: ProviderType.OPENAI,
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4',
  }),
  factory.createProvider({
    type: ProviderType.CLAUDE,
    apiKey: process.env.CLAUDE_API_KEY,
    defaultModel: 'claude-3-sonnet-20240229',
  }),
];

// Use providers interchangeably
for (const provider of providers) {
  const response = await provider.createChatCompletion({
    messages: [{ role: 'user', content: 'Explain quantum computing' }],
    model: provider.getDefaultModel()!,
  });
  console.log(
    `${provider.getProviderName()}:`,
    response.choices[0].message?.content
  );
}
```

### Environment Variable Configuration

```typescript
import { createProvidersFromEnv } from '@noa/ai-provider';

// Automatically create providers from environment variables
// OPENAI_API_KEY, CLAUDE_API_KEY, LLAMA_CPP_BASE_URL, etc.
const providers = createProvidersFromEnv();

// Or use a custom prefix
const customProviders = createProvidersFromEnv('MY_APP_');
```

### Streaming Responses

```typescript
const provider = createProvider({
  type: ProviderType.OPENAI,
  apiKey: 'your-api-key',
});

const stream = provider.createChatCompletionStream({
  messages: [{ role: 'user', content: 'Write a story' }],
  model: 'gpt-4',
  config: { temperature: 0.7 },
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}
```

### Listening to Provider Events

```typescript
const provider = createProvider({
  type: ProviderType.CLAUDE,
  apiKey: process.env.CLAUDE_API_KEY!,
});

provider.on('request:start', (requestId, providerType, operation) => {
  console.log(`[${providerType}] ${operation} started (${requestId})`);
});

provider.on('request:error', (_requestId, _providerType, error) => {
  console.error('Provider error:', error.message);
});
```

## Configuration

### Provider Configuration

Each provider supports the following configuration options:

```typescript
interface ProviderConfig {
  type: ProviderType;
  apiKey?: string; // API key for authentication
  baseURL?: string; // Custom base URL
  organization?: string; // OpenAI organization ID
  project?: string; // OpenAI project ID
  timeout?: number; // Request timeout in milliseconds
  maxRetries?: number; // Maximum retry attempts
  defaultModel?: string; // Default model to use
  additionalOptions?: Record<string, any>; // Provider-specific options
}
```

### Configuration Management

```typescript
import { ConfigurationManager, loadConfigFromFile } from '@noa/ai-provider';

// Load configuration from file
await loadConfigFromFile('./ai-config.json');

// Or load from environment variables
loadConfigFromEnvironment('AI_');

// Access configuration
const config = ConfigurationManager.getInstance().getConfig();
const openaiConfig = config.getProviderConfig(ProviderType.OPENAI);
```

### Configuration File Example

```json
{
  "providers": [
    {
      "type": "openai",
      "apiKey": "${OPENAI_API_KEY}",
      "defaultModel": "gpt-4",
      "timeout": 30000,
      "maxRetries": 3
    },
    {
      "type": "claude",
      "apiKey": "${CLAUDE_API_KEY}",
      "defaultModel": "claude-3-sonnet-20240229"
    },
    {
      "type": "llama.cpp",
      "baseURL": "http://localhost:8080",
      "timeout": 60000
    }
  ],
  "defaultProvider": "openai",
  "timeout": 30000,
  "maxRetries": 3,
  "enableLogging": true,
  "logLevel": "info"
}
```

### llama.cpp Usage

```typescript
import { createProvider, ProviderType } from '@noa/ai-provider';

const llama = createProvider({
  type: ProviderType.LLAMA_CPP,
  baseURL: 'http://localhost:8080',
  timeout: 60_000,
  defaultModel: 'llama-2-7b',
});

const response = await llama.createChatCompletion({
  model: 'llama-2-7b',
  messages: [
    { role: 'system', content: 'You are a concise assistant.' },
    { role: 'user', content: 'Summarize the latest release notes.' },
  ],
});

console.log(response.choices[0]?.message?.content);
```

## Advanced Usage

### Custom Logger

```typescript
import { createProvider } from '@noa/ai-provider';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const provider = createProvider(
  {
    type: ProviderType.OPENAI,
    apiKey: 'your-api-key',
  },
  { logger }
);
```

### Event Handling

```typescript
import { BaseProvider } from '@noa/ai-provider';

const provider = createProvider({
  type: ProviderType.OPENAI,
  apiKey: 'your-api-key',
});

provider.on('request:start', (requestId, providerType, operation) => {
  console.log(`Starting ${operation} request ${requestId}`);
});

provider.on('request:complete', (requestId, providerType, duration) => {
  console.log(`Request ${requestId} completed in ${duration}ms`);
});

provider.on('request:error', (requestId, providerType, error) => {
  console.error(`Request ${requestId} failed:`, error.message);
});
```

### Model Management

```typescript
const provider = createProvider({
  type: ProviderType.OPENAI,
  apiKey: 'your-api-key',
});

// Get available models
const models = await provider.getModels();
console.log(
  'Available models:',
  models.map((m) => m.id)
);

// Check capabilities
models.forEach((model) => {
  console.log(`${model.name}:`, model.capabilities);
});

// Check if model supports specific capability
if (provider.supportsCapability(ModelCapability.STREAMING)) {
  // Use streaming
}
```

### Error Handling

```typescript
import {
  AIProviderError,
  AuthenticationError,
  RateLimitError,
  ModelNotFoundError,
} from '@noa/ai-provider';

try {
  const response = await provider.createChatCompletion({
    messages: [{ role: 'user', content: 'Hello' }],
    model: 'gpt-4',
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
  } else if (error instanceof ModelNotFoundError) {
    console.error('Model not available');
  } else if (error instanceof AIProviderError) {
    console.error('AI provider error:', error.message);
  }
}
```

## API Reference

### Core Interfaces

#### Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | MessageContent[];
  name?: string;
  function_call?: FunctionCall;
}
```

#### GenerationConfig

```typescript
interface GenerationConfig {
  temperature?: number; // 0.0 to 2.0
  top_p?: number; // 0.0 to 1.0
  top_k?: number; // 1 to 100
  max_tokens?: number; // Maximum tokens to generate
  frequency_penalty?: number; // -2.0 to 2.0
  presence_penalty?: number; // -2.0 to 2.0
  stop?: string | string[]; // Stop sequences
  functions?: FunctionDefinition[]; // Function definitions
  function_call?: 'none' | 'auto' | { name: string };
  response_format?: { type: 'text' | 'json_object' };
}
```

### Provider Methods

#### createChatCompletion(request)

Creates a chat completion with the specified messages and configuration.

#### createChatCompletionStream(request)

Creates a streaming chat completion that yields chunks as they arrive.

#### createEmbedding(request)

Creates embeddings for the given input text.

#### getModels()

Returns a list of available models for the provider.

#### supportsCapability(capability)

Checks if the provider supports a specific capability.

#### healthCheck()

Performs a health check on the provider.

## Examples

### Complete Example with Error Handling

```typescript
import {
  createProvider,
  ProviderType,
  ModelCapability,
  AIProviderError,
} from '@noa/ai-provider';

async function chatWithAI(
  message: string,
  providerType: ProviderType = ProviderType.OPENAI
) {
  try {
    const provider = createProvider({
      type: providerType,
      apiKey: process.env[`${providerType.toUpperCase()}_API_KEY`],
      defaultModel: getDefaultModel(providerType),
    });

    // Check if provider is healthy
    const isHealthy = await provider.healthCheck();
    if (!isHealthy) {
      throw new Error(`Provider ${providerType} is not healthy`);
    }

    // Check capabilities
    if (!provider.supportsCapability(ModelCapability.CHAT_COMPLETION)) {
      throw new Error(
        `Provider ${providerType} does not support chat completion`
      );
    }

    const response = await provider.createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message },
      ],
      model: provider.getDefaultModel()!,
      config: {
        temperature: 0.7,
        max_tokens: 1000,
      },
    });

    return response.choices[0].message?.content;
  } catch (error) {
    if (error instanceof AIProviderError) {
      console.error(`AI Provider Error [${error.provider}]:`, error.message);
      if (error.retryable) {
        console.log('This error is retryable');
      }
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// Usage
const result = await chatWithAI('Explain the theory of relativity');
console.log(result);
```

## Migration Guide

### From Direct OpenAI SDK

```typescript
// Before
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: '...' });
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});

// After
import { createProvider, ProviderType } from '@noa/ai-provider';
const provider = createProvider({
  type: ProviderType.OPENAI,
  apiKey: '...',
});
const response = await provider.createChatCompletion({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT
