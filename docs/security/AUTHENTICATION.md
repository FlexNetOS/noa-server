# Authentication & Authorization Guide

Complete guide to using the Noa Server authentication service.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Authentication Providers](#authentication-providers)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Authorization (RBAC)](#authorization-rbac)
- [Session Management](#session-management)
- [Security Features](#security-features)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

## Overview

The Noa Server authentication service (`@noa/auth-service`) provides enterprise-grade authentication and authorization with:

- **Multiple Authentication Methods**: JWT, OAuth 2.0, SAML, LDAP, Magic Links, WebAuthn
- **Multi-Factor Authentication**: TOTP, SMS, Email, Hardware Keys
- **Role-Based Access Control**: Flexible RBAC with wildcard support
- **Session Management**: Redis-backed sessions with automatic cleanup
- **Security Features**: Rate limiting, brute force protection, password breach checking
- **Compliance**: OWASP Top 10, GDPR, SOC 2 compliant

## Quick Start

### Installation

```bash
cd packages/auth-service
pnpm install
```

### Database Setup

```bash
# Run migrations
psql -U noa -d noa < migrations/001_auth_schema.sql
```

### Configuration

```typescript
import { AuthService } from '@noa/auth-service';
import { Pool } from 'pg';
import Redis from 'ioredis';

const config = {
  jwt: {
    algorithm: 'HS256',
    secret: process.env.JWT_SECRET,
    issuer: 'noa-server',
    audience: 'noa-client',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d'
  },
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventBreached: true
  },
  mfa: {
    enabled: true,
    issuer: 'Noa Server',
    window: 1
  },
  session: {
    redis: {
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0
    },
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

const redis = new Redis({
  host: config.session.redis.host,
  port: config.session.redis.port,
  password: config.session.redis.password
});

const authService = new AuthService(config, db, redis);
```

### Basic Usage

```typescript
// Register user
const result = await authService.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  metadata: {
    firstName: 'John',
    lastName: 'Doe'
  }
});

// Login
const loginResult = await authService.login({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});

if (loginResult.success) {
  console.log('Access Token:', loginResult.token.accessToken);
  console.log('Refresh Token:', loginResult.token.refreshToken);
}
```

## Authentication Providers

### JWT Authentication

```typescript
import { JWTProvider } from '@noa/auth-service';

const jwtProvider = new JWTProvider({
  algorithm: 'RS256', // or 'HS256', 'ES256'
  privateKey: fs.readFileSync('private.key'),
  publicKey: fs.readFileSync('public.key'),
  issuer: 'noa-server',
  audience: 'noa-client',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d'
});

// Generate token
const token = jwtProvider.generateAccessToken(user, roles, permissions);

// Verify token
try {
  const payload = jwtProvider.verifyAccessToken(token);
  console.log('User ID:', payload.sub);
  console.log('Email:', payload.email);
} catch (error) {
  console.error('Invalid token:', error.message);
}
```

### OAuth 2.0 / OpenID Connect

```typescript
import { OAuthProviderFactory } from '@noa/auth-service';

// Google OAuth
const googleProvider = OAuthProviderFactory.createGoogleProvider(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://noa.example.com/auth/google/callback'
);

// Get authorization URL
const { url, state } = await googleProvider.getAuthorizationUrl();
res.redirect(url);

// Handle callback
const tokens = await googleProvider.exchangeCodeForTokens(code);
const userInfo = await googleProvider.getUserInfo(tokens.access_token);
```

### SAML 2.0 (Enterprise SSO)

```typescript
// Configure SAML provider
const config = {
  saml: {
    entryPoint: 'https://idp.example.com/sso',
    issuer: 'noa-server',
    cert: fs.readFileSync('idp-cert.pem'),
    privateKey: fs.readFileSync('sp-private.key')
  }
};

// SAML authentication handled by passport-saml middleware
```

### LDAP / Active Directory

```typescript
// Configure LDAP
const config = {
  ldap: {
    url: 'ldap://ldap.example.com:389',
    bindDN: 'cn=admin,dc=example,dc=com',
    bindCredentials: process.env.LDAP_PASSWORD,
    searchBase: 'ou=users,dc=example,dc=com',
    searchFilter: '(uid={{username}})'
  }
};
```

## Multi-Factor Authentication

### TOTP (Time-based One-Time Password)

```typescript
import { TOTPProvider } from '@noa/auth-service';

const totpProvider = new TOTPProvider({
  issuer: 'Noa Server',
  window: 1, // ±30 seconds
  digits: 6
});

// Setup MFA
const setup = await authService.setupMFA(userId, userEmail);
console.log('Secret:', setup.secret);
console.log('QR Code:', setup.qrCode); // Data URL for QR code
console.log('Backup Codes:', setup.backupCodes);

// Enable MFA (verify code first)
const enabled = await authService.enableMFA(userId, verificationCode);

// Login with MFA
const loginResult = await authService.login({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  mfaCode: '123456',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### WebAuthn / FIDO2

```typescript
// Coming soon - Hardware security key support
```

## Authorization (RBAC)

### Role-Based Access Control

```typescript
import { RBACEngine } from '@noa/auth-service';

const rbacEngine = new RBACEngine({
  enableWildcards: true,
  enableInheritance: true,
  cachePermissions: true
});

// Check permission
const result = await authService.checkPermission(
  userId,
  'users',
  'read',
  { department: 'engineering' }
);

if (result.allowed) {
  // User has permission
} else {
  console.log('Denied:', result.reason);
}
```

### Permission Format

Permissions use the format: `resource:action`

Examples:
- `users:read` - Read user data
- `users:write` - Create/update users
- `users:delete` - Delete users
- `users:*` - All user operations
- `*:*` - All operations (admin)

### Wildcard Support

- `users:*` - All actions on users resource
- `api/*:read` - Read any API resource
- `*:read` - Read any resource

## Session Management

```typescript
import { SessionManager } from '@noa/auth-service';

// Create session
const session = await sessionManager.createSession(
  user,
  ipAddress,
  userAgent,
  refreshToken
);

// Get session
const session = await sessionManager.getSession(sessionId);

// Extend session
await sessionManager.extendSession(sessionId);

// Delete session (logout)
await sessionManager.deleteSession(sessionId);

// Delete all user sessions
await sessionManager.deleteUserSessions(userId);

// Get all user sessions
const sessions = await sessionManager.getUserSessions(userId);
```

## Security Features

### Rate Limiting

```typescript
import { RateLimiter, RateLimitPresets } from '@noa/auth-service';

const rateLimiter = new RateLimiter(redis);

// Apply rate limiting
const result = await rateLimiter.consume(
  'login',
  userEmail,
  RateLimitPresets.login
);

if (!result.allowed) {
  throw new Error(`Rate limit exceeded. Retry in ${result.retryAfter}s`);
}
```

### Password Policy

```typescript
import { PasswordPolicy } from '@noa/auth-service';

const policy = new PasswordPolicy({
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommon: true,
  preventUserInfo: true,
  preventReuse: 5, // Last 5 passwords
  maxAge: 90, // Days before expiration
  minAge: 1 // Days before can change
});

// Validate password
const validation = policy.validate(password, { email: userEmail });

if (!validation.valid) {
  console.error('Password errors:', validation.errors);
}

console.log('Password strength:', validation.strength); // weak, fair, good, strong, very-strong
console.log('Password score:', validation.score); // 0-100
```

### Breach Checking

```typescript
import { BreachChecker } from '@noa/auth-service';

const breachChecker = new BreachChecker();

// Check if password has been breached (HaveIBeenPwned API)
const breached = await breachChecker.isPasswordBreached(password);

if (breached) {
  throw new Error('This password has been exposed in data breaches');
}

// Get breach count
const count = await breachChecker.getBreachCount(password);
console.log(`Password found in ${count} breaches`);
```

### Brute Force Protection

- Automatic account lockout after 5 failed attempts
- 15-minute lockout period
- Rate limiting on login endpoints
- IP-based throttling

## API Reference

### Express Middleware

```typescript
import { createExpressAuthMiddleware, requireRoles, requirePermissions } from '@noa/auth-service';

const { jwtProvider, sessionManager } = authService.getServices();

// Authentication middleware
app.use(createExpressAuthMiddleware({
  jwtProvider,
  sessionManager,
  optional: false
}));

// Protect routes
app.get('/admin', requireRoles('admin'), (req, res) => {
  res.json({ user: req.user });
});

app.post('/users', requirePermissions('users', 'write'), (req, res) => {
  // Create user
});
```

### Fastify Plugin

```typescript
import { createFastifyAuthPlugin } from '@noa/auth-service';

fastify.register(createFastifyAuthPlugin({
  jwtProvider,
  sessionManager
}));

// Protected route
fastify.get('/profile', {
  config: { auth: true }
}, async (request, reply) => {
  return { user: request.user };
});
```

## Best Practices

### Password Security

1. **Minimum Length**: Use at least 12 characters
2. **Complexity**: Require uppercase, lowercase, numbers, and special characters
3. **Breach Checking**: Always check against HaveIBeenPwned database
4. **Hashing**: Use Argon2id (default) for password hashing
5. **Reuse Prevention**: Prevent reusing last 5 passwords

### Token Management

1. **Short Expiry**: Access tokens should expire in 15 minutes
2. **Rotation**: Implement refresh token rotation
3. **Secure Storage**: Never store tokens in localStorage
4. **HTTPS Only**: Always use HTTPS in production
5. **Token Revocation**: Implement token blacklist for immediate revocation

### MFA Recommendations

1. **Enforce MFA**: Require MFA for admin accounts
2. **Backup Codes**: Always provide backup codes
3. **Recovery Process**: Implement secure MFA recovery process
4. **Multiple Methods**: Support multiple MFA methods (TOTP, SMS, hardware keys)

### Session Security

1. **Session Expiry**: Limit session lifetime (24 hours max)
2. **Idle Timeout**: Implement idle timeout (15 minutes)
3. **Device Tracking**: Track and display active sessions
4. **Concurrent Sessions**: Limit number of concurrent sessions
5. **Secure Cookies**: Use httpOnly, secure, and sameSite flags

### Rate Limiting

1. **Login**: 5 attempts per 15 minutes per email
2. **Registration**: 3 registrations per hour per IP
3. **Password Reset**: 3 requests per hour per email
4. **API**: 100 requests per minute per user

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here
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

# LDAP
LDAP_URL=ldap://ldap.example.com:389
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_PASSWORD=your-ldap-password
```

## Monitoring & Logging

### Audit Log

All authentication events are logged to the `audit_log` table:

```sql
SELECT * FROM audit_log
WHERE user_id = 'user-uuid'
ORDER BY timestamp DESC;
```

### Metrics

- Login success/failure rates
- MFA usage rates
- Session duration
- Password reset requests
- Rate limit hits

### Alerts

- Multiple failed login attempts
- Unusual login location
- MFA disabled by user
- Password reset requests
- Suspicious activity patterns

## Troubleshooting

### Common Issues

**Issue**: Token verification fails
- Check JWT secret matches between services
- Verify token hasn't expired
- Ensure clock synchronization

**Issue**: MFA code not working
- Check server time is synchronized (NTP)
- Verify window configuration
- Use backup codes if available

**Issue**: Session not persisting
- Verify Redis connection
- Check session expiry configuration
- Ensure cookies are being set correctly

## Support

For issues and questions:
- GitHub Issues: https://github.com/noa-server/auth-service/issues
- Documentation: https://docs.noa-server.com/authentication
- Security Issues: security@noa-server.com
