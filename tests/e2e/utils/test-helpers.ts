/**
 * E2E Test Helpers
 *
 * Common utilities for E2E testing:
 * - HTTP request helpers
 * - Authentication helpers
 * - Assertion utilities
 * - Wait/retry helpers
 * - Data cleanup helpers
 */

import { TEST_ENV_CONFIG } from '../setup/test-environment';

export interface TestUser {
  id: string;
  email: string;
  username: string;
  tier: 'free' | 'pro' | 'enterprise';
  apiKey: string;
  token?: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  free: {
    id: 'test-user-free-id',
    email: 'free@test.com',
    username: 'free_user',
    tier: 'free',
    apiKey: 'test_api_key_free',
  },
  pro: {
    id: 'test-user-pro-id',
    email: 'pro@test.com',
    username: 'pro_user',
    tier: 'pro',
    apiKey: 'test_api_key_pro',
  },
  enterprise: {
    id: 'test-user-enterprise-id',
    email: 'enterprise@test.com',
    username: 'enterprise_user',
    tier: 'enterprise',
    apiKey: 'test_api_key_enterprise',
  },
};

/**
 * HTTP request helper with authentication
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  auth?: { apiKey?: string; token?: string }
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (auth?.apiKey) {
    headers['X-API-Key'] = auth.apiKey;
  }

  if (auth?.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  return fetch(endpoint, {
    ...options,
    headers,
  });
}

/**
 * Login and get JWT token for test user
 */
export async function loginTestUser(user: TestUser): Promise<string> {
  const response = await apiRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      password: 'test_password',
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Wait for condition with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 10000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry helper with exponential backoff
 */
export async function retry<T>(fn: () => Promise<T>, maxAttempts = 3, delayMs = 1000): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delayMs * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Assert response status
 */
export function assertStatus(response: Response, expectedStatus: number): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}: ${response.statusText}`
    );
  }
}

/**
 * Assert response JSON contains expected fields
 */
export async function assertJsonContains(
  response: Response,
  expectedFields: Record<string, any>
): Promise<void> {
  const data = await response.json();

  for (const [key, value] of Object.entries(expectedFields)) {
    if (data[key] !== value) {
      throw new Error(`Expected ${key}=${value}, got ${key}=${data[key]}`);
    }
  }
}

/**
 * Generate random string
 */
export function randomString(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random email
 */
export function randomEmail(): string {
  return `test-${randomString(8)}@example.com`;
}

/**
 * Create mock AI response
 */
export function createMockAIResponse(content: string, model = 'gpt-3.5-turbo') {
  return {
    id: `chatcmpl-${randomString(20)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: content.split(' ').length,
      total_tokens: 10 + content.split(' ').length,
    },
  };
}

/**
 * Create mock streaming AI response
 */
export function* createMockStreamingResponse(content: string, model = 'gpt-3.5-turbo') {
  const id = `chatcmpl-${randomString(20)}`;
  const words = content.split(' ');

  for (let i = 0; i < words.length; i++) {
    yield {
      id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: {
            content: words[i] + (i < words.length - 1 ? ' ' : ''),
          },
          finish_reason: i === words.length - 1 ? 'stop' : null,
        },
      ],
    };
  }
}

/**
 * Measure execution time
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const startTime = Date.now();
  const result = await fn();
  const timeMs = Date.now() - startTime;
  return { result, timeMs };
}

/**
 * Assert time is within range
 */
export function assertTimeInRange(actualMs: number, minMs: number, maxMs: number): void {
  if (actualMs < minMs || actualMs > maxMs) {
    throw new Error(`Expected time between ${minMs}ms and ${maxMs}ms, got ${actualMs}ms`);
  }
}

/**
 * Concurrent request helper
 */
export async function concurrentRequests<T>(
  requests: (() => Promise<T>)[],
  concurrency = 10
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const request of requests) {
    const promise = request().then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Parse Server-Sent Events (SSE) stream
 */
export async function* parseSSEStream(response: Response): AsyncGenerator<any> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }
        try {
          yield JSON.parse(data);
        } catch (error) {
          console.error('Failed to parse SSE data:', data);
        }
      }
    }
  }
}

/**
 * Calculate cache hit rate
 */
export function calculateCacheHitRate(hits: number, misses: number): number {
  const total = hits + misses;
  return total === 0 ? 0 : (hits / total) * 100;
}

/**
 * Format bytes to human-readable
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

/**
 * Calculate percentile from sorted array
 */
export function percentile(sorted: number[], p: number): number {
  const index = Math.ceil(sorted.length * (p / 100)) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}
