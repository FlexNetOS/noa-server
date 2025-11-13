/**
 * Quota Manager
 *
 * Manages user quotas with Redis/SQLite persistence and scheduled resets
 */

import { EventEmitter } from 'events';
import { UserTier } from './ai-rate-limiter';
import { ProviderType } from '../types';

/**
 * Quota storage interface
 */
export interface QuotaStorage {
  get(userId: string): Promise<QuotaData | null>;
  set(userId: string, quota: QuotaData): Promise<void>;
  delete(userId: string): Promise<void>;
  getAll(): Promise<Map<string, QuotaData>>;
  close(): Promise<void>;
}

/**
 * Quota data structure
 */
export interface QuotaData {
  userId: string;
  tier: UserTier;
  daily: QuotaMetrics;
  monthly: QuotaMetrics;
  createdAt: number;
  updatedAt: number;
}

/**
 * Quota metrics
 */
export interface QuotaMetrics {
  requests: number;
  cost: number;
  resetAt: number;
  limit: number;
  costLimit: number;
}

/**
 * Usage analytics
 */
export interface UsageAnalytics {
  userId: string;
  period: 'daily' | 'monthly';
  totalRequests: number;
  totalCost: number;
  providerBreakdown: Map<ProviderType, ProviderUsage>;
  modelBreakdown: Map<string, ModelUsage>;
  timeSeriesData: TimeSeriesPoint[];
}

interface ProviderUsage {
  requests: number;
  cost: number;
  percentage: number;
}

interface ModelUsage {
  requests: number;
  cost: number;
  percentage: number;
}

interface TimeSeriesPoint {
  timestamp: number;
  requests: number;
  cost: number;
}

/**
 * Quota alert configuration
 */
export interface QuotaAlertConfig {
  enabled: boolean;
  thresholds: number[]; // e.g., [0.5, 0.8, 0.9, 0.95]
  notificationMethod?: (userId: string, alert: QuotaAlert) => Promise<void>;
}

/**
 * Quota alert
 */
export interface QuotaAlert {
  userId: string;
  type: 'daily_requests' | 'monthly_requests' | 'daily_cost' | 'monthly_cost';
  threshold: number;
  current: number;
  limit: number;
  percentage: number;
  timestamp: number;
}

/**
 * Quota manager events
 */
export interface QuotaManagerEvents {
  'quota_alert': (alert: QuotaAlert) => void;
  'quota_reset': (userId: string, period: 'daily' | 'monthly') => void;
  'quota_exceeded': (userId: string, type: string) => void;
  'quota_updated': (userId: string, quota: QuotaData) => void;
}

export declare interface QuotaManager {
  on<U extends keyof QuotaManagerEvents>(
    event: U,
    listener: QuotaManagerEvents[U]
  ): this;

  emit<U extends keyof QuotaManagerEvents>(
    event: U,
    ...args: Parameters<QuotaManagerEvents[U]>
  ): boolean;
}

/**
 * Quota Manager
 */
export class QuotaManager extends EventEmitter {
  private storage: QuotaStorage;
  private tierLimits: Map<UserTier, TierLimits>;
  private alertConfig: QuotaAlertConfig;
  private alertedUsers: Map<string, Set<number>> = new Map();
  private usageHistory: Map<string, TimeSeriesPoint[]> = new Map();
  private resetScheduler?: NodeJS.Timeout;

  constructor(
    storage: QuotaStorage,
    tierLimits: Map<UserTier, TierLimits>,
    alertConfig: QuotaAlertConfig = { enabled: true, thresholds: [0.8, 0.9, 0.95] }
  ) {
    super();
    this.storage = storage;
    this.tierLimits = tierLimits;
    this.alertConfig = alertConfig;

    // Start reset scheduler
    this.startResetScheduler();
  }

  /**
   * Get or create user quota
   */
  async getQuota(userId: string, tier: UserTier): Promise<QuotaData> {
    let quota = await this.storage.get(userId);

    if (!quota) {
      quota = this.createQuota(userId, tier);
      await this.storage.set(userId, quota);
    }

    // Check if reset is needed
    quota = this.checkAndResetQuota(quota);

    return quota;
  }

