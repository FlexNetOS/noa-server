export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Inference API',
      version: '1.0.0',
      description: `
# AI Inference API

A comprehensive REST API for AI model inference and management with support for multiple providers.

## Features

- **Multi-Provider Support**: OpenAI, Anthropic Claude, and llama.cpp
- **Model Management**: Load, switch, and unload models dynamically
- **Streaming Support**: Real-time streaming responses for chat completions
- **Health Monitoring**: Comprehensive health checks and status endpoints
- **Validation**: Request validation with detailed error messages
- **Type-Safe**: Full TypeScript support with type definitions

## Supported Providers

### OpenAI
- GPT-4, GPT-3.5 Turbo models
- Text generation and embeddings
- Function calling support

### Anthropic Claude
- Claude 3 family (Opus, Sonnet, Haiku)
- Advanced reasoning capabilities
- Large context windows

### llama.cpp
- Local model inference
- GGUF model format support
- CPU and GPU acceleration

## Authentication

Configure providers using environment variables:

\`\`\`bash
AI_OPENAI_API_KEY=your_openai_key
AI_CLAUDE_API_KEY=your_claude_key
AI_LLAMA_CPP_BASE_URL=http://localhost:8080
\`\`\`

## Rate Limiting

API requests are subject to rate limiting based on provider quotas.

## Support

For issues and questions, please visit:
- Documentation: https://github.com/your-org/ai-inference-api
- Issues: https://github.com/your-org/ai-inference-api/issues
      `,
      contact: {
        name: 'Noa Server Team',
        url: 'https://github.com/your-org/noa-server',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Inference',
        description: 'AI model inference endpoints for chat completions and embeddings'
      },
      {
        name: 'Models',
        description: 'Model management endpoints for listing, loading, and switching models'
      },
      {
        name: 'Status',
        description: 'Health check and status monitoring endpoints'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Human-readable error message'
                },
                code: {
                  type: 'string',
                  description: 'Machine-readable error code'
                },
                provider: {
                  type: 'string',
                  description: 'Provider that generated the error'
                },
                retryable: {
                  type: 'boolean',
                  description: 'Whether the request can be retried'
                },
                details: {
                  type: 'array',
                  description: 'Detailed validation errors',
                  items: {
                    type: 'object'
                  }
                }
              }
            }
          }
        },
        Message: {
          type: 'object',
          required: ['role', 'content'],
          properties: {
            role: {
              type: 'string',
              enum: ['system', 'user', 'assistant', 'function'],
              description: 'Role of the message author'
            },
            content: {
              type: 'string',
              description: 'Content of the message'
            },
            name: {
              type: 'string',
              description: 'Name of the function (for function role)'
            }
          }
        },
        GenerationConfig: {
          type: 'object',
          properties: {
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              description: 'Controls randomness: lower values = more focused, higher values = more random',
              default: 0.7
            },
            max_tokens: {
              type: 'number',
              minimum: 1,
              description: 'Maximum number of tokens to generate'
            },
            top_p: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Nucleus sampling: considers tokens with top_p probability mass',
              default: 1
            },
            frequency_penalty: {
              type: 'number',
              minimum: -2,
              maximum: 2,
              description: 'Positive values decrease likelihood of repeating tokens',
              default: 0
            },
            presence_penalty: {
              type: 'number',
              minimum: -2,
              maximum: 2,
              description: 'Positive values increase likelihood of new topics',
              default: 0
            },
            stop: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Sequences where the API will stop generating'
            }
          }
        },
        ModelInfo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique model identifier'
            },
            name: {
              type: 'string',
              description: 'Human-readable model name'
            },
            provider: {
              type: 'string',
              enum: ['openai', 'claude', 'llama.cpp'],
              description: 'Provider hosting the model'
            },
            contextWindow: {
              type: 'number',
              description: 'Maximum context window size in tokens'
            },
            maxTokens: {
              type: 'number',
              description: 'Maximum tokens per request'
            },
            capabilities: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'text_generation',
                  'chat_completion',
                  'embeddings',
                  'function_calling',
                  'vision',
                  'streaming',
                  'json_mode'
                ]
              },
              description: 'Capabilities supported by the model'
            },
            metadata: {
              type: 'object',
              description: 'Additional model metadata'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        InternalError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ServiceUnavailable: {
          description: 'Service Unavailable',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    externalDocs: {
      description: 'Find out more about the AI Inference API',
      url: 'https://github.com/your-org/noa-server/docs'
    }
  },
  apis: ['./src/routes/*.ts'], // Paths to files containing OpenAPI definitions
};
