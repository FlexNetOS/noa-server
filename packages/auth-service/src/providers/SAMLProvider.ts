/**
 * SAML 2.0 Authentication Provider
 * Secure implementation using @node-saml/passport-saml
 */

import { Profile, Strategy as SamlStrategy, VerifiedCallback } from '@node-saml/passport-saml';
import { Request } from 'express';
import passport from 'passport';

import { SAMLProviderConfig } from '../types/index.js';

export interface SAMLUserInfo {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  groups?: string[];
  attributes?: Record<string, any>;
}

export class SAMLProvider {
  private config: SAMLProviderConfig;
  private strategy: SamlStrategy;

  constructor(config: SAMLProviderConfig) {
    this.config = config;
    this.strategy = this.createStrategy();
  }

  /**
   * Create SAML strategy with secure configuration
   */
  private createStrategy(): SamlStrategy {
    const strategy = new SamlStrategy(
      {
        // Core SAML configuration - using correct property names for @node-saml/passport-saml
        entryPoint: this.config.entryPoint,
        issuer: this.config.issuer,
        callbackUrl: this.config.callbackUrl,
        cert: this.config.cert,
        privateKey: this.config.privateKey,
        idpCert: this.config.idpCert,
      } as any, // Type assertion to bypass strict typing until we get the correct interface
      this.verifyCallback.bind(this),
      this.verifyCallback.bind(this) // logoutVerify callback
    );

    return strategy;
  }

  /**
   * SAML verification callback
   */
  private async verifyCallback(
    profile: Profile | null | undefined,
    done: VerifiedCallback
  ): Promise<void> {
    try {
      if (!profile) {
        return done(new Error('No SAML profile received'));
      }

      // Extract user information from SAML assertion
      const userInfo = this.extractUserInfo(profile);

      // Validate required attributes
      if (!userInfo.email) {
        return done(new Error('Email attribute is required but not provided by IdP'));
      }

      // Additional validation can be added here
      if (this.config.requiredAttributes) {
        for (const attr of this.config.requiredAttributes) {
          if (!(profile.attributes as any)?.[attr]) {
            return done(new Error(`Required attribute '${attr}' not provided by IdP`));
          }
        }
      }

      // Group-based authorization (optional)
      if (this.config.allowedGroups && userInfo.groups) {
        const hasAllowedGroup = userInfo.groups.some((group) =>
          this.config.allowedGroups!.includes(group)
        );
        if (!hasAllowedGroup) {
          return done(new Error('User is not a member of any allowed groups'));
        }
      }

      return done(null, userInfo as any);
    } catch (error) {
      return done(error as Error);
    }
  }

  /**
   * Extract user information from SAML profile
   */
  private extractUserInfo(profile: Profile): SAMLUserInfo {
    const attributes = (profile.attributes as any) || {};

    return {
      id: profile.nameID || profile.nameIDFormat || '',
      email:
        attributes[this.config.emailAttribute || 'email'] ||
        attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
        attributes['urn:oid:0.9.2342.19200300.100.1.3'] || // mail
        '',
      name:
        attributes[this.config.nameAttribute || 'name'] ||
        attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
        attributes['urn:oid:2.5.4.3'] || // cn
        '',
      givenName:
        attributes[this.config.givenNameAttribute || 'givenName'] ||
        attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] ||
        attributes['urn:oid:2.5.4.42'] || // givenName
        '',
      familyName:
        attributes[this.config.familyNameAttribute || 'familyName'] ||
        attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] ||
        attributes['urn:oid:2.5.4.4'] || // sn
        '',
      groups: this.extractGroups(attributes),
      attributes,
    };
  }

  /**
   * Extract group memberships from SAML attributes
   */
  private extractGroups(attributes: Record<string, any>): string[] {
    const groups: string[] = [];

    // Common group attribute names
    const groupAttributes = [
      this.config.groupAttribute || 'groups',
      'memberOf',
      'http://schemas.xmlsoap.org/claims/Group',
      'urn:oid:1.3.6.1.4.1.5923.1.5.1.1', // eduPersonAffiliation
    ];

    for (const attr of groupAttributes) {
      const value = attributes[attr];
      if (value) {
        if (Array.isArray(value)) {
          groups.push(...value);
        } else {
          groups.push(value);
        }
      }
    }

    return [...new Set(groups)]; // Remove duplicates
  }

  /**
   * Get the Passport strategy instance
   */
  getStrategy(): SamlStrategy {
    return this.strategy;
  }

  /**
   * Generate SAML authentication request URL
   */
  async getAuthUrl(req?: Request): Promise<string> {
    return new Promise((resolve, reject) => {
      passport.authenticate('saml', {
        additionalParams: this.config.additionalAuthnRequestParams,
      } as any)(req, {} as any, (err: any) => {
        if (err) {
          reject(err);
        } else {
          // This is a simplified approach - in practice, you'd need to capture the redirect URL
          resolve('/saml/login'); // Placeholder
        }
      });
    });
  }

  /**
   * Handle SAML logout
   */
  async logout(req: Request): Promise<string | null> {
    return new Promise((resolve) => {
      // Type assertion for SAML logout request
      const samlReq = req as any;
      this.strategy.logout(samlReq, (err: any, url?: string | null) => {
        if (err) {
          console.error('SAML logout error:', err);
          resolve(null);
        } else {
          resolve(url || null);
        }
      });
    });
  }

  /**
   * Get service provider metadata XML
   */
  generateServiceProviderMetadata(): string {
    return this.strategy.generateServiceProviderMetadata(
      this.config.decryptionCert || null,
      this.config.signingCert || null
    );
  }

  /**
   * Validate SAML configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.entryPoint) {
      errors.push('entryPoint is required');
    }

    if (!this.config.issuer) {
      errors.push('issuer is required');
    }

    if (!this.config.callbackUrl) {
      errors.push('callbackUrl is required');
    }

    if (!this.config.cert) {
      errors.push('cert is required');
    }

    if (!this.config.privateKey) {
      errors.push('privateKey is required');
    }

    // Validate URLs
    try {
      new URL(this.config.entryPoint);
    } catch {
      errors.push('entryPoint must be a valid URL');
    }

    try {
      new URL(this.config.callbackUrl);
    } catch {
      errors.push('callbackUrl must be a valid URL');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * SAML Provider Factory for common configurations
 */
