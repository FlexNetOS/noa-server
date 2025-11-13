# Noa Server Environment Variables Reference

## Overview

This document provides a comprehensive reference for all environment variables
used across Noa Server services.

## Environment Variable Categories

### Core Configuration

| Variable    | Required | Default      | Description                                                |
| ----------- | -------- | ------------ | ---------------------------------------------------------- |
| `NODE_ENV`  | Yes      | `production` | Application environment (development, staging, production) |
| `LOG_LEVEL` | No       | `info`       | Logging level (debug, info, warn, error)                   |
| `TZ`        | No       | `UTC`        | Timezone for timestamps                                    |

### Service Ports

| Variable           | Required | Default | Description              |
| ------------------ | -------- | ------- | ------------------------ |
| `MCP_PORT`         | No       | `8001`  | MCP service port         |
| `CLAUDE_FLOW_PORT` | No       | `9100`  | Claude Flow service port |
| `UI_PORT`          | No       | `9200`  | UI Dashboard port        |
| `LLAMA_PORT`       | No       | `9300`  | Llama.cpp service port   |
| `AGENTICOS_PORT`   | No       | `9400`  | AgenticOS service port   |
| `REDIS_PORT`       | No       | `6379`  | Redis cache port         |
| `POSTGRES_PORT`    | No       | `5432`  | PostgreSQL database port |

### Service URLs (Internal)

| Variable          | Required | Default                  | Description               |
| ----------------- | -------- | ------------------------ | ------------------------- |
| `MCP_URL`         | No       | `http://localhost:8001`  | MCP service URL           |
| `CLAUDE_FLOW_URL` | No       | `http://localhost:9100`  | Claude Flow service URL   |
| `LLAMA_URL`       | No       | `http://localhost:9300`  | Llama.cpp service URL     |
| `AGENTICOS_URL`   | No       | `http://localhost:9400`  | AgenticOS service URL     |
| `REDIS_URL`       | No       | `redis://localhost:6379` | Redis connection URL      |
| `POSTGRES_URL`    | Yes      | -                        | PostgreSQL connection URL |

### Database Configuration

| Variable            | Required | Default     | Description                  |
| ------------------- | -------- | ----------- | ---------------------------- |
| `POSTGRES_USER`     | Yes      | `noa`       | PostgreSQL username          |
| `POSTGRES_PASSWORD` | Yes      | -           | PostgreSQL password          |
| `POSTGRES_DB`       | Yes      | `noa`       | PostgreSQL database name     |
| `POSTGRES_HOST`     | No       | `localhost` | PostgreSQL host              |
| `POSTGRES_SSL_MODE` | No       | `prefer`    | PostgreSQL SSL mode          |
| `DB_POOL_MIN`       | No       | `2`         | Minimum database connections |
| `DB_POOL_MAX`       | No       | `10`        | Maximum database connections |

### Redis Configuration

| Variable         | Required | Default     | Description           |
| ---------------- | -------- | ----------- | --------------------- |
| `REDIS_PASSWORD` | Yes      | -           | Redis password        |
| `REDIS_HOST`     | No       | `localhost` | Redis host            |
| `REDIS_DB`       | No       | `0`         | Redis database number |
| `REDIS_TLS`      | No       | `false`     | Enable Redis TLS      |

### Neural Processing (Llama.cpp)

| Variable               | Required | Default | Description                  |
| ---------------------- | -------- | ------- | ---------------------------- |
| `MODEL_PATH`           | Yes      | -       | Path to GGUF model file      |
| `LLM_MODEL_PATH`       | No       | -       | Alias for MODEL_PATH         |
| `CUDA_VISIBLE_DEVICES` | No       | `0`     | GPU device IDs               |
| `GGML_CUDA_ENABLE`     | No       | `1`     | Enable CUDA acceleration     |
| `LLAMA_THREADS`        | No       | `4`     | Number of processing threads |
| `LLAMA_CONTEXT_SIZE`   | No       | `2048`  | Model context window size    |
| `LLAMA_BATCH_SIZE`     | No       | `512`   | Batch processing size        |

### Authentication & Security

