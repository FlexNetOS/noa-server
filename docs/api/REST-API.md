# REST API Documentation

<!-- POL-0129, POL-0148-0159: Comprehensive API documentation -->

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Versioning](#versioning)

## Overview

The NOA Server Platform provides a comprehensive REST API for managing agents, swarms, services, and neural processing tasks.

**Base URL**: `https://api.noa-server.io/v1`

**Content Type**: `application/json`

### API Principles

- RESTful design following HTTP semantics
- JSON request/response bodies
- OAuth 2.0 authentication
- Rate limiting with headers
- Semantic versioning
- Comprehensive error messages

## Authentication

### OAuth 2.0

All API requests require authentication using OAuth 2.0 Bearer tokens.

**Example Request**:
```http
GET /v1/agents
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Obtaining a Token**:
```http
POST /v1/auth/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret"
}
```

**Response**:
```json
{
  "access_token": "YOUR_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

### API Keys

For simpler use cases, API keys are supported:

```http
GET /v1/agents
X-API-Key: YOUR_API_KEY
```

## Endpoints

### Agents

#### List All Agents

```http
GET /v1/agents
```

**Query Parameters**:
- `type` (string, optional) - Filter by agent type
- `status` (string, optional) - Filter by status (active, idle, error)
- `limit` (integer, optional) - Number of results (default: 50, max: 100)
- `offset` (integer, optional) - Pagination offset (default: 0)

**Example Request**:
```bash
curl -X GET "https://api.noa-server.io/v1/agents?type=coder&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "agent-123abc",
      "type": "coder",
      "name": "CodeAgent-1",
      "status": "active",
      "created_at": "2025-10-22T10:00:00Z",
      "metadata": {
        "language": "typescript",
        "framework": "express"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

**Errors** (POL-0144: Document panics, errors, safety):
- `401 Unauthorized` - Invalid or missing authentication
- `403 Forbidden` - Insufficient permissions
- `429 Too Many Requests` - Rate limit exceeded

#### Create Agent

```http
POST /v1/agents
```

**Request Body**:
```json
{
  "type": "coder",
  "name": "MyCodeAgent",
  "config": {
    "language": "typescript",
    "framework": "express"
  }
}
```

**Response** (201 Created):
```json
{
  "id": "agent-456def",
  "type": "coder",
  "name": "MyCodeAgent",
  "status": "initializing",
  "created_at": "2025-10-22T10:05:00Z",
  "config": {
    "language": "typescript",
    "framework": "express"
  }
}
```

**Errors**:
- `400 Bad Request` - Invalid request body
- `422 Unprocessable Entity` - Validation errors

**Validation Errors Example**:
```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "type",
        "message": "Agent type 'invalid-type' is not supported"
      }
    ]
  }
}
```

#### Get Agent

```http
GET /v1/agents/{agent_id}
```

**Response** (200 OK):
```json
{
  "id": "agent-123abc",
  "type": "coder",
  "name": "CodeAgent-1",
  "status": "active",
  "created_at": "2025-10-22T10:00:00Z",
  "metrics": {
    "tasks_completed": 42,
    "avg_completion_time_ms": 1250,
    "success_rate": 0.95
  }
}
```

**Errors**:
- `404 Not Found` - Agent does not exist

#### Update Agent

```http
PATCH /v1/agents/{agent_id}
```

**Request Body**:
```json
{
  "name": "UpdatedAgentName",
  "config": {
    "max_tasks": 10
  }
}
```

**Response** (200 OK):
```json
{
  "id": "agent-123abc",
  "name": "UpdatedAgentName",
  "config": {
    "max_tasks": 10
  },
  "updated_at": "2025-10-22T10:10:00Z"
}
```

#### Delete Agent

```http
DELETE /v1/agents/{agent_id}
```

**Response** (204 No Content)

**Errors**:
- `409 Conflict` - Agent is currently executing tasks

### Swarms

#### Initialize Swarm

```http
POST /v1/swarms
```

**Request Body**:
```json
{
  "topology": "mesh",
  "max_agents": 5,
  "namespace": "my-project",
  "config": {
    "coordination_strategy": "consensus",
    "timeout_ms": 30000
  }
}
```

**Response** (201 Created):
```json
{
  "id": "swarm-789ghi",
  "topology": "mesh",
  "max_agents": 5,
  "namespace": "my-project",
  "status": "initializing",
  "created_at": "2025-10-22T10:15:00Z"
}
```

#### Get Swarm Status

```http
GET /v1/swarms/{swarm_id}
```

**Response** (200 OK):
```json
{
  "id": "swarm-789ghi",
  "topology": "mesh",
  "status": "active",
  "agents": [
    {
      "id": "agent-123abc",
      "type": "coder",
      "status": "active"
    },
    {
      "id": "agent-456def",
      "type": "tester",
      "status": "active"
    }
  ],
  "metrics": {
    "total_tasks": 150,
    "active_tasks": 3,
    "completed_tasks": 147
  }
}
```

### Tasks

#### Create Task

```http
POST /v1/tasks
```

**Request Body**:
```json
{
  "description": "Build REST API for user authentication",
  "swarm_id": "swarm-789ghi",
  "agent_ids": ["agent-123abc", "agent-456def"],
  "priority": "high",
  "timeout_ms": 60000
}
```

**Response** (201 Created):
```json
{
  "id": "task-101jkl",
  "description": "Build REST API for user authentication",
  "status": "pending",
  "created_at": "2025-10-22T10:20:00Z",
  "estimated_completion": "2025-10-22T10:21:00Z"
}
```

#### Get Task Results

```http
GET /v1/tasks/{task_id}/results
```

**Response** (200 OK):
```json
{
  "task_id": "task-101jkl",
  "status": "completed",
  "started_at": "2025-10-22T10:20:05Z",
  "completed_at": "2025-10-22T10:20:45Z",
  "duration_ms": 40000,
  "results": {
    "files_created": 5,
    "tests_passed": 12,
    "coverage": 0.89
  },
  "artifacts": [
    {
      "type": "code",
      "path": "/src/auth/router.ts",
      "size_bytes": 2048
    }
  ]
}
```

### Neural Processing

#### Chat Completion

```http
POST /v1/neural/chat/completions
```

**Request Body**:
```json
{
  "model": "llama-2-7b-chat",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful coding assistant."
    },
    {
      "role": "user",
      "content": "Explain REST APIs"
    }
  ],
  "max_tokens": 500,
  "temperature": 0.7
}
```

**Response** (200 OK):
```json
{
  "id": "cmpl-abc123",
  "object": "chat.completion",
  "created": 1729598400,
  "model": "llama-2-7b-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "REST APIs (Representational State Transfer Application Programming Interfaces) are..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175
  }
}
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {},
    "request_id": "req-xyz789"
  }
}
```

### HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `204 No Content` - Request succeeded, no response body
- `400 Bad Request` - Invalid request syntax
- `401 Unauthorized` - Authentication required or failed
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource not found
- `409 Conflict` - Request conflicts with current state
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Common Error Codes

- `invalid_request` - Malformed request
- `authentication_failed` - Invalid credentials
- `permission_denied` - Insufficient permissions
- `resource_not_found` - Requested resource doesn't exist
- `validation_error` - Request data failed validation
- `rate_limit_exceeded` - Too many requests
- `internal_error` - Unexpected server error

## Rate Limiting

Rate limits are applied per API key/token:

- **Default**: 1000 requests per hour
- **Burst**: 100 requests per minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1729602000
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please retry after 2025-10-22T11:00:00Z",
    "retry_after": 3600
  }
}
```

## Versioning

The API uses URL-based versioning:

- Current version: `v1`
- Base URL: `https://api.noa-server.io/v1`

Breaking changes will result in a new version (`v2`, etc.). Non-breaking changes are deployed to existing versions.

## SDKs and Libraries

- **JavaScript/TypeScript**: `npm install @noa-server/sdk`
- **Python**: `pip install noa-server`
- **Rust**: `cargo add noa-server`

## Support

- **API Status**: https://status.noa-server.io
- **Documentation**: https://docs.noa-server.io
- **Support**: api-support@noa-server.io

---

**Version**: 1.0.0 | **Last Updated**: 2025-10-22
