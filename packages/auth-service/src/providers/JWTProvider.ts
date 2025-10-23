/**
 * JWT Authentication Provider
 * Supports HS256, RS256, and ES256 algorithms
 */

import jwt from 'jsonwebtoken';

import { AuthConfig, JWTPayload, Permission, User } from '../types/index.js';

export class JWTProvider {
  private config: AuthConfig['jwt'];

  constructor(config: AuthConfig['jwt']) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.algorithm === 'HS256' && !this.config.secret) {
      throw new Error('JWT secret is required for HS256 algorithm');
    }

    if (
      (this.config.algorithm === 'RS256' || this.config.algorithm === 'ES256') &&
      (!this.config.privateKey || !this.config.publicKey)
    ) {
      throw new Error('Private and public keys are required for RS256/ES256 algorithms');
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(user: User, roles: string[], permissions: Permission[]): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    const options: jwt.SignOptions = {
      algorithm: this.config.algorithm,
      expiresIn: this.config.accessTokenExpiry,
    };

    const secret =
      this.config.algorithm === 'HS256' ? this.config.secret! : this.config.privateKey!;

    return jwt.sign(payload, secret, options);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'refresh',
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    const options: jwt.SignOptions = {
      algorithm: this.config.algorithm,
      expiresIn: this.config.refreshTokenExpiry,
    };

    const secret =
      this.config.algorithm === 'HS256' ? this.config.secret! : this.config.privateKey!;

    return jwt.sign(payload, secret, options);
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JWTPayload {
    const secret = this.config.algorithm === 'HS256' ? this.config.secret! : this.config.publicKey!;

    const options: jwt.VerifyOptions = {
      algorithms: [this.config.algorithm],
      issuer: this.config.issuer,
      audience: this.config.audience,
    };

    try {
      const decoded = jwt.verify(token, secret, options) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { sub: string; type: string } {
    const secret = this.config.algorithm === 'HS256' ? this.config.secret! : this.config.publicKey!;

    const options: jwt.VerifyOptions = {
      algorithms: [this.config.algorithm],
      issuer: this.config.issuer,
      audience: this.config.audience,
    };

    try {
      const decoded = jwt.verify(token, secret, options) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    return jwt.decode(token) as JWTPayload | null;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    return Date.now() >= decoded.exp * 1000;
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    user: User,
    roles: string[],
    permissions: Permission[]
  ): Promise<string> {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // Ensure the refresh token belongs to the user
    if (decoded.sub !== user.id) {
      throw new Error('Refresh token does not match user');
    }

    // Generate new access token
    return this.generateAccessToken(user, roles, permissions);
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Create token pair (access + refresh)
   */
  createTokenPair(
    user: User,
    roles: string[],
    permissions: Permission[]
  ): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    const accessToken = this.generateAccessToken(user, roles, permissions);
    const refreshToken = this.generateRefreshToken(user.id);

    // Calculate expiration in seconds
    const expiresIn = this.parseExpiry(this.config.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
    };

    const match = expiry.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    return value * units[unit];
  }
}
