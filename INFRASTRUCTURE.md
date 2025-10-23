# Noa Server Infrastructure Documentation

## Quick Links

### Getting Started
- [Infrastructure Overview](docs/infrastructure/INFRASTRUCTURE_OVERVIEW.md) - Start here for architecture overview
- [Docker Quick Start](docker/README.md) - Deploy with Docker Compose
- [Kubernetes Quick Start](k8s/README.md) - Deploy to Kubernetes

### Deployment Guides
- [Docker Deployment Guide](docs/infrastructure/DOCKER_GUIDE.md) - Complete Docker reference
- [Kubernetes Deployment Guide](docs/infrastructure/KUBERNETES_GUIDE.md) - Complete Kubernetes reference
- [Deployment Script](scripts/infrastructure/deploy.sh) - Automated deployment

### Configuration
- [Environment Variables](docs/infrastructure/ENVIRONMENT_VARIABLES.md) - All environment variables
- [Health Checks](docs/infrastructure/HEALTH_CHECKS.md) - Health check implementation

### Implementation Status
- [Phase 1 Summary](docs/infrastructure/PHASE1_SUMMARY.md) - What was delivered

## Project Structure

```
noa-server/
├── docker/                          # Docker configuration
│   ├── Dockerfile                   # Multi-stage production build
│   ├── docker-compose.yml          # Service orchestration
│   ├── docker-compose.dev.yml      # Development overrides
│   ├── init-db.sql                 # Database initialization
│   ├── .dockerignore              # Build optimization
│   └── README.md
│
├── k8s/                            # Kubernetes manifests
│   ├── base/                       # Base configurations
│   │   ├── *-deployment.yaml      # Service deployments
│   │   ├── configmap.yaml         # Configuration
│   │   ├── secrets.yaml           # Secret templates
│   │   ├── ingress.yaml           # Ingress rules
│   │   ├── hpa.yaml               # Auto-scaling
│   │   └── kustomization.yaml     # Kustomize config
│   ├── overlays/
│   │   ├── dev/                   # Development
│   │   ├── staging/               # Staging
│   │   └── prod/                  # Production
│   └── README.md
│
├── docs/infrastructure/            # Documentation
│   ├── INFRASTRUCTURE_OVERVIEW.md
│   ├── DOCKER_GUIDE.md
│   ├── KUBERNETES_GUIDE.md
│   ├── ENVIRONMENT_VARIABLES.md
│   ├── HEALTH_CHECKS.md
│   └── PHASE1_SUMMARY.md
│
├── scripts/infrastructure/         # Automation
│   └── deploy.sh                  # Deployment script
│
└── INFRASTRUCTURE.md              # This file
```

## Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| MCP | 8001 | Node.js | Model Context Protocol coordination |
| Claude Flow | 9100 | Node.js | AI workflow orchestration |
| UI Dashboard | 9200 | Next.js 14 | Web interface |
| Llama.cpp | 9300 | Python/C++ | Neural processing (CUDA) |
| AgenticOS | 9400 | Python | Agent system management |
| PostgreSQL | 5432 | PostgreSQL 16 | Primary database |
| Redis | 6379 | Redis 7 | Cache & sessions |

## Quick Start

### Docker Compose (Development)

```bash
# Navigate to project root
cd /home/deflex/noa-server

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Start all services
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d

# Check health
docker-compose ps
curl http://localhost:8001/health
curl http://localhost:9200/api/health

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes (Production)

```bash
# Prerequisites: kubectl, kustomize

# Create secrets (IMPORTANT!)
kubectl create secret generic noa-server-secrets \
  --from-literal=POSTGRES_PASSWORD='your-secure-password' \
  --from-literal=REDIS_PASSWORD='your-secure-password' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  -n noa-server

# Deploy
kubectl apply -k k8s/overlays/prod/

# Monitor deployment
kubectl get pods -n noa-server -w

# Check health
kubectl get pods -n noa-server
kubectl get svc -n noa-server
kubectl get ingress -n noa-server

# View logs
kubectl logs -f deployment/noa-mcp -n noa-server
```

### Using Deployment Script

```bash
# Docker development deployment
ENVIRONMENT=development DEPLOY_TYPE=docker ./scripts/infrastructure/deploy.sh deploy

# Kubernetes production deployment
ENVIRONMENT=production DEPLOY_TYPE=kubernetes ./scripts/infrastructure/deploy.sh deploy

# Check service health
./scripts/infrastructure/deploy.sh health

# View logs
./scripts/infrastructure/deploy.sh logs

# Stop services
./scripts/infrastructure/deploy.sh stop
```

## Environment Configuration

### Required Environment Variables

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

# Database (CHANGE IN PRODUCTION!)
POSTGRES_USER=noa
POSTGRES_PASSWORD=changeme-in-production
POSTGRES_DB=noa
POSTGRES_URL=postgresql://noa:changeme@localhost:5432/noa

# Cache (CHANGE IN PRODUCTION!)
REDIS_PASSWORD=changeme-in-production
REDIS_URL=redis://:changeme@localhost:6379

# Security (CHANGE IN PRODUCTION!)
JWT_SECRET=changeme-to-random-32-char-string
ENCRYPTION_KEY=changeme-to-random-64-char-hex
SESSION_SECRET=changeme-to-random-32-char-string

# Neural Processing
MODEL_PATH=/app/models/demo.gguf
CUDA_VISIBLE_DEVICES=0
```

