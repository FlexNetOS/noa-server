/**
 * Main Authentication Service
 * Orchestrates all authentication providers and features
 */

import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { TOTPProvider } from './mfa/TOTPProvider.js';
import { BreachChecker } from './password/BreachChecker.js';
import { PasswordHasher } from './password/PasswordHasher.js';
import { PasswordPolicy } from './password/PasswordPolicy.js';
import { JWTProvider } from './providers/JWTProvider.js';
import { OAuthProvider } from './providers/OAuthProvider.js';
import { SAMLProvider } from './providers/SAMLProvider.js';
import { RBACEngine } from './rbac/RBACEngine.js';
import { RateLimiter, RateLimitPresets } from './security/RateLimiter.js';
import { SessionManager } from './session/SessionManager.js';
import {
    AuthConfig,
    AuthResult,
    MFASetup,
    MFAVerificationResult,
    Role,
    User
} from './types/index.js';

export class AuthService {
  private config: AuthConfig;
  private db: Pool;
  private redis: Redis;

  // Core providers
  private jwtProvider: JWTProvider;
  private passwordHasher: PasswordHasher;
  private passwordPolicy: PasswordPolicy;
  private breachChecker: BreachChecker;

  // MFA
  private totpProvider: TOTPProvider;

  // Authorization
  private rbacEngine: RBACEngine;

  // Session & Rate Limiting
  private sessionManager: SessionManager;
  private rateLimiter: RateLimiter;

  // OAuth providers
  private oauthProviders: Map<string, OAuthProvider>;

  // SAML providers
  private samlProviders: Map<string, SAMLProvider>;

  constructor(config: AuthConfig, db: Pool, redis: Redis) {
    this.config = config;
    this.db = db;
    this.redis = redis;

    // Initialize providers
    this.jwtProvider = new JWTProvider(config.jwt);
    this.passwordHasher = new PasswordHasher();
    this.passwordPolicy = new PasswordPolicy(config.password);
    this.breachChecker = new BreachChecker();

    // Initialize MFA
    this.totpProvider = new TOTPProvider({
      issuer: config.mfa.issuer,
      window: config.mfa.window,
    });

    // Initialize RBAC
    this.rbacEngine = new RBACEngine();

    // Initialize session manager
    this.sessionManager = new SessionManager(redis, config.session);

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(redis);

    // Initialize OAuth providers
    this.oauthProviders = new Map();
    if (config.oauth?.providers) {
      for (const providerConfig of config.oauth.providers) {
        this.oauthProviders.set(providerConfig.name, new OAuthProvider(providerConfig));
      }
    }

    // Initialize SAML providers
    this.samlProviders = new Map();
    if (config.saml?.providers) {
      for (const providerConfig of config.saml.providers) {
        this.samlProviders.set(providerConfig.name, new SAMLProvider(providerConfig));
      }
    }
  }

  /**
   * Register new user
   */
  async register(data: {
    email: string;
    password: string;
    metadata?: Record<string, any>;
  }): Promise<AuthResult> {
    try {
      // Rate limiting
      const rateLimitResult = await this.rateLimiter.consume(
        'register',
        data.email,
        RateLimitPresets.register
      );

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: 'Too many registration attempts. Please try again later.',
        };
      }

