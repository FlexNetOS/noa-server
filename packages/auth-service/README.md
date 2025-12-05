# @noa/auth-service

📚 [Master Documentation Index](docs/INDEX.md)


Enterprise-grade authentication and authorization service for Noa Server.

## Features

### Authentication

- **JWT**: HS256, RS256, ES256 algorithms
- **OAuth 2.0 / OpenID Connect**: Google, GitHub, Microsoft, custom providers
- **SAML 2.0**: Enterprise SSO integration
- **LDAP / Active Directory**: Corporate authentication
- **Magic Links**: Passwordless email authentication
- **WebAuthn**: FIDO2 / biometric authentication (coming soon)

### Multi-Factor Authentication

- **TOTP**: Google Authenticator, Authy compatible
- **SMS**: Phone-based verification
- **Email**: Email-based codes
- **Hardware Keys**: WebAuthn/FIDO2 support
- **Backup Codes**: Recovery codes for MFA

### Authorization

- **RBAC**: Role-based access control with wildcards
- **ABAC**: Attribute-based access control (coming soon)
- **Permissions**: Fine-grained resource:action permissions
- **Conditional Access**: Context-aware authorization

### Security

- **Password Hashing**: Argon2id (OWASP recommended)
- **Breach Checking**: HaveIBeenPwned API integration
- **Rate Limiting**: Redis-backed adaptive rate limiting
- **Brute Force Protection**: Automatic account lockout
- **Session Management**: Redis-backed sessions
- **Audit Logging**: Complete authentication audit trail

## Installation

```bash
pnpm add @noa/auth-service
```

## Quick Start

```typescript
import { AuthService } from '@noa/auth-service';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Initialize database and Redis
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

// Configure auth service
const authService = new AuthService(
  {
    jwt: {
      algorithm: 'HS256',
      secret: process.env.JWT_SECRET,
      issuer: 'noa-server',
      audience: 'noa-client',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    },
    password: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventBreached: true,
    },
    mfa: {
      enabled: true,
      issuer: 'Noa Server',
      window: 1,
    },
    session: {
      redis: {
        host: 'localhost',
        port: 6379,
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
      maxAge: 24 * 60 * 60 * 1000,
    },
  },
  db,
  redis
);

// Register user
const result = await authService.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
});

// Login
const loginResult = await authService.login({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

console.log('Access Token:', loginResult.token.accessToken);
```

## Express Middleware

```typescript
import express from 'express';
import { createExpressAuthMiddleware, requireRoles } from '@noa/auth-service';

const app = express();

const { jwtProvider, sessionManager } = authService.getServices();

// Apply authentication globally
app.use(createExpressAuthMiddleware({ jwtProvider, sessionManager }));

// Protect specific routes
app.get('/admin', requireRoles('admin'), (req, res) => {
  res.json({ user: req.user });
});
```

## Fastify Plugin

```typescript
import Fastify from 'fastify';
import { createFastifyAuthPlugin } from '@noa/auth-service';

const fastify = Fastify();

fastify.register(
  createFastifyAuthPlugin({
    jwtProvider,
    sessionManager,
  })
);

// Protected route
fastify.get(
  '/profile',
  {
    config: { auth: true },
  },
  async (request, reply) => {
    return { user: request.user };
  }
);
```

## Configuration

### Environment Variables

```bash
# JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256

# Database
DATABASE_URL=postgresql://noa:password@localhost:5432/noa

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# SAML
SAML_ENTRY_POINT=https://idp.example.com/sso
SAML_CERT=/path/to/cert.pem
```

### Password Policy

```typescript
const config = {
  password: {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommon: true,
    preventUserInfo: true,
    preventReuse: 5,
    maxAge: 90, // days
    minAge: 1,
  },
};
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## Documentation

- [Authentication Guide](../../docs/security/AUTHENTICATION.md)
- [API Reference](./docs/API.md)
- [Security Best Practices](./docs/SECURITY.md)
- [Migration Guide](./docs/MIGRATION.md)

## License

MIT

## Support

- Issues: https://github.com/noa-server/auth-service/issues
- Security: security@noa-server.com
- Docs: https://docs.noa-server.com

> Last updated: 2025-11-20
