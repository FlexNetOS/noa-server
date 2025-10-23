/**
 * Custom Feature Flag Provider
 * Self-hosted feature flag implementation with Redis caching
 */

import Redis from 'ioredis';
import type {
  FeatureFlagProvider,
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagValue,
  FeatureFlagDefinition,
} from '../types';

export class CustomProvider implements FeatureFlagProvider {
  private redis: Redis | null = null;
  private flags: Map<string, FeatureFlagDefinition> = new Map();
  private ready = false;

  constructor(private config: FeatureFlagConfig) {}

  async initialize(): Promise<void> {
    // Initialize Redis if caching is enabled
    if (this.config.cacheEnabled && this.config.redisUrl) {
      this.redis = new Redis(this.config.redisUrl);
      await this.loadFlagsFromRedis();
    }

    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  async getValue(
    flagKey: string,
    context: FeatureFlagContext,
    defaultValue: FeatureFlagValue
  ): Promise<FeatureFlagValue> {
    if (!this.ready) {
      return defaultValue;
    }

    // Try cache first
    if (this.redis) {
      const cachedValue = await this.getCachedValue(flagKey, context);
      if (cachedValue !== null) {
        return cachedValue;
      }
    }

    // Get flag definition
    const flag = this.flags.get(flagKey);
    if (!flag || !flag.enabled) {
      return defaultValue;
    }

    // Evaluate flag based on strategy
    const value = await this.evaluateFlag(flag, context);

    // Cache the result
    if (this.redis) {
      await this.cacheValue(flagKey, context, value);
    }

    return value;
  }

  async getAllFlags(context: FeatureFlagContext): Promise<Record<string, FeatureFlagValue>> {
    if (!this.ready) {
      return {};
    }

    const results: Record<string, FeatureFlagValue> = {};

    for (const [key, flag] of this.flags) {
      if (flag.enabled) {
        results[key] = await this.evaluateFlag(flag, context);
      }
    }

    return results;
  }

  async track(eventName: string, context: FeatureFlagContext, data?: unknown): Promise<void> {
    // Store tracking data in Redis
    if (this.redis) {
      const event = {
        name: eventName,
        context,
        data,
        timestamp: Date.now(),
      };

      await this.redis.zadd('feature-flag-events', Date.now(), JSON.stringify(event));
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.ready = false;
  }

  // Flag management methods
  async setFlag(flag: FeatureFlagDefinition): Promise<void> {
    this.flags.set(flag.key, flag);

    if (this.redis) {
      await this.redis.set(
        `flag:${flag.key}`,
        JSON.stringify(flag),
        'EX',
        this.config.cacheTtl || 300
      );
    }
  }

  async deleteFlag(flagKey: string): Promise<void> {
    this.flags.delete(flagKey);

    if (this.redis) {
      await this.redis.del(`flag:${flagKey}`);
    }
  }

  private async loadFlagsFromRedis(): Promise<void> {
    if (!this.redis) return;

    const keys = await this.redis.keys('flag:*');

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const flag: FeatureFlagDefinition = JSON.parse(data);
          this.flags.set(flag.key, flag);
        } catch (error) {
          console.error(`Error parsing flag ${key}:`, error);
        }
      }
    }
  }

  private async getCachedValue(
    flagKey: string,
    context: FeatureFlagContext
  ): Promise<FeatureFlagValue | null> {
    if (!this.redis) return null;

    const cacheKey = this.getCacheKey(flagKey, context);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return cached;
      }
    }

    return null;
  }

  private async cacheValue(
    flagKey: string,
    context: FeatureFlagContext,
    value: FeatureFlagValue
  ): Promise<void> {
    if (!this.redis) return;

    const cacheKey = this.getCacheKey(flagKey, context);
    const ttl = this.config.cacheTtl || 300;

    await this.redis.set(
      cacheKey,
      typeof value === 'object' ? JSON.stringify(value) : String(value),
      'EX',
      ttl
    );
  }

  private getCacheKey(flagKey: string, context: FeatureFlagContext): string {
    const userId = context.userId || 'anonymous';
    return `flag-cache:${flagKey}:${userId}`;
  }

  private async evaluateFlag(
    flag: FeatureFlagDefinition,
    context: FeatureFlagContext
  ): Promise<FeatureFlagValue> {
    if (!flag.strategy) {
      return flag.defaultValue;
    }

    switch (flag.strategy.type) {
      case 'percentage':
        return this.evaluatePercentage(flag, context);

      case 'user':
        return this.evaluateUser(flag, context);

      case 'group':
        return this.evaluateGroup(flag, context);

      default:
        return flag.defaultValue;
    }
  }

  private evaluatePercentage(
    flag: FeatureFlagDefinition,
    context: FeatureFlagContext
  ): FeatureFlagValue {
    const percentage = (flag.strategy?.config.percentage as number) || 0;
    const userId = context.userId || 'anonymous';

    // Simple hash-based percentage
    const hash = this.hashString(userId + flag.key);
    const userPercentage = (hash % 100) + 1;

    return userPercentage <= percentage ? flag.defaultValue : false;
  }

  private evaluateUser(
    flag: FeatureFlagDefinition,
    context: FeatureFlagContext
  ): FeatureFlagValue {
    const targetUsers = (flag.strategy?.config.users as string[]) || [];
    const userId = context.userId || '';

    return targetUsers.includes(userId) ? flag.defaultValue : false;
  }

  private evaluateGroup(
    flag: FeatureFlagDefinition,
    context: FeatureFlagContext
  ): FeatureFlagValue {
    const targetGroups = (flag.strategy?.config.groups as string[]) || [];
    const userGroups = context.userGroups || [];

    const hasMatch = userGroups.some((group) => targetGroups.includes(group));
    return hasMatch ? flag.defaultValue : false;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
