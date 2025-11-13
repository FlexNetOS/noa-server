/**
 * Integration Tests: Auto-Optimizer Engine
 * Tests the core optimization logic and interception flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mandatoryOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/auto-optimizer';
import { automationConfig } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/config';

describe('Auto-Optimizer Integration Tests', () => {
  beforeEach(() => {
    mandatoryOptimizer.clearCache();
    mandatoryOptimizer.resetMonitor();
    mandatoryOptimizer.setEnabled(true);
    mandatoryOptimizer.setEmergencyOverride(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Optimization Application', () => {
    it('should successfully optimize a basic prompt', async () => {
      const result = await mandatoryOptimizer.intercept('write a function');

      expect(result.optimized).toBeDefined();
      expect(result.optimized.length).toBeGreaterThan('write a function'.length);
      expect(result.bypassed).toBe(false);
      expect(result.cached).toBe(false);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should improve prompt clarity and specificity', async () => {
      const vague = 'make it better';
      const result = await mandatoryOptimizer.intercept(vague);

      expect(result.optimized).toBeDefined();
      expect(result.optimized).not.toBe(vague);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.optimized.length).toBeGreaterThan(vague.length);
    });

    it('should handle complex prompts', async () => {
      const complex = 'Create a REST API with authentication, database integration, error handling, and comprehensive tests';
      const result = await mandatoryOptimizer.intercept(complex);

      expect(result.optimized).toBeDefined();
      expect(result.bypassed).toBe(false);
      expect(result.qualityScore).toBeDefined();
    });

    it('should optimize multi-line prompts', async () => {
      const multiline = `
        Write a program that:
        - Reads from a file
        - Processes data
        - Outputs results
      `.trim();

      const result = await mandatoryOptimizer.intercept(multiline);

      expect(result.optimized).toBeDefined();
      expect(result.optimized).toContain('Read');
      expect(result.optimized).toContain('Process');
    });

    it('should maintain context in optimizations', async () => {
      const withContext = 'Given that we have a user database, create a search function';
      const result = await mandatoryOptimizer.intercept(withContext, {
        path: '/api/search',
        method: 'POST'
      });

      expect(result.optimized).toBeDefined();
      expect(result.optimized.toLowerCase()).toContain('user');
      expect(result.optimized.toLowerCase()).toContain('database');
      expect(result.optimized.toLowerCase()).toContain('search');
    });
  });

  describe('Optimization Quality', () => {
    it('should produce prompts meeting quality threshold', async () => {
      const config = automationConfig.getConfig();
      const result = await mandatoryOptimizer.intercept('analyze the data');

      expect(result.qualityScore).toBeDefined();
      if (result.qualityScore) {
        expect(result.qualityScore).toBeGreaterThanOrEqual(config.quality.threshold);
      }
    });

    it('should track quality improvements', async () => {
      const lowQuality = 'do stuff';
      const result = await mandatoryOptimizer.intercept(lowQuality);

      expect(result.optimized).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.optimized.length).toBeGreaterThan(lowQuality.length);
    });
  });

  describe('Processing Performance', () => {
    it('should complete optimization within reasonable time', async () => {
      const start = Date.now();
      await mandatoryOptimizer.intercept('test prompt');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });

    it('should report accurate processing time', async () => {
      const result = await mandatoryOptimizer.intercept('timing test');

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(15000);
    });

    it('should handle timeout gracefully', async () => {
      const config = automationConfig.getConfig();
      const originalTimeout = config.performance.maxProcessingTime;

      // Set very short timeout
      automationConfig.updateConfig({
        performance: { ...config.performance, maxProcessingTime: 1 }
      });

      const result = await mandatoryOptimizer.intercept('timeout test');

      // Should either timeout and passthrough or complete
      expect(result).toBeDefined();
      expect(result.original).toBe('timeout test');

      // Restore original timeout
      automationConfig.updateConfig({
        performance: { ...config.performance, maxProcessingTime: originalTimeout }
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle optimization errors gracefully', async () => {
      // Force an error by disabling and then trying to optimize
      mandatoryOptimizer.setEnabled(false);

      const result = await mandatoryOptimizer.intercept('error test');

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toBe('error test');
    });

    it('should passthrough on emergency override', async () => {
      mandatoryOptimizer.setEmergencyOverride(true);

      const result = await mandatoryOptimizer.intercept('emergency test');

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toBe('emergency test');

      mandatoryOptimizer.setEmergencyOverride(false);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track optimization statistics', async () => {
      await mandatoryOptimizer.intercept('stat test 1');
      await mandatoryOptimizer.intercept('stat test 2');
      await mandatoryOptimizer.intercept('stat test 3');

      const stats = mandatoryOptimizer.getStats();

      expect(stats).toBeDefined();
      expect(stats.monitor).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.agent).toBeDefined();
    });

    it('should reset monitor correctly', async () => {
      await mandatoryOptimizer.intercept('reset test');

      mandatoryOptimizer.resetMonitor();

      const stats = mandatoryOptimizer.getStats();
      expect(stats.monitor).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should reload configuration', () => {
      const config = automationConfig.getConfig();
      expect(config).toBeDefined();

      mandatoryOptimizer.reloadConfig();

      const reloaded = automationConfig.getConfig();
      expect(reloaded).toBeDefined();
    });

    it('should respect enabled state', async () => {
      mandatoryOptimizer.setEnabled(false);

      const result = await mandatoryOptimizer.intercept('disabled test');

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toBe('disabled test');

      mandatoryOptimizer.setEnabled(true);
    });
  });

  describe('Context Awareness', () => {
    it('should use context in optimization', async () => {
      const context = {
        path: '/api/users',
        method: 'POST',
        headers: { 'content-type': 'application/json' }
      };

      const result = await mandatoryOptimizer.intercept('create user', context);

      expect(result.optimized).toBeDefined();
      expect(result.bypassed).toBe(false);
    });

    it('should work without context', async () => {
      const result = await mandatoryOptimizer.intercept('no context test');

      expect(result.optimized).toBeDefined();
      expect(result.bypassed).toBe(false);
    });
  });
});