| Variable            | Required | Default | Description                    |
| ------------------- | -------- | ------- | ------------------------------ |
| `JWT_SECRET`        | Yes      | -       | Secret for JWT token signing   |
| `JWT_EXPIRY`        | No       | `24h`   | JWT token expiry time          |
| `SESSION_SECRET`    | Yes      | -       | Session cookie secret          |
| `ENCRYPTION_KEY`    | Yes      | -       | Data encryption key (32 bytes) |
| `CORS_ORIGIN`       | No       | `*`     | CORS allowed origins           |
| `RATE_LIMIT_WINDOW` | No       | `15m`   | Rate limit time window         |
| `RATE_LIMIT_MAX`    | No       | `100`   | Max requests per window        |

### API Keys (External Services)

| Variable            | Required | Default | Description              |
| ------------------- | -------- | ------- | ------------------------ |
| `OPENAI_API_KEY`    | No       | -       | OpenAI API key           |
| `ANTHROPIC_API_KEY` | No       | -       | Anthropic Claude API key |
| `HUGGINGFACE_TOKEN` | No       | -       | HuggingFace API token    |

### Monitoring & Observability

| Variable          | Required | Default      | Description                |
| ----------------- | -------- | ------------ | -------------------------- |
| `METRICS_ENABLED` | No       | `true`       | Enable Prometheus metrics  |
| `METRICS_PORT`    | No       | Service port | Metrics endpoint port      |
| `TRACING_ENABLED` | No       | `false`      | Enable distributed tracing |
| `JAEGER_ENDPOINT` | No       | -            | Jaeger collector endpoint  |
| `SENTRY_DSN`      | No       | -            | Sentry error tracking DSN  |

### Performance Tuning

| Variable             | Required | Default | Description                   |
| -------------------- | -------- | ------- | ----------------------------- |
| `MEMORY_LIMIT`       | No       | -       | Memory limit (e.g., 512m, 1g) |
| `MAX_OLD_SPACE_SIZE` | No       | -       | Node.js max heap size (MB)    |
| `UV_THREADPOOL_SIZE` | No       | `4`     | Node.js thread pool size      |
| `WORKERS`            | No       | `1`     | Number of worker processes    |
| `WORKER_CONCURRENCY` | No       | `10`    | Concurrent tasks per worker   |

### Feature Flags

| Variable                    | Required | Default | Description                  |
| --------------------------- | -------- | ------- | ---------------------------- |
| `FEATURE_NEURAL_PROCESSING` | No       | `true`  | Enable neural processing     |
| `FEATURE_AGENT_SWARM`       | No       | `true`  | Enable agent swarm features  |
| `FEATURE_REALTIME_UPDATES`  | No       | `true`  | Enable WebSocket updates     |
| `FEATURE_EXPERIMENTAL`      | No       | `false` | Enable experimental features |

## Service-Specific Variables

### MCP Service

```bash
# MCP-specific configuration
MCP_PORT=8001
MCP_MEMORY_LIMIT=512m
MCP_MAX_AGENTS=100
MCP_HEARTBEAT_INTERVAL=30000
MCP_COORDINATION_MODE=mesh
```

### Claude Flow Service

```bash
# Claude Flow configuration
CLAUDE_FLOW_PORT=9100
CLAUDE_FLOW_MAX_WORKFLOWS=50
CLAUDE_FLOW_EXECUTION_TIMEOUT=300000
CLAUDE_FLOW_RETRY_ATTEMPTS=3
```

### UI Dashboard

```bash
# Next.js specific
NEXT_PUBLIC_MCP_URL=http://localhost:8001
NEXT_PUBLIC_CLAUDE_FLOW_URL=http://localhost:9100
NEXT_PUBLIC_LLAMA_URL=http://localhost:9300
NEXT_PUBLIC_APP_NAME="Noa Server Dashboard"
NEXT_PUBLIC_VERSION=0.0.1
```

### Llama.cpp Service

```bash
# Neural processing configuration
LLAMA_PORT=9300
MODEL_PATH=/app/models/demo.gguf
CUDA_VISIBLE_DEVICES=0
GGML_CUDA_ENABLE=1
LLAMA_GPU_LAYERS=35
LLAMA_MLOCK=true
```

### AgenticOS Service