      // Validate password
      const passwordValidation = this.passwordPolicy.validate(data.password, { email: data.email });
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: passwordValidation.errors.join(', '),
        };
      }

      // Check for breached password
      if (this.config.password.preventBreached) {
        const breached = await this.breachChecker.isPasswordBreached(data.password);
        if (breached) {
          return {
            success: false,
            error:
              'This password has been exposed in data breaches. Please choose a different password.',
          };
        }
      }

      // Check if user exists
      const existingUser = await this.db.query('SELECT id FROM users WHERE email = $1', [
        data.email.toLowerCase(),
      ]);

      if (existingUser.rows.length > 0) {
        return {
          success: false,
          error: 'User already exists',
        };
      }

      // Hash password
      const passwordHash = await this.passwordHasher.hash(data.password);

      // Create user
      const result = await this.db.query(
        `INSERT INTO users (id, email, password_hash, mfa_enabled, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [
          uuidv4(),
          data.email.toLowerCase(),
          passwordHash,
          false,
          JSON.stringify(data.metadata || {}),
        ]
      );

      const user = result.rows[0] as User;

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed',
      };
    }
  }

  /**
   * Login with email and password
   */
  async login(data: {
    email: string;
    password: string;
    ipAddress: string;
    userAgent: string;
    mfaCode?: string;
  }): Promise<AuthResult> {
    try {
      // Rate limiting
      const rateLimitResult = await this.rateLimiter.consume(
        'login',
        data.email,
        RateLimitPresets.login
      );

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: `Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        };
      }

      // Get user
      const result = await this.db.query('SELECT * FROM users WHERE email = $1', [
        data.email.toLowerCase(),
      ]);

      if (result.rows.length === 0) {
        // Penalty for invalid email
        await this.rateLimiter.penalty('login', data.email, RateLimitPresets.login, 2);
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      const user = result.rows[0] as User;

      // Check if account is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return {
          success: false,
          error: 'Account is temporarily locked. Please try again later.',
        };
      }

      // Verify password
      const validPassword = await this.passwordHasher.verify(data.password, user.passwordHash!);

      if (!validPassword) {
        // Increment failed attempts
        await this.incrementFailedAttempts(user.id);

        // Penalty for invalid password
        await this.rateLimiter.penalty('login', data.email, RateLimitPresets.login, 2);

        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Check MFA
      if (user.mfaEnabled) {
        if (!data.mfaCode) {
          return {
            success: false,
            mfaRequired: true,
            error: 'MFA code required',
          };
        }

        const mfaValid = this.totpProvider.verifyCode(user.mfaSecret!, data.mfaCode);
        if (!mfaValid) {
          return {
            success: false,
            mfaRequired: true,
            error: 'Invalid MFA code',
          };
        }
      }

      // Reset failed attempts
      await this.resetFailedAttempts(user.id);

      // Get user roles and permissions
      const roles = await this.getUserRoles(user.id);
      const permissions = this.rbacEngine.getRolePermissions(roles);

      // Create session
      const session = await this.sessionManager.createSession(user, data.ipAddress, data.userAgent);

      // Generate tokens
      const tokenPair = this.jwtProvider.createTokenPair(
        user,
        roles.map((r) => r.name),
        permissions
      );

      // Update last login
      await this.db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      // Reward successful login
      await this.rateLimiter.reset('login', data.email, RateLimitPresets.login);

      return {
        success: true,
        user,
        token: {
          ...tokenPair,
          tokenType: 'Bearer',
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.sessionManager.deleteSession(sessionId);
    } else {
      await this.sessionManager.deleteUserSessions(userId);
    }
  }

  /**
   * Setup MFA for user
   */
  async setupMFA(userId: string, email: string): Promise<MFASetup> {
    const setup = await this.totpProvider.generateSecret(email);

    // Store secret (hashed) in database
    await this.db.query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [setup.secret, userId]);

    return setup;
  }

  /**
   * Enable MFA
   */
  async enableMFA(userId: string, verificationCode: string): Promise<MFAVerificationResult> {
    const user = await this.getUser(userId);
    if (!user || !user.mfaSecret) {
      return { verified: false, error: 'MFA not set up' };
    }

    const verified = this.totpProvider.verifyCode(user.mfaSecret, verificationCode);

    if (verified) {
      await this.db.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);
    }

    return { verified };
  }

  /**
   * Disable MFA
   */
  async disableMFA(userId: string, verificationCode: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.mfaEnabled) {
      return false;
    }

    const verified = this.totpProvider.verifyCode(user.mfaSecret!, verificationCode);

    if (verified) {
      await this.db.query('UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1', [
        userId,
      ]);
      return true;
    }

    return false;
  }

  /**
   * Check permission
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ) {
    const roles = await this.getUserRoles(userId);
    const permissions = this.rbacEngine.getRolePermissions(roles);

    return this.rbacEngine.checkPermission(permissions, resource, action, context);
  }

  /**
   * Get user
   */
  private async getUser(userId: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get user roles
   */
  private async getUserRoles(userId: string): Promise<Role[]> {
    const result = await this.db.query(
      `SELECT r.* FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );

    return result.rows as Role[];
  }

  /**
   * Increment failed login attempts
   */
  private async incrementFailedAttempts(userId: string): Promise<void> {
    const result = await this.db.query(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE
             WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
             ELSE NULL
           END
       WHERE id = $1
       RETURNING failed_login_attempts`,
      [userId]
    );
  }

  /**
   * Reset failed login attempts
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [userId]
    );
  }

  /**
   * Get SAML provider
   */
  getSAMLProvider(name: string = 'default'): SAMLProvider | undefined {
    return this.samlProviders.get(name);
  }

  /**
   * Get SAML authorization URL
   */
  async getSAMLAuthUrl(providerName: string = 'default'): Promise<string | null> {
    const provider = this.samlProviders.get(providerName);
    if (!provider) {
      return null;
    }

    // For now, return a placeholder URL - in practice, this would integrate with Passport
    return `/auth/saml/${providerName}`;
  }

  /**
   * Handle SAML login callback
   */
  async samlLogin(
    providerName: string,
    samlUser: any,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthResult> {
    try {
      const provider = this.samlProviders.get(providerName);
      if (!provider) {
        return {
          success: false,
          error: 'SAML provider not found',
        };
      }

      // Extract user information from SAML response
      const email = samlUser.email;
      if (!email) {
        return {
          success: false,
          error: 'Email not provided by SAML IdP',
        };
      }

      // Check if user exists
      let user = await this.getUserByEmail(email);

      if (!user) {
        // Auto-provision user if configured
        user = await this.createSAMLUser(samlUser);
      }

      // Get user roles and permissions
      const roles = await this.getUserRoles(user.id);
      const permissions = this.rbacEngine.getRolePermissions(roles);

      // Create session
      const session = await this.sessionManager.createSession(user, ipAddress, userAgent);

      // Generate tokens
      const tokenPair = this.jwtProvider.createTokenPair(
        user,
        roles.map((r) => r.name),
        permissions
      );

      // Update last login
      await this.db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      return {
        success: true,
        user,
        token: {
          ...tokenPair,
          tokenType: 'Bearer',
        },
      };
    } catch (error) {
      console.error('SAML login error:', error);
      return {
        success: false,
        error: 'SAML authentication failed',
      };
    }
  }

  /**
   * Handle SAML logout
   */
  async samlLogout(providerName: string, req: any): Promise<string | null> {
    const provider = this.samlProviders.get(providerName);
    if (!provider) {
      return null;
    }

    return provider.logout(req);
  }

  /**
   * Get SAML service provider metadata
   */
  getSAMLMetadata(providerName: string = 'default'): string | null {
    const provider = this.samlProviders.get(providerName);
    if (!provider) {
      return null;
    }

    return provider.generateServiceProviderMetadata();
  }

  /**
   * Get user by email
   */
  private async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    return result.rows[0] || null;
  }

  /**
   * Create user from SAML attributes
   */
  private async createSAMLUser(samlUser: any): Promise<User> {
    const userId = uuidv4();
    const now = new Date();

    const user: User = {
      id: userId,
      email: samlUser.email.toLowerCase(),
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
      metadata: {
        samlId: samlUser.id,
        name: samlUser.name,
        givenName: samlUser.givenName,
        familyName: samlUser.familyName,
        groups: samlUser.groups,
        provider: 'saml',
      },
    };

    await this.db.query(
      `INSERT INTO users (id, email, mfa_enabled, failed_login_attempts, created_at, updated_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user.id,
        user.email,
        user.mfaEnabled,
        user.failedLoginAttempts,
        user.createdAt,
        user.updatedAt,
        JSON.stringify(user.metadata),
      ]
    );

    return user;
  }
}
