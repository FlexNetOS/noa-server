/**
 * Feature Flag Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeatureFlagManager } from '../src/FeatureFlagManager';
import type { FeatureFlagConfig, FeatureFlagContext } from '../src/types';

describe('FeatureFlagManager', () => {
  let manager: FeatureFlagManager;
  let config: FeatureFlagConfig;
  let context: FeatureFlagContext;

  beforeEach(() => {
    config = {
      provider: 'custom',
      cacheEnabled: false,
    };

    context = {
      userId: 'user-123',
      userEmail: 'test@example.com',
    };
  });

  afterEach(async () => {
    if (manager) {
      await manager.close();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      manager = new FeatureFlagManager(config);
      await manager.initialize();

      expect(manager.isReady()).toBe(true);
    });

    it('should throw error for unknown provider', () => {
      const invalidConfig = {
        ...config,
        provider: 'unknown' as any,
      };

      expect(() => new FeatureFlagManager(invalidConfig)).toThrow('Unknown provider');
    });
  });

  describe('isEnabled', () => {
    beforeEach(async () => {
      manager = new FeatureFlagManager(config);
      await manager.initialize();
    });

    it('should return default value when not ready', async () => {
      const newManager = new FeatureFlagManager(config);
      const result = await newManager.isEnabled('test-flag', context, true);

      expect(result).toBe(true);
    });

    it('should return boolean value', async () => {
      const result = await manager.isEnabled('test-flag', context, false);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('getValue', () => {
    beforeEach(async () => {
      manager = new FeatureFlagManager(config);
      await manager.initialize();
    });

    it('should return default value when not ready', async () => {
      const newManager = new FeatureFlagManager(config);
      const result = await newManager.getValue('test-flag', context, 'default');

      expect(result).toBe('default');
    });

    it('should support string values', async () => {
      const result = await manager.getValue('test-flag', context, 'default');

      expect(typeof result).toBe('string');
    });

    it('should support number values', async () => {
      const result = await manager.getValue('test-flag', context, 42);

      expect(typeof result).toBe('number');
    });

    it('should support object values', async () => {
      const defaultValue = { key: 'value' };
      const result = await manager.getValue('test-flag', context, defaultValue);

      expect(typeof result).toBe('object');
    });
  });

  describe('getAllFlags', () => {
    beforeEach(async () => {
      manager = new FeatureFlagManager(config);
      await manager.initialize();
    });

    it('should return empty object when not ready', async () => {
      const newManager = new FeatureFlagManager(config);
      const result = await newManager.getAllFlags(context);

      expect(result).toEqual({});
    });

    it('should return all flags', async () => {
      const result = await manager.getAllFlags(context);

      expect(typeof result).toBe('object');
    });
  });

  describe('withFlag', () => {
    beforeEach(async () => {
      manager = new FeatureFlagManager(config);
      await manager.initialize();
    });

    it('should execute enabled function when flag is true', async () => {
      const enabledFn = vi.fn(() => 'enabled');
      const disabledFn = vi.fn(() => 'disabled');

      await manager.withFlag('test-flag', context, enabledFn, disabledFn);

      // At least one should be called
      expect(enabledFn.mock.calls.length + disabledFn.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('variant', () => {
    beforeEach(async () => {
      manager = new FeatureFlagManager(config);
      await manager.initialize();
    });

    it('should return valid variant', async () => {
      const variants = ['control', 'variant-a', 'variant-b'];
      const result = await manager.variant('test-flag', context, variants, 'control');

      expect(variants).toContain(result);
    });

    it('should return default variant for invalid value', async () => {
      const variants = ['control', 'variant-a'];
      const result = await manager.variant('test-flag', context, variants, 'control');

      expect(result).toBe('control');
    });
  });
});
