# NOA Server - API Architecture

## Table of Contents

- [Overview](#overview)
- [REST API Design](#rest-api-design)
- [Authentication & Authorization](#authentication--authorization)
- [Rate Limiting](#rate-limiting)
- [Versioning Strategy](#versioning-strategy)
- [Error Handling](#error-handling)
- [OpenAPI Specification](#openapi-specification)

## Overview

The NOA Server provides a RESTful API following industry best practices with
comprehensive OpenAPI/Swagger documentation, versioning, authentication, rate
limiting, and error handling.

### API Design Principles

1. **RESTful Resource-Based**: Resources modeled as nouns with standard HTTP
   methods
2. **JSON First**: All requests and responses use JSON (except file uploads)
3. **Versioned**: API versioning via URL path (`/v1/`, `/v2/`)
4. **Stateless**: No server-side session affinity required
5. **Idempotent**: Safe retry behavior for GET, PUT, DELETE
6. **Paginated**: Large collections use cursor-based pagination
7. **Documented**: Complete OpenAPI 3.0 specification

## REST API Design

### Resource Structure

```
/v1
├── /auth
│   ├── POST /login
│   ├── POST /register
│   ├── POST /refresh
│   └── POST /logout
├── /models
│   ├── GET /models
│   ├── GET /models/:id
│   └── GET /models/:id/capabilities
├── /completions
│   └── POST /completions
├── /chat
│   └── POST /chat/completions
├── /jobs
│   ├── POST /jobs
│   ├── GET /jobs
│   ├── GET /jobs/:id
│   ├── PATCH /jobs/:id
│   └── DELETE /jobs/:id
├── /users
│   ├── GET /users/me
│   ├── PATCH /users/me
│   └── GET /users/me/usage
└── /admin
    ├── GET /admin/users
    ├── GET /admin/metrics
    └── GET /admin/providers
```

### Standard HTTP Methods

| Method | Purpose                 | Idempotent | Safe |
| ------ | ----------------------- | ---------- | ---- |
| GET    | Retrieve resource(s)    | Yes        | Yes  |
| POST   | Create new resource     | No         | No   |
| PUT    | Replace entire resource | Yes        | No   |
| PATCH  | Partial update          | No         | No   |
| DELETE | Remove resource         | Yes        | No   |

### Request/Response Format

**Standard Request**

```json
POST /v1/completions
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "model": "gpt-4",
  "prompt": "Explain quantum computing",
  "temperature": 0.7,
  "maxTokens": 500
}
```

**Standard Response (Success)**

```json
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200

{
  "id": "cmpl-123abc",
  "object": "completion",
  "created": 1704063600,
  "model": "gpt-4",
  "choices": [{
    "text": "Quantum computing...",
    "index": 0,
    "finishReason": "stop"
  }],
  "usage": {
    "promptTokens": 10,
    "completionTokens": 200,
    "totalTokens": 210
  },
  "cost": {
    "inputCost": 0.0003,
    "outputCost": 0.006,
    "totalCost": 0.0063
  }
}
```

**Standard Response (Error)**

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "temperature",
        "issue": "Must be between 0 and 2"
      }
    ],
    "correlationId": "req-abc123"
  }
}
```

## Authentication & Authorization

### Authentication Methods

#### 1. JWT Bearer Tokens

```bash
# Login
POST /v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}

# Use token
GET /v1/models
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**JWT Payload**

```json
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "role": "user",
  "permissions": ["read:models", "create:completions"],
  "iat": 1704063600,
  "exp": 1704067200
}
```

#### 2. API Keys

```bash
# Create API key
POST /v1/users/me/api-keys
Authorization: Bearer <jwt>
{
  "name": "Production API Key",
  "permissions": {
    "endpoints": ["/v1/completions", "/v1/models"],
    "rateLimit": {
      "requestsPerHour": 1000
    }
  },
  "expiresAt": "2025-12-31T23:59:59Z"
}

# Response
{
  "id": "key-abc123",
  "key": "noa_sk_1234567890abcdef", // Only shown once
  "name": "Production API Key",
  "createdAt": "2025-01-01T00:00:00Z"
}

# Use API key
GET /v1/models
X-API-Key: noa_sk_1234567890abcdef
```

#### 3. OAuth 2.0 Client Credentials

```bash
# Request access token
POST /v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=your_client_id
&client_secret=your_client_secret
&scope=read:models create:completions

# Response
{
  "access_token": "ya29.a0AfH6SMBx...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:models create:completions"
}
```

### Authorization (RBAC)

```typescript
// Role hierarchy
enum Role {
  ADMIN = 'admin', // Full system access
  USER = 'user', // Standard user access
  READONLY = 'readonly', // Read-only access
}

// Permission model
interface Permission {
  resource: string; // 'models', 'completions', 'jobs', 'users'
  action: string; // 'read', 'create', 'update', 'delete'
}

// Role permissions
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [{ resource: '*', action: '*' }],
  user: [
    { resource: 'models', action: 'read' },
    { resource: 'completions', action: 'create' },
    { resource: 'jobs', action: '*' },
    { resource: 'users', action: 'read' },
  ],
  readonly: [
    { resource: 'models', action: 'read' },
    { resource: 'jobs', action: 'read' },
  ],
};
```

**Authorization Middleware**

```typescript
function authorize(resource: string, action: string): RequestHandler {
  return (req, res, next) => {
    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole];

    const hasPermission = permissions.some(
      (p) =>
        (p.resource === '*' || p.resource === resource) &&
        (p.action === '*' || p.action === action)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }

    next();
  };
}

// Usage
app.get('/v1/models', authenticate, authorize('models', 'read'), getModels);
app.post(
  '/v1/completions',
  authenticate,
  authorize('completions', 'create'),
  createCompletion
);
```

## Rate Limiting

### Token Bucket Algorithm

```typescript
interface RateLimitConfig {
  capacity: number; // Max tokens in bucket
  refillRate: number; // Tokens added per second
  window: number; // Time window in seconds
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Tier-based limits
  free: {
    capacity: 100,
    refillRate: 10,
    window: 3600,
  },
  pro: {
    capacity: 1000,
    refillRate: 100,
    window: 3600,
  },
  enterprise: {
    capacity: 10000,
    refillRate: 1000,
    window: 3600,
  },
};
```

**Rate Limit Headers**

```http
X-RateLimit-Limit: 100          # Total requests allowed
X-RateLimit-Remaining: 85       # Requests remaining
X-RateLimit-Reset: 1704067200   # Unix timestamp when limit resets
Retry-After: 60                 # Seconds to wait (if rate limited)
```

**Rate Limit Response (429)**

```json
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
Retry-After: 60

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

### Rate Limiting by Scope

```typescript
// Different limits for different endpoints
const ENDPOINT_LIMITS = {
  '/v1/completions': { capacity: 50, refillRate: 5 }, // Expensive
  '/v1/models': { capacity: 1000, refillRate: 100 }, // Cheap
  '/v1/jobs': { capacity: 200, refillRate: 20 }, // Medium
};

// Combined with user tier
function getRateLimit(user: User, endpoint: string): RateLimitConfig {
  const tierLimit = RATE_LIMITS[user.tier];
  const endpointLimit = ENDPOINT_LIMITS[endpoint];

  // Use more restrictive limit
  return {
    capacity: Math.min(tierLimit.capacity, endpointLimit.capacity),
    refillRate: Math.min(tierLimit.refillRate, endpointLimit.refillRate),
    window: tierLimit.window,
  };
}
```

## Versioning Strategy

### URL Path Versioning

```
/v1/completions  → Current stable version
/v2/completions  → Next major version
/beta/completions → Beta features
```

**Version Deprecation Policy**

- New major version: 6 months notice
- Maintain N-1 versions (e.g., v2 supports v1 endpoints)
- Deprecation warnings in response headers

```http
Deprecation: true
Sunset: Sun, 01 Jan 2026 00:00:00 GMT
Link: </v2/completions>; rel="successor-version"
```

### Breaking vs Non-Breaking Changes

**Non-Breaking (Patch/Minor)**

- Add new endpoints
- Add new optional fields
- Add new enum values
- Deprecate fields (but keep functional)

**Breaking (Major)**

- Remove endpoints
- Remove or rename fields
- Change field types
- Change response structure
- Remove enum values

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string; // Machine-readable error code
    message: string; // Human-readable message
    details?: any[]; // Additional error details
    correlationId?: string; // Request correlation ID
    documentation?: string; // Link to docs
  };
}
```

### Standard Error Codes

| HTTP Status | Error Code           | Description                       |
| ----------- | -------------------- | --------------------------------- |
| 400         | VALIDATION_ERROR     | Invalid request body/parameters   |
| 401         | UNAUTHORIZED         | Missing or invalid authentication |
| 403         | FORBIDDEN            | Insufficient permissions          |
| 404         | NOT_FOUND            | Resource not found                |
| 409         | CONFLICT             | Resource state conflict           |
| 422         | UNPROCESSABLE_ENTITY | Semantic validation error         |
| 429         | RATE_LIMIT_EXCEEDED  | Too many requests                 |
| 500         | INTERNAL_ERROR       | Server error                      |
| 502         | PROVIDER_ERROR       | External provider error           |
| 503         | SERVICE_UNAVAILABLE  | Service temporarily unavailable   |

### Error Response Examples

**Validation Error**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "model",
        "issue": "Must be one of: gpt-4, gpt-3.5-turbo, claude-3-opus"
      },
      {
        "field": "temperature",
        "issue": "Must be between 0 and 2"
      }
    ],
    "correlationId": "req-abc123",
    "documentation": "https://docs.noa-server.com/api/errors#validation"
  }
}
```

**Provider Error**

```json
{
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "AI provider returned an error",
    "details": {
      "provider": "openai",
      "providerError": "context_length_exceeded",
      "providerMessage": "This model's maximum context length is 8192 tokens"
    },
    "correlationId": "req-abc123"
  }
}
```

## OpenAPI Specification

### Specification Structure

```yaml
openapi: 3.0.3
info:
  title: NOA Server API
  version: 1.0.0
  description: Unified AI inference API with multi-provider support
  contact:
    name: NOA Server Team
    email: support@noa-server.com
  license:
    name: MIT
