/**
 * K6 Load Testing Configuration
 *
 * Configures K6 load testing scenarios including:
 * - Virtual users
 * - Test duration
 * - Thresholds
 * - Stages
 */

import { check, sleep, group } from 'k6';
import http from 'k6/http';

/**
 * Test configuration options
 */
export const options = {
  // Scenarios define different load testing patterns
  scenarios: {
    // Smoke test: minimal load to verify system works
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      env: { SCENARIO: 'smoke' },
    },

    // Load test: average expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 }, // Ramp up to 10 users
        { duration: '5m', target: 10 }, // Stay at 10 users
        { duration: '2m', target: 0 }, // Ramp down to 0 users
      ],
      tags: { test_type: 'load' },
      env: { SCENARIO: 'load' },
    },

    // Stress test: above normal load to find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 }, // Ramp up to 20 users
        { duration: '5m', target: 20 }, // Stay at 20 users
        { duration: '2m', target: 50 }, // Spike to 50 users
        { duration: '5m', target: 50 }, // Stay at 50 users
        { duration: '2m', target: 0 }, // Ramp down to 0 users
      ],
      tags: { test_type: 'stress' },
      env: { SCENARIO: 'stress' },
    },

    // Spike test: sudden increase in load
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 }, // Warm up
        { duration: '1m', target: 100 }, // Spike to 100 users
        { duration: '3m', target: 100 }, // Stay at 100 users
        { duration: '10s', target: 0 }, // Quick ramp down
      ],
      tags: { test_type: 'spike' },
      env: { SCENARIO: 'spike' },
    },

    // Soak test: sustained load over extended period
    soak: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30m',
      tags: { test_type: 'soak' },
      env: { SCENARIO: 'soak' },
    },

    // Breakpoint test: gradually increase load until system breaks
    breakpoint: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '2m', target: 10 }, // Start at 10 req/s
        { duration: '5m', target: 50 }, // Ramp to 50 req/s
        { duration: '5m', target: 100 }, // Ramp to 100 req/s
        { duration: '5m', target: 200 }, // Ramp to 200 req/s
        { duration: '5m', target: 400 }, // Ramp to 400 req/s
      ],
      tags: { test_type: 'breakpoint' },
      env: { SCENARIO: 'breakpoint' },
    },
  },

  // Performance thresholds
  thresholds: {
    // HTTP request duration
    http_req_duration: [
      'p(95)<500', // 95% of requests must complete below 500ms
      'p(99)<1000', // 99% of requests must complete below 1000ms
      'max<5000', // Maximum request duration is 5s
    ],

    // HTTP request failed rate
    http_req_failed: [
      'rate<0.01', // Less than 1% of requests can fail
    ],

    // Checks success rate
    checks: [
      'rate>0.95', // 95% of checks must pass
    ],

    // Custom metrics
    'http_req_duration{scenario:smoke}': ['p(95)<300'],
    'http_req_duration{scenario:load}': ['p(95)<500'],
    'http_req_duration{scenario:stress}': ['p(95)<800'],
    'http_req_duration{scenario:spike}': ['p(95)<1000'],
  },

  // Test data
  setupTimeout: '60s',
  teardownTimeout: '60s',

  // Logging and output
  noConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0',

  // Tags for all requests
  tags: {
    environment: 'test',
    team: 'qa',
  },

  // Summary export
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  summaryTimeUnit: 'ms',
};

/**
 * Setup function - runs once before tests
 */
