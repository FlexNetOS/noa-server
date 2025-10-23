# MCP Authentication & Authorization

Comprehensive authentication and authorization system for MCP servers with support for JWT tokens, API keys, and role-based access control.

## Features

- **Multiple Authentication Methods**
  - JWT token authentication
  - API key authentication
  - Extensible for OAuth2, SAML, etc.

- **Role-Based Access Control (RBAC)**
  - Predefined roles: admin, developer, readonly, operator
  - Custom role creation
  - Role inheritance
  - Fine-grained permissions

- **Security Features**
  - Rate limiting per user/IP
  - Token revocation and blacklisting
  - API key rotation
  - Audit logging
  - Request validation

## Quick Start

### 1. Initialize Authentication Middleware

```python
from mcp.auth.auth_middleware import AuthMiddleware

# Initialize with JWT secret
auth = AuthMiddleware(
    jwt_secret="your-secret-key-here",
    jwt_algorithm="HS256",
    jwt_expiry_hours=24,
    rate_limit_requests=100,
    rate_limit_window_seconds=60
)
```

### 2. Generate Authentication Credentials

#### JWT Tokens

```python
from mcp.auth.jwt_handler import JWTHandler

jwt_handler = JWTHandler(
    secret_key="your-secret-key",
    algorithm="HS256",
    expiry_hours=24
)

# Generate token
token = jwt_handler.generate_token(
    user_id="user123",
    role="developer"
)

# Verify token
user_context = jwt_handler.verify_token(token)
```

#### API Keys

```python
from mcp.auth.api_key_handler import APIKeyHandler

api_key_handler = APIKeyHandler(key_prefix="noa_mcp_")

# Generate API key
api_key = api_key_handler.generate_key(
    user_id="user123",
    role="developer",
    name="Production API Key",
    expires_in_days=90
)

# Verify API key
user_context = api_key_handler.verify_api_key(api_key)
```

### 3. Apply Authentication to Requests

```python
# Using middleware decorator
@auth.middleware
def handle_request(request):
    user = request["user_context"]
    print(f"Authenticated as: {user['user_id']}")
    return {"status": "success"}

# Or manual authentication
try:
    user_context = auth.authenticate(request)
    auth.authorize(user_context, tool="mcp.swarm.init", operation="execute")
    auth.check_rate_limit(user_context)
except Exception as e:
    print(f"Authentication failed: {e}")
```

## Authentication Methods

### JWT Authentication

JWT tokens provide stateless authentication with cryptographic signatures.

**Request Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Payload:**
```json
{
  "iss": "noa-mcp-server",
  "sub": "user123",
  "role": "developer",
  "exp": 1735689600,
  "user_id": "user123"
}
```

**Operations:**
- Generate token: `jwt_handler.generate_token(user_id, role)`
- Verify token: `jwt_handler.verify_token(token)`
- Refresh token: `jwt_handler.refresh_token(token)`
- Revoke token: `jwt_handler.revoke_token(token)`

### API Key Authentication

API keys provide simple authentication for programmatic access.

**Request Header:**
```
X-API-Key: noa_mcp_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**Operations:**
- Generate key: `api_key_handler.generate_key(user_id, role, name)`
- Verify key: `api_key_handler.verify_api_key(key)`
- Rotate key: `api_key_handler.rotate_key(old_key)`
- Revoke key: `api_key_handler.revoke_key(key)`

## Role-Based Access Control

### Predefined Roles

#### Admin Role
- **Permissions:** Full access to all MCP tools and operations
- **Use Case:** System administrators, platform owners
- **Resources:** `*` (all)
- **Operations:** `*` (all)

#### Developer Role
- **Permissions:** Access to development tools, no system management
- **Use Case:** Application developers, ML engineers
- **Resources:**
  - `mcp.swarm.*`, `mcp.agent.*`, `mcp.task.*`
  - `mcp.memory.*`, `mcp.neural.*`
  - `mcp.github.*`
- **Operations:** `execute`, `read`, `write`

#### Read-Only Role
- **Permissions:** Read access to status and monitoring
- **Use Case:** Auditors, observers, dashboards
- **Resources:**
  - `mcp.swarm.status`, `mcp.agent.list`
  - `mcp.monitoring.*`
- **Operations:** `read`

#### Operator Role
- **Permissions:** Operations access for deployment and monitoring
- **Use Case:** DevOps engineers, SREs
- **Resources:**
  - `mcp.swarm.*`, `mcp.monitoring.*`
  - `mcp.system.health`
- **Operations:** Varies by resource

### Custom Roles

Create custom roles for specific use cases:

```python
from mcp.auth.rbac import RBACManager, Role, Permission