servers:
  - url: https://api.noa-server.com/v1
    description: Production
  - url: https://staging-api.noa-server.com/v1
    description: Staging
  - url: http://localhost:3001/v1
    description: Local development

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    CompletionRequest:
      type: object
      required: [model, prompt]
      properties:
        model:
          type: string
          enum: [gpt-4, gpt-3.5-turbo, claude-3-opus, claude-3-sonnet]
        prompt:
          type: string
          maxLength: 10000
        temperature:
          type: number
          minimum: 0
          maximum: 2
          default: 0.7
        maxTokens:
          type: integer
          minimum: 1
          maximum: 4096
          default: 1000

    CompletionResponse:
      type: object
      properties:
        id:
          type: string
        object:
          type: string
          enum: [completion]
        created:
          type: integer
          format: int64
        model:
          type: string
        choices:
          type: array
          items:
            $ref: '#/components/schemas/CompletionChoice'
        usage:
          $ref: '#/components/schemas/Usage'

    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: array
            correlationId:
              type: string

paths:
  /completions:
    post:
      summary: Create completion
      operationId: createCompletion
      tags: [Completions]
      security:
        - BearerAuth: []
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CompletionRequest'
      responses:
        '200':
          description: Successful completion
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompletionResponse'
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          description: Rate limit exceeded
          headers:
            X-RateLimit-Limit:
              schema:
                type: integer
            X-RateLimit-Remaining:
              schema:
                type: integer
            X-RateLimit-Reset:
              schema:
                type: integer
