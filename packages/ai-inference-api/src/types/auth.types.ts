/**
 * Authentication and Authorization Type Definitions
 *
 * Defines types for JWT tokens, API keys, user roles, permissions, and OAuth flows
 */

import { Request } from 'express';

/**
 * User roles for RBAC
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

/**
 * Permissions for fine-grained access control
 */
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  DELETE = 'delete'
}

/**
 * Resource types for authorization
 */
export enum ResourceType {
  MODEL = 'model',
  PROVIDER = 'provider',
  INFERENCE = 'inference',
  EMBEDDINGS = 'embeddings',
  API_KEY = 'api_key',
  USER = 'user'
}

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  sub: string; // User ID (subject)
  email: string;
  role: UserRole;
  permissions: Permission[];
  tenantId?: string; // Multi-tenancy support
  scope?: string[]; // OAuth scopes
  iat?: number; // Issued at
  exp?: number; // Expiration time
  jti?: string; // JWT ID for revocation tracking
}

/**
 * API key structure
 */
export interface APIKey {
  id: string;
  key: string; // Hashed API key
  userId: string;
  name: string;
  permissions: Permission[];
  allowedResources?: ResourceType[];
  allowedProviders?: string[];
  allowedModels?: string[];
  rateLimit?: number; // Requests per minute
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  isActive: boolean;
}

/**
 * OAuth 2.0 token structure
 */
export interface OAuth2Token {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/**
 * TOTP (Time-based One-Time Password) configuration
 */
export interface TOTPConfig {
  userId: string;
  secret: string;
  isEnabled: boolean;
  backupCodes: string[];
}

/**
 * Session data structure
 */
export interface SessionData {
  userId: string;
  role: UserRole;
  permissions: Permission[];
  tenantId?: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

/**
 * Authenticated user information
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  tenantId?: string;
  apiKeyId?: string; // Present if authenticated via API key
}

/**
 * Extended Express Request with authentication data
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  token?: string;
  sessionId?: string;
}

/**
 * Authorization context for resource access
 */
export interface AuthorizationContext {
  user: AuthUser;
  resource: ResourceType;
  action: Permission;
  resourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: ResourceType;
  resourceId?: string;
  outcome: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  requestId: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Password policy configuration
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Number of previous passwords to check
}

/**
 * Token refresh request payload
 */
export interface TokenRefreshRequest {
  refreshToken: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string; // Optional TOTP code for 2FA
}

/**
 * Login response payload
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  jwt: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiry: string; // e.g., '15m'
    refreshTokenExpiry: string; // e.g., '7d'
    algorithm: 'RS256' | 'HS256';
    publicKey?: string; // For RS256
    privateKey?: string; // For RS256
  };
  apiKey: {
    hashAlgorithm: 'sha256' | 'sha512';
    prefix: string; // e.g., 'noa_'
  };
  password: {
    bcryptRounds: number;
    policy: PasswordPolicy;
  };
  session: {
    enabled: boolean;
    secret: string;
    maxAge: number; // in milliseconds
    cookieName: string;
  };
  cors: {
    allowedOrigins: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  audit: {
    enabled: boolean;
    logSuccessfulAuth: boolean;
    logFailedAuth: boolean;
    maskPII: boolean;
  };
}
