/**
 * Model Registry E2E Tests
 *
 * Tests for dynamic model registration, status updates, search/filter,
 * cost tracking, and hot-reload configuration.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestEnvironment, TEST_ENV_CONFIG } from '../setup/test-environment';
import { apiRequest, TEST_USERS, waitFor } from '../utils/test-helpers';

describe('Model Registry E2E', () => {
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

  describe('Register Models Dynamically', () => {
    it('should register a new AI model', async () => {
      const newModel = {
        name: 'gpt-4-turbo',
        provider: 'openai',
        modelType: 'chat',
        costPer1kTokens: 0.01,
        maxTokens: 128000,
        supportsStreaming: true,
      };

      const response = await apiRequest(
        `${API_BASE}/models`,
        {
          method: 'POST',
          body: JSON.stringify(newModel),
        },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toMatchObject({
        name: newModel.name,
        provider: newModel.provider,
        status: 'available',
      });
      expect(data.id).toBeDefined();
    });

    it('should prevent duplicate model registration', async () => {
      const model = {
        name: 'gpt-3.5-turbo', // Already exists in seed data
        provider: 'openai',
        modelType: 'chat',
        costPer1kTokens: 0.002,
        maxTokens: 4096,
      };

      const response = await apiRequest(
        `${API_BASE}/models`,
        {
          method: 'POST',
          body: JSON.stringify(model),
        },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('already exists');
    });

    it('should validate model fields', async () => {
      const invalidModel = {
        name: '',
        provider: 'invalid-provider',
        costPer1kTokens: -1,
      };

      const response = await apiRequest(
        `${API_BASE}/models`,
        {
          method: 'POST',
          body: JSON.stringify(invalidModel),
        },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.errors).toBeDefined();
    });
  });

  describe('Update Model Status', () => {
    it('should update model status to unavailable', async () => {
      const pool = testEnv.getPostgresPool();
      const result = await pool.query('SELECT id FROM ai_models WHERE name = $1', [
        'gpt-3.5-turbo',
      ]);
      const modelId = result.rows[0].id;

      const response = await apiRequest(
        `${API_BASE}/models/${modelId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'unavailable' }),
        },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('unavailable');

      // Verify in database
      const updated = await pool.query('SELECT status FROM ai_models WHERE id = $1', [modelId]);
      expect(updated.rows[0].status).toBe('unavailable');
    });

    it('should update model status to available', async () => {
      const pool = testEnv.getPostgresPool();

      // First set to unavailable
      await pool.query('UPDATE ai_models SET status = $1 WHERE name = $2', [
        'unavailable',
        'gpt-4',
      ]);

      const result = await pool.query('SELECT id FROM ai_models WHERE name = $1', ['gpt-4']);
      const modelId = result.rows[0].id;

      const response = await apiRequest(
        `${API_BASE}/models/${modelId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'available' }),
        },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('available');
    });

    it('should reject invalid status values', async () => {
      const pool = testEnv.getPostgresPool();
      const result = await pool.query('SELECT id FROM ai_models WHERE name = $1', [
        'gpt-3.5-turbo',
      ]);
      const modelId = result.rows[0].id;

      const response = await apiRequest(
        `${API_BASE}/models/${modelId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'invalid-status' }),
        },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Search and Filter Models', () => {
    it('should list all models', async () => {
      const response = await apiRequest(
        `${API_BASE}/models`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.models).toBeInstanceOf(Array);
      expect(data.models.length).toBeGreaterThan(0);
      expect(data.total).toBeGreaterThan(0);
    });

    it('should filter models by provider', async () => {
      const response = await apiRequest(
        `${API_BASE}/models?provider=openai`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.models).toBeInstanceOf(Array);
      data.models.forEach((model: any) => {
        expect(model.provider).toBe('openai');
      });
    });

    it('should filter models by status', async () => {
      const response = await apiRequest(
        `${API_BASE}/models?status=available`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.models).toBeInstanceOf(Array);
      data.models.forEach((model: any) => {
        expect(model.status).toBe('available');
      });
    });

    it('should filter models by type', async () => {
      const response = await apiRequest(
        `${API_BASE}/models?modelType=chat`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.models).toBeInstanceOf(Array);
      data.models.forEach((model: any) => {
        expect(model.model_type).toBe('chat');
      });
    });

    it('should search models by name', async () => {
      const response = await apiRequest(
        `${API_BASE}/models?search=gpt`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.models).toBeInstanceOf(Array);
      data.models.forEach((model: any) => {
        expect(model.name.toLowerCase()).toContain('gpt');
      });
    });

    it('should combine multiple filters', async () => {
      const response = await apiRequest(
        `${API_BASE}/models?provider=openai&status=available&modelType=chat`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.models).toBeInstanceOf(Array);
      data.models.forEach((model: any) => {
        expect(model.provider).toBe('openai');
        expect(model.status).toBe('available');
        expect(model.model_type).toBe('chat');
      });
    });

    it('should paginate results', async () => {
      const response1 = await apiRequest(
        `${API_BASE}/models?limit=2&offset=0`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response1.status).toBe(200);
      const data1 = await response1.json();
      expect(data1.models.length).toBeLessThanOrEqual(2);

      const response2 = await apiRequest(
        `${API_BASE}/models?limit=2&offset=2`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response2.status).toBe(200);
      const data2 = await response2.json();
      expect(data2.models[0]?.id).not.toBe(data1.models[0]?.id);
    });
  });

  describe('Cost Tracking', () => {
    it('should track costs across multiple requests', async () => {
      const pool = testEnv.getPostgresPool();
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [
        TEST_USERS.pro.email,
      ]);
      const userId = userResult.rows[0].id;

      const modelResult = await pool.query(
        'SELECT id, cost_per_1k_tokens FROM ai_models WHERE name = $1',
        ['gpt-3.5-turbo']
      );
      const modelId = modelResult.rows[0].id;
      const costPer1k = parseFloat(modelResult.rows[0].cost_per_1k_tokens);

      // Make multiple AI requests
      const requests = [
        { tokens: 1000, cost: costPer1k },
        { tokens: 2000, cost: costPer1k * 2 },
        { tokens: 500, cost: costPer1k * 0.5 },
      ];

      for (const req of requests) {
        await pool.query(
          `INSERT INTO ai_requests (user_id, model_id, provider, prompt_tokens, completion_tokens, total_tokens, cost, latency_ms, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            userId,
            modelId,
            'openai',
            req.tokens / 2,
            req.tokens / 2,
            req.tokens,
            req.cost,
            100,
            'completed',
          ]
        );
      }

      // Get cost summary
      const response = await apiRequest(
        `${API_BASE}/analytics/costs?userId=${userId}`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalCost).toBeCloseTo(costPer1k * 3.5, 5);
      expect(data.totalTokens).toBe(3500);
      expect(data.requestCount).toBe(3);
    });

    it('should track costs by model', async () => {
      const pool = testEnv.getPostgresPool();
      const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [
        TEST_USERS.pro.email,
      ]);
      const userId = userResult.rows[0].id;

      const response = await apiRequest(
        `${API_BASE}/analytics/costs/by-model?userId=${userId}`,
        { method: 'GET' },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('modelName');
        expect(data[0]).toHaveProperty('totalCost');
        expect(data[0]).toHaveProperty('requestCount');
      }
    });
  });

  describe('Hot-Reload Configuration', () => {
    it('should reload model configuration without restart', async () => {
      // Update model in database
      const pool = testEnv.getPostgresPool();
      await pool.query('UPDATE ai_models SET cost_per_1k_tokens = $1 WHERE name = $2', [
        0.003,
        'gpt-3.5-turbo',
      ]);

      // Trigger config reload
      const reloadResponse = await apiRequest(
        `${API_BASE}/models/reload`,
        { method: 'POST' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(reloadResponse.status).toBe(200);

      // Verify updated config is in effect
      await waitFor(async () => {
        const response = await apiRequest(
          `${API_BASE}/models?search=gpt-3.5-turbo`,
          { method: 'GET' },
          { apiKey: TEST_USERS.pro.apiKey }
        );
        const data = await response.json();
        return data.models[0]?.cost_per_1k_tokens === 0.003;
      }, 5000);
    });

    it('should handle configuration reload errors gracefully', async () => {
      // Create invalid model configuration
      const pool = testEnv.getPostgresPool();
      await pool.query(
        'UPDATE ai_models SET cost_per_1k_tokens = $1 WHERE name = $2',
        [-1, 'gpt-3.5-turbo'] // Invalid negative cost
      );

      const reloadResponse = await apiRequest(
        `${API_BASE}/models/reload`,
        { method: 'POST' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(reloadResponse.status).toBe(500);
      const data = await reloadResponse.json();
      expect(data.error).toBeDefined();

      // Fix configuration
      await pool.query('UPDATE ai_models SET cost_per_1k_tokens = $1 WHERE name = $2', [
        0.002,
        'gpt-3.5-turbo',
      ]);
    });
  });
});
