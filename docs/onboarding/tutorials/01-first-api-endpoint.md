# Tutorial: Build Your First API Endpoint

In this tutorial, you'll learn how to add a new REST API endpoint to the NOA
Server. This is a hands-on guide that walks you through the entire process.

## What You'll Build

A simple `/api/v1/status` endpoint that returns system status information.

**Final result:**

```bash
GET /api/v1/status
Response:
{
  "status": "operational",
  "version": "1.0.0",
  "uptime": 12345,
  "providers": {
    "openai": "healthy",
    "claude": "healthy",
    "llamacpp": "healthy"
  }
}
```

## Prerequisites

- Development environment set up
- Repository cloned and dependencies installed
- Basic TypeScript knowledge
- Understanding of REST APIs

## Step 1: Create the Route File

**Location:** `packages/ai-inference-api/src/routes/status.ts`

```typescript
import { Router, Request, Response } from 'express';
import { AIProvider } from '@noa/ai-provider';

const router = Router();

/**
 * GET /api/v1/status
 * Returns system status and provider health
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get AI provider instance
    const aiProvider = AIProvider.getInstance();

    // Check provider health
    const providers = await aiProvider.healthCheckAll();

    // Get system uptime
    const uptime = process.uptime();

    // Build response
    const status = {
      status: 'operational',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      providers: providers,
    };

    res.json(status);
  } catch (error) {
    console.error('Status check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check system status',
    });
  }
});

export default router;
```

## Step 2: Register the Route

**Location:** `packages/ai-inference-api/src/index.ts`

Add the route to your Express app:

```typescript
import express from 'express';
import statusRoutes from './routes/status';
// ... other imports

const app = express();

// ... middleware setup

// Register routes
app.use('/api/v1', statusRoutes);

// ... other routes
```

## Step 3: Add OpenAPI Documentation

**Location:** `packages/ai-inference-api/src/routes/status.ts`

Add JSDoc comments for Swagger:

```typescript
/**
 * @swagger
 * /api/v1/status:
 *   get:
 *     summary: Get system status
 *     description: Returns operational status and provider health
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: operational
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 uptime:
 *                   type: number
 *                   example: 12345
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 providers:
 *                   type: object
 *                   properties:
 *                     openai:
 *                       type: string
 *                       example: healthy
 *                     claude:
 *                       type: string
 *                       example: healthy
 *                     llamacpp:
 *                       type: string
 *                       example: healthy
 *       500:
 *         description: Internal server error
 */
router.get('/status', async (req: Request, res: Response) => {
  // ... implementation
});
```

## Step 4: Write Tests

**Location:** `packages/ai-inference-api/src/__tests__/status.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('GET /api/v1/status', () => {
  it('should return system status', async () => {
    const response = await request(app)
      .get('/api/v1/status')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('providers');
  });

  it('should have operational status', async () => {
    const response = await request(app).get('/api/v1/status').expect(200);

    expect(response.body.status).toBe('operational');
  });

  it('should include provider health', async () => {
    const response = await request(app).get('/api/v1/status').expect(200);

    const { providers } = response.body;
    expect(providers).toBeDefined();
    expect(providers).toHaveProperty('openai');
    expect(providers).toHaveProperty('claude');
    expect(providers).toHaveProperty('llamacpp');
  });

  it('should return valid uptime', async () => {
    const response = await request(app).get('/api/v1/status').expect(200);

    expect(response.body.uptime).toBeGreaterThan(0);
    expect(typeof response.body.uptime).toBe('number');
  });

  it('should return ISO timestamp', async () => {
    const response = await request(app).get('/api/v1/status').expect(200);

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).not.toBeNaN();
  });
});
```

## Step 5: Run Tests

```bash
# Navigate to package
cd packages/ai-inference-api

# Run tests
pnpm test src/__tests__/status.test.ts

# Run with coverage
pnpm test:coverage src/__tests__/status.test.ts
```

**Expected output:**

```
✓ GET /api/v1/status (5 tests) 234ms
  ✓ should return system status
  ✓ should have operational status
  ✓ should include provider health
  ✓ should return valid uptime
  ✓ should return ISO timestamp
```

## Step 6: Test Manually

Start the development server:

```bash
pnpm dev
```

Test the endpoint:

```bash
# Using curl
curl http://localhost:3000/api/v1/status

# Using HTTPie
http GET http://localhost:3000/api/v1/status

# Using browser
open http://localhost:3000/api/v1/status
```

## Step 7: Check Swagger Documentation

Open Swagger UI:

```
http://localhost:3000/api-docs
```

Find your endpoint under "System" tag and try it out.

## Step 8: Add Type Definitions

**Location:** `packages/ai-inference-api/src/types/status.ts`

```typescript
export interface SystemStatus {
  status: 'operational' | 'degraded' | 'down';
  version: string;
  uptime: number;
  timestamp: string;
  providers: ProviderStatus;
}

export interface ProviderStatus {
  openai: HealthStatus;
  claude: HealthStatus;
  llamacpp: HealthStatus;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
```

Update route to use types:

```typescript
import { SystemStatus } from '../types/status';

router.get('/status', async (req: Request, res: Response<SystemStatus>) => {
  // ... implementation
});
```

## Step 9: Lint and Format

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm typecheck
```

## Step 10: Commit and Create PR

```bash
# Create feature branch
git checkout -b feature/add-status-endpoint

# Add files
git add packages/ai-inference-api/src/routes/status.ts
git add packages/ai-inference-api/src/__tests__/status.test.ts
git add packages/ai-inference-api/src/types/status.ts
git add packages/ai-inference-api/src/index.ts

# Commit
git commit -m "feat(api): add system status endpoint

- Add GET /api/v1/status endpoint
- Include provider health checks
- Add comprehensive tests
- Add OpenAPI documentation"

# Push
git push origin feature/add-status-endpoint

# Create PR on GitHub
```

## Verification Checklist

- [ ] Route file created
- [ ] Route registered in app
- [ ] OpenAPI documentation added
- [ ] Tests written and passing
- [ ] Types defined
- [ ] Manual testing successful
- [ ] Swagger docs accessible
- [ ] Linting passed
- [ ] Type checking passed
- [ ] Code formatted
- [ ] Committed with good message
- [ ] PR created

## Next Steps

Now that you've built your first endpoint, try:

1. Add request validation
2. Add authentication
3. Add rate limiting
4. Add caching
5. Add more comprehensive error handling

## Common Issues

### Issue: Route not found (404)

**Solution:** Ensure route is registered in `index.ts`:

```typescript
app.use('/api/v1', statusRoutes);
```

### Issue: Tests failing

**Solution:** Ensure test server is set up correctly:

```typescript
import app from '../index'; // Import the Express app
```

### Issue: Type errors

**Solution:** Ensure types are properly imported and exported:

```typescript
import { SystemStatus } from '../types/status';
```

## Learn More

- [API Development Guide](../API_DEVELOPMENT.md)
- [Testing Guide](../TESTING.md)
- [Express Documentation](https://expressjs.com/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

**Congratulations!** You've built your first API endpoint. Ready for the next
tutorial?

**Next Tutorial:** [Integrate a New AI Provider →](02-add-ai-provider.md)
