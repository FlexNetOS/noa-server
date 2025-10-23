# API Security Documentation

Comprehensive security documentation for the AI Inference API, covering authentication, authorization, and security best practices.

## Table of Contents

1. [Authentication Methods](#authentication-methods)
2. [Authorization Model](#authorization-model)
3. [Security Headers](#security-headers)
4. [Input Validation](#input-validation)
5. [Audit Logging](#audit-logging)
6. [API Key Management](#api-key-management)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Authentication Methods

The AI Inference API supports multiple authentication methods:

### 1. JWT Token Authentication (Recommended)

JWT (JSON Web Tokens) provide stateless authentication using RS256 or HS256 algorithms.

#### Login Flow

```
┌─────────┐                  ┌──────────┐                  ┌──────────┐
│ Client  │                  │ API      │                  │ Database │
└────┬────┘                  └────┬─────┘                  └────┬─────┘
     │                            │                             │
     │  POST /auth/login          │                             │
     │──────────────────────────> │                             │
     │  {email, password}         │                             │
     │                            │  Verify credentials         │
     │                            │ ─────────────────────────>  │
     │                            │                             │
     │                            │  <───────────────────────   │
     │                            │  User data                  │
     │                            │                             │
     │  <──────────────────────── │                             │
     │  {accessToken,             │                             │
     │   refreshToken}            │                             │
     │                            │                             │
     │  Authorization: Bearer     │                             │
     │  {accessToken}             │                             │
     │──────────────────────────> │                             │
     │                            │                             │
     │  <──────────────────────── │                             │
     │  Protected resource        │                             │
     │                            │                             │
```

#### Request Example

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Response Example

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "user_1234567890",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_1234567890",
    "email": "user@example.com",
    "role": "user",
    "permissions": ["read", "write"],
    "tenantId": "tenant_abc",
    "iat": 1704067200,
    "exp": 1704068100,
    "jti": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 2. API Key Authentication

API keys provide long-lived authentication for machine-to-machine communication.

#### Request Example

```bash
curl -X POST http://localhost:3001/api/v1/inference/chat \
  -H "X-API-Key: noa_a1b2c3d4e5f6..." \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [...],
    "model": "gpt-4"
  }'
```

#### Creating an API Key

```bash
curl -X POST http://localhost:3001/api/v1/auth/api-keys \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "permissions": ["read", "write"],
    "allowedModels": ["gpt-4", "gpt-3.5-turbo"],
    "rateLimit": 1000
  }'
```

### 3. Session-Based Authentication (Optional)

Session-based authentication uses HTTP-only cookies for web applications.

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# Subsequent requests
curl -X GET http://localhost:3001/api/v1/auth/me \
  -b cookies.txt
```

## Authorization Model

The API uses Role-Based Access Control (RBAC) with three roles:

### Role Hierarchy

```
┌──────────────────────────────────────────────────┐
│                     ADMIN                        │
│  • Full access to all resources                  │
│  • Can manage users and API keys                 │
│  • Cross-tenant access                           │
│  • Permissions: read, write, execute, delete     │
└──────────────────────────────────────────────────┘
                       ▲
                       │ inherits
┌──────────────────────────────────────────────────┐
│                     USER                         │
│  • Access to AI inference and models             │
│  • Can create API keys                           │
│  • Tenant-isolated access                        │
│  • Permissions: read, write                      │
└──────────────────────────────────────────────────┘
                       ▲
                       │ inherits
┌──────────────────────────────────────────────────┐
│                     GUEST                        │
│  • Read-only access to models                    │
│  • No API key creation                           │
│  • Limited rate limits                           │
│  • Permissions: read                             │
└──────────────────────────────────────────────────┘
```

### Permission Matrix

| Resource      | Admin | User | Guest |
|---------------|-------|------|-------|
| Models (read) | ✅    | ✅   | ✅    |
| Inference     | ✅    | ✅   | ❌    |
| Embeddings    | ✅    | ✅   | ❌    |
| API Keys      | ✅    | ✅   | ❌    |
| Users         | ✅    | ❌   | ❌    |
| Providers     | ✅    | ✅   | ❌    |

### Tenant Isolation

Multi-tenancy ensures data isolation between organizations:

```javascript
// Tenant validation middleware
app.use('/api/v1/models/:id',
  authenticate,
  validateTenantAccess(req => req.params.id)
);
```

## Security Headers

The API implements comprehensive security headers:

### Helmet.js Configuration

```javascript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true
}
```

### Custom Security Headers

All API responses include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Permissions-Policy: geolocation=(), microphone=(), camera=()
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Input Validation

### Validation Layers

1. **Schema Validation (Zod)**
   - Type checking
   - Format validation
   - Range validation

2. **Sanitization**
   - XSS prevention
   - SQL injection prevention
   - Command injection prevention

3. **Business Logic Validation**
   - Resource limits
   - Permission checks
   - Rate limiting

### Example: Chat Completion Validation

```typescript
const chatCompletionSchema = z.object({
  body: z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1).max(50000)
    })).min(1),
    model: z.string().regex(/^[a-zA-Z0-9\-_.]+$/),
    config: z.object({
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().int().positive().max(100000).optional()
    }).optional()
  })
});
```

### Attack Prevention

| Attack Type          | Prevention Method                    |
|----------------------|--------------------------------------|
| XSS                  | HTML entity encoding, CSP            |
| SQL Injection        | Parameterized queries, input validation |
| Command Injection    | Character whitelist, escape sequences |
| Path Traversal       | Path normalization, whitelist        |
| CSRF                 | SameSite cookies, CSRF tokens        |
| SSRF                 | URL whitelist, internal IP blocking  |

## Audit Logging

### Logged Events

All security events are logged with PII masking:

- Authentication attempts (success/failure)
- Authorization decisions
- API key usage
- Token refresh
- Sensitive operations (user creation, role changes)
- Failed access attempts

### Log Entry Structure

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "userId": "user_1234567890",
  "action": "auth.login.success",
  "resource": "authentication",
  "outcome": "success",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req_1704067200_abc123",
  "metadata": {
    "email": "user****@example.com"
  }
}
```

