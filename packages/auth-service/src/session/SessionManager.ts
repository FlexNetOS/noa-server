/**
 * Session Manager with Redis backend
 */

import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import { AuthConfig, Session, User } from '../types/index.js';

export class SessionManager {
  private redis: Redis;
  private config: AuthConfig['session'];
  private keyPrefix = 'session:';

  constructor(redis: Redis, config: AuthConfig['session']) {
    this.redis = redis;
    this.config = config;
  }

  /**
   * Create new session
   */
  async createSession(
    user: User,
    ipAddress: string,
    userAgent: string,
    refreshToken?: string
  ): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      userId: user.id,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + this.config.maxAge),
      createdAt: new Date(),
      refreshToken,
      metadata: {},
    };

    // Store session in Redis
    const key = this.getSessionKey(session.id);
    const ttl = Math.floor(this.config.maxAge / 1000); // Convert to seconds

    await this.redis.setex(key, ttl, JSON.stringify(session));

    // Add session to user's session list
    await this.redis.sadd(this.getUserSessionsKey(user.id), session.id);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const key = this.getSessionKey(sessionId);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const session = JSON.parse(data) as Session;

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const updated = { ...session, ...updates };
    const key = this.getSessionKey(sessionId);
    const ttl = await this.redis.ttl(key);

    await this.redis.setex(
      key,
      ttl > 0 ? ttl : Math.floor(this.config.maxAge / 1000),
      JSON.stringify(updated)
    );
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (session) {
      await this.redis.srem(this.getUserSessionsKey(session.userId), sessionId);
    }

    await this.redis.del(this.getSessionKey(sessionId));
  }

  /**
   * Get all user sessions
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = await this.redis.smembers(this.getUserSessionsKey(userId));

    const sessions = await Promise.all(sessionIds.map((id) => this.getSession(id)));

    return sessions.filter((s): s is Session => s !== null);
  }

  /**
   * Delete all user sessions
   */
  async deleteUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(this.getUserSessionsKey(userId));

    const pipeline = this.redis.pipeline();

    for (const sessionId of sessionIds) {
      pipeline.del(this.getSessionKey(sessionId));
    }

    pipeline.del(this.getUserSessionsKey(userId));

    await pipeline.exec();
  }

  /**
   * Delete all sessions except current
   */
  async deleteOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(this.getUserSessionsKey(userId));

    const pipeline = this.redis.pipeline();

    for (const sessionId of sessionIds) {
      if (sessionId !== currentSessionId) {
        pipeline.del(this.getSessionKey(sessionId));
        pipeline.srem(this.getUserSessionsKey(userId), sessionId);
      }
    }

    await pipeline.exec();
  }

  /**
   * Extend session expiry
   */
  async extendSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    session.expiresAt = new Date(Date.now() + this.config.maxAge);

    const key = this.getSessionKey(sessionId);
    const ttl = Math.floor(this.config.maxAge / 1000);

    await this.redis.setex(key, ttl, JSON.stringify(session));
  }

  /**
   * Touch session (update last activity)
   */
  async touchSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    const ttl = Math.floor(this.config.maxAge / 1000);

    await this.redis.expire(key, ttl);
  }

  /**
   * Get session count for user
   */
  async getSessionCount(userId: string): Promise<number> {
    return await this.redis.scard(this.getUserSessionsKey(userId));
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const exists = await this.redis.exists(this.getSessionKey(sessionId));
    return exists === 1;
  }

  /**
   * Get all active sessions count
   */
  async getActiveSessions(): Promise<number> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    return keys.filter((key) => !key.includes(':sessions:')).length;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    // Redis automatically removes expired keys, but we need to clean up user session sets
    let cleaned = 0;

    // Get all user session keys
    const userKeys = await this.redis.keys(`${this.keyPrefix}user:*:sessions`);

    for (const userKey of userKeys) {
      const sessionIds = await this.redis.smembers(userKey);

      for (const sessionId of sessionIds) {
        const exists = await this.sessionExists(sessionId);

        if (!exists) {
          await this.redis.srem(userKey, sessionId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  /**
   * Get session key
   */
  private getSessionKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`;
  }

  /**
   * Get user sessions key
   */
  private getUserSessionsKey(userId: string): string {
    return `${this.keyPrefix}user:${userId}:sessions`;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
