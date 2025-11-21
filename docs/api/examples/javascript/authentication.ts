/**
 * Authentication Examples - TypeScript
 * Demonstrates user registration, login, and token management
 */

interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    mfaEnabled: boolean;
  };
  token: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

interface ApiError {
  success: false;
  error: string;
  mfaRequired?: boolean;
}

class NoaAuthClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, metadata }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    return data;
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string, mfaCode?: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, mfaCode }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.mfaRequired) {
        throw new Error('MFA_REQUIRED');
      }
      throw new Error(data.error || 'Login failed');
    }

    // Store tokens
    this.accessToken = data.token.accessToken;
    this.refreshToken = data.token.refreshToken;

    // Store in localStorage for persistence
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', this.refreshToken);
    }

    return data;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('refreshToken', this.refreshToken);
    }

    return this.accessToken;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    if (!this.accessToken) return;

    await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    this.accessToken = null;
    this.refreshToken = null;

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  /**
   * Setup MFA
   */
  async setupMFA(): Promise<{ secret: string; qrCode: string }> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/auth/mfa/setup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.json();
  }

  /**
   * Enable MFA
   */
  async enableMFA(verificationCode: string): Promise<{ verified: boolean }> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/auth/mfa/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ verificationCode }),
    });

    return response.json();
  }

  /**
   * Create API key
   */
  async createApiKey(
    name: string,
    expiresIn?: number,
    scopes?: string[]
  ): Promise<{ id: string; name: string; key: string }> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}/auth/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ name, expiresIn, scopes }),
    });

    return response.json();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Make authenticated request with automatic token refresh
   */
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    // First attempt
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    // If unauthorized, try refreshing token
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();

      // Retry with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    }

    return response;
  }
}

// Example usage
async function example() {
  const client = new NoaAuthClient();

  try {
    // Register
    await client.register('user@example.com', 'SecureP@ssw0rd123!', {
      firstName: 'John',
      lastName: 'Doe',
    });

    // Login
    const loginResult = await client.login('user@example.com', 'SecureP@ssw0rd123!');
    console.log('Logged in:', loginResult.user);

    // Create API key
    const apiKey = await client.createApiKey('Production Key', 31536000, [
      'inference:read',
      'inference:write',
    ]);
    console.log('API Key created:', apiKey.key);

    // Make authenticated request
    const response = await client.authenticatedRequest('http://localhost:3000/api/v1/models');
    const models = await response.json();
    console.log('Available models:', models);

    // Logout
    await client.logout();
  } catch (error) {
    console.error('Error:', error);
  }
}

export { NoaAuthClient };
export default NoaAuthClient;
