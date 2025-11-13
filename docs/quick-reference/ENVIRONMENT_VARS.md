---
title: Environment Variables Reference
category: Configuration
last_updated: 2025-10-23
---

# Environment Variables Reference

> Complete list of NOA Server configuration environment variables

## Core Configuration

```bash
# Node Environment
NODE_ENV=production|development|test

# Server Configuration
PORT=3000
HOST=0.0.0.0
API_VERSION=v1

# Base URLs
PUBLIC_URL=https://noa-server.io
API_BASE_URL=https://api.noa-server.io
```

## Database

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/noa_server
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=true

# Redis
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=3600
REDIS_SESSION_TTL=86400
```

## Authentication

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# OAuth
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_CALLBACK_URL=https://noa-server.io/auth/callback

# SAML
SAML_CERT_PATH=/path/to/cert.pem
SAML_ISSUER=https://noa-server.io
SAML_CALLBACK_URL=https://noa-server.io/auth/saml/callback
```

## AI Providers

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORG_ID=org-...
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com

# Google AI
GOOGLE_AI_API_KEY=...
GOOGLE_AI_PROJECT_ID=...

# Azure OpenAI
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_DEPLOYMENT=...
```

## Caching

```bash
# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=3600
CACHE_MAX_SIZE=1000000
CACHE_STRATEGY=lru|lfu|ttl

# CDN
CDN_ENABLED=true
CDN_BASE_URL=https://cdn.noa-server.io
CDN_CACHE_CONTROL=public, max-age=3600
```

## Rate Limiting

```bash
# Rate Limit Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_FAILED_REQUESTS=false
```

## Monitoring

```bash
# Monitoring
MONITORING_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics

# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PUSH_GATEWAY=http://localhost:9091

# Grafana
GRAFANA_URL=http://localhost:3001
GRAFANA_API_KEY=...

# Logging
LOG_LEVEL=info|debug|warn|error
LOG_FORMAT=json|pretty
LOG_FILE=/var/log/noa-server.log
```

## Security

```bash
# CORS
CORS_ORIGIN=*
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,PATCH

# Helmet
HELMET_ENABLED=true
HELMET_CSP_DIRECTIVES=default-src 'self'

# API Keys
API_KEY_HEADER=X-API-Key
API_KEY_ENCRYPTION_KEY=...
```

## Feature Flags

```bash
# Features
FEATURE_AI_INFERENCE=true
FEATURE_EMBEDDINGS=true
FEATURE_IMAGE_GENERATION=true
FEATURE_FUNCTION_CALLING=true
FEATURE_STREAMING=true

# Experimental
EXPERIMENTAL_NEURAL_PROCESSING=false
EXPERIMENTAL_DISTRIBUTED_CACHE=false
```

## Cloud Providers

```bash
# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=noa-server-data

# GCP
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GCP_PROJECT_ID=...
GCP_BUCKET=noa-server-data

# Azure
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_ACCOUNT=...
AZURE_CONTAINER=noa-server-data
```

## Email

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@noa-server.io
SMTP_PASS=...
SMTP_FROM=NOA Server <noreply@noa-server.io>

# SendGrid
SENDGRID_API_KEY=...

# Mailgun
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...
```

## Development

```bash
# Development
DEBUG=noa:*
ENABLE_HOT_RELOAD=true
MOCK_AI_RESPONSES=false
DISABLE_RATE_LIMITING=true

# Testing
TEST_DATABASE_URL=postgresql://...
TEST_REDIS_URL=redis://...
COVERAGE_THRESHOLD=80
```

## Production

```bash
# Production Optimizations
COMPRESSION_ENABLED=true
CLUSTER_MODE=true
CLUSTER_WORKERS=4
GRACEFUL_SHUTDOWN_TIMEOUT=30

# Health Checks
HEALTH_CHECK_INTERVAL=10000
HEALTH_CHECK_TIMEOUT=5000
```

**[Complete Environment Configuration Guide →](../.claude/ENV_CONFIG.md)**

**[← Back to Documentation Index](../INDEX.md)**
