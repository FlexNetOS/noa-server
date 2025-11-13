# Noa Server Docker Configuration

This directory contains all Docker-related configuration for the Noa Server
project.

## Quick Start

### Development

```bash
# Start all services in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Start all services in production mode
docker-compose -f docker-compose.yml up -d

# View service status
docker-compose ps

# Stop services (keep data)
docker-compose down

# Stop services (remove data)
docker-compose down -v
```

## Files

- `Dockerfile` - Multi-stage Dockerfile for all services
- `docker-compose.yml` - Main compose configuration
- `docker-compose.dev.yml` - Development overrides
- `.dockerignore` - Files excluded from build context
- `init-db.sql` - PostgreSQL initialization script

## Services

| Service      | Port | Purpose                   |
| ------------ | ---- | ------------------------- |
| mcp          | 8001 | Model Context Protocol    |
| claude-flow  | 9100 | AI workflow orchestration |
| ui-dashboard | 9200 | Web interface             |
| llama-cpp    | 9300 | Neural processing         |
| agenticos    | 9400 | Agent management          |
| postgres     | 5432 | Database                  |
| redis        | 6379 | Cache                     |

## Building Individual Services

```bash
# Build specific service
docker build -f Dockerfile --target mcp-service -t noa-mcp:latest ..

# Build with specific Node.js version
docker build -f Dockerfile --build-arg NODE_VERSION=20 -t noa-mcp:latest ..
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp ../.env.example ../.env
nano ../.env
```

See
[Environment Variables Guide](../docs/infrastructure/ENVIRONMENT_VARIABLES.md)
for details.

## Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs <service-name>

# Restart service
docker-compose restart <service-name>

# Rebuild service
docker-compose build --no-cache <service-name>
docker-compose up -d <service-name>
```

### Database connection issues

```bash
# Access PostgreSQL
docker exec -it noa-postgres psql -U noa -d noa

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

## Documentation

- [Complete Docker Guide](../docs/infrastructure/DOCKER_GUIDE.md)
- [Health Checks](../docs/infrastructure/HEALTH_CHECKS.md)
- [Infrastructure Overview](../docs/infrastructure/INFRASTRUCTURE_OVERVIEW.md)
