/**
 * Configuration loader for AuthService
 * Loads configuration from environment variables
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AuthConfig, OAuthProviderConfig, SAMLProviderConfig } from '../types/index.js';

export class AuthConfigLoader {
  /**
   * Load configuration from environment variables
   */
  static loadFromEnv(): AuthConfig {
    return {
      jwt: {
        algorithm: (process.env.JWT_ALGORITHM as 'HS256' | 'RS256' | 'ES256') || 'HS256',
        secret: process.env.JWT_SECRET,
        privateKey: process.env.JWT_PRIVATE_KEY_PATH
          ? readFileSync(resolve(process.env.JWT_PRIVATE_KEY_PATH), 'utf8')
          : undefined,
        publicKey: process.env.JWT_PUBLIC_KEY_PATH
          ? readFileSync(resolve(process.env.JWT_PUBLIC_KEY_PATH), 'utf8')
          : undefined,
        issuer: process.env.JWT_ISSUER || 'noa-server',
        audience: process.env.JWT_AUDIENCE || 'noa-client',
        accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
      },
      oauth: this.loadOAuthConfig(),
      saml: this.loadSAMLConfig(),
      ldap:
        process.env.LDAP_ENABLED === 'true'
          ? {
              url: process.env.LDAP_URL || '',
              bindDN: process.env.LDAP_BIND_DN || '',
              bindCredentials: process.env.LDAP_BIND_PASSWORD || '',
              searchBase: process.env.LDAP_SEARCH_BASE || '',
              searchFilter: process.env.LDAP_SEARCH_FILTER || '',
            }
          : undefined,
      mfa: {
        enabled: process.env.MFA_ENABLED !== 'false',
        issuer: process.env.MFA_ISSUER || 'Noa Server',
        window: parseInt(process.env.MFA_WINDOW || '1'),
      },
      password: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
        maxLength: parseInt(process.env.PASSWORD_MAX_LENGTH || '128'),
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
        preventBreached: process.env.PASSWORD_PREVENT_BREACHED !== 'false',
        preventCommon: process.env.PASSWORD_PREVENT_COMMON !== 'false',
        preventUserInfo: process.env.PASSWORD_PREVENT_USER_INFO !== 'false',
        preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5'),
        maxAge: process.env.PASSWORD_MAX_AGE_DAYS
          ? parseInt(process.env.PASSWORD_MAX_AGE_DAYS)
          : undefined,
        minAge: process.env.PASSWORD_MIN_AGE_DAYS
          ? parseInt(process.env.PASSWORD_MIN_AGE_DAYS)
          : undefined,
      },
      session: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
        },
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'),
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_API_DURATION || '60') * 1000,
        max: parseInt(process.env.RATE_LIMIT_API_POINTS || '100'),
        skipSuccessfulRequests: false,
      },
      bruteForce: {
        freeRetries: parseInt(process.env.BRUTE_FORCE_FREE_RETRIES || '5'),
        minWaitMs: parseInt(process.env.BRUTE_FORCE_MIN_WAIT || '900000'),
        maxWaitMs: parseInt(process.env.BRUTE_FORCE_MAX_WAIT || '900000'),
        lifetime: parseInt(process.env.BRUTE_FORCE_LIFETIME || '86400000'),
      },
    };
  }

  /**
   * Load OAuth provider configurations
   */
  private static loadOAuthConfig(): { providers: OAuthProviderConfig[] } | undefined {
    const providers: OAuthProviderConfig[] = [];

    // Google OAuth
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push({
        name: 'google',
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenURL: 'https://oauth2.googleapis.com/token',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
        scope: ['openid', 'email', 'profile'],
      });
    }

    // GitHub OAuth
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      providers.push({
        name: 'github',
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        authorizationURL: 'https://github.com/login/oauth/authorize',
        tokenURL: 'https://github.com/login/oauth/access_token',
        callbackURL: process.env.GITHUB_CALLBACK_URL || '',
        scope: ['user:email'],
      });
    }

    // Microsoft OAuth
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
      providers.push({
        name: 'microsoft',
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        authorizationURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
        tokenURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL || '',
        scope: ['openid', 'email', 'profile'],
      });
    }

    return providers.length > 0 ? { providers } : undefined;
  }

  /**
   * Load SAML provider configurations
   */
  private static loadSAMLConfig(): { providers: SAMLProviderConfig[] } | undefined {
    if (process.env.SAML_ENABLED !== 'true') {
      return undefined;
    }

    const providers: SAMLProviderConfig[] = [];

    // Load certificate and key files
    let cert: string;
    let privateKey: string;
    let idpCert: string | undefined;

    try {
      if (process.env.SAML_CERT_PATH) {
        cert = readFileSync(resolve(process.env.SAML_CERT_PATH), 'utf8');
      } else {
        throw new Error('SAML_CERT_PATH environment variable is required when SAML is enabled');
      }

      if (process.env.SAML_PRIVATE_KEY_PATH) {
        privateKey = readFileSync(resolve(process.env.SAML_PRIVATE_KEY_PATH), 'utf8');
      } else {
        throw new Error(
          'SAML_PRIVATE_KEY_PATH environment variable is required when SAML is enabled'
        );
      }

      // Optional IdP certificate for response validation
      if (process.env.SAML_IDP_CERT_PATH) {
        idpCert = readFileSync(resolve(process.env.SAML_IDP_CERT_PATH), 'utf8');
      }
    } catch (error) {
      console.error('Failed to load SAML certificates:', error);
      throw new Error(
        'SAML certificate files could not be loaded. Please check SAML_CERT_PATH, SAML_PRIVATE_KEY_PATH, and SAML_IDP_CERT_PATH.'
      );
    }

    providers.push({
      name: 'default',
      entryPoint: process.env.SAML_ENTRY_POINT || '',
      issuer: process.env.SAML_ISSUER || 'noa-server',
      callbackUrl: process.env.SAML_CALLBACK_URL || '',
      cert,
      privateKey,
      idpCert,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: false,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      validateInResponseTo: true,
      requestIdExpirationPeriodMs: 28800000, // 8 hours
      acceptedClockSkewMs: 300000, // 5 minutes
      emailAttribute: 'email',
      nameAttribute: 'name',
      givenNameAttribute: 'givenName',
      familyNameAttribute: 'familyName',
      groupAttribute: 'groups',
    });

    return { providers };
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: AuthConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // JWT validation
    if (config.jwt.algorithm === 'HS256' && !config.jwt.secret) {
      errors.push('JWT_SECRET is required when using HS256 algorithm');
    }

    if (
      (config.jwt.algorithm === 'RS256' || config.jwt.algorithm === 'ES256') &&
      (!config.jwt.privateKey || !config.jwt.publicKey)
    ) {
      errors.push('JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH are required for RS256/ES256');
    }

    // SAML validation
    if (config.saml?.providers) {
      for (const provider of config.saml.providers) {
        if (!provider.entryPoint) {
          errors.push(`SAML provider '${provider.name}': entryPoint is required`);
        }
        if (!provider.issuer) {
          errors.push(`SAML provider '${provider.name}': issuer is required`);
        }
        if (!provider.callbackUrl) {
          errors.push(`SAML provider '${provider.name}': callbackUrl is required`);
        }
        if (!provider.cert) {
          errors.push(`SAML provider '${provider.name}': cert is required`);
        }
        if (!provider.privateKey) {
          errors.push(`SAML provider '${provider.name}': privateKey is required`);
        }
        // Note: idpCert is optional for testing but recommended for production
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
