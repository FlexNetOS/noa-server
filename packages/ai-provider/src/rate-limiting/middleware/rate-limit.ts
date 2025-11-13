/**
 * Rate Limit Middleware
 *
 * Express/Fastify middleware for automatic rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { AIRateLimiter, RequestPriority, UserTier } from '../ai-rate-limiter';
import { ProviderType } from '../../types';

/**
 * Rate limit middleware configuration
 */
export interface RateLimitMiddlewareConfig {
  rateLimiter: AIRateLimiter;
  getUserId?: (req: Request) => string;
  getProvider?: (req: Request) => ProviderType;
  getModelId?: (req: Request) => string;
  getPriority?: (req: Request) => RequestPriority;
  bypassCheck?: (req: Request) => boolean;
  onRateLimited?: (req: Request, res: Response, retryAfter: number) => void;
  includeHeaders?: boolean;
  queueRequests?: boolean;
  queueTimeout?: number;
}

/**
 * Rate limit headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Create rate limit middleware
 */
export function createRateLimitMiddleware(
  config: RateLimitMiddlewareConfig
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    rateLimiter,
    getUserId = defaultGetUserId,
    getProvider = defaultGetProvider,
    getModelId = defaultGetModelId,
    getPriority = defaultGetPriority,
    bypassCheck = defaultBypassCheck,
    onRateLimited = defaultOnRateLimited,
    includeHeaders = true,
    queueRequests = true,
    queueTimeout = 30000
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check bypass conditions (internal/system requests)
      if (bypassCheck(req)) {
        next();
        return;
      }

      // Extract request info
      const userId = getUserId(req);
      const provider = getProvider(req);
      const modelId = getModelId(req);
      const priority = getPriority(req);

      // Check rate limit
      const status = await rateLimiter.checkRateLimit(userId, provider, modelId, priority);

      // Add headers if enabled
      if (includeHeaders) {
        const headers = buildRateLimitHeaders(status, userId, rateLimiter);
        Object.entries(headers).forEach(([key, value]) => {
          if (value) res.setHeader(key, value);
        });
      }

      // Handle rate limited requests
      if (!status.allowed) {
        if (queueRequests && status.retryAfter && status.retryAfter < queueTimeout) {
          // Queue the request
          try {
            await rateLimiter.queueRequest(userId, provider, modelId, priority, queueTimeout);

            // Request was processed, continue
            rateLimiter.releaseRequest();
            next();
          } catch (error) {
            // Queue timeout or error
            onRateLimited(req, res, status.retryAfter || 1000);
          }
        } else {
          // Reject immediately
          onRateLimited(req, res, status.retryAfter || 1000);
        }
        return;
      }

      // Request allowed - add cleanup on response finish
      res.on('finish', () => {
        rateLimiter.releaseRequest();
      });

      next();
    } catch (error) {
      // Error in middleware - allow request but log error
      console.error('Rate limit middleware error:', error);
      next();
    }
  };
}

/**
 * Default user ID extractor
 */
function defaultGetUserId(req: Request): string {
  // Try various sources for user ID
  return (
    (req as any).user?.id ||
    (req as any).userId ||
    req.headers['x-user-id'] as string ||
    req.ip ||
    'anonymous'
  );
}

/**
 * Default provider extractor
 */
function defaultGetProvider(req: Request): ProviderType {
  return (
    (req.body?.provider as ProviderType) ||
    (req.query?.provider as ProviderType) ||
    (req.headers['x-provider'] as ProviderType) ||
    ProviderType.OPENAI
  );
}

/**
 * Default model ID extractor
 */
function defaultGetModelId(req: Request): string {
  return (
    req.body?.model ||
    req.query?.model as string ||
    req.headers['x-model'] as string ||
    'default'
  );
}

/**
 * Default priority extractor
 */
function defaultGetPriority(req: Request): RequestPriority {
  const priority = (
    req.headers['x-priority'] as string ||
    req.query?.priority as string ||
    'medium'
  ).toLowerCase();

  switch (priority) {
    case 'critical': return RequestPriority.CRITICAL;
    case 'high': return RequestPriority.HIGH;
    case 'low': return RequestPriority.LOW;
    default: return RequestPriority.MEDIUM;
  }
}

/**
 * Default bypass check (for internal requests)
 */
function defaultBypassCheck(req: Request): boolean {
  // Check for internal API key or system user
  const apiKey = req.headers['x-api-key'] as string;
  const userTier = (req as any).user?.tier;

  return (
    apiKey === process.env.INTERNAL_API_KEY ||
    userTier === UserTier.INTERNAL ||
    (req as any).isSystemRequest === true
  );
}

/**
 * Default rate limited handler
 */
function defaultOnRateLimited(req: Request, res: Response, retryAfter: number): void {
  const retryAfterSeconds = Math.ceil(retryAfter / 1000);

  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: retryAfterSeconds,
      retryAfterMs: retryAfter
    }
  });
}

/**
 * Build rate limit headers
 */
function buildRateLimitHeaders(
  status: any,
  userId: string,
  rateLimiter: AIRateLimiter
): RateLimitHeaders {
  const quota = rateLimiter.getUserQuota(userId);
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': '0',
    'X-RateLimit-Remaining': String(status.remaining || 0),
    'X-RateLimit-Reset': String(quota?.dailyResetAt || Date.now() + 86400000)
  };

  if (status.retryAfter) {
    headers['Retry-After'] = String(Math.ceil(status.retryAfter / 1000));
  }

  return headers;
}

/**
 * Fastify rate limit plugin
 */
export function createFastifyRateLimitPlugin(config: RateLimitMiddlewareConfig) {
  return async function rateLimitPlugin(fastify: any, options: any) {
    fastify.addHook('onRequest', async (request: any, reply: any) => {
      // Convert to Express-like interface
      const req = request.raw as Request;
      const res = reply.raw as Response;

      return new Promise<void>((resolve, reject) => {
        const middleware = createRateLimitMiddleware(config);
        middleware(req, res, (error?: any) => {
          if (error) reject(error);
          else resolve();
        });
      });
    });
  };
}

/**
 * WebSocket rate limit wrapper
 */
export function createWebSocketRateLimiter(config: RateLimitMiddlewareConfig) {
  const { rateLimiter, getUserId, getProvider, getModelId, getPriority } = config;

  return async function checkWebSocketRateLimit(
    socket: any,
    provider: ProviderType,
    modelId: string
  ): Promise<boolean> {
    const userId = socket.userId || socket.id || 'anonymous';
    const priority = RequestPriority.MEDIUM;

    const status = await rateLimiter.checkRateLimit(userId, provider, modelId, priority);

    if (!status.allowed) {
      socket.emit('rate_limit_exceeded', {
        retryAfter: status.retryAfter,
        message: 'Rate limit exceeded for WebSocket request'
      });
      return false;
    }

    return true;
  };
}
