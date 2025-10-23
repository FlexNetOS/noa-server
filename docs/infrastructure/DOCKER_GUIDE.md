# Noa Server Docker Guide

## Overview

This guide covers the Docker-based deployment of Noa Server, including multi-service orchestration, health monitoring, and production best practices.

## Architecture

The Noa Server consists of 5 main services orchestrated via Docker Compose:

1. **MCP Service** - Model Context Protocol coordination (Port 8001)
2. **Claude Flow** - AI orchestration and workflow management (Port 9100)
3. **UI Dashboard** - Next.js frontend interface (Port 9200)
4. **Llama.cpp** - Neural processing with CUDA support (Port 9300)
5. **AgenticOS** - Agent system management (Port 9400)

### Supporting Services

- **Redis** - Caching and session storage (Port 6379)
- **PostgreSQL** - Primary data store (Port 5432)

## Quick Start

### Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- 8GB+ RAM
- (Optional) NVIDIA GPU with CUDA support for llama.cpp

### Basic Deployment

```bash
# Navigate to project root
cd /home/deflex/noa-server

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Build and start all services
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Check service health
docker-compose -f docker/docker-compose.yml ps
```

### Development Mode

```bash
# Use development override
docker-compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.dev.yml \
  up -d

# Hot reload is enabled for all services
```

## Service Details

### MCP Service

**Image**: Built from `Dockerfile` stage `mcp-service`
**Port**: 8001
**Health Check**: `http://localhost:8001/health`
**Resources**: 0.5-1.0 CPU, 256-512MB RAM

```bash
# Access MCP service
curl http://localhost:8001/health

# View logs
docker-compose logs -f mcp
```

### Claude Flow Service

**Image**: Built from `Dockerfile` stage `claude-flow-service`
**Port**: 9100
**Health Check**: `http://localhost:9100/health`
**Resources**: 1.0-2.0 CPU, 512MB-1GB RAM

Depends on MCP service being healthy.

### UI Dashboard

**Image**: Built from `Dockerfile` stage `ui-dashboard`
**Port**: 9200
**Health Check**: `http://localhost:9200/api/health`
**Resources**: 0.5-1.5 CPU, 384-768MB RAM

Next.js application with server-side rendering.

### Llama.cpp Neural Service

**Image**: Built from `Dockerfile` stage `llama-service`
**Port**: 9300
**Health Check**: `http://localhost:9300/health`
**Resources**: 2.0-4.0 CPU, 2-4GB RAM, 1 GPU (optional)

```bash
# Enable GPU support
CUDA_VISIBLE_DEVICES=0 docker-compose up llama-cpp

# Check GPU utilization
nvidia-smi
```

### AgenticOS Service

**Image**: Built from `Dockerfile` stage `agenticos-service`
**Port**: 9400
**Health Check**: `http://localhost:9400/health`
**Resources**: 1.0-2.0 CPU, 512MB-1GB RAM

## Environment Variables

### Required Variables

```bash
# Core
NODE_ENV=production
LOG_LEVEL=info

# Service Ports
MCP_PORT=8001
CLAUDE_FLOW_PORT=9100
UI_PORT=9200
LLAMA_PORT=9300
AGENTICOS_PORT=9400

# Database
POSTGRES_USER=noa
POSTGRES_PASSWORD=secure-password-here
POSTGRES_DB=noa

# Cache
REDIS_PASSWORD=secure-redis-password
```

### Optional Variables

```bash
# GPU Configuration
CUDA_VISIBLE_DEVICES=0

# Model Path
LLM_MODEL_PATH=/app/models/demo.gguf

# Memory Limits
MCP_MEMORY_LIMIT=512m
```

## Volume Management

### Persistent Volumes

```bash
# List volumes
docker volume ls | grep noa

# Inspect volume
docker volume inspect docker_mcp-data

# Backup volume
docker run --rm -v docker_mcp-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/mcp-data-backup.tar.gz /data

# Restore volume
docker run --rm -v docker_mcp-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/mcp-data-backup.tar.gz -C /
```

### Volume Locations

- `mcp-data` - MCP service data
- `claude-flow-data` - Claude Flow workflows
- `claude-flow-cache` - Claude Flow cache
- `llama-models` - Neural models (read-only)
- `postgres-data` - Database storage
- `redis-data` - Cache storage

