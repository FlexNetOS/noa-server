/**
 * JWT Utility Functions
 *
 * Provides JWT token generation, validation, and management
 */

import crypto from 'crypto';
import { JWTPayload, AuthUser, UserRole } from '../types/auth.types';
import { generateJTI } from './crypto.utils';

/**
 * JWT Error types
 */
export class JWTError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'JWTError';
  }
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString();
}

/**
 * Generate JWT token
 */
export function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>,
  secret: string,
  expiresIn: string = '15m',
  algorithm: 'RS256' | 'HS256' = 'HS256',
  privateKey?: string
): string {
  const now = Math.floor(Date.now() / 1000);
  const expirySeconds = parseExpiry(expiresIn);

  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expirySeconds,
    jti: generateJTI()
  };

  const header = {
    alg: algorithm,
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  let signature: string;
  if (algorithm === 'RS256') {
    if (!privateKey) {
      throw new JWTError('Private key required for RS256', 'MISSING_PRIVATE_KEY');
    }
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    signature = base64UrlEncode(sign.sign(privateKey, 'base64'));
  } else {
    signature = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(signatureInput).digest('base64')
    );
  }

  return `${signatureInput}.${signature}`;
}

/**
 * Verify JWT token
 */
export function verifyJWT(
  token: string,
  secret: string,
  algorithm: 'RS256' | 'HS256' = 'HS256',
  publicKey?: string
): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JWTError('Invalid token format', 'INVALID_FORMAT');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Verify signature
  let isValid = false;
  if (algorithm === 'RS256') {
    if (!publicKey) {
      throw new JWTError('Public key required for RS256', 'MISSING_PUBLIC_KEY');
    }
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signatureInput);
    isValid = verify.verify(publicKey, Buffer.from(base64UrlDecode(signature), 'base64'));
  } else {
    const expectedSignature = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(signatureInput).digest('base64')
    );
    isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  if (!isValid) {
    throw new JWTError('Invalid signature', 'INVALID_SIGNATURE');
  }

  // Decode and validate payload
  const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new JWTError('Token expired', 'TOKEN_EXPIRED');
  }

  // Check issued at (not in future)
  if (payload.iat && payload.iat > Math.floor(Date.now() / 1000) + 60) {
    throw new JWTError('Token issued in future', 'INVALID_ISSUED_AT');
  }

  return payload;
}

/**
 * Decode JWT without verification (for inspection only)
 */
export function decodeJWT(token: string): { header: any; payload: JWTPayload } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JWTError('Invalid token format', 'INVALID_FORMAT');
  }

  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));

  return { header, payload };
}

/**
 * Refresh access token
 */
export function refreshAccessToken(
  refreshToken: string,
  refreshTokenSecret: string,
  accessTokenSecret: string,
  accessTokenExpiry: string = '15m',
  algorithm: 'RS256' | 'HS256' = 'HS256',
  privateKey?: string,
  publicKey?: string
): string {
  // Verify refresh token
  const payload = verifyJWT(refreshToken, refreshTokenSecret, algorithm, publicKey);

  // Generate new access token
  return generateJWT(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      tenantId: payload.tenantId,
      scope: payload.scope
    },
    accessTokenSecret,
    accessTokenExpiry,
    algorithm,
    privateKey
  );
}

/**
 * Parse expiry string to seconds
 */
function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new JWTError(`Invalid expiry format: ${expiresIn}`, 'INVALID_EXPIRY');
  }

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  switch (unit) {
    case 's':
      return numValue;
    case 'm':
      return numValue * 60;
    case 'h':
      return numValue * 3600;
    case 'd':
      return numValue * 86400;
    default:
      throw new JWTError(`Invalid expiry unit: ${unit}`, 'INVALID_EXPIRY_UNIT');
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const { payload } = decodeJWT(token);
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return false;
  return expiration < new Date();
}

/**
 * Extract user from JWT payload
 */
export function extractUserFromToken(payload: JWTPayload): AuthUser {
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions,
    tenantId: payload.tenantId
  };
}