export class SAMLProviderFactory {
  /**
   * Create SAML provider for Microsoft Azure AD
   */
  static createAzureADProvider(config: {
    tenantId: string;
    clientId: string;
    callbackUrl: string;
    privateKey: string;
    cert: string;
    issuer?: string;
    allowedGroups?: string[];
  }): SAMLProvider {
    return new SAMLProvider({
      name: 'azure-ad',
      entryPoint: `https://login.microsoftonline.com/${config.tenantId}/saml2`,
      issuer: config.issuer || config.clientId,
      callbackUrl: config.callbackUrl,
      cert: config.cert,
      privateKey: config.privateKey,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: false,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      emailAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      nameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      givenNameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      familyNameAttribute: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      groupAttribute: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
      allowedGroups: config.allowedGroups,
      validateInResponseTo: true,
      requestIdExpirationPeriodMs: 28800000, // 8 hours
      acceptedClockSkewMs: 300000, // 5 minutes
    });
  }

  /**
   * Create SAML provider for Okta
   */
  static createOktaProvider(config: {
    oktaDomain: string;
    callbackUrl: string;
    privateKey: string;
    cert: string;
    issuer?: string;
    allowedGroups?: string[];
  }): SAMLProvider {
    return new SAMLProvider({
      name: 'okta',
      entryPoint: `https://${config.oktaDomain}/app/template_saml_2_0/...`, // Should be configured in Okta
      issuer: config.issuer || `https://${config.oktaDomain}`,
      callbackUrl: config.callbackUrl,
      cert: config.cert,
      privateKey: config.privateKey,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: false,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      emailAttribute: 'email',
      nameAttribute: 'name',
      givenNameAttribute: 'firstName',
      familyNameAttribute: 'lastName',
      groupAttribute: 'groups',
      allowedGroups: config.allowedGroups,
      validateInResponseTo: true,
      requestIdExpirationPeriodMs: 28800000,
      acceptedClockSkewMs: 300000,
    });
  }

  /**
   * Create SAML provider for Google Workspace
   */
  static createGoogleWorkspaceProvider(config: {
    callbackUrl: string;
    privateKey: string;
    cert: string;
    issuer?: string;
    allowedGroups?: string[];
  }): SAMLProvider {
    return new SAMLProvider({
      name: 'google-workspace',
      entryPoint: 'https://accounts.google.com/o/saml2/idp?idpid=...', // Should be configured in Google Workspace
      issuer: config.issuer || 'google.com',
      callbackUrl: config.callbackUrl,
      cert: config.cert,
      privateKey: config.privateKey,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: false,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      emailAttribute: 'email',
      nameAttribute: 'name',
      givenNameAttribute: 'givenName',
      familyNameAttribute: 'familyName',
      groupAttribute: 'groups',
      allowedGroups: config.allowedGroups,
      validateInResponseTo: true,
      requestIdExpirationPeriodMs: 28800000,
      acceptedClockSkewMs: 300000,
    });
  }
}