rbac = RBACManager()

# Create ML engineer role
ml_role = Role(
    name="ml-engineer",
    description="ML engineer with neural processing access",
    permissions=[
        Permission(resource="mcp.neural.*", operations=["*"]),
        Permission(resource="llama.*", operations=["execute"]),
        Permission(resource="mcp.memory.*", operations=["read", "write"])
    ]
)

rbac.add_role(ml_role)
```

### Permission Checking

```python
from mcp.auth.rbac import RBACManager

rbac = RBACManager()

# Check permission
allowed = rbac.check_permission(
    role_name="developer",
    resource="mcp.swarm.init",
    operation="execute"
)

# Get allowed resources
resources = rbac.get_allowed_resources(
    role_name="developer",
    operation="execute"
)
```

## Configuration

### Permissions File

The `permissions.json` file defines roles and permissions:

```json
{
  "roles": [
    {
      "name": "developer",
      "description": "Development access",
      "permissions": [
        {
          "resource": "mcp.swarm.*",
          "operations": ["execute", "read"],
          "conditions": {}
        }
      ],
      "inherits": []
    }
  ]
}
```

Load custom permissions:

```python
rbac = RBACManager()
rbac.load_permissions("/path/to/permissions.json")
```

## Security Best Practices

### JWT Secrets

- Use strong, randomly generated secrets (32+ characters)
- Rotate secrets periodically
- Store secrets securely (environment variables, secret managers)
- Never commit secrets to version control

```bash
# Generate secure secret
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### API Key Management

- Use descriptive names for keys
- Set expiration dates (30-90 days)
- Rotate keys regularly
- Revoke unused keys
- Monitor key usage

### Rate Limiting

- Configure appropriate limits per role
- Monitor rate limit violations
- Implement exponential backoff
- Alert on suspicious patterns

### Audit Logging

- Enable audit logging in production
- Review logs regularly
- Alert on failed authentication attempts
- Track privileged operations

## Examples

### Complete Authentication Flow

```python
from mcp.auth.auth_middleware import AuthMiddleware
from mcp.auth.jwt_handler import JWTHandler
from mcp.auth.rbac import RBACManager

# Initialize components
jwt_handler = JWTHandler(secret_key="your-secret")
rbac = RBACManager()
auth = AuthMiddleware(jwt_secret="your-secret")

# Generate token for developer
token = jwt_handler.generate_token(
    user_id="dev001",
    role="developer"
)

# Simulate request
request = {
    "headers": {
        "Authorization": f"Bearer {token}"
    },
    "tool": "mcp.swarm.init",
    "operation": "execute"
}

# Authenticate and authorize
try:
    user_context = auth.authenticate(request)
    auth.check_rate_limit(user_context)
    auth.authorize(user_context, "mcp.swarm.init", "execute")
    print("Access granted!")
except Exception as e:
    print(f"Access denied: {e}")
```

### API Key Rotation

```python
from mcp.auth.api_key_handler import APIKeyHandler

api_key_handler = APIKeyHandler()

# Generate initial key
old_key = api_key_handler.generate_key(
    user_id="app001",
    role="developer",
    name="Production Key",
    expires_in_days=90
)

# Rotate key (e.g., before expiration)
new_key = api_key_handler.rotate_key(old_key)

print(f"New API key: {new_key}")
```

### Custom Role with Inheritance

