# NOA Server API Documentation

Complete API documentation for NOA Server with interactive examples and
comprehensive guides.

## 📚 Overview

NOA Server provides enterprise-grade APIs for:

- **AI Inference**: Multi-provider AI completions, embeddings, and streaming
- **Authentication**: JWT, OAuth 2.0, SAML SSO, MFA
- **Message Queue**: High-performance async task processing
- **Monitoring**: Kubernetes-compatible health probes and metrics
- **MCP Tools Integration**: Filesystem, SQLite, GitHub operations
- **Workflow Orchestration**: Create and execute complex workflows
- **Agent Swarm Coordination**: Spawn and coordinate multiple AI agents

### Key Features

- ✅ **OpenAPI 3.1 Specifications** - Complete API schemas
- ✅ **Interactive Documentation** - Swagger UI and ReDoc
- ✅ **Code Examples** - JavaScript, TypeScript, Python, cURL
- ✅ **Postman Collection** - Ready-to-import API collection
- ✅ **SDK Documentation** - TypeScript and Python clients
- ✅ **Automation Scripts** - Generate and validate docs

## Documentation Structure

```
docs/api/
├── openapi/                      # OpenAPI 3.1 Specifications (NEW!)
│   ├── ai-inference-api.yaml     # AI Inference API
│   ├── auth-api.yaml             # Authentication API
│   ├── message-queue-api.yaml    # Message Queue API
│   └── monitoring-api.yaml       # Monitoring API
├── examples/                     # Code Examples (NEW!)
│   ├── javascript/
│   │   ├── chat-completion.js    # Fetch API examples
│   │   └── authentication.ts     # TypeScript auth client
│   ├── python/
│   │   └── client.py             # Complete Python client
│   └── curl/
│       └── examples.sh           # Comprehensive cURL examples
├── postman/                      # Postman Collection (NEW!)
│   └── noa-server.json           # Import-ready collection
├── sdk/                          # SDK Documentation
│   ├── typescript/               # TypeScript SDK docs
│   └── python/                   # Python SDK docs
├── scripts/                      # Automation Scripts (NEW!)
│   ├── generate-api-docs.sh      # Generate all docs
│   └── validate-openapi.sh       # Validate specifications
├── swagger-ui.html               # Interactive Swagger UI (NEW!)
├── redoc.html                    # ReDoc documentation (NEW!)
├── CHANGELOG.md                  # API version history
└── README.md                     # This file
```

## Quick Links

### Interactive Documentation

- **[Swagger UI](./swagger-ui/index.html)** - Try the API interactively
- **[OpenAPI Spec](./openapi.yaml)** - Full API specification

### Guides

- **[Quick Start Guide](./guides/API_QUICKSTART.md)** - Get started in minutes
- **[Authentication Guide](./guides/AUTHENTICATION.md)** - Complete auth
  documentation
- **[Rate Limiting Guide](./guides/RATE_LIMITING.md)** - Understanding rate
  limits
- **[Webhooks Guide](./guides/WEBHOOKS.md)** - Real-time event notifications

### Client Libraries

- **[TypeScript Client](./clients/typescript/README.md)** -
  TypeScript/JavaScript SDK
- **[Python Client](./clients/python/README.md)** - Python SDK

## Getting Started

### 1. Register an Account

```bash
curl -X POST https://api.noa-server.io/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "username": "johndoe"
  }'
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

### 3. Make Authenticated Requests

```bash
curl -X GET https://api.noa-server.io/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## API Endpoints