### PII Masking

Sensitive fields are automatically masked:

```javascript
// Email: user@example.com → user****@example.com
// IP: 192.168.1.100 → 192.****.***.***
// API Key: noa_abc123... → noa_****
```

## API Key Management

### Creating API Keys

```bash
POST /api/v1/auth/api-keys
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Production Key",
  "permissions": ["read", "write"],
  "allowedModels": ["gpt-4"],
  "allowedProviders": ["openai"],
  "rateLimit": 1000,
  "expiresIn": 2592000
}
```

### API Key Best Practices

1. **Rotation**: Rotate keys every 90 days
2. **Scoping**: Use minimal required permissions
3. **Monitoring**: Track key usage and anomalies
4. **Revocation**: Revoke compromised keys immediately
5. **Storage**: Never commit keys to version control

### API Key Format

```
noa_{64_hex_characters}
Example: noa_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

## Best Practices

### 1. Token Management

```javascript
// Store tokens securely
localStorage.setItem('accessToken', token); // ❌ Not secure
httpOnly cookie // ✅ Secure

// Refresh before expiration
if (tokenExpiresIn < 60) {
  await refreshToken();
}

// Revoke on logout
await fetch('/api/v1/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 2. Password Requirements

```
Minimum 12 characters
At least 1 uppercase letter
At least 1 lowercase letter
At least 1 number
At least 1 special character
Cannot reuse last 5 passwords
```

### 3. Rate Limiting

| Role  | Requests/Minute |
|-------|-----------------|
| Admin | 1000            |
| User  | 100             |
| Guest | 10              |

### 4. HTTPS Only

```javascript
// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
  return res.redirect(301, `https://${req.hostname}${req.url}`);
}
```

## Troubleshooting

### Common Issues

#### 1. "Invalid token" Error

**Cause**: Expired or malformed JWT token

**Solution**:
```bash
# Refresh token
POST /api/v1/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

# Or re-authenticate
POST /api/v1/auth/login
```

#### 2. "Insufficient permissions" Error

**Cause**: User lacks required role or permission

**Solution**: Contact admin to upgrade role or permissions

#### 3. "Invalid API key" Error

**Cause**: API key is revoked, expired, or invalid

**Solution**: Generate new API key via `/api/v1/auth/api-keys`

#### 4. Rate Limit Exceeded

**Cause**: Too many requests in time window

**Solution**: Wait for rate limit reset (check `X-RateLimit-Reset` header)

### Debug Mode

Enable debug logging:

```bash
DEBUG=noa:* NODE_ENV=development npm start
```

### Security Checklist

- [ ] Use HTTPS in production
- [ ] Rotate JWT secrets regularly
- [ ] Enable 2FA for admin accounts
- [ ] Monitor audit logs for anomalies
- [ ] Implement IP whitelisting for sensitive endpoints
- [ ] Use API keys with minimal permissions
- [ ] Set appropriate CORS origins
- [ ] Enable rate limiting
- [ ] Validate all input
- [ ] Encrypt sensitive data at rest

### Contact

For security issues, please email: security@noa-server.com

Do not disclose security vulnerabilities publicly.
