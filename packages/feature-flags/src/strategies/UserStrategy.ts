/**
 * User-based Rollout Strategy
 * Target specific users or user groups
 */

import type { RolloutStrategy } from '../types';

export class UserStrategy {
  /**
   * Create a user-based rollout strategy
   * @param users - Array of user IDs to target
   */
  static createForUsers(users: string[]): RolloutStrategy {
    return {
      type: 'user',
      config: {
        users,
      },
    };
  }

  /**
   * Create a group-based rollout strategy
   * @param groups - Array of group names to target
   */
  static createForGroups(groups: string[]): RolloutStrategy {
    return {
      type: 'group',
      config: {
        groups,
      },
    };
  }

  /**
   * Check if a user should see the feature
   * @param userId - User identifier
   * @param targetUsers - List of target users
   */
  static shouldEnableForUser(userId: string, targetUsers: string[]): boolean {
    return targetUsers.includes(userId);
  }

  /**
   * Check if a user's groups match target groups
   * @param userGroups - User's group memberships
   * @param targetGroups - Target groups
   */
  static shouldEnableForGroups(userGroups: string[], targetGroups: string[]): boolean {
    return userGroups.some((group) => targetGroups.includes(group));
  }

  /**
   * Create a strategy for beta testers
   */
  static createForBetaTesters(): RolloutStrategy {
    return this.createForGroups(['beta-testers', 'early-adopters']);
  }

  /**
   * Create a strategy for internal team
   */
  static createForInternalTeam(): RolloutStrategy {
    return this.createForGroups(['internal', 'team-members', 'employees']);
  }
}
