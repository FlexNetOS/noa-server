/**
 * Authentication Middleware
 *
 * Handles JWT token validation, API key authentication, and OAuth 2.0 flows
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole, Permission } from '../types/auth.types';
import { verifyJWT, JWTError, extractUserFromToken } from '../utils/jwt.utils';
import { hashAPIKey } from '../utils/crypto.utils';
import { logAudit } from './audit-logger';
import securityConfig from '../config/security-config.json';

/**
 * Authentication error
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * In-memory stores (replace with database in production)
 */
const apiKeyStore = new Map<string, {
  userId: string;
  role: UserRole;
  permissions: Permission[];
  tenantId?: string;
  rateLimit: number;
  isActive: boolean;
}>();

const revokedTokens = new Set<string>();
const sessionStore = new Map<string, any>();

/**
 * Extract token from Authorization header or cookie
 */
function extractToken(req: AuthenticatedRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie (for session-based auth)
  if (req.cookies && req.cookies[securityConfig.session.cookieName]) {
    return req.cookies[securityConfig.session.cookieName];
  }

  // Check API key header
  if (req.headers['x-api-key']) {
    return req.headers['x-api-key'] as string;
  }

  return null;
}

/**
 * JWT Authentication Middleware
 */
export function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req);

  if (!token) {
    logAudit({
      action: 'auth.jwt.missing_token',
      resource: 'authentication' as any,
      outcome: 'failure',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });

    return res.status(401).json({
      error: {
        message: 'No authentication token provided',
        code: 'MISSING_TOKEN'
      }
    });
  }

  try {
    // Check if token is revoked
    if (revokedTokens.has(token)) {
      throw new JWTError('Token has been revoked', 'TOKEN_REVOKED');
    }

    // Verify JWT token
    const secret = process.env.JWT_ACCESS_SECRET || 'development-secret-change-in-production';
    const publicKey = process.env.JWT_PUBLIC_KEY;
    const algorithm = securityConfig.jwt.algorithm as 'RS256' | 'HS256';

    const payload = verifyJWT(token, secret, algorithm, publicKey);

    // Extract user from payload
    req.user = extractUserFromToken(payload);
    req.token = token;

    logAudit({
      userId: req.user.id,
      action: 'auth.jwt.success',
      resource: 'authentication' as any,
      outcome: 'success',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });

    next();
  } catch (error) {
    let errorMessage = 'Invalid token';
    let errorCode = 'INVALID_TOKEN';

    if (error instanceof JWTError) {
      errorMessage = error.message;
      errorCode = error.code;
    }

    logAudit({
      action: 'auth.jwt.failed',
      resource: 'authentication' as any,
      outcome: 'failure',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId: req.headers['x-request-id'] as string || 'unknown',
      errorMessage
    });

    return res.status(401).json({
      error: {
        message: errorMessage,
        code: errorCode
      }
    });
  }
}

/**
 * API Key Authentication Middleware
 */
export function authenticateAPIKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    logAudit({
      action: 'auth.api_key.missing',
      resource: 'authentication' as any,
      outcome: 'failure',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });

    return res.status(401).json({
      error: {
        message: 'API key required',
        code: 'MISSING_API_KEY'
      }
    });
  }

  // Validate API key format
  if (!apiKey.startsWith(securityConfig.apiKey.prefix)) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key format',
        code: 'INVALID_API_KEY_FORMAT'
      }
    });
  }

  // Hash API key and lookup
  const hashedKey = hashAPIKey(apiKey);
  const keyData = apiKeyStore.get(hashedKey);

  if (!keyData || !keyData.isActive) {
    logAudit({
      action: 'auth.api_key.invalid',
      resource: 'authentication' as any,
      outcome: 'failure',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });

    return res.status(401).json({
      error: {
        message: 'Invalid API key',
        code: 'INVALID_API_KEY'
      }
    });
  }

  // Set user from API key
  req.user = {
    id: keyData.userId,
    email: '', // API keys may not have email
    role: keyData.role,
    permissions: keyData.permissions,
    tenantId: keyData.tenantId,
    apiKeyId: hashedKey
  };

  logAudit({
    userId: req.user.id,
    action: 'auth.api_key.success',
    resource: 'authentication' as any,
    outcome: 'success',
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    requestId: req.headers['x-request-id'] as string || 'unknown',
    metadata: { apiKeyId: hashedKey }
  });

  next();
}

/**
 * Multi-method authentication (JWT or API Key)
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  const apiKey = req.headers['x-api-key'];

  // Try API key first if present
  if (apiKey) {
    return authenticateAPIKey(req, res, next);
  }

  // Fall back to JWT
  if (token) {
    return authenticateJWT(req, res, next);
  }

  logAudit({
    action: 'auth.no_credentials',
    resource: 'authentication' as any,
    outcome: 'failure',
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    requestId: req.headers['x-request-id'] as string || 'unknown'
  });

  return res.status(401).json({
    error: {
      message: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    }
  });
}

/**
 * Optional authentication (doesn't fail if no credentials)
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  const apiKey = req.headers['x-api-key'];

  if (!token && !apiKey) {
    return next();
  }

  // Try to authenticate but don't fail
  if (apiKey) {
    authenticateAPIKey(req, res, (err) => {
      if (err) return next();
      next();
    });
  } else if (token) {
    authenticateJWT(req, res, (err) => {
      if (err) return next();
      next();
    });
  } else {
    next();
  }
}

/**
 * Session-based authentication
 */
export function authenticateSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!securityConfig.session.enabled) {
    return res.status(501).json({
      error: {
        message: 'Session authentication not enabled',
        code: 'SESSION_AUTH_DISABLED'
      }
    });
  }

  const sessionId = req.cookies?.[securityConfig.session.cookieName];

  if (!sessionId) {
    return res.status(401).json({
      error: {
        message: 'No session found',
        code: 'NO_SESSION'
      }
    });
  }

  const sessionData = sessionStore.get(sessionId);

  if (!sessionData) {
    return res.status(401).json({
      error: {
        message: 'Invalid session',
        code: 'INVALID_SESSION'
      }
    });
  }

  // Check session expiration
  const sessionAge = Date.now() - sessionData.createdAt.getTime();
  if (sessionAge > securityConfig.session.maxAge) {
    sessionStore.delete(sessionId);
    return res.status(401).json({
      error: {
        message: 'Session expired',
        code: 'SESSION_EXPIRED'
      }
    });
  }

  // Update last activity
  sessionData.lastActivity = new Date();

  req.user = {
    id: sessionData.userId,
    email: sessionData.email,
    role: sessionData.role,
    permissions: sessionData.permissions,
    tenantId: sessionData.tenantId
  };
  req.sessionId = sessionId;

  next();
}

/**
 * Revoke JWT token
 */
export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

/**
 * Add API key to store (for testing/development)
 */
export function addAPIKey(
  apiKey: string,
  userId: string,
  role: UserRole,
  permissions: Permission[],
  tenantId?: string
): void {
  const hashedKey = hashAPIKey(apiKey);
  apiKeyStore.set(hashedKey, {
    userId,
    role,
    permissions,
    tenantId,
    rateLimit: securityConfig.defaultRateLimits[role],
    isActive: true
  });
}

/**
 * Create session
 */
export function createSession(userId: string, userData: any): string {
  const sessionId = require('crypto').randomBytes(32).toString('hex');
  sessionStore.set(sessionId, {
    ...userData,
    userId,
    createdAt: new Date(),
    lastActivity: new Date()
  });
  return sessionId;
}

/**
 * Destroy session
 */
export function destroySession(sessionId: string): void {
  sessionStore.delete(sessionId);
}
