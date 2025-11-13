# Python API Client

Python client library for the Noa Server API, auto-generated from the OpenAPI
specification.

## Installation

### From PyPI (when published)

```bash
pip install noa-server-api-client
```

### From local generation

```bash
# Generate the client
./generate-client.sh

# Install
cd generated
source venv/bin/activate
pip install -e .
```

## Quick Start

```python
from noa_server_api import Configuration, ApiClient
from noa_server_api.api import AuthenticationApi, UsersApi
from noa_server_api.exceptions import ApiException

# Configure API client
configuration = Configuration(
    host='https://api.noa-server.io/v1',
    access_token='YOUR_ACCESS_TOKEN'
)

# Login
def login(email: str, password: str) -> str:
    with ApiClient(configuration) as api_client:
        auth_api = AuthenticationApi(api_client)

        try:
            response = auth_api.auth_login({
                'email': email,
                'password': password
            })

            access_token = response.data.access_token
            print(f'Logged in successfully: {access_token}')
            return access_token

        except ApiException as e:
            print(f'Login failed: {e}')
            raise

# Get current user
def get_current_user():
    with ApiClient(configuration) as api_client:
        users_api = UsersApi(api_client)
        response = users_api.users_me()
        return response.data
```

## Available APIs

### AuthenticationApi

```python
from noa_server_api.api import AuthenticationApi

with ApiClient(configuration) as api_client:
    auth_api = AuthenticationApi(api_client)

    # Register
    auth_api.auth_register({
        'email': 'user@example.com',
        'password': 'SecurePass123!',
        'username': 'johndoe'
    })

    # Login
    response = auth_api.auth_login({
        'email': 'user@example.com',
        'password': 'SecurePass123!'
    })

    # Logout
    auth_api.auth_logout()

    # Refresh token
    auth_api.auth_refresh({'refreshToken': refresh_token})

    # Setup MFA
    auth_api.auth_mfa_setup()

    # Verify MFA
    auth_api.auth_mfa_verify({'code': '123456', 'secret': secret})
```

### UsersApi

```python
from noa_server_api.api import UsersApi

with ApiClient(configuration) as api_client:
    users_api = UsersApi(api_client)

    # List users
    users_api.users(page=1, limit=20)

    # Get user
    users_api.users_user_id(user_id='uuid')

    # Update user
    users_api.users_user_id_update(
        user_id='uuid',
        body={'firstName': 'John', 'lastName': 'Doe'}
    )

    # Get current user
    users_api.users_me()

    # Get user permissions
    users_api.users_user_id_permissions(user_id='uuid')
```

### WorkflowsApi

```python
from noa_server_api.api import WorkflowsApi

with ApiClient(configuration) as api_client:
    workflows_api = WorkflowsApi(api_client)

    # List workflows
    workflows_api.workflows(page=1, limit=20)

    # Create workflow
    workflows_api.workflows_create({
        'name': 'Data Processing Pipeline',
        'definition': {
            'steps': [...]
        }
    })

    # Execute workflow
    workflows_api.workflows_workflow_id_execute(
        workflow_id='uuid',
        body={'parameters': {...}}
    )

    # Get workflow status
    workflows_api.workflows_workflow_id_status(workflow_id='uuid')

    # List executions
    workflows_api.workflows_executions(workflow_id='uuid')
```

### AgentsApi

```python
from noa_server_api.api import AgentsApi

with ApiClient(configuration) as api_client:
    agents_api = AgentsApi(api_client)

    # List agents
    agents_api.agents(status='idle')

    # Spawn agent
    agents_api.agents_create({
        'type': 'coder',
        'capabilities': ['python', 'typescript']
    })

    # Get agent
    agents_api.agents_agent_id(agent_id='uuid')

    # Assign task
    agents_api.agents_agent_id_tasks(
        agent_id='uuid',
        body={'type': 'code_generation', 'parameters': {...}}
    )

    # Create swarm
    agents_api.agents_swarms({
        'name': 'Development Swarm',
        'topology': 'hierarchical'
    })

    # Coordinate swarm
    agents_api.agents_swarm_id_coordinate(
        swarm_id='uuid',
        body={'task': {...}, 'strategy': 'hierarchical'}
    )
```

### MCPToolsApi

```python
from noa_server_api.api import MCPToolsApi

with ApiClient(configuration) as api_client:
    mcp_api = MCPToolsApi(api_client)

    # List tools
    mcp_api.mcp_tools()

    # Get tool details
    mcp_api.mcp_tools_tool_id(tool_id='filesystem')

    # Execute tool
    mcp_api.mcp_tools_tool_id_execute(
        tool_id='filesystem',
        body={'parameters': {...}}
    )

    # Filesystem operations
    mcp_api.mcp_filesystem({
        'operation': 'read',
        'path': '/data/file.txt'
    })

    # SQLite operations
    mcp_api.mcp_sqlite({
        'database': 'app.db',
        'query': 'SELECT * FROM users'
    })

    # GitHub operations
    mcp_api.mcp_github({
        'operation': 'create_issue',
        'repository': 'owner/repo',
        'parameters': {...}
    })
```

