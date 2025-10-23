# AI Inference API

A comprehensive REST API for AI model inference and management with support for multiple providers including OpenAI, Anthropic Claude, and llama.cpp.

## Features

- **Multi-Provider Support**: Unified interface for OpenAI, Claude, and llama.cpp
- **Model Management**: Load, switch, and unload models dynamically
- **Streaming Support**: Real-time streaming responses for chat completions
- **Health Monitoring**: Comprehensive health checks and status endpoints
- **Validation**: Request validation with detailed error messages
- **Type-Safe**: Full TypeScript support with type definitions
- **OpenAPI Documentation**: Auto-generated Swagger docs

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm run build

# Start development server
pnpm run start:dev

# Start production server
pnpm run start
```

## Configuration

Configure providers using environment variables:

```bash
# OpenAI Configuration
AI_OPENAI_API_KEY=your_openai_api_key
AI_OPENAI_BASE_URL=https://api.openai.com/v1
AI_OPENAI_DEFAULT_MODEL=gpt-4

# Claude Configuration
AI_CLAUDE_API_KEY=your_claude_api_key
AI_CLAUDE_BASE_URL=https://api.anthropic.com
AI_CLAUDE_DEFAULT_MODEL=claude-3-opus-20240229

# llama.cpp Configuration
AI_LLAMA_CPP_BASE_URL=http://localhost:8080
AI_LLAMA_CPP_DEFAULT_MODEL=llama-2-7b

# API Configuration
PORT=3001
CORS_ORIGIN=*
```

## API Endpoints

### Inference

#### POST /api/v1/inference/chat
Generate chat completion

```bash
curl -X POST http://localhost:3001/api/v1/inference/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ],
    "model": "gpt-4",
    "config": {
      "temperature": 0.7,
      "max_tokens": 2000
    }
  }'
```

#### POST /api/v1/inference/chat/stream
Generate streaming chat completion

```bash
curl -X POST http://localhost:3001/api/v1/inference/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Tell me a story"}
    ],
    "model": "gpt-4"
  }'
```

#### POST /api/v1/inference/embeddings
Generate embeddings

```bash
curl -X POST http://localhost:3001/api/v1/inference/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "The quick brown fox",
    "model": "text-embedding-ada-002"
  }'
```

### Models

#### GET /api/v1/models
List all available models

#### GET /api/v1/models/loaded
List currently loaded models

#### GET /api/v1/models/current
Get current active model

#### GET /api/v1/models/{provider}
List models for a specific provider

#### POST /api/v1/models/load
Load a model into memory

#### POST /api/v1/models/switch
Switch active model

#### POST /api/v1/models/unload
Unload a model from memory

### Status

#### GET /api/v1/status/health
Get comprehensive health status

#### GET /api/v1/status/providers
Get provider status details

#### GET /api/v1/status/system
Get system information

#### GET /api/v1/status/ready
Readiness check

#### GET /api/v1/status/live
Liveness check

## OpenAPI Documentation

Interactive API documentation is available at:

```
http://localhost:3001/api-docs
```

## Architecture

### Components

- **AIService**: Core service managing providers and models
- **ProviderFactory**: Factory for creating provider instances
- **ModelManager**: Manages loaded models and model switching
- **ConfigurationManager**: Handles provider configuration
- **Routes**: Express route handlers with validation
- **Middleware**: Error handling, logging, CORS, security

### Provider Integration

The API integrates with the `@noa/ai-provider` package which provides:

- Unified interface across providers
- Type-safe request/response handling
- Error handling and retries
- Streaming support
- Model capability detection

## Development

### Running Tests

```bash
pnpm run test
```

### Linting

```bash
pnpm run lint
pnpm run lint:fix
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "provider": "openai",
    "retryable": false,
    "details": []
  }
}
```

### Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `CONFIGURATION_ERROR`: Provider configuration error
- `AUTHENTICATION_ERROR`: Authentication failed
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `MODEL_NOT_FOUND`: Model not found
- `CONTEXT_LENGTH_EXCEEDED`: Context window exceeded
- `MODEL_LOAD_ERROR`: Failed to load model
- `INTERNAL_ERROR`: Internal server error

## License

MIT
