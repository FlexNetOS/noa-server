# MCP Authentication & Monitoring - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd /home/deflex/noa-server/mcp
pip install flask pyjwt
```

### 2. Start Example Server

```bash
python example_server.py
```

Output will show demo credentials:

```
Demo users initialized:
  Admin Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Developer Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Admin API Key: noa_mcp_xxxxxxxxxxxxxxxxxxxxx...
```

### 3. Test Authentication

```bash
# Get token
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "myuser", "role": "developer"}'

# Response: {"token": "eyJ...", "type": "Bearer", "expires_in": 86400}
```

### 4. Call MCP Endpoint

```bash
# Use token from step 3
curl -X POST http://localhost:8080/mcp/swarm/init \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"topology": "mesh"}'

# Response: {"status": "success", "swarm_id": "swarm-1729589234"}
```

### 5. View Metrics

```bash
curl http://localhost:8080/metrics
```

## Common Operations

### Generate API Key

```bash
curl -X POST http://localhost:8080/auth/apikey \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "myuser",
    "role": "developer",
    "name": "Production Key",
    "expires_in_days": 90
  }'
```

### Test Different Endpoints

```bash
# Spawn agent
curl -X POST http://localhost:8080/mcp/agent/spawn \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "coder"}'

# Orchestrate tasks
curl -X POST http://localhost:8080/mcp/task/orchestrate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tasks": [{"name": "task1"}, {"name": "task2"}]}'

# Health check (no auth required)
curl http://localhost:8080/health
```

## Integration in Your Code

### Basic Setup

```python
from mcp.auth import AuthMiddleware, JWTHandler
from mcp.monitoring import get_metrics_collector, setup_logger, get_tracer

# Initialize
auth = AuthMiddleware(jwt_secret="your-secret")
logger = setup_logger("mcp")
tracer = get_tracer()
collector = get_metrics_collector()

# Your handler
def my_handler(request):
    # Authenticate
    user_context = auth.authenticate(request)
    auth.authorize(user_context, "mcp.tool.name", "execute")

    # Log
    logger.info("Processing request", extra_fields={"tool": "my_tool"})

    # Trace
    with tracer.span("my_operation"):
        result = do_work()

    # Metrics
    collector.get_metric("mcp_requests_total").inc(
        tool="my_tool", operation="execute", status="success"
    )

    return result
```

### Using Decorators

```python
from mcp.monitoring import track_request_metrics, trace_mcp_tool, log_operation

@track_request_metrics(tool="my_tool", operation="execute")
@trace_mcp_tool(tool="my_tool", operation="execute")
@log_operation(operation="execute", tool="my_tool")
def my_handler(request):
    # Your code here - metrics, tracing, and logging are automatic
    return {"status": "success"}
```

## Roles & Permissions

### Available Roles

| Role          | Description  | Access Level                     |
| ------------- | ------------ | -------------------------------- |
| `admin`       | Full access  | All tools, all operations        |
| `developer`   | Development  | Most tools, no system management |
| `readonly`    | Monitoring   | Read-only access                 |
| `operator`    | Operations   | Deployment and monitoring        |
| `ml-engineer` | ML workloads | Neural processing tools          |
| `ci-bot`      | CI/CD        | Limited automation access        |
| `guest`       | Minimal      | Basic health checks only         |

### Check Permissions

```python
from mcp.auth import RBACManager

rbac = RBACManager()

# Check if developer can execute swarm.init
allowed = rbac.check_permission(
    role_name="developer",
    resource="mcp.swarm.init",
    operation="execute"
)  # Returns: True

# Get all allowed resources
resources = rbac.get_allowed_resources(
    role_name="developer",
    operation="execute"
)  # Returns: ['mcp.swarm.*', 'mcp.agent.*', ...]
```

## Monitoring Setup

### Prometheus

Create `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'mcp-server'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

Start Prometheus:

```bash
./prometheus --config.file=prometheus.yml
```

### Grafana Dashboard

1. Add Prometheus data source: `http://localhost:9090`
2. Import dashboard: `/home/deflex/noa-server/mcp/monitoring/dashboard.json`
3. View metrics in real-time

### Alert Rules

Copy alerts to Prometheus:

```bash
cp /home/deflex/noa-server/mcp/monitoring/alerts.yml /etc/prometheus/
```

Add to `prometheus.yml`:

```yaml
rule_files:
  - '/etc/prometheus/alerts.yml'
```

## Troubleshooting

### Authentication Failed

```bash
# Check token expiry
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"user_id": "myuser", "role": "developer"}'
```

### Rate Limit Exceeded

Wait for rate limit window to expire (default: 60 seconds) or request rate limit
increase.

### Permission Denied

Check role permissions:

```python
from mcp.auth import RBACManager

rbac = RBACManager()
rbac.check_permission("developer", "mcp.swarm.init", "execute")
```

## File Locations

- **Authentication**: `/home/deflex/noa-server/mcp/auth/`
- **Monitoring**: `/home/deflex/noa-server/mcp/monitoring/`
- **Example Server**: `/home/deflex/noa-server/mcp/example_server.py`
- **Dashboard**: `/home/deflex/noa-server/mcp/monitoring/dashboard.json`
- **Alerts**: `/home/deflex/noa-server/mcp/monitoring/alerts.yml`
- **Permissions**: `/home/deflex/noa-server/mcp/auth/permissions.json`

## Documentation

- **Full Auth Guide**: `/home/deflex/noa-server/mcp/auth/README.md`
- **Full Monitoring Guide**: `/home/deflex/noa-server/mcp/monitoring/README.md`
- **Implementation Details**:
  `/home/deflex/noa-server/mcp/IMPLEMENTATION_SUMMARY.md`

## Production Checklist

- [ ] Change JWT_SECRET to secure random value
- [ ] Enable HTTPS/TLS
- [ ] Configure rate limits per role
- [ ] Set up log rotation
- [ ] Configure Prometheus scraping
- [ ] Import Grafana dashboard
- [ ] Set up alert notifications
- [ ] Review and customize RBAC roles
- [ ] Enable audit logging
- [ ] Configure backup for API keys
- [ ] Set up monitoring alerts
- [ ] Test authentication flow
- [ ] Test authorization for all roles
- [ ] Load test rate limiting
- [ ] Review security settings

## Support

- **Issues**: GitHub Issues
- **Documentation**: See README files in auth/ and monitoring/ directories
- **Examples**: See example_server.py for complete integration

---

**Ready to go!** Start with the example server and customize for your needs.
