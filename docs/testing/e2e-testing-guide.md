# E2E Testing Guide

## Overview

This guide covers the end-to-end (E2E) testing infrastructure for the AI
integration system. The E2E test suite validates the complete AI system
including all components implemented in Swarm A.

## Architecture

### Test Environment

The E2E test environment consists of:

- **PostgreSQL** - Test database (port 5433)
- **Redis** - Caching and rate limiting (port 6380)
- **Mock OpenAI** - Simulated OpenAI API (port 8081)
- **Mock Claude** - Simulated Claude API (port 8082)
- **llama.cpp** - Local inference (port 8083)
- **RabbitMQ** - Message queue (port 5673)
- **Prometheus** - Metrics collection (port 9091)

All services are orchestrated via Docker Compose.

### Test Structure

```
tests/e2e/
├── setup/                    # Test infrastructure
│   ├── docker-compose.test.yml
│   ├── init-db.sql
│   └── test-environment.ts
├── ai-provider/              # AI provider tests
│   ├── model-registry.e2e.test.ts
│   ├── fallback.e2e.test.ts
│   ├── caching.e2e.test.ts
│   └── rate-limiting.e2e.test.ts
├── api/                      # API integration tests
│   ├── auth.e2e.test.ts
│   ├── inference.e2e.test.ts
│   └── job-queue.e2e.test.ts
├── monitoring/               # Monitoring tests
│   ├── metrics.e2e.test.ts
│   ├── health.e2e.test.ts
│   └── alerting.e2e.test.ts
├── dashboard/                # Dashboard tests
│   └── dashboard.e2e.test.ts
├── load/                     # Load testing
│   ├── performance.e2e.test.ts
│   └── stress.e2e.test.ts
├── failure/                  # Failure scenarios
│   ├── provider-failure.e2e.test.ts
│   └── system-failure.e2e.test.ts
├── security/                 # Security tests
│   ├── auth-security.e2e.test.ts
│   └── input-validation.e2e.test.ts
└── utils/                    # Test utilities
    ├── test-helpers.ts
    ├── ai-provider-mock.ts
    └── test-data-generator.ts
```

## Running Tests

### Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ installed
- pnpm installed

### Quick Start

```bash
# Install dependencies
pnpm install

# Start test environment
docker-compose -f tests/e2e/setup/docker-compose.test.yml up -d

# Run all E2E tests
pnpm test:e2e

# Run specific test suite
pnpm vitest run tests/e2e/ai-provider/model-registry.e2e.test.ts

# Run with coverage
pnpm test:e2e --coverage

# Run in watch mode
pnpm vitest watch tests/e2e/
```

### Environment Variables

Create `.env.test` file:

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=noa_test
POSTGRES_USER=test_user
POSTGRES_PASSWORD=test_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380

# Mock Providers
MOCK_OPENAI_URL=http://localhost:8081
MOCK_CLAUDE_URL=http://localhost:8082
LLAMACPP_URL=http://localhost:8083

# RabbitMQ
RABBITMQ_URL=amqp://test_user:test_password@localhost:5673
```

## Writing E2E Tests

### Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestEnvironment } from '../setup/test-environment';
import { apiRequest, TEST_USERS } from '../utils/test-helpers';

describe('Feature Name E2E', () => {
  let testEnv: TestEnvironment;
  const API_BASE = 'http://localhost:3000/api';

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
  }, 60000);

  afterAll(async () => {
    await testEnv.teardown();
  }, 30000);

  beforeEach(async () => {
    await testEnv.reset();
  });

  describe('Specific Functionality', () => {
    it('should perform expected behavior', async () => {
      const response = await apiRequest(
        `${API_BASE}/endpoint`,
        { method: 'POST', body: JSON.stringify({ data: 'test' }) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('result');
    });
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach` to reset state
3. **Timeouts**: Set appropriate timeouts for async operations
4. **Assertions**: Make specific, meaningful assertions
5. **Error Handling**: Test both success and failure cases
6. **Documentation**: Add comments explaining complex test logic

### Test Data

Use the pre-seeded test users:

