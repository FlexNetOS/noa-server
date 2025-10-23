/**
 * Swagger UI Configuration
 *
 * This file contains additional configuration for Swagger UI customization
 */

// Custom theme configuration
const CUSTOM_THEME = {
  colors: {
    primary: '#667eea',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  fonts: {
    regular: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    code: '"Fira Code", "Courier New", monospace',
  },
};

// API configuration
const API_CONFIG = {
  servers: {
    production: {
      url: 'https://api.noa-server.io/v1',
      description: 'Production server',
    },
    staging: {
      url: 'https://staging-api.noa-server.io/v1',
      description: 'Staging server',
    },
    local: {
      url: 'http://localhost:3000/v1',
      description: 'Local development server',
    },
  },
  rateLimits: {
    anonymous: 100,
    authenticated: 1000,
    admin: 10000,
  },
};

// Authentication helpers
const AUTH_HELPERS = {
  /**
   * Store authentication token
   */
  setToken: (token) => {
    localStorage.setItem('noa_api_token', token);
  },

  /**
   * Get stored authentication token
   */
  getToken: () => {
    return localStorage.getItem('noa_api_token');
  },

  /**
   * Clear authentication token
   */
  clearToken: () => {
    localStorage.removeItem('noa_api_token');
  },

  /**
   * Format token for Bearer authentication
   */
  formatBearerToken: (token) => {
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  },
};

// Request interceptor for adding common headers
const requestInterceptor = (request) => {
  const token = AUTH_HELPERS.getToken();

  if (token && !request.headers.Authorization) {
    request.headers.Authorization = AUTH_HELPERS.formatBearerToken(token);
  }

  // Add request ID for tracking
  request.headers['X-Request-ID'] = generateRequestId();

  // Add timestamp
  request.headers['X-Request-Time'] = new Date().toISOString();

  return request;
};

// Response interceptor for handling common patterns
const responseInterceptor = (response) => {
  // Auto-save token from login response
  if (response.url.includes('/auth/login') && response.obj?.data?.accessToken) {
    AUTH_HELPERS.setToken(response.obj.data.accessToken);
    console.log('Authentication token saved');
  }

  // Clear token on logout
  if (response.url.includes('/auth/logout')) {
    AUTH_HELPERS.clearToken();
    console.log('Authentication token cleared');
  }

  // Log rate limit headers
  if (response.headers['x-ratelimit-remaining']) {
    console.log(`Rate limit remaining: ${response.headers['x-ratelimit-remaining']}`);
  }

  return response;
};

// Generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CUSTOM_THEME,
    API_CONFIG,
    AUTH_HELPERS,
    requestInterceptor,
    responseInterceptor,
  };
}

// Example usage in console
console.log(`
Noa Server API Documentation - Helper Functions

Available in console:
- AUTH_HELPERS.setToken(token)     - Store authentication token
- AUTH_HELPERS.getToken()          - Retrieve stored token
- AUTH_HELPERS.clearToken()        - Clear stored token
- API_CONFIG                       - View API configuration
`);
