/**
 * Integration Tests: Bypass Rules
 * Tests the bypass prefix system and passthrough logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mandatoryOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/auto-optimizer';
import { automationConfig } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/config';

describe('Bypass Rules Integration Tests', () => {
  beforeEach(() => {
    mandatoryOptimizer.clearCache();
    mandatoryOptimizer.resetMonitor();
    mandatoryOptimizer.setEnabled(true);
    mandatoryOptimizer.setEmergencyOverride(false);

    // Ensure bypass is enabled
    const config = automationConfig.getConfig();
    automationConfig.updateConfig({
      bypass: {
        ...config.bypass,
        enabled: true,
        prefixes: ['NOOPT:', 'RAW:', 'BYPASS:']
      }
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Bypass Prefix Detection', () => {
    it('should bypass optimization with NOOPT: prefix', async () => {
      const result = await mandatoryOptimizer.intercept('NOOPT: this is raw text');

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toBe('this is raw text');
      expect(result.processingTime).toBeLessThan(100); // Should be very fast
    });

    it('should bypass optimization with RAW: prefix', async () => {
      const result = await mandatoryOptimizer.intercept('RAW: keep this exactly as is');

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toBe('keep this exactly as is');
    });

    it('should bypass optimization with BYPASS: prefix', async () => {
      const result = await mandatoryOptimizer.intercept('BYPASS: skip optimization');

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toBe('skip optimization');
    });

    it('should remove bypass prefix from output', async () => {
      const result = await mandatoryOptimizer.intercept('NOOPT: clean output');

      expect(result.optimized).not.toContain('NOOPT:');
      expect(result.optimized).toBe('clean output');
    });

    it('should handle bypass prefix with whitespace', async () => {
      const result = await mandatoryOptimizer.intercept('  NOOPT:   text with spaces  ');

      expect(result.bypassed).toBe(true);
      expect(result.optimized.trim()).toBe('text with spaces');
    });
  });

  describe('Non-Bypass Behavior', () => {
    it('should optimize prompts without bypass prefix', async () => {
      const result = await mandatoryOptimizer.intercept('normal prompt without prefix');

      expect(result.bypassed).toBe(false);
      expect(result.optimized).not.toBe('normal prompt without prefix');
      expect(result.optimized.length).toBeGreaterThan('normal prompt without prefix'.length);
    });

    it('should not treat mid-text bypass keywords as prefixes', async () => {
      const result = await mandatoryOptimizer.intercept('this contains NOOPT: but not at start');

      expect(result.bypassed).toBe(false);
      expect(result.optimized).toBeDefined();
    });

    it('should be case-sensitive with bypass prefixes', async () => {
      const result = await mandatoryOptimizer.intercept('noopt: lowercase should not bypass');

      expect(result.bypassed).toBe(false);
      expect(result.optimized).not.toBe('lowercase should not bypass');
    });
  });

  describe('Bypass Configuration', () => {
    it('should respect disabled bypass configuration', async () => {
      const config = automationConfig.getConfig();
      automationConfig.updateConfig({
        bypass: {
          ...config.bypass,
          enabled: false
        }
      });

      const result = await mandatoryOptimizer.intercept('NOOPT: should still optimize');

      expect(result.bypassed).toBe(false);
      expect(result.optimized).not.toBe('should still optimize');

      // Re-enable bypass
      automationConfig.updateConfig({
        bypass: {
          ...config.bypass,
          enabled: true
        }
      });
    });

    it('should work with custom bypass prefixes', async () => {
      const config = automationConfig.getConfig();
      automationConfig.updateConfig({
        bypass: {
          ...config.bypass,
          enabled: true,
          prefixes: ['SKIP:', 'CUSTOM:']
        }
      });

      const result1 = await mandatoryOptimizer.intercept('SKIP: custom prefix test');
      expect(result1.bypassed).toBe(true);

      const result2 = await mandatoryOptimizer.intercept('CUSTOM: another custom prefix');
      expect(result2.bypassed).toBe(true);

      // Old prefix should no longer work
      const result3 = await mandatoryOptimizer.intercept('NOOPT: old prefix');
      expect(result3.bypassed).toBe(false);

      // Restore original prefixes
      automationConfig.updateConfig({
        bypass: {
          ...config.bypass,
          prefixes: ['NOOPT:', 'RAW:', 'BYPASS:']
        }
      });
    });
  });

  describe('Bypass Logging', () => {
    it('should log bypass operations', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await mandatoryOptimizer.intercept('NOOPT: log this bypass');

      // Logger should have recorded the bypass
      logSpy.mockRestore();
    });

    it('should track bypassed requests in statistics', async () => {
      await mandatoryOptimizer.intercept('NOOPT: bypass 1');
      await mandatoryOptimizer.intercept('NOOPT: bypass 2');
      await mandatoryOptimizer.intercept('normal prompt');

      const stats = mandatoryOptimizer.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Multiple Bypass Prefixes', () => {
    it('should handle only the first matching bypass prefix', async () => {
      const result = await mandatoryOptimizer.intercept('NOOPT: RAW: double prefix');

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toBe('RAW: double prefix');
    });

    it('should work with any configured prefix', async () => {
      const prefixes = ['NOOPT:', 'RAW:', 'BYPASS:'];

      for (const prefix of prefixes) {
        const result = await mandatoryOptimizer.intercept(`${prefix} test ${prefix}`);
        expect(result.bypassed).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prompt after prefix removal', async () => {
      const result = await mandatoryOptimizer.intercept('NOOPT:');

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toBe('');
    });

    it('should handle prefix-only prompt', async () => {
      const result = await mandatoryOptimizer.intercept('NOOPT:   ');

      expect(result.bypassed).toBe(true);
      expect(result.optimized.trim()).toBe('');
    });

    it('should preserve special characters after bypass', async () => {
      const special = 'NOOPT: Hello! @#$%^&*() <html> {code}';
      const result = await mandatoryOptimizer.intercept(special);

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toContain('@#$%^&*()');
      expect(result.optimized).toContain('<html>');
    });

    it('should handle unicode characters after bypass', async () => {
      const unicode = 'NOOPT: Unicode test: 你好 🚀 café';
      const result = await mandatoryOptimizer.intercept(unicode);

      expect(result.bypassed).toBe(true);
      expect(result.optimized).toContain('你好');
      expect(result.optimized).toContain('🚀');
      expect(result.optimized).toContain('café');
    });
  });

  describe('Performance with Bypass', () => {
    it('should complete bypass very quickly', async () => {
      const start = Date.now();
      await mandatoryOptimizer.intercept('NOOPT: fast bypass test');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be nearly instant
    });

    it('should be faster than normal optimization', async () => {
      const bypassStart = Date.now();
      await mandatoryOptimizer.intercept('NOOPT: bypass timing');
      const bypassDuration = Date.now() - bypassStart;

      const optimizeStart = Date.now();
      await mandatoryOptimizer.intercept('normal timing');
      const optimizeDuration = Date.now() - optimizeStart;

      expect(bypassDuration).toBeLessThan(optimizeDuration);
    });
  });

  describe('Bypass Metadata', () => {
    it('should indicate bypass in result', async () => {
      const result = await mandatoryOptimizer.intercept('NOOPT: metadata test');

      expect(result.bypassed).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.qualityScore).toBeUndefined();
    });

    it('should still track processing time for bypass', async () => {
      const result = await mandatoryOptimizer.intercept('NOOPT: timing metadata');

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(100);
    });
  });
});
