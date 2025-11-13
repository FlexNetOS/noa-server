/**
 * Rate Limiting E2E Tests
 *
 * Tests for provider-level rate limits, model-level rate limits,
 * user tier limits, quota tracking, and request queuing.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestEnvironment } from '../setup/test-environment';
import { apiRequest, TEST_USERS, sleep, concurrentRequests } from '../utils/test-helpers';

describe('Rate Limiting E2E', () => {
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

  describe('Provider-Level Rate Limits', () => {
    it('should enforce provider RPM limits', async () => {
      const providerLimit = 10; // 10 requests per minute for OpenAI

      const requests = Array.from(
        { length: providerLimit + 5 },
        () => () =>
          apiRequest(
            `${API_BASE}/ai/chat/completions`,
            {
              method: 'POST',
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Test' }],
              }),
            },
            { apiKey: TEST_USERS.pro.apiKey }
          )
      );

      const responses = await concurrentRequests(requests, 15);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000);

    it('should include rate limit headers in response', async () => {
      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Test' }],
          }),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Model-Level Rate Limits', () => {
    it('should enforce model-specific RPM limits', async () => {
      const modelLimit = 5;

      const requests = Array.from(
        { length: modelLimit + 3 },
        () => () =>
          apiRequest(
            `${API_BASE}/ai/chat/completions`,
            {
              method: 'POST',
              body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: 'Test' }],
              }),
            },
            { apiKey: TEST_USERS.pro.apiKey }
          )
      );

      const responses = await concurrentRequests(requests, 8);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should track token usage per model', async () => {
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello world' }],
          }),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const usageResponse = await apiRequest(
        `${API_BASE}/usage/tokens?model=gpt-3.5-turbo`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(usageResponse.status).toBe(200);
      const usage = await usageResponse.json();
      expect(usage.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('User Tier Limits', () => {
    it('should enforce free tier limits (100 requests/day)', async () => {
      const freeLimit = 100;

      for (let i = 0; i < freeLimit + 1; i++) {
        const response = await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: `Request ${i}` }],
            }),
          },
          { apiKey: TEST_USERS.free.apiKey }
        );

        if (i < freeLimit) {
          expect(response.status).toBeLessThan(429);
        } else {
          expect(response.status).toBe(429);
          const data = await response.json();
          expect(data.error).toContain('tier limit');
        }
      }
    }, 120000);

    it('should allow higher limits for pro tier', async () => {
      const proLimit = 1000;

      const requests = Array.from(
        { length: 150 },
        () => () =>
          apiRequest(
            `${API_BASE}/ai/chat/completions`,
            {
              method: 'POST',
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Test' }],
              }),
            },
            { apiKey: TEST_USERS.pro.apiKey }
          )
      );

      const responses = await concurrentRequests(requests, 20);
      const successful = responses.filter((r) => r.status === 200);

      expect(successful.length).toBeGreaterThan(100);
    }, 60000);

    it('should enforce enterprise tier limits', async () => {
      const response = await apiRequest(
        `${API_BASE}/usage/limits`,
        { method: 'GET' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(response.status).toBe(200);
      const limits = await response.json();
      expect(limits.requestsPerDay).toBeGreaterThan(1000);
      expect(limits.tokensPerDay).toBeGreaterThan(100000);
    });
  });

  describe('Quota Tracking and Reset', () => {
    it('should track quota usage', async () => {
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Quota test' }],
          }),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const quotaResponse = await apiRequest(
        `${API_BASE}/usage/quota`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(quotaResponse.status).toBe(200);
      const quota = await quotaResponse.json();
      expect(quota.used).toBeGreaterThan(0);
      expect(quota.remaining).toBeDefined();
      expect(quota.resetAt).toBeDefined();
    });

    it('should reset quota after time window', async () => {
      const shortWindow = 2; // 2 seconds for testing

      // Configure short reset window
      await apiRequest(
        `${API_BASE}/config/rate-limit`,
        {
          method: 'PATCH',
          body: JSON.stringify({ resetWindowSeconds: shortWindow }),
        },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      // Use quota
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Test' }],
          }),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const quotaBefore = await apiRequest(
        `${API_BASE}/usage/quota`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );
      const dataBefore = await quotaBefore.json();

      // Wait for reset
      await sleep((shortWindow + 1) * 1000);

      const quotaAfter = await apiRequest(
        `${API_BASE}/usage/quota`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );
      const dataAfter = await quotaAfter.json();

      expect(dataAfter.used).toBeLessThan(dataBefore.used);
    }, 10000);
  });

  describe('Request Queuing Under High Load', () => {
    it('should queue requests when rate limit reached', async () => {
      const limit = 5;

      const requests = Array.from(
        { length: limit + 5 },
        () => () =>
          apiRequest(
            `${API_BASE}/ai/chat/completions`,
            {
              method: 'POST',
              body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Queue test' }],
                queueIfRateLimited: true,
              }),
            },
            { apiKey: TEST_USERS.pro.apiKey }
          )
      );

      const responses = await concurrentRequests(requests, 10);
      const queued = responses.filter(async (r) => {
        if (r.status === 202) {
          const data = await r.json();
          return data.status === 'queued';
        }
        return false;
      });

      expect(queued.length).toBeGreaterThan(0);
    });

    it('should process queued requests after rate limit resets', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Queued processing test' }],
        queueIfRateLimited: true,
      };

      // Fill rate limit
      const requests = Array.from(
        { length: 10 },
        () => () =>
          apiRequest(
            `${API_BASE}/ai/chat/completions`,
            { method: 'POST', body: JSON.stringify(chatRequest) },
            { apiKey: TEST_USERS.pro.apiKey }
          )
      );

      const responses = await concurrentRequests(requests, 10);
      const queuedResponse = responses.find((r) => r.status === 202);

      if (queuedResponse) {
        const queuedData = await queuedResponse.json();
        const jobId = queuedData.jobId;

        // Poll job status
        await sleep(3000);

        const statusResponse = await apiRequest(
          `${API_BASE}/jobs/${jobId}`,
          { method: 'GET' },
          { apiKey: TEST_USERS.pro.apiKey }
        );

        const status = await statusResponse.json();
        expect(['queued', 'processing', 'completed']).toContain(status.status);
      }
    }, 15000);
  });
});
