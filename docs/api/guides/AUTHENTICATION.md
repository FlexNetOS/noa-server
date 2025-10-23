# Authentication Guide

Complete guide to authentication and authorization in the Noa Server API.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [Registration and Login](#registration-and-login)
- [Token Management](#token-management)
- [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
- [Password Management](#password-management)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Security Best Practices](#security-best-practices)

## Overview

Noa Server API uses **JWT (JSON Web Tokens)** for authentication with support for:

- Email/password authentication
- Multi-factor authentication (MFA)
- API key authentication
- OAuth 2.0 (coming soon)
- Role-based access control (RBAC)

## Authentication Methods

### 1. Bearer Token (JWT)

Primary authentication method using JWT tokens:

```bash
curl -X GET https://api.noa-server.io/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. API Key

For server-to-server communication:

```bash
curl -X GET https://api.noa-server.io/v1/users/me \
  -H "X-API-Key: noa_sk_live_abc123xyz789"
```

## Registration and Login

### User Registration

**Endpoint**: `POST /auth/register`

```bash
curl -X POST https://api.noa-server.io/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe",
    "roles": ["user"],
    "emailVerified": false,
    "createdAt": "2025-10-22T10:00:00Z"
  }
}
```

### User Login

**Endpoint**: `POST /auth/login`

```bash
curl -X POST https://api.noa-server.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "rememberMe": false
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "username": "johndoe",
      "roles": ["user"],
      "mfaEnabled": false
    }
  }
}
```

### Login with MFA

If MFA is enabled, include the MFA code:

```bash
curl -X POST https://api.noa-server.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "mfaCode": "123456"
  }'
```

## Token Management

### Access Token

- **Purpose**: Authenticate API requests
- **Lifetime**: 1 hour (configurable)
- **Usage**: Include in `Authorization` header

### Refresh Token

- **Purpose**: Obtain new access tokens without re-authentication
- **Lifetime**: 30 days (configurable)
- **Usage**: Exchange for new access token

### Token Refresh

**Endpoint**: `POST /auth/refresh`

```bash
curl -X POST https://api.noa-server.io/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

### Token Storage

**Client-side Best Practices**:

```javascript
// Store tokens securely
class TokenManager {
  static setTokens(accessToken, refreshToken) {
    // Use httpOnly cookies in production
    sessionStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  static getAccessToken() {
    return sessionStorage.getItem('accessToken');
  }

  static getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  static clearTokens() {
    sessionStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  static async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();

    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();
    this.setTokens(data.accessToken, data.refreshToken);

    return data.accessToken;
  }
}
```

### Automatic Token Refresh

```javascript
// Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await TokenManager.refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        TokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

## Multi-Factor Authentication (MFA)

### Setup MFA

**Step 1: Initialize MFA Setup**

**Endpoint**: `POST /auth/mfa/setup`

```bash
curl -X POST https://api.noa-server.io/v1/auth/mfa/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "backupCodes": [
      "ABC123DEF456",
      "GHI789JKL012",
      "MNO345PQR678"
    ]
  }
}
```

**Step 2: Verify and Enable MFA**

**Endpoint**: `POST /auth/mfa/verify`

```bash
curl -X POST https://api.noa-server.io/v1/auth/mfa/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "secret": "JBSWY3DPEHPK3PXP"
  }'
```

### Using MFA with Login

Once MFA is enabled, include the 6-digit code during login:

```bash
curl -X POST https://api.noa-server.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "mfaCode": "123456"
  }'
```

### Backup Codes

If you lose access to your MFA device, use a backup code:

```bash
curl -X POST https://api.noa-server.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "mfaCode": "ABC123DEF456"
  }'
```

## Password Management

### Change Password

**Endpoint**: `POST /auth/password/change`

```bash
curl -X POST https://api.noa-server.io/v1/auth/password/change \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewSecurePass456!"
  }'
```

### Password Reset

**Step 1: Request Password Reset**

**Endpoint**: `POST /auth/password/reset`

```bash
curl -X POST https://api.noa-server.io/v1/auth/password/reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

**Step 2: Reset Password with Token**

Check your email for the reset token, then:

```bash
curl -X POST https://api.noa-server.io/v1/auth/password/reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_from_email",
    "newPassword": "NewSecurePass456!"
  }'
```

## Role-Based Access Control (RBAC)

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | Full system access | All operations |
| `user` | Standard user | Own resources + workflows |
| `agent` | AI agent account | Execute tasks only |
| `viewer` | Read-only access | View resources only |

### Checking Permissions

**Endpoint**: `GET /users/{userId}/permissions`

```bash
curl -X GET https://api.noa-server.io/v1/users/me/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": [
    "users:read",
    "users:write",
    "workflows:execute",
    "agents:spawn",
    "mcp:execute"
  ]
}
```

### Permission Format

Permissions use the format: `resource:action`

Examples:
- `users:read` - Read user information
- `users:write` - Create/update users
- `users:delete` - Delete users
- `workflows:execute` - Execute workflows
- `agents:spawn` - Spawn new agents
- `mcp:execute` - Execute MCP tools

## Security Best Practices

### 1. Token Security

```javascript
// ✅ DO: Store tokens securely
// Use httpOnly cookies in production
document.cookie = `accessToken=${token}; Secure; HttpOnly; SameSite=Strict`;

// ❌ DON'T: Store in localStorage for sensitive data
localStorage.setItem('accessToken', token); // Vulnerable to XSS
```

### 2. HTTPS Only

Always use HTTPS in production:

```javascript
if (location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
  location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
```

### 3. Token Expiration Handling

```javascript
function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp * 1000 < Date.now();
}
```

### 4. Rate Limiting

Implement client-side rate limiting:

```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.requests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}
```

### 5. Secure Password Practices

```javascript
// Password strength validator
function validatePassword(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  return Object.values(requirements).every(Boolean);
}
```

### 6. Logout Cleanup

```javascript
async function logout() {
  try {
    await fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`
      },
      body: JSON.stringify({
        refreshToken: TokenManager.getRefreshToken()
      })
    });
  } finally {
    TokenManager.clearTokens();
    sessionStorage.clear();
    window.location.href = '/login';
  }
}
```

## Troubleshooting

### Common Issues

**1. 401 Unauthorized**
- Check if token is expired
- Verify token format: `Bearer <token>`
- Ensure token is valid

**2. 403 Forbidden**
- Verify user has required role
- Check permission requirements
- Contact admin for role assignment

**3. Token Refresh Fails**
- Refresh token may be expired
- Re-authenticate with credentials
- Check refresh token validity

### Testing Authentication

```bash
# Test token validity
curl -X GET https://api.noa-server.io/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -v
```

---

For more information, see:
- [API Quick Start](./API_QUICKSTART.md)
- [Rate Limiting Guide](./RATE_LIMITING.md)
- [Swagger UI](../swagger-ui/index.html)