export function setup() {
  console.log('🚀 Starting load tests...');

  // Initialize test data
  const baseURL = __ENV.BASE_URL || 'http://localhost:3000';

  // Verify API is accessible
  const healthCheck = http.get(`${baseURL}/api/health`);

  if (healthCheck.status !== 200) {
    throw new Error('API health check failed. Cannot proceed with tests.');
  }

  console.log('✅ API health check passed');

  return {
    baseURL,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Main test function - runs for each virtual user
 */
export default function (data) {
  const baseURL = data.baseURL;
  const scenario = __ENV.SCENARIO || 'load';

  // Group related requests
  group('API Health Check', () => {
    const res = http.get(`${baseURL}/api/health`);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has status field': (r) => r.json('status') !== undefined,
    });
  });

  sleep(1);

  group('User Operations', () => {
    // List users
    const listRes = http.get(`${baseURL}/api/users`);

    check(listRes, {
      'list users status is 200': (r) => r.status === 200,
      'list response is array': (r) => Array.isArray(r.json()),
    });

    sleep(1);

    // Create user
    const createRes = http.post(
      `${baseURL}/api/users`,
      JSON.stringify({
        name: `TestUser${Date.now()}`,
        email: `test${Date.now()}@example.com`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(createRes, {
      'create user status is 201': (r) => r.status === 201,
      'create response has id': (r) => r.json('id') !== undefined,
    });

    sleep(1);
  });

  // Adjust think time based on scenario
  const thinkTime = scenario === 'spike' ? 0.5 : 2;
  sleep(thinkTime);
}

/**
 * Teardown function - runs once after all tests
 */
export function teardown(data) {
  console.log('\n🏁 Load tests completed');
  console.log(`Started at: ${data.timestamp}`);
  console.log(`Finished at: ${new Date().toISOString()}`);
}

/**
 * Handle summary - custom report formatting
 */
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    // JSON report
    [`docs/reports/load-test-${timestamp}.json`]: JSON.stringify(data, null, 2),

    // Console output
    stdout: textSummary(data, { indent: '  ', enableColors: true }),

    // HTML report
    [`docs/reports/load-test-${timestamp}.html`]: htmlReport(data),
  };
}

/**
 * Generate text summary
 */
function textSummary(data, options) {
  let summary = '\n';
  summary += '='.repeat(80) + '\n';
  summary += 'LOAD TEST SUMMARY\n';
  summary += '='.repeat(80) + '\n\n';

  // Request metrics
  if (data.metrics.http_reqs) {
    summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += `Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s\n\n`;
  }

  // Duration metrics
  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration.values;
    summary += 'Response Times:\n';
    summary += `  Average: ${duration.avg.toFixed(2)}ms\n`;
    summary += `  Min: ${duration.min.toFixed(2)}ms\n`;
    summary += `  Max: ${duration.max.toFixed(2)}ms\n`;
    summary += `  p(95): ${duration['p(95)'].toFixed(2)}ms\n`;
    summary += `  p(99): ${duration['p(99)'].toFixed(2)}ms\n\n`;
  }

  // Error rate
  if (data.metrics.http_req_failed) {
    const failRate = data.metrics.http_req_failed.values.rate * 100;
    summary += `Failed Requests: ${failRate.toFixed(2)}%\n\n`;
  }

  return summary;
}

/**
 * Generate HTML report
 */
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>K6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .metric { margin: 10px 0; }
    .passed { color: green; font-weight: bold; }
    .failed { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>K6 Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>Test Summary</h2>
  <div class="metric">Total Requests: ${data.metrics.http_reqs?.values.count || 0}</div>
  <div class="metric">Request Rate: ${(data.metrics.http_reqs?.values.rate || 0).toFixed(2)} req/s</div>

  <h2>Response Times</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>Average</td>
      <td>${(data.metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms</td>
    </tr>
    <tr>
      <td>p(95)</td>
      <td>${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms</td>
    </tr>
    <tr>
      <td>p(99)</td>
      <td>${(data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms</td>
    </tr>
  </table>

  <h2>Thresholds</h2>
  ${generateThresholdsTable(data.thresholds)}
</body>
</html>
  `;
}

/**
 * Generate thresholds table for HTML report
 */
function generateThresholdsTable(thresholds) {
  if (!thresholds) {
    return '<p>No thresholds defined</p>';
  }

  let html = '<table><tr><th>Threshold</th><th>Status</th></tr>';

  for (const [name, threshold] of Object.entries(thresholds)) {
    const status = threshold.ok ? 'PASSED' : 'FAILED';
    const statusClass = threshold.ok ? 'passed' : 'failed';
    html += `<tr><td>${name}</td><td class="${statusClass}">${status}</td></tr>`;
  }

  html += '</table>';
  return html;
}
