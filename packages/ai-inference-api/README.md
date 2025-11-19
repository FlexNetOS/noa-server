# AI Inference API - Secure REST API

Production-ready REST API for AI model inference with comprehensive security
features.

## Features

### Security

- **Multi-Method Authentication**
  - JWT tokens (RS256/HS256)
  - API keys with scoped permissions
  - Session-based authentication
  - OAuth 2.0 support (planned)

- **Role-Based Access Control (RBAC)**
  - Admin, User, Guest roles
  - Fine-grained permissions (read/write/execute/delete)
  - Resource-level authorization
  - Tenant isolation for multi-tenancy

- **Security Headers**
  - Helmet.js with 11+ security headers
  - Content Security Policy (CSP)
  - HSTS (HTTP Strict Transport Security)
  - XSS protection
  - CSRF prevention

- **Input Validation & Sanitization**
  - Zod schema validation
  - XSS attack prevention
  - SQL injection prevention
  - Command injection prevention
  - File upload validation

- **Audit Logging**
  - All authentication attempts logged
  - Authorization decisions tracked
  - PII masking (GDPR compliant)
  - Comprehensive security event tracking

### Performance

- **Advanced Rate Limiting**
  - Sliding window algorithm
  - Per-user and per-endpoint limits
  - Distributed rate limiting (Redis)
  - Burst protection

- **Adaptive Throttling**
  - CPU/memory-based throttling
  - Concurrent request limiting
  - Request queuing with timeouts

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Variables

Required:

- `JWT_ACCESS_SECRET` - Secret for access tokens (min 32 chars)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (min 32 chars)

Optional:

- `REDIS_URL` - Redis URL for distributed rate limiting
- `JWT_PRIVATE_KEY` - Private key for RS256 algorithm
- `JWT_PUBLIC_KEY` - Public key for RS256 algorithm

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run security tests
pnpm test:security

# Build
pnpm build

# Start production server
pnpm start
```

## Authentication

### 1. Login with JWT

```bash
# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# Response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "user"
  }
}

# Use access token
curl -X POST http://localhost:3001/api/v1/inference/chat \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "gpt-4"
  }'
```

### 2. API Key Authentication

```bash
# Create API key
curl -X POST http://localhost:3001/api/v1/auth/api-keys \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "permissions": ["read", "write"],
    "rateLimit": 1000
  }'

# Use API key
curl -X POST http://localhost:3001/api/v1/inference/chat \
  -H "X-API-Key: noa_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "model": "gpt-4"
  }'
```

## API Endpoints

### Authentication

| Method | Endpoint                | Description                   | Auth Required |
| ------ | ----------------------- | ----------------------------- | ------------- |
| POST   | `/api/v1/auth/login`    | Login with credentials        | No            |
| POST   | `/api/v1/auth/refresh`  | Refresh access token          | No            |
| POST   | `/api/v1/auth/logout`   | Logout and invalidate session | Yes           |
| POST   | `/api/v1/auth/api-keys` | Create API key                | Yes (User+)   |
| GET    | `/api/v1/auth/me`       | Get current user info         | Yes           |

### Inference

| Method | Endpoint                        | Description         | Auth Required |
| ------ | ------------------------------- | ------------------- | ------------- |
| POST   | `/api/v1/inference/chat`        | Chat completion     | Yes           |
| POST   | `/api/v1/inference/chat/stream` | Streaming chat      | Yes           |
| POST   | `/api/v1/inference/embeddings`  | Generate embeddings | Yes           |

### Models

| Method | Endpoint             | Description           | Auth Required |
| ------ | -------------------- | --------------------- | ------------- |
| GET    | `/api/v1/models`     | List available models | Optional      |
| GET    | `/api/v1/models/:id` | Get model details     | Optional      |

## Security Best Practices

### 1. Use HTTPS in Production

```javascript
// Always use HTTPS in production
if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
  return res.redirect(301, `https://${req.hostname}${req.url}`);
}
```

### 2. Rotate Secrets Regularly

- JWT secrets: Every 90 days
- API keys: Every 90 days
- Session secrets: Every 90 days

### 3. Use Strong Passwords

Password requirements:

- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### 4. Implement Rate Limiting

Default limits per role:

- Admin: 1000 requests/minute
- User: 100 requests/minute
- Guest: 10 requests/minute

### 5. Monitor Audit Logs

Check audit logs regularly for:

- Failed authentication attempts
- Unauthorized access attempts
- Unusual API key usage patterns

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run security tests only
pnpm test:security

# Watch mode
pnpm test:watch
```

### Test Coverage

Current coverage: 90%+

Test categories:

- JWT authentication (8 tests)
- Password hashing (4 tests)
- API key management (4 tests)
- RBAC authorization (3 tests)
- Input validation (4 tests)
- SQL injection prevention (3 tests)
- Command injection prevention (2 tests)
- XSS prevention (6 tests)
- PII masking (3 tests)

## Documentation

- [API Security Documentation](./docs/api-security.md) - Comprehensive security
  guide
- [Swagger/OpenAPI](http://localhost:3001/api-docs) - Interactive API
  documentation

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Request                    │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│            Security Headers Middleware              │
│  • Helmet.js (11+ headers)                          │
│  • Custom CSP, HSTS, X-Frame-Options                │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│           Input Sanitization Middleware             │
│  • XSS prevention                                   │
│  • SQL injection prevention                         │
│  • Command injection prevention                     │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          Authentication Middleware                  │
│  • JWT verification (RS256/HS256)                   │
│  • API key validation                               │
│  • Session validation                               │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│          Authorization Middleware                   │
│  • Role-based access control                        │
│  • Permission validation                            │
│  • Resource-level authorization                     │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│           Rate Limiting Middleware                  │
│  • Sliding window algorithm                         │
│  • Per-user and per-endpoint limits                 │
│  • Burst protection                                 │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Route Handler                          │
│  • Business logic                                   │
│  • AI provider integration                          │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│           Audit Logging Middleware                  │
│  • Log all requests/responses                       │
│  • PII masking (GDPR compliant)                     │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Response                           │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

See [API Security Documentation](./docs/api-security.md#troubleshooting) for
common issues and solutions.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT

## Support

For security issues, please email: security@noa-server.com

Do not disclose security vulnerabilities publicly.