```bash
# Agent system configuration
AGENTICOS_PORT=9400
AGENTICOS_MAX_AGENTS=1000
AGENTICOS_TASK_QUEUE_SIZE=10000
AGENTICOS_AGENT_TIMEOUT=60000
```

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=*
HOT_RELOAD=true
SKIP_SSL_VERIFY=true
MOCK_EXTERNAL_APIS=true
```

### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=info
METRICS_ENABLED=true
TRACING_ENABLED=true
RATE_LIMIT_MAX=1000
```

### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
METRICS_ENABLED=true
TRACING_ENABLED=true
RATE_LIMIT_MAX=100
FORCE_SSL=true
TRUST_PROXY=true
```

## Docker-Specific Variables

```bash
# Container configuration
DOCKER_BUILDKIT=1
COMPOSE_PROJECT_NAME=noa-server
COMPOSE_FILE=docker/docker-compose.yml
```

## Kubernetes-Specific Variables

```bash
# K8s service discovery
KUBERNETES_SERVICE_HOST=10.96.0.1
KUBERNETES_SERVICE_PORT=443
POD_NAME=${HOSTNAME}
POD_NAMESPACE=noa-server
POD_IP=${POD_IP}
```

## Validation Rules

### Required for Production

The following variables MUST be set in production:

- `POSTGRES_PASSWORD` - Secure random password
- `REDIS_PASSWORD` - Secure random password
- `JWT_SECRET` - 32+ character random string
- `ENCRYPTION_KEY` - 32 bytes hex-encoded
- `SESSION_SECRET` - 32+ character random string

### Security Requirements

- Passwords: Minimum 16 characters, alphanumeric + symbols
- Secrets/Keys: Cryptographically random, minimum 32 bytes
- API Keys: Valid format per provider requirements

## Environment File Templates

### .env.example

```bash
# Core
NODE_ENV=development
LOG_LEVEL=info

# Ports
MCP_PORT=8001
CLAUDE_FLOW_PORT=9100
UI_PORT=9200
LLAMA_PORT=9300
AGENTICOS_PORT=9400

# Database
POSTGRES_USER=noa
POSTGRES_PASSWORD=changeme-in-production
POSTGRES_DB=noa
POSTGRES_URL=postgresql://noa:changeme@localhost:5432/noa

# Cache
REDIS_PASSWORD=changeme-in-production
REDIS_URL=redis://:changeme@localhost:6379

# Security
JWT_SECRET=changeme-to-random-32-char-string
ENCRYPTION_KEY=changeme-to-random-64-char-hex
SESSION_SECRET=changeme-to-random-32-char-string

# Neural
MODEL_PATH=/app/models/demo.gguf
CUDA_VISIBLE_DEVICES=0

# External APIs (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### .env.production.example

```bash
NODE_ENV=production
LOG_LEVEL=warn

# Use environment-specific values
POSTGRES_URL=${DATABASE_URL}
REDIS_URL=${REDIS_URL}

# Monitoring
METRICS_ENABLED=true
SENTRY_DSN=${SENTRY_DSN}

# Performance
MEMORY_LIMIT=1g
WORKERS=4
```

## Best Practices

1. **Never commit .env files** to version control
2. **Use different secrets** for each environment
3. **Rotate secrets** regularly (90 days)
4. **Use secret managers** in production (Vault, AWS Secrets Manager)
5. **Validate variables** on application startup
6. **Document all variables** in this file
7. **Use type-safe config** libraries (joi, zod)
8. **Set sensible defaults** for non-sensitive values
9. **Fail fast** if required variables are missing
10. **Log configuration** (redact sensitive values)

## Troubleshooting

### Variable Not Loading

```bash
# Check if variable is set
echo $VARIABLE_NAME

# Check in container
docker exec noa-mcp env | grep VARIABLE_NAME

# Check in Kubernetes
kubectl exec -it pod-name -n noa-server -- env | grep VARIABLE_NAME
```

### Invalid Format

```bash
# Validate URL format
echo $POSTGRES_URL | grep -E '^postgresql://'

# Validate port number
echo $MCP_PORT | grep -E '^[0-9]+$'
```

## Related Documentation

- [Docker Guide](./DOCKER_GUIDE.md)
- [Kubernetes Guide](./KUBERNETES_GUIDE.md)
- [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
