# @noa/shared-utils

Consolidated shared utilities for NOA Server monorepo. This package eliminates code duplication by providing standardized implementations of common functionality across all packages.

## Features

- **Logger**: Winston-based logging with consistent formatting and configuration
- **Error Handling**: Standardized error classes and Express middleware
- **Validation**: Reusable Zod schemas and validation utilities
- **Crypto**: Cryptographic utilities for secure operations

## Installation

```bash
# From workspace root
pnpm add @noa/shared-utils --workspace

# In your package
pnpm add @noa/shared-utils
```

## Usage

### Logger

```typescript
import { createLogger, createHttpLogger } from '@noa/shared-utils';

// Create a logger instance
const logger = createLogger({
  service: 'auth-service',
  module: 'AuthController',
  level: 'info',
  file: true,
  logDir: 'logs'
});

logger.info('User logged in', { userId: '123' });
logger.error('Authentication failed', { error: err });
logger.warn('Deprecated API called');

// Express HTTP logging middleware
import express from 'express';
const app = express();
app.use(createHttpLogger(logger));
```

### Error Handling

```typescript
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  errorHandler,
  notFoundHandler,
  asyncHandler
} from '@noa/shared-utils';

// Throw standardized errors
throw new ValidationError('Invalid email format');
throw new AuthenticationError('Invalid credentials');
throw new NotFoundError('User');

// Express error handling
import express from 'express';
const app = express();

// Your routes here
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) throw new NotFoundError('User');
  res.json(user);
}));

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);
```

### Validation

```typescript
import {
  validate,
  validateRequest,
  emailSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
  sanitizeInput,
  validateEmail
} from '@noa/shared-utils';

// Validate data with Zod schemas
const userData = validate(registerSchema, req.body);

// Express validation middleware
import express from 'express';
const router = express.Router();

router.post('/register', validateRequest(registerSchema, 'body'), (req, res) => {
  // req.body is now validated and type-safe
  const { email, password } = req.body;
});

// Standalone validation
const email = validateEmail('user@example.com');
const safe = sanitizeInput(userInput);
```

### Crypto

```typescript
import {
  generateToken,
  sha256,
  sha512,
  hmacSign,
  timingSafeEqual
} from '@noa/shared-utils';

// Generate secure tokens
const token = await generateToken(32);

// Hashing
const hash = sha256('data');

// HMAC signatures
const signature = hmacSign('data', 'secret');

// Timing-safe comparison
if (timingSafeEqual(input, expected)) {
  // Valid
}
```

## Migration Guide

### From Individual Package Utils

**Before:**
```typescript
// packages/alerting/src/utils/logger.ts
import { createLogger } from './utils/logger';

// packages/ai-inference-api/src/middleware/logger.ts
import { logger } from '../middleware/logger';

// packages/ai-inference-api/src/middleware/errorHandler.ts
import { errorHandler } from '../middleware/errorHandler';
```

**After:**
```typescript
// All packages
import { createLogger, errorHandler } from '@noa/shared-utils';
```

### Error Handling Migration

**Before:**
```typescript
// Custom error in each package
class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomError';
  }
}

// Inconsistent error responses
res.status(400).json({ error: 'Validation failed' });
res.status(404).json({ message: 'Not found' });
```

**After:**
```typescript
import { ValidationError, NotFoundError, errorHandler } from '@noa/shared-utils';

throw new ValidationError('Validation failed');
throw new NotFoundError('Resource');

// Consistent error responses via middleware
app.use(errorHandler);
```

### Logger Migration

**Before:**
```typescript
// packages/alerting/src/utils/logger.ts
export function createLogger(module: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'alerting', module },
    transports: [/* ... */],
  });
}
```

**After:**
```typescript
import { createLogger } from '@noa/shared-utils';

const logger = createLogger({
  service: 'alerting',
  module: 'AlertManager',
  level: 'info',
  file: true
});
```

### Validation Migration

**Before:**
```typescript
// packages/auth-service/src/utils/validators.ts
export const emailSchema = z.string().email().min(3).max(255);
export function validateEmail(email: string): string {
  const sanitized = sanitizeInput(email).toLowerCase();
  const result = emailSchema.safeParse(sanitized);
  if (!result.success) throw new Error('Invalid email');
  return result.data;
}
```

**After:**
```typescript
import { emailSchema, validateEmail } from '@noa/shared-utils';

const email = validateEmail(userInput);
```

## Benefits

- **Reduced Duplication**: Single source of truth for common utilities
- **Consistency**: Standardized implementations across all packages
- **Type Safety**: Full TypeScript support with exported types
- **Maintainability**: Update once, benefit everywhere
- **Testing**: Centralized test coverage for utilities
- **Bundle Size**: Shared dependencies reduce overall bundle size

## Architecture

```
packages/shared-utils/
├── src/
│   ├── logger/
│   │   ├── index.ts      # Logger implementation
│   │   └── types.ts      # Logger type definitions
│   ├── errors/
│   │   └── index.ts      # Error classes and middleware
│   ├── validation/
│   │   └── index.ts      # Zod schemas and validators
│   ├── crypto/
│   │   └── index.ts      # Cryptographic utilities
│   └── index.ts          # Main exports
├── package.json
├── tsconfig.json
└── README.md
```

## API Reference

### Logger

- `createLogger(config: LoggerConfig): winston.Logger`
- `createHttpLogger(logger: winston.Logger): Middleware`
- `createChildLogger(logger: winston.Logger, context: LogContext): winston.Logger`
- `LogLevel` - Log level constants

### Errors

- `AppError` - Base error class
- `ValidationError` - 400 validation errors
- `AuthenticationError` - 401 authentication errors
- `AuthorizationError` - 403 authorization errors
- `NotFoundError` - 404 not found errors
- `ConflictError` - 409 conflict errors
- `RateLimitError` - 429 rate limit errors
- `InternalError` - 500 internal errors
- `ServiceUnavailableError` - 503 service unavailable errors
- `DatabaseError` - Database operation errors
- `ExternalAPIError` - External API errors
- `errorHandler` - Express error handler middleware
- `notFoundHandler` - Express 404 handler middleware
- `asyncHandler` - Async route handler wrapper
- `isOperationalError` - Check if error is operational

### Validation

- `emailSchema` - Email validation
- `uuidSchema` - UUID validation
- `usernameSchema` - Username validation
- `passwordSchema` - Password validation
- `createPasswordSchema` - Custom password schema factory
- `registerSchema` - User registration
- `loginSchema` - User login
- `passwordResetSchema` - Password reset
- `validate` - Validate data against schema
- `validateRequest` - Express validation middleware
- `sanitizeInput` - XSS prevention
- `validateEmail` - Validate and sanitize email

### Crypto

- `generateToken` - Generate secure random tokens
- `sha256` - SHA-256 hashing
- `sha512` - SHA-512 hashing
- `hmacSign` - HMAC signature generation
- `timingSafeEqual` - Timing-safe string comparison

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Type checking
pnpm typecheck
```

## License

MIT
