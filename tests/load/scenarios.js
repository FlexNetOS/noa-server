/**
 * K6 Load Test Scenarios
 *
 * Defines different load testing scenarios:
 * - Smoke Test: Minimal load verification
 * - Average Load: Normal usage patterns
 * - Stress Test: High load conditions
 * - Spike Test: Sudden traffic bursts
 * - Soak Test: Sustained load over time
 */

import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import http from 'k6/http';

// Shared test data
const users = new SharedArray('users', function () {
  return Array.from({ length: 100 }, (_, i) => ({
    name: `TestUser${i}`,
    email: `test${i}@example.com`,
    role: i % 3 === 0 ? 'admin' : 'user',
  }));
});

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

/**
 * Scenario 1: Smoke Test
 * Minimal load to verify basic functionality
 */
export const smokeTestOptions = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { scenario: 'smoke' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export function smokeTest() {
  group('Smoke Test - Basic Operations', () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      'health check OK': (r) => r.status === 200,
    });

    sleep(1);

    // List users
    const listRes = http.get(`${BASE_URL}/api/users`);
    check(listRes, {
      'list users OK': (r) => r.status === 200,
    });

    sleep(1);
  });
}

/**
 * Scenario 2: Average Load Test
 * Simulates normal expected usage
 */
export const averageLoadOptions = {
  scenarios: {
    average_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 }, // Ramp up
        { duration: '5m', target: 10 }, // Steady state
        { duration: '2m', target: 20 }, // Increase
        { duration: '5m', target: 20 }, // Steady state
        { duration: '2m', target: 0 }, // Ramp down
      ],
      tags: { scenario: 'average_load' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],
  },
};

export function averageLoadTest() {
  const user = users[Math.floor(Math.random() * users.length)];

  group('Average Load - User Journey', () => {
    // Browse users
    const browseRes = http.get(`${BASE_URL}/api/users?page=1&limit=20`);
    check(browseRes, {
      'browse successful': (r) => r.status === 200,
    });

    sleep(2);

    // Create user
    const createRes = http.post(
      `${BASE_URL}/api/users`,
      JSON.stringify({
        name: `${user.name}_${Date.now()}`,
        email: `${Date.now()}_${user.email}`,
        role: user.role,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(createRes, {
      'create successful': (r) => r.status === 201,
    });

    sleep(2);

    // Search users
    const searchRes = http.get(`${BASE_URL}/api/users?search=${user.name}`);
    check(searchRes, {
      'search successful': (r) => r.status === 200,
    });

    sleep(3);
  });
}

/**
 * Scenario 3: Stress Test
 * Tests system under high load
 */
export const stressTestOptions = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 }, // Warm up
        { duration: '5m', target: 50 }, // Ramp to 50 users
        { duration: '5m', target: 100 }, // Ramp to 100 users
        { duration: '5m', target: 150 }, // Ramp to 150 users
        { duration: '2m', target: 0 }, // Ramp down
      ],
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.90'],
  },
};

export function stressTest() {
  group('Stress Test - Heavy Load', () => {
    // Parallel requests
    const requests = [
      http.get(`${BASE_URL}/api/users`),
      http.get(`${BASE_URL}/api/users?page=2`),
      http.get(`${BASE_URL}/api/users?search=test`),
    ];

    http.batch(requests);

    check(requests, {
      'all requests completed': (r) => r.every((res) => res.status === 200),
    });

    sleep(1);

    // Create multiple users
    for (let i = 0; i < 3; i++) {
      http.post(
        `${BASE_URL}/api/users`,
        JSON.stringify({
          name: `StressUser${Date.now()}_${i}`,
          email: `stress${Date.now()}_${i}@example.com`,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    sleep(1);
  });
}

/**
 * Scenario 4: Spike Test
 * Tests sudden traffic increase
 */
export const spikeTestOptions = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 }, // Normal load
        { duration: '1m', target: 200 }, // Sudden spike
        { duration: '3m', target: 200 }, // Sustained spike
        { duration: '30s', target: 10 }, // Drop back to normal
        { duration: '2m', target: 10 }, // Normal operation
        { duration: '10s', target: 0 }, // Ramp down
      ],
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.10'],
    checks: ['rate>0.85'],
  },
};

export function spikeTest() {
  group('Spike Test - Burst Traffic', () => {
    // Rapid fire requests
    http.get(`${BASE_URL}/api/health`);
    http.get(`${BASE_URL}/api/users`);

    const createRes = http.post(
      `${BASE_URL}/api/users`,
      JSON.stringify({
        name: `SpikeUser${Date.now()}`,
        email: `spike${Date.now()}@example.com`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(createRes, {
      'spike create successful': (r) => r.status === 201,
    });

    // Minimal sleep to maintain high request rate
    sleep(0.5);
  });
}

/**
 * Scenario 5: Soak Test
 * Extended duration test to find memory leaks
 */
export const soakTestOptions = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 30,
      duration: '1h', // Run for 1 hour
      tags: { scenario: 'soak' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.93'],
  },
};

export function soakTest() {
  group('Soak Test - Sustained Load', () => {
    // Varied operations over long period
    const operations = [
      () => http.get(`${BASE_URL}/api/users`),
      () => http.get(`${BASE_URL}/api/users?page=${Math.floor(Math.random() * 10)}`),
      () =>
        http.post(
          `${BASE_URL}/api/users`,
          JSON.stringify({
            name: `SoakUser${Date.now()}`,
            email: `soak${Date.now()}@example.com`,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        ),
      () => http.get(`${BASE_URL}/api/health`),
    ];

    // Random operation
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const res = operation();

    check(res, {
      'soak operation successful': (r) => r.status >= 200 && r.status < 300,
    });

    // Vary sleep time
    sleep(Math.random() * 3 + 1); // 1-4 seconds
  });
}

/**
 * Scenario 6: Breakpoint Test
 * Find the system's breaking point
 */
export const breakpointTestOptions = {
  scenarios: {
    breakpoint: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '2m', target: 10 }, // 10 req/s
        { duration: '5m', target: 50 }, // 50 req/s
        { duration: '5m', target: 100 }, // 100 req/s
        { duration: '5m', target: 200 }, // 200 req/s
        { duration: '5m', target: 400 }, // 400 req/s
        { duration: '5m', target: 800 }, // 800 req/s
      ],
      tags: { scenario: 'breakpoint' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.20'],
  },
};

export function breakpointTest() {
  group('Breakpoint Test - Find Limits', () => {
    const res = http.get(`${BASE_URL}/api/users`);

    check(res, {
      'breakpoint request OK': (r) => r.status === 200,
      'breakpoint response time acceptable': (r) => r.timings.duration < 5000,
    });

    sleep(0.1); // Minimal sleep
  });
}

/**
 * Utility function to run specific scenario
 */
export function setup() {
  const scenario = __ENV.SCENARIO || 'average_load';
  console.log(`🚀 Running scenario: ${scenario}`);

  return {
    scenario,
    startTime: Date.now(),
  };
}

/**
 * Main entry point - routes to appropriate scenario
 */
export default function (data) {
  const scenario = data.scenario || __ENV.SCENARIO || 'average_load';

  switch (scenario) {
    case 'smoke':
      smokeTest();
      break;
    case 'average_load':
      averageLoadTest();
      break;
    case 'stress':
      stressTest();
      break;
    case 'spike':
      spikeTest();
      break;
    case 'soak':
      soakTest();
      break;
    case 'breakpoint':
      breakpointTest();
      break;
    default:
      averageLoadTest();
  }
}

/**
 * Teardown
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n✅ Scenario '${data.scenario}' completed in ${duration.toFixed(2)}s`);
}
