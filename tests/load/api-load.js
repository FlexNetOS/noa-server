/**
 * K6 API Load Tests
 *
 * Comprehensive API endpoint load testing including:
 * - User management endpoints
 * - Authentication flows
 * - Data operations
 * - Search and filtering
 */

import { check, sleep, group } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successfulRequests = new Counter('successful_requests');
const apiDuration = new Trend('api_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '3m', target: 20 }, // Ramp up to 20 users
    { duration: '2m', target: 20 }, // Stay at 20 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.1'],
    checks: ['rate>0.95'],
  },
};

// Base URL from environment or default
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * Setup function
 */
export function setup() {
  console.log('🚀 Starting API load tests...');

  // Verify API is up
  const healthRes = http.get(`${BASE_URL}/api/health`);

  if (healthRes.status !== 200) {
    throw new Error('API is not accessible');
  }

  return {
    baseURL: BASE_URL,
    testStartTime: Date.now(),
  };
}

/**
 * Main test function
 */
export default function (data) {
  const baseURL = data.baseURL;

  // Test 1: Health Check
  group('Health Check', () => {
    const res = http.get(`${baseURL}/api/health`);

    const success = check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check responds quickly': (r) => r.timings.duration < 100,
      'health status is healthy': (r) => r.json('status') === 'healthy',
    });

    errorRate.add(!success);
    if (success) {
      successfulRequests.add(1);
    }
    apiDuration.add(res.timings.duration);
  });

  sleep(1);

  // Test 2: List Users
  group('List Users', () => {
    const res = http.get(`${baseURL}/api/users`);

    const success = check(res, {
      'list users status is 200': (r) => r.status === 200,
      'list users response is array': (r) => Array.isArray(r.json()),
      'list users responds in time': (r) => r.timings.duration < 500,
    });

    errorRate.add(!success);
    if (success) {
      successfulRequests.add(1);
    }
    apiDuration.add(res.timings.duration);
  });

  sleep(1);

  // Test 3: Create User
  group('Create User', () => {
    const timestamp = Date.now();
    const payload = JSON.stringify({
      name: `LoadTestUser${timestamp}`,
      email: `load.test${timestamp}@example.com`,
      role: 'user',
    });

    const res = http.post(`${baseURL}/api/users`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const success = check(res, {
      'create user status is 201': (r) => r.status === 201,
      'create user returns id': (r) => r.json('id') !== undefined,
      'create user responds in time': (r) => r.timings.duration < 800,
    });

    errorRate.add(!success);
    if (success) {
      successfulRequests.add(1);
    }
    apiDuration.add(res.timings.duration);

    // Store user ID for subsequent tests
    if (res.status === 201) {
      const userId = res.json('id');

      sleep(1);

      // Test 4: Get User
      group('Get User', () => {
        const getRes = http.get(`${baseURL}/api/users/${userId}`);

        const getSuccess = check(getRes, {
          'get user status is 200': (r) => r.status === 200,
          'get user returns correct id': (r) => r.json('id') === userId,
          'get user responds in time': (r) => r.timings.duration < 300,
        });

        errorRate.add(!getSuccess);
        if (getSuccess) {
          successfulRequests.add(1);
        }
        apiDuration.add(getRes.timings.duration);
      });

      sleep(1);

      // Test 5: Update User
      group('Update User', () => {
        const updatePayload = JSON.stringify({
          name: `UpdatedUser${timestamp}`,
          email: `updated${timestamp}@example.com`,
        });

        const updateRes = http.put(`${baseURL}/api/users/${userId}`, updatePayload, {
          headers: { 'Content-Type': 'application/json' },
        });

        const updateSuccess = check(updateRes, {
          'update user status is 200': (r) => r.status === 200,
          'update user returns updated data': (r) => r.json('name') === `UpdatedUser${timestamp}`,
          'update user responds in time': (r) => r.timings.duration < 800,
        });

        errorRate.add(!updateSuccess);
        if (updateSuccess) {
          successfulRequests.add(1);
        }
        apiDuration.add(updateRes.timings.duration);
      });

      sleep(1);

      // Test 6: Delete User
      group('Delete User', () => {
        const deleteRes = http.del(`${baseURL}/api/users/${userId}`);

        const deleteSuccess = check(deleteRes, {
          'delete user status is 204': (r) => r.status === 204,
          'delete user responds in time': (r) => r.timings.duration < 500,
        });

        errorRate.add(!deleteSuccess);
        if (deleteSuccess) {
          successfulRequests.add(1);
        }
        apiDuration.add(deleteRes.timings.duration);
      });
    }
  });

  sleep(1);

  // Test 7: Search and Filter
  group('Search Users', () => {
    const searchRes = http.get(`${baseURL}/api/users?search=test&role=user&page=1&limit=10`);

    const searchSuccess = check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search returns array': (r) => Array.isArray(r.json()),
      'search responds in time': (r) => r.timings.duration < 600,
    });

    errorRate.add(!searchSuccess);
    if (searchSuccess) {
      successfulRequests.add(1);
    }
    apiDuration.add(searchRes.timings.duration);
  });

  sleep(1);

  // Test 8: Pagination
  group('Pagination', () => {
    const paginationRes = http.get(`${baseURL}/api/users?page=1&limit=20`);

    const paginationSuccess = check(paginationRes, {
      'pagination status is 200': (r) => r.status === 200,
      'pagination returns data': (r) => r.json().length <= 20,
      'pagination responds in time': (r) => r.timings.duration < 500,
    });

    errorRate.add(!paginationSuccess);
    if (paginationSuccess) {
      successfulRequests.add(1);
    }
    apiDuration.add(paginationRes.timings.duration);
  });

  sleep(2);
}

