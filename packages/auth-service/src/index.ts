/**
 * @noa/auth-service
 * Enterprise-grade authentication and authorization
 */

export { AuthService } from './AuthService.js';

// Providers
export { JWTProvider } from './providers/JWTProvider.js';
export { OAuthProvider, OAuthProviderFactory } from './providers/OAuthProvider.js';

// Password management
export { PasswordHasher } from './password/PasswordHasher.js';
export { PasswordPolicy } from './password/PasswordPolicy.js';
export { BreachChecker } from './password/BreachChecker.js';

// MFA
export { TOTPProvider } from './mfa/TOTPProvider.js';

// RBAC
export { RBACEngine } from './rbac/RBACEngine.js';

// Session
export { SessionManager } from './session/SessionManager.js';

// Middleware
export {
  createExpressAuthMiddleware,
  createFastifyAuthPlugin,
  requireRoles,
  requirePermissions,
  optionalAuth,
} from './middleware/AuthMiddleware.js';

// Security
export { RateLimiter, RateLimitPresets } from './security/RateLimiter.js';

// Utilities
export * from './utils/crypto.js';
export * from './utils/validators.js';

// Types
export * from './types/index.js';