```python
from mcp.auth.rbac import RBACManager, Role, Permission

rbac = RBACManager()

# Create base role
base_role = Role(
    name="base-developer",
    description="Base development permissions",
    permissions=[
        Permission(resource="mcp.task.*", operations=["execute", "read"])
    ]
)

# Create specialized role that inherits
ml_role = Role(
    name="ml-developer",
    description="ML developer with neural access",
    permissions=[
        Permission(resource="mcp.neural.*", operations=["*"]),
        Permission(resource="llama.*", operations=["execute"])
    ],
    inherits=["base-developer"]
)

rbac.add_role(base_role)
rbac.add_role(ml_role)

# Check inherited permission
can_execute_tasks = rbac.check_permission(
    "ml-developer",
    "mcp.task.orchestrate",
    "execute"
)  # True (inherited from base-developer)
```

## Integration with MCP Servers

### HTTP Server Integration

```python
from flask import Flask, request, jsonify
from mcp.auth.auth_middleware import AuthMiddleware

app = Flask(__name__)
auth = AuthMiddleware(jwt_secret="your-secret")

@app.route('/api/mcp/swarm/init', methods=['POST'])
def swarm_init():
    # Convert Flask request to auth request format
    auth_request = {
        "headers": dict(request.headers),
        "tool": "mcp.swarm.init",
        "operation": "execute"
    }

    try:
        # Authenticate and authorize
        user_context = auth.authenticate(auth_request)
        auth.check_rate_limit(user_context)
        auth.authorize(user_context, "mcp.swarm.init", "execute")

        # Handle request
        result = handle_swarm_init(request.json)

        # Audit log
        auth.audit_log_request(user_context, auth_request, result)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 403
```

### WebSocket Server Integration

```python
import asyncio
import websockets
from mcp.auth.auth_middleware import AuthMiddleware

auth = AuthMiddleware(jwt_secret="your-secret")

async def handle_connection(websocket, path):
    # Get token from query string or first message
    token = await websocket.recv()

    auth_request = {
        "headers": {"Authorization": f"Bearer {token}"},
        "tool": "mcp.agent.spawn",
        "operation": "execute"
    }

    try:
        user_context = auth.authenticate(auth_request)
        auth.authorize(user_context, "mcp.agent.spawn", "execute")

        # Handle WebSocket messages
        async for message in websocket:
            # Process authenticated messages
            pass

    except Exception as e:
        await websocket.send(f"Authentication failed: {e}")
        await websocket.close()

start_server = websockets.serve(handle_connection, "localhost", 8765)
asyncio.get_event_loop().run_until_complete(start_server)
```

## Testing

### Unit Tests

```python
import unittest
from mcp.auth.auth_middleware import AuthMiddleware
from mcp.auth.jwt_handler import JWTHandler

class TestAuthentication(unittest.TestCase):
    def setUp(self):
        self.jwt_handler = JWTHandler(secret_key="test-secret")
        self.auth = AuthMiddleware(jwt_secret="test-secret")

    def test_token_generation(self):
        token = self.jwt_handler.generate_token("user1", "developer")
        self.assertIsNotNone(token)

    def test_token_verification(self):
        token = self.jwt_handler.generate_token("user1", "developer")
        context = self.jwt_handler.verify_token(token)
        self.assertEqual(context["user_id"], "user1")

    def test_authorization(self):
        context = {"user_id": "user1", "role": "developer"}
        result = self.auth.authorize(context, "mcp.swarm.init", "execute")
        self.assertTrue(result)
```

## Troubleshooting

### Common Issues

**Issue:** "Invalid JWT token"
- Check token expiration
- Verify JWT secret matches
- Ensure token format is correct

**Issue:** "Rate limit exceeded"
- Check rate limit configuration
- Verify user is not making excessive requests
- Consider increasing limits for specific users

**Issue:** "Authorization failed"
- Verify role has required permissions
- Check resource and operation names
- Review permissions configuration

### Debug Mode

Enable debug logging:

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("mcp.auth")
logger.setLevel(logging.DEBUG)
```

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/deflex/noa-server/issues
- Documentation: https://docs.noa-server.io/mcp/auth
