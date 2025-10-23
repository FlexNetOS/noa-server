# Quick Start Guide

Get up and running with @noa/auth-service in 5 minutes.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+

## Step 1: Installation

```bash
cd packages/auth-service
pnpm install
```

## Step 2: Database Setup

```bash
# Create database
createdb noa

# Run migrations
psql -U postgres -d noa < migrations/001_auth_schema.sql
```

## Step 3: Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env and set required values:
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - DATABASE_URL
# - REDIS_PASSWORD
```

## Step 4: Basic Usage

```typescript
import { AuthService } from '@noa/auth-service';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Initialize
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

const authService = new AuthService({
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
    maxAge: 24 * 60 * 60 * 1000
  }
}, db, redis);

// Register
const result = await authService.register({
  email: 'user@example.com',
  password: 'SecurePass123!'
});

// Login
const login = await authService.login({
  email: 'user@example.com',
  password: 'SecurePass123!',
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0...'
});

console.log('Token:', login.token.accessToken);
```

## Step 5: Express Integration

```typescript
import express from 'express';
import { createExpressAuthMiddleware } from '@noa/auth-service';

const app = express();
const { jwtProvider, sessionManager } = authService.getServices();

// Protect all routes
app.use(createExpressAuthMiddleware({ jwtProvider, sessionManager }));

// Now req.user is available
app.get('/profile', (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000);
```

## What's Next?

- [Full Documentation](../../docs/security/AUTHENTICATION.md)
- [Zero-Trust Network](../../docs/security/ZERO_TRUST.md)
- [API Reference](./docs/API.md)
- [Examples](./examples/)

## Common Commands

```bash
# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint

# Format
pnpm format
```

## Troubleshooting

**Database connection fails**
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql postgresql://noa:password@localhost:5432/noa
```

**Redis connection fails**
```bash
# Check Redis is running
redis-cli ping

# Test with password
redis-cli -a your-password ping
```

**JWT verification fails**
- Ensure JWT_SECRET is the same across all services
- Check token hasn't expired
- Verify algorithm matches configuration

## Getting Help

- Issues: https://github.com/noa-server/auth-service/issues
- Docs: https://docs.noa-server.com
- Security: security@noa-server.com