## Configuration

### Basic Configuration

```python
from noa_server_api import Configuration

configuration = Configuration(
    host='https://api.noa-server.io/v1',
    access_token='YOUR_ACCESS_TOKEN'
)
```

### With API Key

```python
configuration = Configuration(
    host='https://api.noa-server.io/v1',
    api_key={'X-API-Key': 'YOUR_API_KEY'}
)
```

### Custom Headers

```python
configuration = Configuration(
    host='https://api.noa-server.io/v1',
    access_token='YOUR_ACCESS_TOKEN'
)

# Add custom headers
api_client = ApiClient(configuration)
api_client.default_headers['X-Client-ID'] = 'my-app'
api_client.default_headers['X-Client-Version'] = '1.0.0'
```

## Error Handling

```python
from noa_server_api.exceptions import ApiException, UnauthorizedException

try:
    auth_api.auth_login({'email': email, 'password': password})
except UnauthorizedException as e:
    print(f'Authentication failed: {e}')
except ApiException as e:
    print(f'API Error: Status {e.status}')
    print(f'Reason: {e.reason}')
    print(f'Body: {e.body}')

    # Handle specific errors
    if e.status == 429:
        retry_after = e.headers.get('Retry-After')
        print(f'Rate limited. Retry after {retry_after} seconds')
```

## Token Management

```python
class TokenManager:
    def __init__(self):
        self.access_token: str = None
        self.refresh_token: str = None
        self.configuration: Configuration = None

    def login(self, email: str, password: str) -> str:
        config = Configuration(host='https://api.noa-server.io/v1')

        with ApiClient(config) as api_client:
            auth_api = AuthenticationApi(api_client)
            response = auth_api.auth_login({
                'email': email,
                'password': password
            })

            self.access_token = response.data.access_token
            self.refresh_token = response.data.refresh_token

            # Update configuration
            self.configuration = Configuration(
                host='https://api.noa-server.io/v1',
                access_token=self.access_token
            )

            return self.access_token

    def refresh_access_token(self) -> str:
        if not self.refresh_token:
            raise ValueError('No refresh token available')

        config = Configuration(host='https://api.noa-server.io/v1')

        with ApiClient(config) as api_client:
            auth_api = AuthenticationApi(api_client)
            response = auth_api.auth_refresh({
                'refreshToken': self.refresh_token
            })

            self.access_token = response.data.access_token
            self.refresh_token = response.data.refresh_token

            # Update configuration
            self.configuration.access_token = self.access_token

            return self.access_token

    def get_api_client(self) -> ApiClient:
        if not self.configuration:
            raise ValueError('Not authenticated')
        return ApiClient(self.configuration)
```

## Pagination

```python
def get_all_users():
    with ApiClient(configuration) as api_client:
        users_api = UsersApi(api_client)
        all_users = []
        page = 1

        while True:
            response = users_api.users(page=page, limit=100)
            users = response.data
            all_users.extend(users)

            # Check if there are more pages
            if not response.meta.has_next:
                break

            page += 1

        return all_users
```

## Async Support

```python
import asyncio
from noa_server_api import ApiClient, Configuration
from noa_server_api.api import UsersApi

async def get_user_async(user_id: str):
    configuration = Configuration(
        host='https://api.noa-server.io/v1',
        access_token='YOUR_ACCESS_TOKEN'
    )

    async with ApiClient(configuration) as api_client:
        users_api = UsersApi(api_client)
        response = await users_api.users_user_id(user_id)
        return response.data

# Run async function
user = asyncio.run(get_user_async('uuid'))
```

## Type Hints

The client is fully typed with Python type hints:

```python
from noa_server_api.models import User, Workflow, Agent

# Type-safe user object
user: User = User(
    id='550e8400-e29b-41d4-a716-446655440000',
    email='user@example.com',
    username='johndoe',
    roles=['user']
)

# Type-safe workflow
workflow: Workflow = Workflow(
    id='wf_123',
    name='Data Processing',
    status='active',
    definition={'steps': [...]}
)
```

## Examples

See the [examples](./examples) directory for complete working examples:

- `basic_auth.py` - Authentication and login
- `workflow_management.py` - Create and execute workflows
- `agent_swarm.py` - Spawn and coordinate agents
- `mcp_tools.py` - Execute MCP tools
- `error_handling.py` - Comprehensive error handling

## Development

### Generate Client

```bash
./generate-client.sh
```

### Run Tests

```bash
cd generated
source venv/bin/activate
python -m pytest tests/
```

### Type Checking

```bash
mypy noa_server_api/
```

## Support

- **Documentation**: https://docs.noa-server.io
- **GitHub**: https://github.com/deflex/noa-server
- **Issues**: https://github.com/deflex/noa-server/issues
