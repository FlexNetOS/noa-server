/**
 * Authentication middleware for Express and Fastify
 */

import { NextFunction, Request, Response } from 'express';
import { FastifyReply, FastifyRequest } from 'fastify';

import { JWTProvider } from '../providers/JWTProvider.js';
import { SessionManager } from '../session/SessionManager.js';
import { JWTPayload, Permission } from '../types/index.js';

export interface AuthMiddlewareConfig {
  jwtProvider: JWTProvider;
  sessionManager?: SessionManager;
  optional?: boolean; // Allow request even if not authenticated
  requireMFA?: boolean; // Require MFA verification
}

/**
 * Express authentication middleware
 */
export function createExpressAuthMiddleware(config: AuthMiddlewareConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const token = config.jwtProvider.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        if (config.optional) {
          return next();
        }

        res.status(401).json({
          error: 'Unauthorized',
          message: 'No authentication token provided',
        });
        return;
      }

      // Verify token
      let payload: JWTPayload;
      try {
        payload = config.jwtProvider.verifyAccessToken(token);
      } catch (error) {
        res.status(401).json({
          error: 'Unauthorized',
          message: error instanceof Error ? error.message : 'Invalid token',
        });
        return;
      }

      // Verify session if session manager is provided
      if (config.sessionManager) {
        const sessionId = req.headers['x-session-id'] as string;

        if (sessionId) {
          const session = await config.sessionManager.getSession(sessionId);

          if (!session || session.userId !== payload.sub) {
            res.status(401).json({
              error: 'Unauthorized',
              message: 'Invalid or expired session',
            });
            return;
          }

          // Touch session to extend expiry
          await config.sessionManager.touchSession(sessionId);

          (req as any).sessionId = sessionId;
        }
      }

      // Attach user to request
      (req as any).user = payload;

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed',
      });
    }
  };
}

/**
 * Fastify authentication decorator
 */
export function createFastifyAuthPlugin(config: AuthMiddlewareConfig) {
  return async function (fastify: any) {
    // Add authenticate decorator
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Extract token
        const token = config.jwtProvider.extractTokenFromHeader(
          request.headers.authorization as string
        );

        if (!token) {
          if (config.optional) {
            return;
          }

          throw new Error('No authentication token provided');
        }

        // Verify token
        const payload = config.jwtProvider.verifyAccessToken(token);

        // Verify session if session manager is provided
        if (config.sessionManager) {
          const sessionId = request.headers['x-session-id'] as string;

          if (sessionId) {
            const session = await config.sessionManager.getSession(sessionId);

            if (!session || session.userId !== payload.sub) {
              throw new Error('Invalid or expired session');
            }

            // Touch session
            await config.sessionManager.touchSession(sessionId);

            (request as any).sessionId = sessionId;
          }
        }

        // Attach user to request
        (request as any).user = payload;
      } catch (error) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    });

    // Add preHandler hook
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      // Routes can opt-in to authentication via route config
      if ((request.routeOptions as any).config?.auth) {
        await fastify.authenticate(request, reply);
      }
    });
  };
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JWTPayload | undefined;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userRoles = user.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

export function requirePermissions(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JWTPayload | undefined;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const permissions = user.permissions || [];
    const hasPermission = permissions.some((p: Permission) => p.resource === resource && p.action === action);

    if (!hasPermission) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required permission: ${resource}:${action}`,
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(config: Omit<AuthMiddlewareConfig, 'optional'>) {
  return createExpressAuthMiddleware({ ...config, optional: true });
}