/**
 * Teardown function
 */
export function teardown(data) {
  const duration = (Date.now() - data.testStartTime) / 1000;
  console.log(`\n✅ API load tests completed in ${duration.toFixed(2)}s`);
}

/**
 * Custom summary handler
 */
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    [`docs/reports/api-load-test-${timestamp}.json`]: JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data),
  };
}

/**
 * Generate text summary
 */
function generateTextSummary(data) {
  let summary = '\n';
  summary += '='.repeat(80) + '\n';
  summary += 'API LOAD TEST RESULTS\n';
  summary += '='.repeat(80) + '\n\n';

  // Requests
  if (data.metrics.http_reqs) {
    summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += `Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s\n\n`;
  }

  // Response times
  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration.values;
    summary += 'Response Times:\n';
    summary += `  Average: ${duration.avg.toFixed(2)}ms\n`;
    summary += `  Min: ${duration.min.toFixed(2)}ms\n`;
    summary += `  Max: ${duration.max.toFixed(2)}ms\n`;
    summary += `  Median: ${duration.med.toFixed(2)}ms\n`;
    summary += `  p(90): ${duration['p(90)'].toFixed(2)}ms\n`;
    summary += `  p(95): ${duration['p(95)'].toFixed(2)}ms\n`;
    summary += `  p(99): ${duration['p(99)'].toFixed(2)}ms\n\n`;
  }

  // Success rate
  if (data.metrics.successful_requests && data.metrics.http_reqs) {
    const successRate =
      (data.metrics.successful_requests.values.count / data.metrics.http_reqs.values.count) * 100;
    summary += `Success Rate: ${successRate.toFixed(2)}%\n`;
  }

  // Error rate
  if (data.metrics.errors) {
    summary += `Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n\n`;
  }

  // Thresholds
  summary += 'Threshold Results:\n';
  for (const [name, threshold] of Object.entries(data.thresholds)) {
    const status = threshold.ok ? '✅ PASSED' : '❌ FAILED';
    summary += `  ${name}: ${status}\n`;
  }

  summary += '\n' + '='.repeat(80) + '\n';
  return summary;
}
