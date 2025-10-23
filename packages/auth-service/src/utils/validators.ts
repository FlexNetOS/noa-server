/**
 * Input validation utilities
 */

import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email().min(3).max(255);

/**
 * Password validation schema
 */
export function createPasswordSchema(config: {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}) {
  let regex = '.+'; // Default: any character
  const requirements: string[] = [];

  if (config.requireUppercase) {
    regex = '(?=.*[A-Z])' + regex;
    requirements.push('uppercase letter');
  }

  if (config.requireLowercase) {
    regex = '(?=.*[a-z])' + regex;
    requirements.push('lowercase letter');
  }

  if (config.requireNumbers) {
    regex = '(?=.*\\d)' + regex;
    requirements.push('number');
  }

  if (config.requireSpecialChars) {
    regex = '(?=.*[@$!%*?&#])' + regex;
    requirements.push('special character');
  }

  return z
    .string()
    .min(config.minLength, `Password must be at least ${config.minLength} characters`)
    .regex(new RegExp(regex), `Password must contain at least one ${requirements.join(', ')}`);
}

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid();

/**
 * Username validation schema
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must not exceed 50 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens'
  );

/**
 * IP address validation
 */
export const ipAddressSchema = z.string().ip();

/**
 * User registration input validation
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
  username: usernameSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Login input validation
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  mfaCode: z.string().length(6).optional(),
  rememberMe: z.boolean().optional(),
});

/**
 * MFA setup validation
 */
export const mfaSetupSchema = z.object({
  userId: uuidSchema,
  method: z.enum(['totp', 'sms', 'email', 'webauthn']),
});

/**
 * MFA verification validation
 */
export const mfaVerifySchema = z.object({
  userId: uuidSchema,
  code: z.string().min(6).max(8),
  backupCode: z.boolean().optional(),
});

/**
 * Password reset request validation
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset validation
 */
export const passwordResetSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8),
});

/**
 * Token refresh validation
 */
export const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(20),
});

/**
 * Role creation validation
 */
export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(
    z.object({
      resource: z.string(),
      action: z.string(),
      conditions: z.record(z.any()).optional(),
    })
  ),
});

/**
 * Permission check validation
 */
export const permissionCheckSchema = z.object({
  userId: uuidSchema,
  resource: z.string(),
  action: z.string(),
  context: z.record(z.any()).optional(),
});

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): string {
  const sanitized = sanitizeInput(email).toLowerCase();
  const result = emailSchema.safeParse(sanitized);

  if (!result.success) {
    throw new Error('Invalid email address');
  }

  return result.data;
}

/**
 * Validate JWT token format
 */
export function validateJWTFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Validate permission string format (resource:action)
 */
export function validatePermissionFormat(permission: string): boolean {
  const regex = /^[a-z0-9_-]+:[a-z0-9_*-]+$/i;
  return regex.test(permission);
}

/**
 * Parse permission string into resource and action
 */
export function parsePermission(permission: string): { resource: string; action: string } {
  if (!validatePermissionFormat(permission)) {
    throw new Error('Invalid permission format. Expected: resource:action');
  }

  const [resource, action] = permission.split(':');
  return { resource, action };
}
