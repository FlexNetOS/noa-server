/**
 * OAuth 2.0 / OpenID Connect Provider
 */

import axios from 'axios';

import { OAuthProviderConfig } from '../types/index.js';
import { generateToken } from '../utils/crypto.js';

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string; // OpenID Connect
}

export interface OAuthUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export class OAuthProvider {
  private config: OAuthProviderConfig;
  private stateStore: Map<string, { timestamp: number; redirectUri?: string }>;

  constructor(config: OAuthProviderConfig) {
    this.config = config;
    this.stateStore = new Map();

    // Clean up expired state tokens every 5 minutes
    setInterval(() => this.cleanupExpiredStates(), 5 * 60 * 1000);
  }

  /**
   * Generate authorization URL
   */
  async getAuthorizationUrl(redirectUri?: string): Promise<{ url: string; state: string }> {
    const state = await generateToken(32);

    // Store state with timestamp for CSRF protection
    this.stateStore.set(state, {
      timestamp: Date.now(),
      redirectUri,
    });

    const params = new URLSearchParams({
      client_id: this.config.clientID,
      redirect_uri: this.config.callbackURL,
      response_type: 'code',
      scope: this.config.scope.join(' '),
      state,
    });

    const url = `${this.config.authorizationURL}?${params.toString()}`;

    return { url, state };
  }

  /**
   * Verify state token (CSRF protection)
   */
  verifyState(state: string): boolean {
    const stored = this.stateStore.get(state);

    if (!stored) {
      return false;
    }

    // State is valid for 10 minutes
    const isValid = Date.now() - stored.timestamp < 10 * 60 * 1000;

    if (isValid) {
      this.stateStore.delete(state); // One-time use
    }

    return isValid;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.callbackURL,
      client_id: this.config.clientID,
      client_secret: this.config.clientSecret,
    });

    try {
      const response = await axios.post<OAuthTokenResponse>(this.config.tokenURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `OAuth token exchange failed: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    // This URL should be configurable per provider
    const userInfoUrl = `${this.config.authorizationURL.replace('/authorize', '/userinfo')}`;

    try {
      const response = await axios.get<OAuthUserInfo>(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get user info: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientID,
      client_secret: this.config.clientSecret,
    });

    try {
      const response = await axios.post<OAuthTokenResponse>(this.config.tokenURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Token refresh failed: ${error.response?.data?.error_description || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    const revokeUrl = this.config.tokenURL.replace('/token', '/revoke');

    const params = new URLSearchParams({
      token,
      client_id: this.config.clientID,
      client_secret: this.config.clientSecret,
    });

    try {
      await axios.post(revokeUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      // Token revocation errors are usually not critical
      console.error('Token revocation failed:', error);
    }
  }

  /**
   * Clean up expired state tokens
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    const expiry = 10 * 60 * 1000; // 10 minutes

    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.timestamp > expiry) {
        this.stateStore.delete(state);
      }
    }
  }

  /**
   * Validate ID token (OpenID Connect)
   */
  validateIdToken(idToken: string): any {
    // Simple JWT decode (in production, should verify signature)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format');
    }

    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  }
}

/**
 * Create OAuth provider for common services
 */
export class OAuthProviderFactory {
  /**
   * Create Google OAuth provider
   */
  static createGoogleProvider(
    clientID: string,
    clientSecret: string,
    callbackURL: string
  ): OAuthProvider {
    return new OAuthProvider({
      name: 'google',
      clientID,
      clientSecret,
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      callbackURL,
      scope: ['openid', 'email', 'profile'],
    });
  }

  /**
   * Create GitHub OAuth provider
   */
  static createGitHubProvider(
    clientID: string,
    clientSecret: string,
    callbackURL: string
  ): OAuthProvider {
    return new OAuthProvider({
      name: 'github',
      clientID,
      clientSecret,
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      callbackURL,
      scope: ['user:email'],
    });
  }

  /**
   * Create Microsoft OAuth provider
   */
  static createMicrosoftProvider(
    clientID: string,
    clientSecret: string,
    callbackURL: string,
    tenant: string = 'common'
  ): OAuthProvider {
    return new OAuthProvider({
      name: 'microsoft',
      clientID,
      clientSecret,
      authorizationURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      callbackURL,
      scope: ['openid', 'email', 'profile'],
    });
  }
}
