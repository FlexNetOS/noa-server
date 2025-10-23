/**
 * Authentication Routes
 *
 * Handles login, logout, token refresh, and API key management
 */

import { Router, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { AuthenticatedRequest, LoginRequest, UserRole, Permission } from '../types/auth.types';
import { generateJWT, refreshAccessToken, JWTError } from '../utils/jwt.utils';
import { generateAPIKey, hashAPIKey, hashPassword, verifyPassword } from '../utils/crypto.utils';
import { logAuthAttempt, logTokenRefresh, logSensitiveOperation } from '../middleware/audit-logger';
import { authenticate, createSession, destroySession, addAPIKey } from '../middleware/auth';
import { requireAdmin, requireUser } from '../middleware/authz';
import { validateSchema, loginSchema, createAPIKeySchema } from '../middleware/validation';
import securityConfig from '../config/security-config.json';

const router: ExpressRouter = Router();

/**
 * In-memory user store (replace with database in production)
 */
const userStore = new Map<string, {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  tenantId?: string;
}>();

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate user and receive JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               totpCode:
 *                 type: string
 *                 description: Optional TOTP code for 2FA
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *                 tokenType:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validateSchema(loginSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, totpCode } = req.body as LoginRequest;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  try {
    // Find user by email
    const user = Array.from(userStore.values()).find(u => u.email === email);

    if (!user) {
      logAuthAttempt(email, false, ipAddress, userAgent, requestId, 'User not found');
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      logAuthAttempt(email, false, ipAddress, userAgent, requestId, 'Invalid password', user.id);
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // TODO: Verify TOTP if 2FA is enabled and code is provided
    // This would require integrating a TOTP library like speakeasy

    // Generate JWT tokens
    const accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'development-secret-change-in-production';
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret';
    const privateKey = process.env.JWT_PRIVATE_KEY;
    const algorithm = securityConfig.jwt.algorithm as 'RS256' | 'HS256';

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      tenantId: user.tenantId
    };

    const accessToken = generateJWT(
      payload,
      accessTokenSecret,
      securityConfig.jwt.accessTokenExpiry,
      algorithm,
      privateKey
    );

    const refreshToken = generateJWT(
      payload,
      refreshTokenSecret,
      securityConfig.jwt.refreshTokenExpiry,
      algorithm,
      privateKey
    );

    // Log successful authentication
    logAuthAttempt(email, true, ipAddress, userAgent, requestId, undefined, user.id);

    // Create session if enabled
    if (securityConfig.session.enabled) {
      const sessionId = createSession(user.id, {
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        tenantId: user.tenantId
      });

      res.cookie(securityConfig.session.cookieName, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: securityConfig.session.maxAge
      });
    }

    res.json({
      accessToken,
      refreshToken,
      expiresIn: parseExpiry(securityConfig.jwt.accessTokenExpiry),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    logAuthAttempt(email, false, ipAddress, userAgent, requestId, (error as Error).message);

    res.status(500).json({
      error: {
        message: 'Authentication failed',
        code: 'AUTH_ERROR'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  if (!refreshToken) {
    return res.status(400).json({
      error: {
        message: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      }
    });
  }

  try {
    const accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'development-secret-change-in-production';
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret';
    const privateKey = process.env.JWT_PRIVATE_KEY;
    const publicKey = process.env.JWT_PUBLIC_KEY;
    const algorithm = securityConfig.jwt.algorithm as 'RS256' | 'HS256';

    const newAccessToken = refreshAccessToken(
      refreshToken,
      refreshTokenSecret,
      accessTokenSecret,
      securityConfig.jwt.accessTokenExpiry,
      algorithm,
      privateKey,
      publicKey
    );

    // Extract user ID from refresh token for logging
    const { decodeJWT } = require('../utils/jwt.utils');
    const { payload } = decodeJWT(refreshToken);

    logTokenRefresh(payload.sub, ipAddress, userAgent, requestId, true);

    res.json({
      accessToken: newAccessToken,
      expiresIn: parseExpiry(securityConfig.jwt.accessTokenExpiry),
      tokenType: 'Bearer'
    });
  } catch (error) {
    if (error instanceof JWTError) {
      logTokenRefresh('unknown', ipAddress, userAgent, requestId, false);

      return res.status(401).json({
        error: {
          message: error.message,
          code: error.code
        }
      });
    }

    res.status(500).json({
      error: {
        message: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      }
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and invalidate session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  // Destroy session if exists
  if (req.sessionId) {
    destroySession(req.sessionId);
  }

  // Clear session cookie
  res.clearCookie(securityConfig.session.cookieName);

  // Log logout
  logSensitiveOperation(
    req.user!.id,
    'auth.logout',
    'authentication' as any,
    req.user!.id,
    ipAddress,
    userAgent,
    requestId
  );

  res.json({
    message: 'Successfully logged out'
  });
});

/**
 * @swagger
 * /api/v1/auth/api-keys:
 *   post:
 *     summary: Create new API key
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresIn:
 *                 type: number
 *     responses:
 *       201:
 *         description: API key created
 *       403:
 *         description: Insufficient permissions
 */
router.post('/api-keys', authenticate, requireUser, validateSchema(createAPIKeySchema),
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, permissions, expiresIn, allowedModels, allowedProviders, rateLimit } = req.body;
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const requestId = req.headers['x-request-id'] as string || 'unknown';

    try {
      // Generate API key
      const apiKey = generateAPIKey(securityConfig.apiKey.prefix);

      // Add to store
      addAPIKey(
        apiKey,
        req.user!.id,
        req.user!.role,
        permissions || req.user!.permissions,
        req.user!.tenantId
      );

      // Log API key creation
      logSensitiveOperation(
        req.user!.id,
        'auth.api_key.created',
        'api_key' as any,
        hashAPIKey(apiKey),
        ipAddress,
        userAgent,
        requestId,
        { name, permissions }
      );

      res.status(201).json({
        apiKey, // Only shown once!
        name,
        permissions,
        message: 'API key created successfully. Store this securely, it will not be shown again.'
      });
    } catch (error) {
      console.error('API key creation error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to create API key',
          code: 'API_KEY_CREATION_ERROR'
        }
      });
    }
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: req.user
  });
});

/**
 * Helper function to parse expiry to seconds
 */
function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // Default 15 minutes

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  switch (unit) {
    case 's': return numValue;
    case 'm': return numValue * 60;
    case 'h': return numValue * 3600;
    case 'd': return numValue * 86400;
    default: return 900;
  }
}

/**
 * Development: Create test user
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/create-user', async (req: AuthenticatedRequest, res: Response) => {
    const { email, password, role } = req.body;

    const userId = `user_${Date.now()}`;
    const passwordHash = await hashPassword(password);

    userStore.set(userId, {
      id: userId,
      email,
      passwordHash,
      role: role || UserRole.USER,
      permissions: [Permission.READ, Permission.WRITE]
    });

    res.json({
      message: 'User created',
      userId,
      email
    });
  });
}

export default router;
