/**
 * Percentage Rollout Strategy
 * Gradually roll out features to a percentage of users
 */

import type { RolloutStrategy } from '../types';

export class PercentageStrategy {
  /**
   * Create a percentage-based rollout strategy
   * @param percentage - Percentage of users to enable (0-100)
   */
  static create(percentage: number): RolloutStrategy {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    return {
      type: 'percentage',
      config: {
        percentage,
      },
    };
  }

  /**
   * Check if a user should see the feature based on percentage
   * @param userId - User identifier
   * @param flagKey - Feature flag key
   * @param percentage - Target percentage
   */
  static shouldEnable(userId: string, flagKey: string, percentage: number): boolean {
    const hash = this.hashString(userId + flagKey);
    const userPercentage = (hash % 100) + 1;
    return userPercentage <= percentage;
  }

  /**
   * Create a gradual rollout plan
   * @param stages - Array of percentage stages
   */
  static createGradualRollout(stages: number[]): RolloutStrategy[] {
    return stages.map((percentage) => this.create(percentage));
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
