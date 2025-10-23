/**
 * Feature Flag Manager
 * Central management for feature flags with provider abstraction
 */

import type {
  FeatureFlagProvider,
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagValue,
} from './types';
import { LaunchDarklyProvider } from './providers/LaunchDarklyProvider';
import { CustomProvider } from './providers/CustomProvider';

export class FeatureFlagManager {
  private provider: FeatureFlagProvider;
  private ready = false;

  constructor(private config: FeatureFlagConfig) {
    this.provider = this.createProvider();
  }

  private createProvider(): FeatureFlagProvider {
    switch (this.config.provider) {
      case 'launchdarkly':
        if (!this.config.sdkKey) {
          throw new Error('LaunchDarkly SDK key required');
        }
        return new LaunchDarklyProvider(this.config);

      case 'custom':
        return new CustomProvider(this.config);

      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  async initialize(): Promise<void> {
    await this.provider.initialize();
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready && this.provider.isReady();
  }

  async isEnabled(
    flagKey: string,
    context: FeatureFlagContext,
    defaultValue = false
  ): Promise<boolean> {
    if (!this.ready) {
      return defaultValue;
    }

    const value = await this.provider.getValue(flagKey, context, defaultValue);
    return Boolean(value);
  }

  async getValue<T extends FeatureFlagValue>(
    flagKey: string,
    context: FeatureFlagContext,
    defaultValue: T
  ): Promise<T> {
    if (!this.ready) {
      return defaultValue;
    }

    const value = await this.provider.getValue(flagKey, context, defaultValue);
    return value as T;
  }

  async getAllFlags(context: FeatureFlagContext): Promise<Record<string, FeatureFlagValue>> {
    if (!this.ready) {
      return {};
    }

    return this.provider.getAllFlags(context);
  }

  async track(eventName: string, context: FeatureFlagContext, data?: unknown): Promise<void> {
    if (!this.ready) {
      return;
    }

    await this.provider.track(eventName, context, data);
  }

  async close(): Promise<void> {
    await this.provider.close();
    this.ready = false;
  }

  // Helper methods for common patterns
  async withFlag<T>(
    flagKey: string,
    context: FeatureFlagContext,
    enabledFn: () => T | Promise<T>,
    disabledFn: () => T | Promise<T>
  ): Promise<T> {
    const enabled = await this.isEnabled(flagKey, context);
    return enabled ? enabledFn() : disabledFn();
  }

  async percentage(
    flagKey: string,
    context: FeatureFlagContext,
    percentage: number
  ): Promise<boolean> {
    const value = await this.getValue(flagKey, context, 0);
    return typeof value === 'number' && value <= percentage;
  }

  async variant<T extends string>(
    flagKey: string,
    context: FeatureFlagContext,
    variants: T[],
    defaultVariant: T
  ): Promise<T> {
    const value = await this.getValue(flagKey, context, defaultVariant);
    return variants.includes(value as T) ? (value as T) : defaultVariant;
  }
}