## Health Monitoring

### Health Check Endpoints

Each service exposes health endpoints:

```bash
# MCP
curl http://localhost:8001/health

# Claude Flow
curl http://localhost:9100/health

# UI Dashboard
curl http://localhost:9200/api/health

# Llama.cpp
curl http://localhost:9300/health

# AgenticOS
curl http://localhost:9400/health
```

### Docker Health Status

```bash
# Check all services
docker-compose ps

# Inspect specific service health
docker inspect noa-mcp | jq '.[0].State.Health'
```

## Networking

### Internal Network

Services communicate via bridge network `noa-network` (172.28.0.0/16):

```bash
# Inspect network
docker network inspect docker_noa-network

# Service discovery uses DNS
# Example: http://mcp:8001 from claude-flow container
```

### External Access

- MCP: `http://localhost:8001`
- Claude Flow: `http://localhost:9100`
- UI Dashboard: `http://localhost:9200`
- Llama.cpp: `http://localhost:9300`
- AgenticOS: `http://localhost:9400`

## Building Images

### Build All Services

```bash
# Build all stages
docker-compose -f docker/docker-compose.yml build

# Build specific service
docker-compose build mcp

# Build without cache
docker-compose build --no-cache
```

### Build Specific Stages

```bash
cd /home/deflex/noa-server

# Build MCP only
docker build -f docker/Dockerfile --target mcp-service -t noa-mcp:latest .

# Build UI Dashboard
docker build -f docker/Dockerfile --target ui-dashboard -t noa-ui:latest .

# Build Llama.cpp with GPU
docker build -f docker/Dockerfile --target llama-service \
  --build-arg CUDA_VERSION=12.2 -t noa-llama:latest .
```

## Scaling Services

```bash
# Scale Claude Flow to 3 instances
docker-compose up -d --scale claude-flow=3

# Scale UI Dashboard to 5 instances
docker-compose up -d --scale ui-dashboard=5
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs mcp

# Check resource usage
docker stats

# Restart service
docker-compose restart mcp
```

#### Health Check Failing

```bash
# Exec into container
docker exec -it noa-mcp sh

# Test health endpoint
curl localhost:8001/health

# Check environment
env | grep -E "(PORT|URL)"
```

#### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec -it noa-postgres psql -U noa -d noa -c "SELECT 1;"

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Performance Optimization

```bash
# Monitor resource usage
docker stats

# Adjust memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
docker-compose build
```

## Security Best Practices

1. **Never commit .env files**
2. **Use secrets management** (Docker Secrets, Vault)
3. **Run as non-root user** (already configured)
4. **Keep images updated** (`docker-compose pull`)
5. **Use read-only root filesystem** (configured in Dockerfile)
6. **Scan images** (`docker scan noa-server:latest`)
7. **Limit network exposure** (bind to localhost in production)

## Production Deployment

### Pre-deployment Checklist

- [ ] Update all secrets in .env
- [ ] Configure resource limits
- [ ] Enable TLS/SSL
- [ ] Set up log aggregation
- [ ] Configure backup strategy
- [ ] Test health checks
- [ ] Review security settings
- [ ] Set up monitoring/alerting

### Production Commands

```bash
# Pull latest images
docker-compose pull

# Start with restart policy
docker-compose up -d --force-recreate

# Verify all services healthy
docker-compose ps | grep -E "(healthy|running)"

# Enable log rotation
docker-compose up -d --log-opt max-size=10m --log-opt max-file=3
```

## Maintenance

### Updates

```bash
# Pull latest images
docker-compose pull

# Recreate services with new images
docker-compose up -d --force-recreate

# Clean old images
docker image prune -a
```

### Backups

```bash
# Backup script
#!/bin/bash
BACKUP_DIR=/backups/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

# Backup volumes
docker run --rm -v docker_postgres-data:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/postgres-data.tar.gz /data

# Backup database
docker exec noa-postgres pg_dump -U noa noa > $BACKUP_DIR/noa-db.sql
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Kubernetes Migration Guide](./KUBERNETES_GUIDE.md)
- [Environment Variables Reference](./ENVIRONMENT_VARIABLES.md)