```

### Swagger UI Integration

```typescript
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'NOA Server API',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:3001/v1' }],
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

## API Usage Examples

### cURL Examples

```bash
# List models
curl -X GET "https://api.noa-server.com/v1/models" \
  -H "Authorization: Bearer <token>"

# Create completion
curl -X POST "https://api.noa-server.com/v1/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "model": "gpt-4",
    "prompt": "Explain quantum computing",
    "temperature": 0.7,
    "maxTokens": 500
  }'

# Create job
curl -X POST "https://api.noa-server.com/v1/jobs" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: noa_sk_1234567890" \
  -d '{
    "type": "ai_inference",
    "priority": 1,
    "parameters": {
      "model": "claude-3-opus",
      "prompt": "Write a technical blog post"
    },
    "callbackUrl": "https://your-app.com/webhooks/job-complete"
  }'
```

### Python SDK Example

```python
import requests

class NOAClient:
    def __init__(self, api_key: str, base_url: str = "https://api.noa-server.com/v1"):
        self.api_key = api_key
        self.base_url = base_url

    def create_completion(self, model: str, prompt: str, **kwargs):
        response = requests.post(
            f"{self.base_url}/completions",
            headers={
                "X-API-Key": self.api_key,
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "prompt": prompt,
                **kwargs
            }
        )
        response.raise_for_status()
        return response.json()

# Usage
client = NOAClient(api_key="noa_sk_1234567890")
result = client.create_completion(
    model="gpt-4",
    prompt="Explain quantum computing",
    temperature=0.7
)
print(result["choices"][0]["text"])
```

## Related Documentation

- [Component Architecture](./COMPONENTS.md) - API component details
- [Security Architecture](./SECURITY_ARCHITECTURE.md) - Authentication details
- [Data Architecture](./DATA_ARCHITECTURE.md) - Data models
