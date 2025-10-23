/**
 * Rollout Strategies Tests
 */

import { describe, it, expect } from 'vitest';
import { PercentageStrategy } from '../src/strategies/PercentageStrategy';
import { UserStrategy } from '../src/strategies/UserStrategy';

describe('PercentageStrategy', () => {
  describe('create', () => {
    it('should create percentage strategy', () => {
      const strategy = PercentageStrategy.create(50);

      expect(strategy.type).toBe('percentage');
      expect(strategy.config.percentage).toBe(50);
    });

    it('should throw error for invalid percentage', () => {
      expect(() => PercentageStrategy.create(-1)).toThrow();
      expect(() => PercentageStrategy.create(101)).toThrow();
    });
  });

  describe('shouldEnable', () => {
    it('should consistently enable for same user', () => {
      const userId = 'user-123';
      const flagKey = 'test-flag';
      const percentage = 50;

      const result1 = PercentageStrategy.shouldEnable(userId, flagKey, percentage);
      const result2 = PercentageStrategy.shouldEnable(userId, flagKey, percentage);

      expect(result1).toBe(result2);
    });

    it('should enable approximately correct percentage', () => {
      const flagKey = 'test-flag';
      const percentage = 50;
      const iterations = 1000;

      let enabled = 0;
      for (let i = 0; i < iterations; i++) {
        if (PercentageStrategy.shouldEnable(`user-${i}`, flagKey, percentage)) {
          enabled++;
        }
      }

      const actualPercentage = (enabled / iterations) * 100;
      // Allow 10% margin of error
      expect(actualPercentage).toBeGreaterThan(40);
      expect(actualPercentage).toBeLessThan(60);
    });
  });

  describe('createGradualRollout', () => {
    it('should create gradual rollout stages', () => {
      const stages = [10, 25, 50, 75, 100];
      const strategies = PercentageStrategy.createGradualRollout(stages);

      expect(strategies).toHaveLength(5);
      expect(strategies[0].config.percentage).toBe(10);
      expect(strategies[4].config.percentage).toBe(100);
    });
  });
});

describe('UserStrategy', () => {
  describe('createForUsers', () => {
    it('should create user-based strategy', () => {
      const users = ['user-1', 'user-2'];
      const strategy = UserStrategy.createForUsers(users);

      expect(strategy.type).toBe('user');
      expect(strategy.config.users).toEqual(users);
    });
  });

  describe('createForGroups', () => {
    it('should create group-based strategy', () => {
      const groups = ['beta-testers', 'early-adopters'];
      const strategy = UserStrategy.createForGroups(groups);

      expect(strategy.type).toBe('group');
      expect(strategy.config.groups).toEqual(groups);
    });
  });

  describe('shouldEnableForUser', () => {
    it('should enable for targeted users', () => {
      const targetUsers = ['user-1', 'user-2'];

      expect(UserStrategy.shouldEnableForUser('user-1', targetUsers)).toBe(true);
      expect(UserStrategy.shouldEnableForUser('user-3', targetUsers)).toBe(false);
    });
  });

  describe('shouldEnableForGroups', () => {
    it('should enable when user has matching group', () => {
      const userGroups = ['developers', 'beta-testers'];
      const targetGroups = ['beta-testers', 'internal'];

      expect(UserStrategy.shouldEnableForGroups(userGroups, targetGroups)).toBe(true);
    });

    it('should not enable when user has no matching group', () => {
      const userGroups = ['developers'];
      const targetGroups = ['beta-testers', 'internal'];

      expect(UserStrategy.shouldEnableForGroups(userGroups, targetGroups)).toBe(false);
    });
  });

  describe('createForBetaTesters', () => {
    it('should create beta tester strategy', () => {
      const strategy = UserStrategy.createForBetaTesters();

      expect(strategy.type).toBe('group');
      expect(strategy.config.groups).toContain('beta-testers');
    });
  });

  describe('createForInternalTeam', () => {
    it('should create internal team strategy', () => {
      const strategy = UserStrategy.createForInternalTeam();

      expect(strategy.type).toBe('group');
      expect(strategy.config.groups).toContain('internal');
    });
  });
});
