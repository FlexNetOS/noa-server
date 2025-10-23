/**
 * LaunchDarkly Feature Flag Provider
 * Integration with LaunchDarkly service
 */

import * as LaunchDarkly from 'launchdarkly-node-server-sdk';
import type {
  FeatureFlagProvider,
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagValue,
} from '../types';

export class LaunchDarklyProvider implements FeatureFlagProvider {
  private client: LaunchDarkly.LDClient | null = null;
  private ready = false;

  constructor(private config: FeatureFlagConfig) {}

  async initialize(): Promise<void> {
    if (!this.config.sdkKey) {
      throw new Error('LaunchDarkly SDK key is required');
    }

    const options: LaunchDarkly.LDOptions = {
      offline: this.config.offlineMode ?? false,
    };

    this.client = LaunchDarkly.init(this.config.sdkKey, options);

    await this.client.waitForInitialization();
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready && this.client !== null;
  }

  async getValue(
    flagKey: string,
    context: FeatureFlagContext,
    defaultValue: FeatureFlagValue
  ): Promise<FeatureFlagValue> {
    if (!this.client || !this.ready) {
      return defaultValue;
    }

    const ldContext = this.convertContext(context);

    try {
      // LaunchDarkly supports different value types
      if (typeof defaultValue === 'boolean') {
        return await this.client.variation(flagKey, ldContext, defaultValue);
      } else if (typeof defaultValue === 'string') {
        return await this.client.variation(flagKey, ldContext, defaultValue);
      } else if (typeof defaultValue === 'number') {
        return await this.client.variation(flagKey, ldContext, defaultValue);
      } else {
        return await this.client.variation(flagKey, ldContext, defaultValue);
      }
    } catch (error) {
      console.error(`Error getting flag ${flagKey}:`, error);
      return defaultValue;
    }
  }

  async getAllFlags(context: FeatureFlagContext): Promise<Record<string, FeatureFlagValue>> {
    if (!this.client || !this.ready) {
      return {};
    }

    const ldContext = this.convertContext(context);

    try {
      const allFlags = await this.client.allFlagsState(ldContext);
      return allFlags.allValues();
    } catch (error) {
      console.error('Error getting all flags:', error);
      return {};
    }
  }

  async track(eventName: string, context: FeatureFlagContext, data?: unknown): Promise<void> {
    if (!this.client || !this.ready) {
      return;
    }

    const ldContext = this.convertContext(context);

    try {
      this.client.track(eventName, ldContext, data);
      await this.client.flush();
    } catch (error) {
      console.error(`Error tracking event ${eventName}:`, error);
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.ready = false;
    }
  }

  private convertContext(context: FeatureFlagContext): LaunchDarkly.LDContext {
    const ldContext: LaunchDarkly.LDContext = {
      kind: 'user',
      key: context.userId || 'anonymous',
    };

    if (context.userEmail) {
      ldContext.email = context.userEmail;
    }

    if (context.ip) {
      ldContext.ip = context.ip;
    }

    if (context.country) {
      ldContext.country = context.country;
    }

    if (context.customAttributes) {
      ldContext.custom = context.customAttributes;
    }

    return ldContext;
  }
}
