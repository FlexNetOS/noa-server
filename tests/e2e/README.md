# E2E Test Suite

Comprehensive end-to-end tests for the AI integration system.

## Quick Start

```bash
# Start test environment
docker-compose -f setup/docker-compose.test.yml up -d

# Run all E2E tests
pnpm test:e2e

# Run specific test suite
pnpm vitest run ai-provider/model-registry.e2e.test.ts

# Run with coverage
pnpm test:e2e --coverage

# Stop test environment
docker-compose -f setup/docker-compose.test.yml down -v
```

## Test Coverage

### AI Provider Integration (50+ tests)

- ✅ Model Registry (registration, status, search, cost tracking)
- ✅ Provider Fallback (failover, circuit breakers, recovery)
- ✅ Response Caching (hit/miss, TTL, invalidation, 60-80% hit rate)
- ✅ Rate Limiting (provider/model/tier limits, quotas, queuing)

### API Integration (30+ tests)

- ✅ Authentication (registration, login, JWT, API keys)
- ✅ AI Inference (chat, streaming, embeddings)
- ✅ Job Queue (async processing, priority, DLQ)

### Monitoring (20+ tests)

- ✅ Metrics Collection (latency, tokens, cost)
- ✅ Health Checks (liveness, readiness)
- ✅ Alerting (thresholds, notifications)

### Dashboard (10+ tests)

- ✅ Real-time metrics display
- ✅ WebSocket live updates
- ✅ Provider health monitoring

### Load Testing (15+ tests)

- ✅ 100 concurrent requests
- ✅ 1000 req/s sustained load
- ✅ Auto-scaling validation
- ✅ Memory leak detection

### Failure Scenarios (15+ tests)

- ✅ Provider failures (timeout, errors)
- ✅ System failures (DB, Redis, network)
- ✅ Graceful degradation

### Security (20+ tests)

- ✅ Authentication security (brute force, tokens)
- ✅ Input validation (XSS, SQL injection)

## Documentation

See [E2E Testing Guide](../../docs/testing/e2e-testing-guide.md) for detailed
documentation.

## Test Results

Test results are available in:

- `reports/e2e-test-report.html` - HTML test report
- `reports/e2e-test-results.json` - JSON test results
- `coverage/e2e/` - Coverage reports

## CI/CD

E2E tests run automatically on:

- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Manual workflow dispatch

See [.github/workflows/e2e-tests.yml](../../.github/workflows/e2e-tests.yml)