  /**
   * Create new quota for user
   */
  private createQuota(userId: string, tier: UserTier): QuotaData {
    const limits = this.tierLimits.get(tier);
    const now = Date.now();

    return {
      userId,
      tier,
      daily: {
        requests: 0,
        cost: 0,
        resetAt: this.getNextDayTimestamp(),
        limit: limits?.dailyQuota || 0,
        costLimit: limits?.dailyCostLimit || 0
      },
      monthly: {
        requests: 0,
        cost: 0,
        resetAt: this.getNextMonthTimestamp(),
        limit: limits?.monthlyQuota || 0,
        costLimit: limits?.monthlyCostLimit || 0
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Track usage
   */
  async trackUsage(
    userId: string,
    tier: UserTier,
    provider: ProviderType,
    modelId: string,
    cost: number = 0
  ): Promise<void> {
    const quota = await this.getQuota(userId, tier);

    // Update quota
    quota.daily.requests++;
    quota.daily.cost += cost;
    quota.monthly.requests++;
    quota.monthly.cost += cost;
    quota.updatedAt = Date.now();

    // Save to storage
    await this.storage.set(userId, quota);

    // Track time series data
    this.trackTimeSeriesData(userId, cost);

    // Check for alerts
    await this.checkQuotaAlerts(quota);

    this.emit('quota_updated', userId, quota);
  }

  /**
   * Check if quota is exceeded
   */
  async isQuotaExceeded(userId: string, tier: UserTier): Promise<{
    exceeded: boolean;
    type?: string;
    limit?: number;
    current?: number;
  }> {
    const quota = await this.getQuota(userId, tier);

    // Check daily requests
    if (quota.daily.limit > 0 && quota.daily.requests >= quota.daily.limit) {
      this.emit('quota_exceeded', userId, 'daily_requests');
      return {
        exceeded: true,
        type: 'daily_requests',
        limit: quota.daily.limit,
        current: quota.daily.requests
      };
    }

    // Check monthly requests
    if (quota.monthly.limit > 0 && quota.monthly.requests >= quota.monthly.limit) {
      this.emit('quota_exceeded', userId, 'monthly_requests');
      return {
        exceeded: true,
        type: 'monthly_requests',
        limit: quota.monthly.limit,
        current: quota.monthly.requests
      };
    }

    // Check daily cost
    if (quota.daily.costLimit > 0 && quota.daily.cost >= quota.daily.costLimit) {
      this.emit('quota_exceeded', userId, 'daily_cost');
      return {
        exceeded: true,
        type: 'daily_cost',
        limit: quota.daily.costLimit,
        current: quota.daily.cost
      };
    }

    // Check monthly cost
    if (quota.monthly.costLimit > 0 && quota.monthly.cost >= quota.monthly.costLimit) {
      this.emit('quota_exceeded', userId, 'monthly_cost');
      return {
        exceeded: true,
        type: 'monthly_cost',
        limit: quota.monthly.costLimit,
        current: quota.monthly.cost
      };
    }

    return { exceeded: false };
  }

  /**
   * Get usage analytics
   */
  async getAnalytics(userId: string, period: 'daily' | 'monthly'): Promise<UsageAnalytics> {
    const quota = await this.storage.get(userId);
    if (!quota) {
      throw new Error(`No quota found for user: ${userId}`);
    }

    const metrics = period === 'daily' ? quota.daily : quota.monthly;
    const timeSeries = this.usageHistory.get(userId) || [];

    return {
      userId,
      period,
      totalRequests: metrics.requests,
      totalCost: metrics.cost,
      providerBreakdown: new Map(), // TODO: Track provider usage
      modelBreakdown: new Map(), // TODO: Track model usage
      timeSeriesData: timeSeries
    };
  }

  /**
   * Reset user quota (admin function)
   */
  async resetQuota(userId: string, period?: 'daily' | 'monthly'): Promise<void> {
    const quota = await this.storage.get(userId);
    if (!quota) return;

    const now = Date.now();

    if (!period || period === 'daily') {
      quota.daily.requests = 0;
      quota.daily.cost = 0;
      quota.daily.resetAt = this.getNextDayTimestamp();
      this.emit('quota_reset', userId, 'daily');
    }

    if (!period || period === 'monthly') {
      quota.monthly.requests = 0;
      quota.monthly.cost = 0;
      quota.monthly.resetAt = this.getNextMonthTimestamp();
      this.emit('quota_reset', userId, 'monthly');
    }

    quota.updatedAt = now;
    await this.storage.set(userId, quota);

    // Clear alerts
    this.alertedUsers.delete(userId);
  }

  /**
   * Override quota limits (admin function)
   */
  async overrideQuota(userId: string, limits: Partial<{
    dailyLimit: number;
    monthlyLimit: number;
    dailyCostLimit: number;
    monthlyCostLimit: number;
  }>): Promise<void> {
    const quota = await this.storage.get(userId);
    if (!quota) {
      throw new Error(`No quota found for user: ${userId}`);
    }

    if (limits.dailyLimit !== undefined) {
      quota.daily.limit = limits.dailyLimit;
    }
    if (limits.monthlyLimit !== undefined) {
      quota.monthly.limit = limits.monthlyLimit;
    }
    if (limits.dailyCostLimit !== undefined) {
      quota.daily.costLimit = limits.dailyCostLimit;
    }
    if (limits.monthlyCostLimit !== undefined) {
      quota.monthly.costLimit = limits.monthlyCostLimit;
    }

    quota.updatedAt = Date.now();
    await this.storage.set(userId, quota);
  }

  /**
   * Check and reset quota if needed
   */
  private checkAndResetQuota(quota: QuotaData): QuotaData {
    const now = Date.now();
    let updated = false;

    if (now >= quota.daily.resetAt) {
      quota.daily.requests = 0;
      quota.daily.cost = 0;
      quota.daily.resetAt = this.getNextDayTimestamp();
      this.emit('quota_reset', quota.userId, 'daily');
      this.alertedUsers.delete(quota.userId);
      updated = true;
    }

    if (now >= quota.monthly.resetAt) {
      quota.monthly.requests = 0;
      quota.monthly.cost = 0;
      quota.monthly.resetAt = this.getNextMonthTimestamp();
      this.emit('quota_reset', quota.userId, 'monthly');
      this.alertedUsers.delete(quota.userId);
      updated = true;
    }

    if (updated) {
      quota.updatedAt = now;
      this.storage.set(quota.userId, quota).catch(console.error);
    }

    return quota;
  }

  /**
   * Check quota alerts
   */
  private async checkQuotaAlerts(quota: QuotaData): Promise<void> {
    if (!this.alertConfig.enabled) return;

    const alerts: QuotaAlert[] = [];
    const alertedThresholds = this.alertedUsers.get(quota.userId) || new Set();

    // Check daily requests
    if (quota.daily.limit > 0) {
      const percentage = quota.daily.requests / quota.daily.limit;
      for (const threshold of this.alertConfig.thresholds) {
        if (percentage >= threshold && !alertedThresholds.has(threshold * 100)) {
          alerts.push({
            userId: quota.userId,
            type: 'daily_requests',
            threshold,
            current: quota.daily.requests,
            limit: quota.daily.limit,
            percentage,
            timestamp: Date.now()
          });
          alertedThresholds.add(threshold * 100);
        }
      }
    }

    // Check daily cost
    if (quota.daily.costLimit > 0) {
      const percentage = quota.daily.cost / quota.daily.costLimit;
      for (const threshold of this.alertConfig.thresholds) {
        if (percentage >= threshold && !alertedThresholds.has(threshold * 100 + 0.1)) {
          alerts.push({
            userId: quota.userId,
            type: 'daily_cost',
            threshold,
            current: quota.daily.cost,
            limit: quota.daily.costLimit,
            percentage,
            timestamp: Date.now()
          });
          alertedThresholds.add(threshold * 100 + 0.1);
        }
      }
    }

    this.alertedUsers.set(quota.userId, alertedThresholds);

    // Emit alerts
    for (const alert of alerts) {
      this.emit('quota_alert', alert);
      if (this.alertConfig.notificationMethod) {
        await this.alertConfig.notificationMethod(quota.userId, alert);
      }
    }
  }

  /**
   * Track time series data
   */
  private trackTimeSeriesData(userId: string, cost: number): void {
    if (!this.usageHistory.has(userId)) {
      this.usageHistory.set(userId, []);
    }

    const history = this.usageHistory.get(userId)!;
    const now = Date.now();

    // Add data point
    history.push({
      timestamp: now,
      requests: 1,
      cost
    });

    // Keep only last 24 hours
    const oneDayAgo = now - 86400000;
    const filtered = history.filter(p => p.timestamp >= oneDayAgo);
    this.usageHistory.set(userId, filtered);
  }

  /**
   * Start reset scheduler
   */
  private startResetScheduler(): void {
    // Check every hour for quotas to reset
    this.resetScheduler = setInterval(async () => {
      await this.checkAllQuotasForReset();
    }, 3600000); // 1 hour
  }

  /**
   * Check all quotas for reset
   */
  private async checkAllQuotasForReset(): Promise<void> {
    try {
      const allQuotas = await this.storage.getAll();
      for (const [userId, quota] of allQuotas) {
        this.checkAndResetQuota(quota);
      }
    } catch (error) {
      console.error('Error checking quotas for reset:', error);
    }
  }

  /**
   * Get next day timestamp
   */
  private getNextDayTimestamp(): number {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Get next month timestamp
   */
  private getNextMonthTimestamp(): number {
    const nextMonth = new Date();
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
    nextMonth.setUTCHours(0, 0, 0, 0);
    return nextMonth.getTime();
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    if (this.resetScheduler) {
      clearInterval(this.resetScheduler);
    }
    await this.storage.close();
    this.removeAllListeners();
  }
}

/**
 * Tier limits
 */
interface TierLimits {
  dailyQuota: number;
  monthlyQuota: number;
  dailyCostLimit: number;
  monthlyCostLimit: number;
}

/**
 * In-memory quota storage (for testing/development)
 */
export class InMemoryQuotaStorage implements QuotaStorage {
  private store: Map<string, QuotaData> = new Map();

  async get(userId: string): Promise<QuotaData | null> {
    return this.store.get(userId) || null;
  }

  async set(userId: string, quota: QuotaData): Promise<void> {
    this.store.set(userId, quota);
  }

  async delete(userId: string): Promise<void> {
    this.store.delete(userId);
  }

  async getAll(): Promise<Map<string, QuotaData>> {
    return new Map(this.store);
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}
