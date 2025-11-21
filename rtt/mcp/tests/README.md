# MCP Platform Test Suite

Comprehensive test suite for the MCP (Model Context Protocol) platform, covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
tests/
├── unit/                   # Unit tests
│   ├── server/            # MCP server tests
│   │   ├── echo-tool.test.ts
│   │   ├── health-resource.test.ts
│   │   └── prompt.test.ts
│   ├── gateway/           # Gateway tests
│   │   ├── router.test.ts
│   │   ├── tenants.test.ts
│   │   └── config.test.ts
│   └── ui/                # UI component tests
│       ├── Card.test.tsx
│       └── api-service.test.ts
├── integration/           # Integration tests
│   └── api/
│       └── gateway-endpoints.test.ts
├── e2e/                   # End-to-end tests
│   └── user-flows/
│       ├── dashboard-navigation.spec.ts
│       └── chat-completion.spec.ts
├── helpers/               # Test utilities
│   ├── test-utils.ts
│   └── mocks.ts
├── setup.ts              # Global test setup
└── README.md             # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Categories

### Unit Tests

Unit tests focus on individual functions, methods, and components in isolation.

**Server Tests** (`tests/unit/server/`)
- `echo-tool.test.ts` - Tests echo tool functionality, schema validation, and error handling
- `health-resource.test.ts` - Tests health check endpoint and response format
- `prompt.test.ts` - Tests prompt generation and message formatting

**Gateway Tests** (`tests/unit/gateway/`)
- `router.test.ts` - Tests chat routing, model selection, and policy enforcement
- `tenants.test.ts` - Tests tenant management, accounting, and budget tracking
- `config.test.ts` - Tests configuration validation and route setup

**UI Tests** (`tests/unit/ui/`)
- `Card.test.tsx` - Tests Card component rendering and props
- `api-service.test.ts` - Tests API client configuration and methods

### Integration Tests

Integration tests verify that multiple components work together correctly.

**API Tests** (`tests/integration/api/`)
- `gateway-endpoints.test.ts` - Tests complete request/response cycles for all gateway endpoints

### End-to-End Tests

E2E tests verify complete user workflows through the application.

**User Flows** (`tests/e2e/user-flows/`)
- `dashboard-navigation.spec.ts` - Tests dashboard UI navigation and interactions
- `chat-completion.spec.ts` - Tests chat completion flows through the API

## Test Utilities

### Test Helpers (`tests/helpers/test-utils.ts`)

- `delay(ms)` - Async delay utility
- `mockResponse(data, status)` - Creates mock HTTP responses
- `generateTestId()` - Generates unique test IDs
- `generateTraceId()` - Generates mock trace IDs
- `waitFor(condition, timeout)` - Waits for async conditions
- `factories` - Data factories for creating test fixtures
- `assertions` - Custom assertion helpers

### Mock Implementations (`tests/helpers/mocks.ts`)

- `createMockAxios()` - Mock Axios HTTP client
- `createMockLocalStorage()` - Mock browser localStorage
- `createMockOTel()` - Mock OpenTelemetry
- `createMockRouter()` - Mock React Router
- `createMockStore()` - Mock Zustand store
- `createMockWebSocket()` - Mock WebSocket
- `createMockFetch()` - Mock Fetch API
- `createMockExpressApp()` - Mock Express app
- `createMockLogger()` - Mock logger

## Test Coverage

The test suite aims for the following coverage targets:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

Current coverage can be viewed by running:
```bash
npm run test:coverage
```

Coverage reports are generated in:
- `coverage/` - HTML report (open `coverage/index.html`)
- `coverage/lcov.info` - LCOV format for CI tools

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest'

describe('MyComponent', () => {
  it('should render correctly', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'

describe('API Endpoint', () => {
  it('should return data', async () => {
    const response = await request(app).get('/api/data')
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('data')
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test('user can navigate to dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h2')).toHaveText('Dashboard')
})
```

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Test public APIs and user-facing behavior

2. **Use Descriptive Test Names**
   - Test names should clearly describe what is being tested
   - Use "should" statements: `it('should validate input')`

3. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should calculate total', () => {
     // Arrange - Set up test data
     const items = [1, 2, 3]

     // Act - Execute the function
     const result = sum(items)

     // Assert - Verify the result
     expect(result).toBe(6)
   })
   ```

4. **Isolate Tests**
   - Each test should be independent
   - Use `beforeEach` to reset state
   - Clean up after tests in `afterEach`

5. **Mock External Dependencies**
   - Mock HTTP requests, databases, external APIs
   - Use test utilities from `tests/helpers/`

6. **Test Edge Cases**
   - Test with empty data, null, undefined
   - Test boundary conditions
   - Test error scenarios

7. **Keep Tests Fast**
   - Unit tests should complete in milliseconds
   - Integration tests in seconds
   - E2E tests can take longer but should still be optimized

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Scheduled nightly builds

CI configuration:
- `.github/workflows/test.yml` - GitHub Actions workflow
- Runs all test suites
- Generates coverage reports
- Fails on coverage below thresholds

## Debugging Tests

### Run Single Test File
```bash
npx vitest run tests/unit/server/echo-tool.test.ts
```

### Run Single Test Suite
```bash
npx vitest run -t "Echo Tool Success Cases"
```

### Run in Debug Mode
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

### Playwright Debug Mode
```bash
npx playwright test --debug
```

### View Playwright UI
```bash
npx playwright test --ui
```

## Test Data Management

Test data is managed through:

1. **Factories** - Use `factories` from test-utils for consistent test data
2. **Fixtures** - Store reusable test data in fixtures files
3. **Mocks** - Use mock implementations for external services

## Performance Testing

Performance tests are located in `tests/load/`:
- k6 load tests for API endpoints
- Stress tests for concurrent requests
- Latency benchmarks

Run performance tests:
```bash
npm run test:load
```

## Security Testing

Security tests verify:
- Input validation and sanitization
- Authentication and authorization
- Rate limiting
- CORS policies

Located in `tests/security/`

## Troubleshooting

### Tests Timeout
- Increase timeout in test file or vitest config
- Check for unresolved promises
- Verify async/await usage

### Flaky Tests
- Add appropriate waits (`waitFor`, `page.waitForSelector`)
- Ensure proper cleanup in `afterEach`
- Check for race conditions

### Coverage Not Generated
- Ensure source files are in `src/` directory
- Check `vitest.config.ts` coverage settings
- Run with `--coverage` flag

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure tests pass locally
3. Maintain coverage thresholds
4. Update test documentation
5. Add test utilities if creating reusable patterns

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
