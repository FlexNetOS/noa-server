/**
 * Provider Fallback E2E Tests
 *
 * Tests for automatic failover between AI providers, circuit breaker
 * state transitions, and recovery scenarios.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestEnvironment, TEST_ENV_CONFIG } from '../setup/test-environment';
import { apiRequest, TEST_USERS, waitFor, sleep } from '../utils/test-helpers';

describe('Provider Fallback E2E', () => {
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
    // Reset circuit breakers
    await apiRequest(
      `${API_BASE}/circuit-breakers/reset`,
      { method: 'POST' },
      { apiKey: TEST_USERS.enterprise.apiKey }
    );
  });

  describe('Primary Provider Failure Triggers Fallback', () => {
    it('should fallback to secondary provider when primary fails', async () => {
      // Configure primary provider to fail
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 1.0 }),
      });

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        fallbackEnabled: true,
      };

      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.choices[0].message.content).toBeDefined();
      expect(data.metadata.usedFallback).toBe(true);
      expect(data.metadata.primaryProvider).toBe('openai');
      expect(data.metadata.actualProvider).toBe('anthropic'); // Fallback

      // Reset mock provider
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 0.0 }),
      });
    });

    it('should track fallback events in metrics', async () => {
      // Configure primary to fail
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 1.0 }),
      });

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        fallbackEnabled: true,
      };

      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      // Check metrics
      const metricsResponse = await apiRequest(
        `${API_BASE}/metrics/fallback`,
        { method: 'GET' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(metricsResponse.status).toBe(200);
      const metrics = await metricsResponse.json();
      expect(metrics.totalFallbacks).toBeGreaterThan(0);
      expect(metrics.providers.openai.failures).toBeGreaterThan(0);

      // Reset
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 0.0 }),
      });
    });
  });

  describe('Circuit Breaker State Transitions', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const threshold = 5;

      // Configure provider to fail
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 1.0 }),
      });

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        fallbackEnabled: false, // Disable fallback to trigger circuit breaker
      };

      // Make requests until circuit opens
      for (let i = 0; i < threshold; i++) {
        await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify(chatRequest),
          },
          { apiKey: TEST_USERS.pro.apiKey }
        );
      }

      // Check circuit breaker status
      const statusResponse = await apiRequest(
        `${API_BASE}/circuit-breakers/status`,
        { method: 'GET' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(statusResponse.status).toBe(200);
      const status = await statusResponse.json();
      expect(status.providers.openai.state).toBe('open');

      // Reset
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 0.0 }),
      });
    });

    it('should transition from open to half-open after cooldown', async () => {
      const cooldownMs = 2000;

      // Open circuit breaker
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 1.0 }),
      });

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        fallbackEnabled: false,
      };

      for (let i = 0; i < 5; i++) {
        await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify(chatRequest),
          },
          { apiKey: TEST_USERS.pro.apiKey }
        );
      }

      // Wait for cooldown
      await sleep(cooldownMs + 500);

      // Check state transitioned to half-open
      const statusResponse = await apiRequest(
        `${API_BASE}/circuit-breakers/status`,
        { method: 'GET' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      const status = await statusResponse.json();
      expect(status.providers.openai.state).toBe('half-open');

      // Reset
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 0.0 }),
      });
    });

    it('should transition from half-open to closed on success', async () => {
      // First open the circuit
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 1.0 }),
      });

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        fallbackEnabled: false,
      };

      for (let i = 0; i < 5; i++) {
        await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify(chatRequest),
          },
          { apiKey: TEST_USERS.pro.apiKey }
        );
      }

      // Wait for cooldown
      await sleep(2500);

      // Fix provider
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 0.0 }),
      });

      // Make successful request
      const successResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(successResponse.status).toBe(200);

      // Check circuit closed
      const statusResponse = await apiRequest(
        `${API_BASE}/circuit-breakers/status`,
        { method: 'GET' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      const status = await statusResponse.json();
      expect(status.providers.openai.state).toBe('closed');
    });
  });

  describe('Automatic Recovery After Cooldown', () => {
    it('should automatically retry after cooldown period', async () => {
      // Open circuit
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 1.0 }),
      });

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        fallbackEnabled: false,
      };

      for (let i = 0; i < 5; i++) {
        await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify(chatRequest),
          },
          { apiKey: TEST_USERS.pro.apiKey }
        );
      }

      // Wait for cooldown
      await sleep(2500);

      // Fix provider
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 0.0 }),
      });

      // Retry should succeed
      const retryResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(retryResponse.status).toBe(200);
      const data = await retryResponse.json();
      expect(data.choices[0].message.content).toBeDefined();
    });

    it('should track recovery events', async () => {
      // Simulate failure and recovery
      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 1.0 }),
      });

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        fallbackEnabled: false,
      };

      for (let i = 0; i < 5; i++) {
        await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify(chatRequest),
          },
          { apiKey: TEST_USERS.pro.apiKey }
        );
      }

      await sleep(2500);

      await fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failureRate: 0.0 }),
      });

      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      // Check recovery metrics
      const metricsResponse = await apiRequest(
        `${API_BASE}/metrics/circuit-breaker`,
        { method: 'GET' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(metricsResponse.status).toBe(200);
      const metrics = await metricsResponse.json();
      expect(metrics.providers.openai.recoveries).toBeGreaterThan(0);
    });
  });

  describe('All Providers Down Scenario', () => {
    it('should return error when all providers are down', async () => {
      // Configure all providers to fail
      await Promise.all([
        fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failureRate: 1.0 }),
        }),
        fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.claude.port}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failureRate: 1.0 }),
        }),
      ]);

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        fallbackEnabled: true,
      };

      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('All providers unavailable');

      // Reset
      await Promise.all([
        fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failureRate: 0.0 }),
        }),
        fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.claude.port}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failureRate: 0.0 }),
        }),
      ]);
    });

    it('should queue requests when all providers down (if queueing enabled)', async () => {
      // Configure all providers to fail
      await Promise.all([
        fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failureRate: 1.0 }),
        }),
        fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.claude.port}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failureRate: 1.0 }),
        }),
      ]);

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        fallbackEnabled: true,
        queueIfUnavailable: true,
      };

      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(202);
      const data = await response.json();
      expect(data.jobId).toBeDefined();
      expect(data.status).toBe('queued');

      // Reset
      await Promise.all([
        fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.openai.port}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failureRate: 0.0 }),
        }),
        fetch(`http://localhost:${TEST_ENV_CONFIG.mockProviders.claude.port}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ failureRate: 0.0 }),
        }),
      ]);
    });
  });
});
