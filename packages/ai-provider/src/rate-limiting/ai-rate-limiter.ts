/**
 * AI Rate Limiter - Token Bucket Implementation
 *
 * Provides multi-tier rate limiting for AI providers with:
 * - Token bucket algorithm for smooth rate limiting
 * - Per-provider, per-model, per-user, and global limits
 * - Request queuing with priority
 * - Quota tracking and enforcement
 * - Performance optimized (<1ms overhead)
 */

import { EventEmitter } from 'events';
import { ProviderType } from '../types';

/**
 * Token Bucket for rate limiting
 * Implements smooth rate limiting with burst support
 */
export class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
    private burstCapacity: number = capacity
  ) {
    this.tokens = capacity;
    this.lastRefillTime = Date.now();
  }

  /**
   * Attempt to consume tokens from the bucket
   * @param tokens Number of tokens to consume
   * @returns true if tokens were consumed, false otherwise
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.burstCapacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get time until bucket has specified tokens available
   * @param requiredTokens Number of tokens needed
   * @returns milliseconds until tokens available
   */
  getTimeUntilAvailable(requiredTokens: number = 1): number {
    this.refill();

    if (this.tokens >= requiredTokens) {
      return 0;
    }

    const tokensNeeded = requiredTokens - this.tokens;
    const secondsNeeded = tokensNeeded / this.refillRate;
    return Math.ceil(secondsNeeded * 1000);
  }

  /**
   * Reset bucket to full capacity
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefillTime = Date.now();
  }
}

/**
 * Rate limit configuration for different tiers
 */
export interface RateLimitTier {
  requestsPerSecond: number;
  burstCapacity: number;
  dailyQuota?: number;
  monthlyQuota?: number;
  costLimit?: number; // max $ per day
}

/**
 * Rate limit configuration per provider
 */
export interface ProviderRateLimit {
  provider: ProviderType;
  requestsPerSecond: number;
  burstCapacity: number;
  maxConcurrent?: number;
}

/**
 * Rate limit configuration per model
 */
export interface ModelRateLimit {
  modelId: string;
  provider: ProviderType;
  requestsPerSecond: number;
  burstCapacity: number;
  costPerRequest?: number;
}

/**
 * User tier configuration
 */
export enum UserTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  INTERNAL = 'internal'
}

/**
 * Request priority levels
 */
export enum RequestPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Queued request
 */
interface QueuedRequest {
  id: string;
  userId: string;
  provider: ProviderType;
  modelId: string;
  priority: RequestPriority;
  timestamp: number;
  timeoutMs: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  allowed: boolean;
  retryAfter?: number;
  limitType?: 'provider' | 'model' | 'user' | 'global' | 'quota';
  remaining?: number;
  resetAt?: number;
}

/**
 * Rate limiter events
 */
export interface RateLimiterEvents {
  'rate_limit_exceeded': (userId: string, provider: ProviderType, modelId: string) => void;
  'quota_exceeded': (userId: string, quotaType: 'daily' | 'monthly' | 'cost') => void;
  'request_queued': (requestId: string, queueLength: number) => void;
  'request_dequeued': (requestId: string, waitTime: number) => void;
  'request_timeout': (requestId: string) => void;
}

export declare interface AIRateLimiter {
  on<U extends keyof RateLimiterEvents>(
    event: U,
    listener: RateLimiterEvents[U]
  ): this;

  emit<U extends keyof RateLimiterEvents>(
    event: U,
    ...args: Parameters<RateLimiterEvents[U]>
  ): boolean;
}

/**
 * Main AI Rate Limiter
 */
export class AIRateLimiter extends EventEmitter {
  private providerBuckets: Map<ProviderType, TokenBucket> = new Map();
  private modelBuckets: Map<string, TokenBucket> = new Map();
  private userBuckets: Map<string, TokenBucket> = new Map();
  private globalBucket: TokenBucket;

  private requestQueue: QueuedRequest[] = [];
  private activeRequests: number = 0;
  private maxConcurrent: number;

  private userQuotas: Map<string, UserQuota> = new Map();
  private userTiers: Map<string, UserTier> = new Map();

  private providerLimits: Map<ProviderType, ProviderRateLimit>;
  private modelLimits: Map<string, ModelRateLimit>;
  private tierLimits: Map<UserTier, RateLimitTier>;

  private queueProcessInterval?: NodeJS.Timeout;

  constructor(
    providerLimits: ProviderRateLimit[],
    modelLimits: ModelRateLimit[],
    tierLimits: Map<UserTier, RateLimitTier>,
    maxConcurrent: number = 100
  ) {
    super();

    this.providerLimits = new Map(providerLimits.map(l => [l.provider, l]));
    this.modelLimits = new Map(modelLimits.map(l => [`${l.provider}:${l.modelId}`, l]));
    this.tierLimits = tierLimits;
    this.maxConcurrent = maxConcurrent;

    // Initialize global bucket
    this.globalBucket = new TokenBucket(maxConcurrent, maxConcurrent / 2, maxConcurrent * 2);

    // Initialize provider buckets
    for (const limit of providerLimits) {
      this.providerBuckets.set(
        limit.provider,
        new TokenBucket(limit.requestsPerSecond, limit.requestsPerSecond, limit.burstCapacity)
      );
    }

    // Initialize model buckets
    for (const limit of modelLimits) {
      const key = `${limit.provider}:${limit.modelId}`;
      this.modelBuckets.set(
        key,
        new TokenBucket(limit.requestsPerSecond, limit.requestsPerSecond, limit.burstCapacity)
      );
    }

    // Start queue processor
    this.startQueueProcessor();
  }