### Authentication (`/auth`)

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/mfa/setup` - Setup MFA
- `POST /auth/mfa/verify` - Verify MFA
- `POST /auth/password/reset` - Request password reset
- `POST /auth/password/change` - Change password

### Users (`/users`)

- `GET /users` - List users
- `POST /users` - Create user
- `GET /users/{userId}` - Get user
- `PUT /users/{userId}` - Update user
- `DELETE /users/{userId}` - Delete user
- `GET /users/me` - Get current user
- `GET /users/{userId}/roles` - Get user roles
- `GET /users/{userId}/permissions` - Get user permissions

### MCP Tools (`/mcp`)

- `GET /mcp/tools` - List MCP tools
- `GET /mcp/tools/{toolId}` - Get tool details
- `POST /mcp/tools/{toolId}/execute` - Execute tool
- `POST /mcp/filesystem` - Filesystem operations
- `POST /mcp/sqlite` - SQLite operations
- `POST /mcp/github` - GitHub operations

### Workflows (`/workflows`)

- `GET /workflows` - List workflows
- `POST /workflows` - Create workflow
- `GET /workflows/{workflowId}` - Get workflow
- `PUT /workflows/{workflowId}` - Update workflow
- `DELETE /workflows/{workflowId}` - Delete workflow
- `POST /workflows/{workflowId}/execute` - Execute workflow
- `GET /workflows/{workflowId}/status` - Get workflow status
- `GET /workflows/executions` - List executions
- `GET /workflows/executions/{executionId}` - Get execution details

### Agents (`/agents`)

- `GET /agents` - List agents
- `POST /agents` - Spawn agent
- `GET /agents/{agentId}` - Get agent
- `DELETE /agents/{agentId}` - Terminate agent
- `GET /agents/{agentId}/tasks` - Get agent tasks
- `POST /agents/{agentId}/tasks` - Assign task to agent
- `GET /agents/swarms` - List agent swarms
- `POST /agents/swarms` - Create agent swarm
- `GET /agents/swarms/{swarmId}` - Get swarm details
- `POST /agents/swarms/{swarmId}/coordinate` - Coordinate swarm task

### Health (`/health`)

- `GET /health` - Health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check
- `GET /metrics` - Prometheus metrics

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Alternative authentication methods:

- **API Key**: `X-API-Key: YOUR_API_KEY`

See [Authentication Guide](./guides/AUTHENTICATION.md) for details.

## Rate Limits

| User Type     | Requests/Hour |
| ------------- | ------------- |
| Anonymous     | 100           |
| Authenticated | 1000          |
| Admin         | 10000         |

See [Rate Limiting Guide](./guides/RATE_LIMITING.md) for details.

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response

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

## Status Codes

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| 200  | OK - Request successful                    |
| 201  | Created - Resource created                 |
| 202  | Accepted - Request accepted for processing |
| 400  | Bad Request - Invalid parameters           |
| 401  | Unauthorized - Authentication required     |
| 403  | Forbidden - Insufficient permissions       |
| 404  | Not Found - Resource not found             |
| 409  | Conflict - Resource already exists         |
| 429  | Too Many Requests - Rate limit exceeded    |
| 500  | Internal Server Error - Server error       |

## Pagination

List endpoints support pagination:

```bash
GET /users?page=1&limit=20
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Webhooks

Subscribe to real-time events:

```bash
curl -X POST https://api.noa-server.io/v1/webhooks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "url": "https://your-server.com/webhooks",
    "events": ["workflow.completed", "agent.status.changed"]
  }'
```

See [Webhooks Guide](./guides/WEBHOOKS.md) for details.

## Client Libraries

### TypeScript/JavaScript

```bash
npm install @noa-server/api-client
```

```typescript
import { Configuration, AuthenticationApi } from '@noa-server/api-client';

const config = new Configuration({
  basePath: 'https://api.noa-server.io/v1',
  accessToken: 'YOUR_ACCESS_TOKEN',
});

const authApi = new AuthenticationApi(config);
```

See [TypeScript Client Documentation](./clients/typescript/README.md)

### Python

```bash
pip install noa-server-api-client
```

```python
from noa_server_api import Configuration, ApiClient, AuthenticationApi

configuration = Configuration(
    host='https://api.noa-server.io/v1',
    access_token='YOUR_ACCESS_TOKEN'
)

with ApiClient(configuration) as api_client:
    auth_api = AuthenticationApi(api_client)
```

See [Python Client Documentation](./clients/python/README.md)

## OpenAPI Specification

The complete OpenAPI 3.0.3 specification is available in:

- **YAML**: [openapi.yaml](./openapi.yaml)
- **JSON**: [openapi.json](./openapi.json)

Use these specifications to:

- Generate client libraries in any language
- Import into API testing tools (Postman, Insomnia)
- Integrate with API gateways
- Validate API requests/responses

## Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Store tokens securely**: Use secure storage for access tokens
3. **Implement token refresh**: Automatically refresh expired tokens
4. **Handle rate limits**: Implement exponential backoff
5. **Use pagination**: Don't fetch all data at once
6. **Cache responses**: Reduce API calls with caching
7. **Use webhooks**: Avoid polling for real-time updates
8. **Validate inputs**: Validate data before sending to API
9. **Handle errors**: Implement comprehensive error handling
10. **Monitor usage**: Track API usage and performance

## Testing

### Using cURL

```bash
# Set environment variables
export API_URL="https://api.noa-server.io/v1"
export ACCESS_TOKEN="your_token_here"

# Test authentication
curl -X GET "$API_URL/users/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Using Postman

1. Import OpenAPI specification: `openapi.json`
2. Set up environment variables
3. Configure authentication
4. Run requests

### Using Swagger UI

Visit [Swagger UI](./swagger-ui/index.html) to test the API interactively.

## Support

### Documentation

- **API Docs**: https://docs.noa-server.io/api
- **Guides**: See [guides](./guides/) directory
- **OpenAPI Spec**: [openapi.yaml](./openapi.yaml)

### Community

- **GitHub**: https://github.com/deflex/noa-server
- **Issues**: https://github.com/deflex/noa-server/issues
- **Discussions**: https://github.com/deflex/noa-server/discussions

### Enterprise Support

- **Email**: support@noa-server.io
- **Sales**: sales@noa-server.io
- **SLA**: Available for enterprise customers

## Changelog

### Version 1.0.0 (2025-10-22)

- Initial API release
- Complete OpenAPI 3.0.3 specification
- Authentication with JWT and MFA
- User management with RBAC
- MCP tools integration
- Workflow orchestration
- Agent swarm coordination
- Webhooks support
- TypeScript and Python client libraries

---

**Built with** OpenAPI 3.0.3 | **License** MIT | **Version** 1.0.0
