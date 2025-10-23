# AI Inference API

A REST API for AI model inference and management, integrating with the AI provider package.

## Features

- **Chat Completion**: Generate responses using various AI models
- **Embeddings**: Generate vector embeddings for text
- **Model Management**: List available models and switch between them
- **Status Monitoring**: Check health and provider status
- **OpenAPI Documentation**: Interactive API documentation
- **Error Handling**: Comprehensive error responses
- **Request Validation**: Input validation using express-validator

## Endpoints

### Inference
- `POST /api/v1/inference/chat` - Generate chat completion
- `POST /api/v1/inference/embeddings` - Generate embeddings

### Models
- `GET /api/v1/models` - List all available models
- `GET /api/v1/models/{provider}` - List models for a specific provider
- `POST /api/v1/models/switch` - Switch active model

### Status
- `GET /api/v1/status/health` - Get API health status
- `GET /api/v1/status/providers` - Get provider status

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm run dev
```

## Build

```bash
pnpm run build
```

## Start

```bash
pnpm start
```

## Environment Variables

- `OPENAI_API_KEY`: API key for OpenAI provider
- `PORT`: Server port (default: 3001)
- `CORS_ORIGIN`: CORS origin (default: '*')

## Documentation

API documentation is available at `/api-docs` when the server is running.