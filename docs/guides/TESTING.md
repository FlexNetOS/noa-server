# Testing Guide

<!-- POL-0166: How to write and run tests -->

This guide covers testing practices, frameworks, and workflows for the NOA
Server Platform.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Edge Case Testing](#edge-case-testing)
6. [Code Coverage](#code-coverage)
7. [Continuous Integration](#continuous-integration)

## Testing Philosophy

We follow Test-Driven Development (TDD) principles:

1. **Write tests first** - Define expected behavior before implementation
2. **Test edge cases** - Handle null, empty, maximum, minimum values
   (POL-0117-0122)
3. **Maintain high coverage** - Aim for >80% coverage (POL-0100)
4. **Fast tests** - Unit tests should run in milliseconds
5. **Isolated tests** - Each test should be independent

## Test Types

### Unit Tests

Test individual functions and modules in isolation.

```javascript
// tests/unit/utils/validateEmail.test.js
describe('validateEmail', () => {
  // POL-0117: Test with empty inputs
  it('returns false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  // POL-0119: Test with null/undefined
  it('returns false for null', () => {
    expect(validateEmail(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(validateEmail(undefined)).toBe(false);
  });

  // POL-0120: Test with invalid UTF-8/encoding
  it('handles invalid UTF-8 characters', () => {
    expect(validateEmail('\uD800@example.com')).toBe(false);
  });

  it('returns true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
});
```

### Integration Tests

Test multiple components working together.

```javascript
// tests/integration/api/users.test.js
const request = require('supertest');
const app = require('../../../packages/microservices/api-gateway/src/app');

describe('User API', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/users', () => {
    it('creates a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('newuser@example.com');
    });

    // POL-0117-0122: Edge case testing
    it('handles empty email', async () => {
      await request(app)
        .post('/api/users')
        .send({ email: '', password: 'pass' })
        .expect(400);
    });

    it('handles duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/users')
        .send({ email: 'dup@example.com', password: 'pass' });

      // Try to create duplicate
      await request(app)
        .post('/api/users')
        .send({ email: 'dup@example.com', password: 'pass' })
        .expect(409);
    });
  });
});
```

### End-to-End Tests

Test complete user workflows.

```javascript
// tests/e2e/user-journey.test.js
const { chromium } = require('playwright');

describe('User Journey', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  it('user can sign up, log in, and create a project', async () => {
    // Navigate to sign up
    await page.goto('http://localhost:3000/signup');

    // Fill sign up form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');

    // Create project
    await page.click('text=New Project');
    await page.fill('[name="projectName"]', 'Test Project');
    await page.click('button:has-text("Create")');

    // Verify project created
    await expect(page.locator('text=Test Project')).toBeVisible();
  });
});
```

### Edge Case Tests (POL-0117-0122)

```javascript
// tests/edge-cases/input-validation.test.js
describe('Edge Case Testing', () => {
  describe('Empty inputs (POL-0117)', () => {
    it('handles empty string', () => {
      expect(processInput('')).toThrow('Input cannot be empty');
    });

    it('handles empty array', () => {
      expect(processArray([])).toEqual([]);
    });

    it('handles empty object', () => {
      expect(processObject({})).toThrow('Invalid object');
    });
  });

  describe('Maximum/Minimum values (POL-0118)', () => {
    it('handles maximum integer', () => {
      expect(addNumbers(Number.MAX_SAFE_INTEGER, 1)).toThrow(
        'Integer overflow'
      );
    });

    it('handles minimum integer', () => {
      expect(subtractNumbers(Number.MIN_SAFE_INTEGER, 1)).toThrow(
        'Integer underflow'
      );
    });
  });

  describe('Null/None/Undefined (POL-0119)', () => {
    it('handles null', () => {
      expect(processValue(null)).toBeNull();
    });

    it('handles undefined', () => {
      expect(processValue(undefined)).toBeUndefined();
    });
  });

  describe('Invalid UTF-8/Encoding (POL-0120)', () => {
    it('handles invalid UTF-8', () => {
      expect(sanitizeString('\uD800')).toBe('');
    });

    it('handles emoji', () => {
      expect(sanitizeString('Hello 👋')).toBe('Hello 👋');
    });
  });

  describe('Filesystem errors (POL-0121)', () => {
    it('handles permission denied', async () => {
      await expect(readFile('/root/secret.txt')).rejects.toThrow(
        'Permission denied'
      );
    });

    it('handles disk full', async () => {
      // Mock disk full error
      jest
        .spyOn(fs, 'writeFile')
        .mockRejectedValue(new Error('ENOSPC: no space left on device'));

      await expect(writeFile('/tmp/test.txt', 'data')).rejects.toThrow(
        'ENOSPC'
      );
    });
  });

  describe('Network errors (POL-0122)', () => {
    it('handles connection timeout', async () => {
      await expect(
        fetchData('http://slow-server.com', { timeout: 100 })
      ).rejects.toThrow('Request timeout');
    });

    it('handles connection refused', async () => {
      await expect(fetchData('http://localhost:9999')).rejects.toThrow(
        'ECONNREFUSED'
      );
    });
  });
});
```

## Running Tests

### All Tests

```bash
# Run all tests
npm test

# Run with coverage (POL-0100)
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Edge case tests (POL-0117-0122)
npm run test:edge-cases
```

### Test Specific Files

```bash
# Test single file
npm test -- tests/unit/utils/validateEmail.test.js

# Test files matching pattern
npm test -- tests/unit/utils/*.test.js

# Test specific describe block
npm test -- --testNamePattern="validateEmail"
```

### POL-0103-0105: Multi-environment Testing

```bash
# Test on different OS (via CI)
npm run test:ci

# Test with different Node versions
nvm use 18 && npm test
nvm use 20 && npm test
nvm use 22 && npm test

# Test with feature flags
FEATURE_FLAGS=experimental npm test
FEATURE_FLAGS=minimal npm test
```

## Writing Tests

### Test Structure

Follow the AAA pattern:

- **Arrange**: Set up test data
- **Act**: Execute the code being tested
- **Assert**: Verify the results

```javascript
it('creates a user with valid data', () => {
  // Arrange
  const userData = {
    email: 'user@example.com',
    password: 'SecurePass123!',
  };

  // Act
  const user = createUser(userData);

  // Assert
  expect(user).toHaveProperty('id');
  expect(user.email).toBe(userData.email);
});
```

### Mocking

```javascript
// Mock external dependencies
jest.mock('../services/emailService');

describe('User creation', () => {
  it('sends welcome email', async () => {
    const emailService = require('../services/emailService');
    emailService.sendEmail.mockResolvedValue(true);

    await createUser({ email: 'user@example.com' });

    expect(emailService.sendEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome!',
    });
  });
});
```

### Async Testing

```javascript
// Using async/await
it('fetches user data', async () => {
  const user = await fetchUser(123);
  expect(user.id).toBe(123);
});

// Using promises
it('fetches user data', () => {
  return fetchUser(123).then((user) => {
    expect(user.id).toBe(123);
  });
});

// Testing rejections
it('handles non-existent user', async () => {
  await expect(fetchUser(999)).rejects.toThrow('User not found');
});
```

## Code Coverage (POL-0100)

### Coverage Thresholds

We maintain these minimum coverage thresholds:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Continuous Integration (POL-0101-0108)

### CI Configuration

Tests run automatically on:

- Every push to branches
- Every pull request
- Scheduled nightly builds

See `.github/workflows/ci.yml` for full configuration.

### Performance Benchmarks (POL-0106-0108)

```bash
# Run benchmarks
npm run bench

# Compare with baseline
npm run bench:compare

# Fail if regression > 10%
npm run bench:ci
```

## Best Practices

1. **Test behavior, not implementation**

   ```javascript
   // ❌ Bad - tests implementation details
   it('calls getUserFromDb', () => {
     expect(getUserFromDb).toHaveBeenCalled();
   });

   // ✅ Good - tests behavior
   it('returns user data', () => {
     expect(getUser(123)).resolves.toHaveProperty('id', 123);
   });
   ```

2. **Use descriptive test names**

   ```javascript
   // ❌ Bad
   it('works', () => {});

   // ✅ Good
   it('creates user with valid email and password', () => {});
   ```

3. **Keep tests focused**

   ```javascript
   // ❌ Bad - tests too many things
   it('handles user creation and updates', () => {
     const user = createUser(data);
     expect(user).toBeDefined();
     updateUser(user.id, newData);
     expect(user.updated).toBe(true);
   });

   // ✅ Good - separate tests
   it('creates user with valid data', () => {
     const user = createUser(data);
     expect(user).toBeDefined();
   });

   it('updates user data', () => {
     const user = createUser(data);
     updateUser(user.id, newData);
     expect(user.updated).toBe(true);
   });
   ```

4. **Clean up after tests**
   ```javascript
   afterEach(async () => {
     await db.cleanup();
     jest.clearAllMocks();
   });
   ```

## Debugging Tests

### Run Single Test

```bash
# Run specific test file
npm test -- path/to/test.js

# Run specific test case
npm test -- -t "test name"
```

### Debug in VS Code

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

### View Test Output

```bash
# Verbose output
npm test -- --verbose

# Show console.log output
npm test -- --silent=false
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Next Steps

- Read [Development Guide](DEVELOPMENT.md)
- Explore [Contributing Guide](CONTRIBUTING.md)
- Review example tests in `tests/` directory

---

Remember: Good tests are **Fast**, **Isolated**, **Repeatable**,
**Self-validating**, and **Timely** (FIRST principles).
