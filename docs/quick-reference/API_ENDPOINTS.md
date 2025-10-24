---
title: API Endpoints Quick Reference
category: API
last_updated: 2025-10-23
---

# API Endpoints Quick Reference

> Common API endpoints and usage examples

## Base URLs

- **Production:** `https://api.noa-server.io/v1`
- **Staging:** `https://staging-api.noa-server.io/v1`
- **Sandbox:** `https://sandbox-api.noa-server.io/v1`
- **Local:** `http://localhost:3000/v1`

## Authentication

### POST /v1/auth/login

User login

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### POST /v1/auth/token/refresh

Refresh access token

```bash
curl -X POST http://localhost:3000/v1/auth/token/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your_refresh_token"}'
```

## AI Inference

### POST /v1/inference/chat

Chat completion

```bash
curl -X POST http://localhost:3000/v1/inference/chat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### POST /v1/inference/embeddings

Generate embeddings

```bash
curl -X POST http://localhost:3000/v1/inference/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-ada-002",
    "input": "Sample text"
  }'
```

### POST /v1/inference/image

Generate image

```bash
curl -X POST http://localhost:3000/v1/inference/image \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "prompt": "A beautiful sunset"
  }'
```

## Management

### GET /v1/manage/providers

List AI providers

```bash
curl -X GET http://localhost:3000/v1/manage/providers \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### POST /v1/manage/providers

Add AI provider

```bash
curl -X POST http://localhost:3000/v1/manage/providers \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openai",
    "apiKey": "sk-...",
    "enabled": true
  }'
```

### GET /v1/manage/cache/stats

Cache statistics

```bash
curl -X GET http://localhost:3000/v1/manage/cache/stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### POST /v1/manage/cache/clear

Clear cache

```bash
curl -X POST http://localhost:3000/v1/manage/cache/clear \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Monitoring

### GET /v1/health

Health check

```bash
curl -X GET http://localhost:3000/v1/health
```

### GET /v1/metrics

Prometheus metrics

```bash
curl -X GET http://localhost:3000/v1/metrics
```

### GET /v1/metrics/usage

Usage statistics

```bash
curl -X GET http://localhost:3000/v1/metrics/usage \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Rate Limits

| Endpoint                | Free Tier | Pro Tier | Enterprise |
| ----------------------- | --------- | -------- | ---------- |
| `/inference/chat`       | 100/min   | 1000/min | Custom     |
| `/inference/embeddings` | 200/min   | 2000/min | Custom     |
| `/inference/image`      | 50/min    | 500/min  | Custom     |
| `/auth/*`               | 20/min    | 100/min  | Custom     |
| `/manage/*`             | 50/min    | 500/min  | Custom     |
| `/metrics/*`            | 100/min   | 1000/min | Custom     |

**[Complete API Documentation →](../API_DOCS.md)**

**[← Back to Documentation Index](../INDEX.md)**
