# Noa Server API Quick Start Guide

Welcome to the Noa Server API! This guide will help you get started with the API
in minutes.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Making Your First Request](#making-your-first-request)
- [Common Operations](#common-operations)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Next Steps](#next-steps)

## Overview

The Noa Server API is a RESTful API that provides:

- **Authentication & Authorization**: Secure JWT-based authentication with MFA
  support
- **User Management**: Complete CRUD operations for users with RBAC
- **MCP Tools Integration**: Execute filesystem, SQLite, and GitHub operations
- **Workflow Orchestration**: Create and execute complex workflows
- **Agent Swarm Coordination**: Spawn and coordinate multiple AI agents
- **Real-time Monitoring**: Health checks and metrics

### Base URLs

- **Production**: `https://api.noa-server.io/v1`
- **Staging**: `https://staging-api.noa-server.io/v1`
- **Local**: `http://localhost:3000/v1`

### Rate Limits

| User Type     | Requests per Hour |
| ------------- | ----------------- |
| Anonymous     | 100               |
| Authenticated | 1000              |
| Admin         | 10000             |

## Authentication

### 1. Register a New Account

```bash
curl -X POST https://api.noa-server.io/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "roles": ["user"],
    "createdAt": "2025-10-22T10:00:00Z"
  }
}
```

### 2. Login to Get Access Token

```bash
curl -X POST https://api.noa-server.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "YOUR_ACCESS_TOKEN",
    "refreshToken": "YOUR_REFRESH_TOKEN",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "roles": ["user"]
    }
  }
}
```

### 3. Use Token in Requests

Include the access token in the `Authorization` header:

```bash
curl -X GET https://api.noa-server.io/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Making Your First Request

### Get Your Profile

```bash
curl -X GET https://api.noa-server.io/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### List Available MCP Tools

```bash
curl -X GET https://api.noa-server.io/v1/mcp/tools \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Execute a Filesystem Operation

```bash
curl -X POST https://api.noa-server.io/v1/mcp/filesystem \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "list",
    "path": "/data"
  }'
```

## Common Operations

### Working with Workflows

#### Create a Workflow

```bash
curl -X POST https://api.noa-server.io/v1/workflows \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Data Processing Pipeline",
    "description": "Process and analyze data files",
    "category": "data-processing",
    "definition": {
      "steps": [
        {
          "id": "step1",
          "name": "Read File",
          "type": "mcp_tool",
          "config": {
            "tool": "filesystem",
            "operation": "read",
            "path": "/data/input.json"
          }
        },
        {
          "id": "step2",
          "name": "Process Data",
          "type": "task",
          "config": {
            "processor": "json"
          },
          "dependencies": ["step1"]
        }
      ]
    }
  }'
```

#### Execute a Workflow

```bash
curl -X POST https://api.noa-server.io/v1/workflows/{workflowId}/execute \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "inputFile": "/data/input.json"
    },
    "priority": "high"
  }'
```

### Working with Agent Swarms

#### Create an Agent Swarm

```bash
curl -X POST https://api.noa-server.io/v1/agents/swarms \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development Swarm",
    "description": "Full-stack development team",
    "topology": "hierarchical",
    "maxAgents": 5,
    "agents": [
      {
        "type": "backend-dev",
        "capabilities": ["api", "database"]
      },
      {
        "type": "frontend-dev",
        "capabilities": ["react", "typescript"]
      },
      {
        "type": "tester",
        "capabilities": ["unit-tests", "integration-tests"]
      }
    ]
  }'
```

#### Coordinate a Swarm Task

```bash
curl -X POST https://api.noa-server.io/v1/agents/swarms/{swarmId}/coordinate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "type": "full_stack_development",
      "requirements": "Build REST API with React frontend"
    },
    "strategy": "hierarchical",
    "timeout": 600
  }'
```

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses:

### Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Invalid request parameters",
  "statusCode": 400,
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  },
  "timestamp": "2025-10-22T10:00:00Z",
  "path": "/api/v1/auth/register",
  "requestId": "req_12345"
}
```

### Common Status Codes

| Code | Meaning               | Description                     |
| ---- | --------------------- | ------------------------------- |
| 200  | OK                    | Request successful              |
| 201  | Created               | Resource created successfully   |
| 202  | Accepted              | Request accepted for processing |
| 400  | Bad Request           | Invalid request parameters      |
| 401  | Unauthorized          | Authentication required         |
| 403  | Forbidden             | Insufficient permissions        |
| 404  | Not Found             | Resource not found              |
| 409  | Conflict              | Resource already exists         |
| 429  | Too Many Requests     | Rate limit exceeded             |
| 500  | Internal Server Error | Server error                    |

### Handling Rate Limits

Check rate limit headers in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
```

## Best Practices

### 1. Authentication

- **Store tokens securely**: Never commit tokens to version control
- **Refresh tokens**: Use refresh tokens to get new access tokens
- **Handle token expiration**: Implement automatic token refresh logic

### 2. Error Handling

```javascript
async function makeApiRequest(url, options) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.message}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

### 3. Pagination

Always use pagination for list endpoints:

```bash
curl -X GET "https://api.noa-server.io/v1/users?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Request IDs

Include custom request IDs for tracking:

```bash
curl -X GET https://api.noa-server.io/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Request-ID: req_custom_12345"
```

### 5. Timeouts

Set appropriate timeouts for long-running operations:

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

fetch(url, {
  signal: controller.signal,
  headers: { Authorization: `Bearer ${token}` },
}).finally(() => clearTimeout(timeout));
```

## Next Steps

### Explore the API

- **Interactive Documentation**: Visit the
  [Swagger UI](../swagger-ui/index.html)
- **Full API Reference**: See [OpenAPI Specification](../openapi.yaml)
- **Authentication Guide**: Read
  [Authentication Documentation](./AUTHENTICATION.md)
- **Rate Limiting**: Learn about [Rate Limiting](./RATE_LIMITING.md)
- **Webhooks**: Set up [Webhooks](./WEBHOOKS.md)

### SDK and Client Libraries

Generate client libraries in your preferred language:

```bash
# TypeScript/JavaScript
npm run generate:client:typescript

# Python
npm run generate:client:python

# Go
npm run generate:client:go
```

### Example Applications

Check out example applications in the `/examples` directory:

- Node.js/Express integration
- React frontend with API integration
- Python automation scripts
- CLI tools

### Support

- **Documentation**: https://docs.noa-server.io
- **GitHub Issues**: https://github.com/deflex/noa-server/issues
- **Email**: support@noa-server.io
- **Discord**: https://discord.gg/noa-server

---

**Happy coding!** If you have questions or feedback, please reach out to our
support team.