```typescript
import { TEST_USERS } from '../utils/test-helpers';

// Free tier user
TEST_USERS.free.apiKey;

// Pro tier user
TEST_USERS.pro.apiKey;

// Enterprise tier user
TEST_USERS.enterprise.apiKey;
```

### Helper Functions

```typescript
import {
  apiRequest, // Make authenticated API requests
  waitFor, // Wait for condition
  sleep, // Delay execution
  retry, // Retry with backoff
  measureTime, // Measure execution time
  concurrentRequests, // Make parallel requests
  parseSSEStream, // Parse streaming responses
} from '../utils/test-helpers';
```

## Test Categories

### AI Provider Integration Tests

Test the core AI provider functionality:

- **Model Registry**: Dynamic registration, status updates, search
- **Fallback**: Provider failover, circuit breakers
- **Caching**: Hit/miss, TTL, invalidation
- **Rate Limiting**: Provider/model/tier limits, quotas

### API Integration Tests

Test API endpoints and authentication:

- **Auth**: Registration, login, JWT, API keys
- **Inference**: Chat completions, streaming, embeddings
- **Job Queue**: Async processing, status tracking

### Monitoring Tests

Test observability and alerting:

- **Metrics**: Request tracking, aggregation
- **Health Checks**: Liveness, readiness
- **Alerting**: Threshold alerts, notifications

### Load Tests

Test performance under load:

- **Performance**: Concurrent requests, latency
- **Stress**: Sustained load, memory leaks

### Failure Scenario Tests

Test resilience and error handling:

- **Provider Failures**: Timeouts, errors
- **System Failures**: Database, Redis, network issues

### Security Tests

Test authentication and input validation:

- **Auth Security**: Brute force, token validation
- **Input Validation**: XSS, SQL injection

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: docker-compose -f tests/e2e/setup/docker-compose.test.yml up -d
      - run: pnpm test:e2e --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/e2e/lcov.info
```

## Debugging Tests

### View Logs

```bash
# View Docker Compose logs
docker-compose -f tests/e2e/setup/docker-compose.test.yml logs -f

# View specific service logs
docker logs noa-postgres-test
docker logs noa-redis-test
docker logs noa-mock-openai
```

### Inspect Database

```bash
# Connect to test database
docker exec -it noa-postgres-test psql -U test_user -d noa_test

# Run queries
SELECT * FROM users;
SELECT * FROM ai_models;
SELECT * FROM ai_requests;
```

### Inspect Redis

```bash
# Connect to Redis
docker exec -it noa-redis-test redis-cli

# View keys
KEYS *

# Get cache value
GET cache:key:example
```

### Debug Test Failures

1. **Enable verbose logging**: Set `DEBUG=true` in `.env.test`
2. **Run single test**: `pnpm vitest run path/to/test.ts`
3. **Use debugger**: Add `debugger` statements, run with `--inspect-brk`
4. **Check service health**: Verify all services are healthy
5. **Review logs**: Check application and service logs

## Performance Benchmarks

Expected performance targets:

- **API Response Time**: <100ms (cached), <500ms (uncached)
- **Cache Hit Rate**: 60-80%
- **Rate Limiter Overhead**: <1ms
- **Concurrent Requests**: 100+ simultaneous
- **Memory Usage**: <512MB under normal load

## Troubleshooting

### Common Issues

**Services not starting**:

```bash
docker-compose -f tests/e2e/setup/docker-compose.test.yml down -v
docker-compose -f tests/e2e/setup/docker-compose.test.yml up -d --force-recreate
```

**Database connection errors**:

- Check PostgreSQL is healthy: `docker ps`
- Verify credentials in `.env.test`
- Check port 5433 is not in use

**Test timeouts**:

- Increase `testTimeout` in vitest.config.ts
- Check service latency
- Verify network connectivity

**Cache tests failing**:

- Clear Redis: `docker exec noa-redis-test redis-cli FLUSHDB`
- Restart Redis service
- Check Redis connection

## Contributing

When adding new E2E tests:

1. Follow existing test structure
2. Add test to appropriate directory
3. Update this documentation
4. Ensure tests pass locally
5. Check code coverage meets threshold (>80%)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Testing Best Practices](https://testingjavascript.com/)
