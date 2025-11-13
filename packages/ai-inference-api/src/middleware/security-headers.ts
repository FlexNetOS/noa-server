/**
 * Security Headers Middleware
 *
 * Implements comprehensive security headers using Helmet.js and custom policies
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import securityConfig from '../config/security-config.json';

/**
 * Content Security Policy configuration
 */
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // Unsafe-inline needed for Swagger UI
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
};

/**
 * Helmet security middleware configuration
 */
export const helmetMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: cspDirectives as any
  },

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },

  // Expect-CT (Certificate Transparency)
  expectCt: {
    enforce: true,
    maxAge: 86400 // 24 hours
  },

  // Frameguard (X-Frame-Options)
  frameguard: {
    action: 'deny'
  },

  // Hide Powered-By header
  hidePoweredBy: true,

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // IE No Open
  ieNoOpen: true,

  // Don't Sniff Mimetype
  noSniff: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // XSS Filter
  xssFilter: true
});

/**
 * Custom security headers middleware
 */
export function customSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Permissions Policy (formerly Feature-Policy)
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Cross-Origin-Embedder-Policy
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // Cross-Origin-Opener-Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // Cross-Origin-Resource-Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Remove Server header
  res.removeHeader('Server');

  next();
}

/**
 * CORS configuration with security
 */
export function corsWithSecurity(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',')
    : securityConfig.cors.allowedOrigins;

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  // Allow credentials if configured
  if (securityConfig.cors.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Allowed methods
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );

  // Allowed headers
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, X-Request-ID, X-Tenant-ID'
  );

  // Exposed headers
  res.setHeader(
    'Access-Control-Expose-Headers',
    'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
  );

  // Max age for preflight
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

/**
 * Rate limit headers
 */
export function addRateLimitHeaders(
  req: Request,
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number
) {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', resetTime.toString());
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers['x-request-id'] as string
    || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Cache control for sensitive endpoints
 */
export function noCacheHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  next();
}

/**
 * Security headers for API responses
 */
export function apiSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // JSON content type
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // No cache for API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
}

/**
 * Strict transport security for HTTPS
 */
export function strictTransportSecurity(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  next();
}

/**
 * Combined security middleware
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  customSecurityHeaders(req, res, () => {
    requestIdMiddleware(req, res, () => {
      strictTransportSecurity(req, res, next);
    });
  });
}