See [complete environment variable reference](docs/infrastructure/ENVIRONMENT_VARIABLES.md).

## Health Monitoring

All services expose health check endpoints:

```bash
# MCP Service
curl http://localhost:8001/health
curl http://localhost:8001/health/ready

# Claude Flow
curl http://localhost:9100/health

# UI Dashboard
curl http://localhost:9200/api/health

# Llama.cpp
curl http://localhost:9300/health

# AgenticOS
curl http://localhost:9400/health
```

## Resource Requirements

### Minimum (Development)
- CPU: 4 vCPUs
- Memory: 8GB RAM
- Storage: 50GB

### Recommended (Production)
- CPU: 16+ vCPUs
- Memory: 32+ GB RAM
- Storage: 200GB SSD
- GPU: 1x NVIDIA GPU (optional, for llama.cpp)

## Scaling

### Docker Compose
```bash
# Scale specific service
docker-compose up -d --scale claude-flow=3
```

### Kubernetes
```bash
# Manual scaling
kubectl scale deployment noa-mcp --replicas=5 -n noa-server

# Auto-scaling is configured via HPA:
# - MCP: 2-10 replicas
# - Claude Flow: 2-8 replicas
# - UI Dashboard: 3-15 replicas
```

## Security Best Practices

1. **Change all default passwords** in .env file
2. **Use external secret management** (Vault, AWS Secrets Manager)
3. **Enable TLS** for all external traffic
4. **Run as non-root user** (already configured)
5. **Scan images regularly** for vulnerabilities
6. **Keep dependencies updated**
7. **Use network policies** in Kubernetes
8. **Enable audit logging**

## Troubleshooting

### Service Won't Start

```bash
# Docker
docker-compose logs <service-name>
docker-compose restart <service-name>

# Kubernetes
kubectl describe pod <pod-name> -n noa-server
kubectl logs <pod-name> -n noa-server
kubectl logs <pod-name> -n noa-server --previous
```

### Database Connection Issues

```bash
# Docker
docker exec -it noa-postgres psql -U noa -d noa

# Kubernetes
kubectl exec -it <postgres-pod> -n noa-server -- psql -U noa -d noa
```

### Health Check Failing

```bash
# Docker - exec into container
docker exec -it noa-mcp sh
curl localhost:8001/health

# Kubernetes - exec into pod
kubectl exec -it <pod-name> -n noa-server -- sh
curl localhost:8001/health
```

## Monitoring & Observability

### Metrics
- Prometheus annotations configured
- Metrics endpoint: `/metrics` on each service
- Grafana dashboards ready

### Logging
- JSON structured logging
- Log rotation: 10MB, 3 files
- Aggregation ready (Fluent Bit compatible)

### Tracing
- OpenTelemetry instrumentation ready
- Jaeger integration points configured

## Backup & Disaster Recovery

### Database Backups

```bash
# Docker
docker exec noa-postgres pg_dump -U noa noa > backup.sql

# Kubernetes
kubectl exec <postgres-pod> -n noa-server -- pg_dump -U noa noa > backup.sql
```

### Volume Backups

```bash
# Docker
docker run --rm -v docker_postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Kubernetes
# Use Velero or cloud provider snapshots
```

## Maintenance

### Updates

```bash
# Docker - pull and recreate
docker-compose pull
docker-compose up -d --force-recreate

# Kubernetes - rolling update
kubectl set image deployment/noa-mcp mcp=noa-server:v0.0.2 -n noa-server
kubectl rollout status deployment/noa-mcp -n noa-server
```

### Cleanup

```bash
# Docker - remove unused resources
docker system prune -a

# Kubernetes - delete old resources
kubectl delete pod <completed-pod> -n noa-server
```

## CI/CD Integration

The infrastructure is CI/CD ready:

- Dockerfile optimized for layer caching
- Kubernetes manifests support GitOps
- Health checks for deployment verification
- Rolling update strategy configured
- Rollback capability built-in

## Support

### Documentation
- [Infrastructure Overview](docs/infrastructure/INFRASTRUCTURE_OVERVIEW.md)
- [Docker Guide](docs/infrastructure/DOCKER_GUIDE.md)
- [Kubernetes Guide](docs/infrastructure/KUBERNETES_GUIDE.md)
- [Environment Variables](docs/infrastructure/ENVIRONMENT_VARIABLES.md)
- [Health Checks](docs/infrastructure/HEALTH_CHECKS.md)

### Quick References
- [Docker README](docker/README.md)
- [Kubernetes README](k8s/README.md)

### Issues & Questions
- Check troubleshooting sections in guides
- Review service logs
- Verify environment configuration
- Check health endpoints

## License

See project LICENSE file.

---

**Last Updated:** October 22, 2025
**Version:** Phase 1 Complete
**Status:** Production Ready
