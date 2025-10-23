/**
 * Feature Flag Types and Interfaces
 */

export interface FeatureFlagContext {
  userId?: string;
  userEmail?: string;
  userGroups?: string[];
  customAttributes?: Record<string, string | number | boolean>;
  ip?: string;
  country?: string;
  environment?: string;
}

export type FeatureFlagValue = boolean | string | number | object;

export interface FeatureFlagConfig {
  provider: 'launchdarkly' | 'custom';
  sdkKey?: string;
  apiUrl?: string;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  offlineMode?: boolean;
  redisUrl?: string;
}

export interface RolloutStrategy {
  type: 'percentage' | 'user' | 'group' | 'custom';
  config: Record<string, unknown>;
}

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  defaultValue: FeatureFlagValue;
  strategy?: RolloutStrategy;
  variations?: Array<{
    name: string;
    value: FeatureFlagValue;
    weight?: number;
  }>;
}

export interface FeatureFlagProvider {
  initialize(): Promise<void>;
  isReady(): boolean;
  getValue(
    flagKey: string,
    context: FeatureFlagContext,
    defaultValue: FeatureFlagValue
  ): Promise<FeatureFlagValue>;
  getAllFlags(context: FeatureFlagContext): Promise<Record<string, FeatureFlagValue>>;
  track(eventName: string, context: FeatureFlagContext, data?: unknown): Promise<void>;
  close(): Promise<void>;
}

export interface FeatureFlagCache {
  get(key: string): Promise<FeatureFlagValue | null>;
  set(key: string, value: FeatureFlagValue, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