  /**
   * Set user tier
   */
  setUserTier(userId: string, tier: UserTier): void {
    this.userTiers.set(userId, tier);

    // Initialize user bucket based on tier
    const tierLimit = this.tierLimits.get(tier);
    if (tierLimit) {
      this.userBuckets.set(
        userId,
        new TokenBucket(
          tierLimit.requestsPerSecond,
          tierLimit.requestsPerSecond,
          tierLimit.burstCapacity
        )
      );
    }

    // Initialize quota
    if (!this.userQuotas.has(userId)) {
      this.userQuotas.set(userId, {
        dailyRequests: 0,
        monthlyRequests: 0,
        dailyCost: 0,
        dailyResetAt: this.getNextDayTimestamp(),
        monthlyResetAt: this.getNextMonthTimestamp()
      });
    }
  }

  /**
   * Check if request is allowed
   */
  async checkRateLimit(
    userId: string,
    provider: ProviderType,
    modelId: string,
    priority: RequestPriority = RequestPriority.MEDIUM
  ): Promise<RateLimitStatus> {
    const startTime = Date.now();

    // Ensure user is initialized
    if (!this.userTiers.has(userId)) {
      this.setUserTier(userId, UserTier.FREE);
    }

    // Check global limit
    if (!this.globalBucket.tryConsume(1)) {
      return {
        allowed: false,
        retryAfter: this.globalBucket.getTimeUntilAvailable(1),
        limitType: 'global',
        remaining: Math.floor(this.globalBucket.getTokens())
      };
    }

    // Check provider limit
    const providerBucket = this.providerBuckets.get(provider);
    if (providerBucket && !providerBucket.tryConsume(1)) {
      this.globalBucket.tryConsume(-1); // Return global token
      return {
        allowed: false,
        retryAfter: providerBucket.getTimeUntilAvailable(1),
        limitType: 'provider',
        remaining: Math.floor(providerBucket.getTokens())
      };
    }

    // Check model limit
    const modelKey = `${provider}:${modelId}`;
    const modelBucket = this.modelBuckets.get(modelKey);
    if (modelBucket && !modelBucket.tryConsume(1)) {
      this.globalBucket.tryConsume(-1); // Return tokens
      if (providerBucket) providerBucket.tryConsume(-1);
      return {
        allowed: false,
        retryAfter: modelBucket.getTimeUntilAvailable(1),
        limitType: 'model',
        remaining: Math.floor(modelBucket.getTokens())
      };
    }

    // Check user limit
    const userBucket = this.userBuckets.get(userId);
    if (userBucket && !userBucket.tryConsume(1)) {
      this.globalBucket.tryConsume(-1); // Return tokens
      if (providerBucket) providerBucket.tryConsume(-1);
      if (modelBucket) modelBucket.tryConsume(-1);
      return {
        allowed: false,
        retryAfter: userBucket.getTimeUntilAvailable(1),
        limitType: 'user',
        remaining: Math.floor(userBucket.getTokens())
      };
    }

    // Check quota limits
    const quotaCheck = this.checkQuota(userId, provider, modelId);
    if (!quotaCheck.allowed) {
      // Return all tokens
      this.globalBucket.tryConsume(-1);
      if (providerBucket) providerBucket.tryConsume(-1);
      if (modelBucket) modelBucket.tryConsume(-1);
      if (userBucket) userBucket.tryConsume(-1);
      return quotaCheck;
    }

    // Track quota usage
    this.trackQuotaUsage(userId, provider, modelId);

    // Performance check - should be <1ms
    const elapsed = Date.now() - startTime;
    if (elapsed > 1) {
      console.warn(`Rate limit check took ${elapsed}ms (target: <1ms)`);
    }

    return {
      allowed: true,
      remaining: Math.floor(userBucket?.getTokens() || 0)
    };
  }

  /**
   * Queue a request if rate limited
   */
  async queueRequest(
    userId: string,
    provider: ProviderType,
    modelId: string,
    priority: RequestPriority = RequestPriority.MEDIUM,
    timeoutMs: number = 30000
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${userId}-${Date.now()}-${Math.random()}`,
        userId,
        provider,
        modelId,
        priority,
        timestamp: Date.now(),
        timeoutMs,
        resolve,
        reject
      };

      // Insert based on priority (higher priority first, then FIFO)
      const insertIndex = this.requestQueue.findIndex(
        r => r.priority < priority || (r.priority === priority && r.timestamp > request.timestamp)
      );

      if (insertIndex === -1) {
        this.requestQueue.push(request);
      } else {
        this.requestQueue.splice(insertIndex, 0, request);
      }

      this.emit('request_queued', request.id, this.requestQueue.length);

      // Set timeout
      setTimeout(() => {
        const index = this.requestQueue.findIndex(r => r.id === request.id);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          this.emit('request_timeout', request.id);
          reject(new Error('Request timeout in queue'));
        }
      }, timeoutMs);
    });
  }

  /**
   * Process queued requests
   */
  private startQueueProcessor(): void {
    this.queueProcessInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Check every 100ms
  }

  private async processQueue(): Promise<void> {
    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.requestQueue[0];

      const status = await this.checkRateLimit(
        request.userId,
        request.provider,
        request.modelId,
        request.priority
      );

      if (status.allowed) {
        this.requestQueue.shift();
        this.activeRequests++;

        const waitTime = Date.now() - request.timestamp;
        this.emit('request_dequeued', request.id, waitTime);

        request.resolve();
      } else {
        // Can't process yet, wait for next iteration
        break;
      }
    }
  }

  /**
   * Release request slot
   */
  releaseRequest(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  /**
   * Check user quota limits
   */
  private checkQuota(userId: string, provider: ProviderType, modelId: string): RateLimitStatus {
    const quota = this.userQuotas.get(userId);
    if (!quota) {
      return { allowed: true };
    }

    // Reset if needed
    this.resetQuotaIfNeeded(userId, quota);

    const tier = this.userTiers.get(userId) || UserTier.FREE;
    const tierLimit = this.tierLimits.get(tier);
    if (!tierLimit) {
      return { allowed: true };
    }

    // Check daily quota
    if (tierLimit.dailyQuota && quota.dailyRequests >= tierLimit.dailyQuota) {
      this.emit('quota_exceeded', userId, 'daily');
      return {
        allowed: false,
        limitType: 'quota',
        retryAfter: quota.dailyResetAt - Date.now(),
        resetAt: quota.dailyResetAt
      };
    }

    // Check monthly quota
    if (tierLimit.monthlyQuota && quota.monthlyRequests >= tierLimit.monthlyQuota) {
      this.emit('quota_exceeded', userId, 'monthly');
      return {
        allowed: false,
        limitType: 'quota',
        retryAfter: quota.monthlyResetAt - Date.now(),
        resetAt: quota.monthlyResetAt
      };
    }

    // Check cost limit
    if (tierLimit.costLimit && quota.dailyCost >= tierLimit.costLimit) {
      this.emit('quota_exceeded', userId, 'cost');
      return {
        allowed: false,
        limitType: 'quota',
        retryAfter: quota.dailyResetAt - Date.now(),
        resetAt: quota.dailyResetAt
      };
    }

    return { allowed: true };
  }

  /**
   * Track quota usage
   */
  private trackQuotaUsage(userId: string, provider: ProviderType, modelId: string): void {
    const quota = this.userQuotas.get(userId);
    if (!quota) return;

    quota.dailyRequests++;
    quota.monthlyRequests++;

    // Track cost if available
    const modelKey = `${provider}:${modelId}`;
    const modelLimit = this.modelLimits.get(modelKey);
    if (modelLimit?.costPerRequest) {
      quota.dailyCost += modelLimit.costPerRequest;
    }
  }

  /**
   * Reset quota if needed
   */
  private resetQuotaIfNeeded(userId: string, quota: UserQuota): void {
    const now = Date.now();

    if (now >= quota.dailyResetAt) {
      quota.dailyRequests = 0;
      quota.dailyCost = 0;
      quota.dailyResetAt = this.getNextDayTimestamp();
    }

    if (now >= quota.monthlyResetAt) {
      quota.monthlyRequests = 0;
      quota.monthlyResetAt = this.getNextMonthTimestamp();
    }
  }

  /**
   * Get next day timestamp (midnight UTC)
   */
  private getNextDayTimestamp(): number {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Get next month timestamp (1st at midnight UTC)
   */
  private getNextMonthTimestamp(): number {
    const nextMonth = new Date();
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
    nextMonth.setUTCHours(0, 0, 0, 0);
    return nextMonth.getTime();
  }

  /**
   * Get user quota status
   */
  getUserQuota(userId: string): UserQuota | undefined {
    return this.userQuotas.get(userId);
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.requestQueue.length;
  }

  /**
   * Get active requests count
   */
  getActiveRequests(): number {
    return this.activeRequests;
  }

  /**
   * Reset user quota (admin function)
   */
  resetUserQuota(userId: string): void {
    const quota = this.userQuotas.get(userId);
    if (quota) {
      quota.dailyRequests = 0;
      quota.monthlyRequests = 0;
      quota.dailyCost = 0;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.queueProcessInterval) {
      clearInterval(this.queueProcessInterval);
    }
    this.removeAllListeners();
  }
}

/**
 * User quota tracking
 */
interface UserQuota {
  dailyRequests: number;
  monthlyRequests: number;
  dailyCost: number;
  dailyResetAt: number;
  monthlyResetAt: number;
}
