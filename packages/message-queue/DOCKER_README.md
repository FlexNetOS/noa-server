# Message Queue API - Docker & Kubernetes Deployment

Production-ready containerization with Docker, Docker Compose, and Kubernetes orchestration.

## Quick Start

### 1. Local Development

```bash
# Copy environment variables
cp .env.example .env

# Start with Docker Compose
docker-compose up

# Or use Makefile
make dev
```

Access API at: http://localhost:8081

### 2. Build Production Image

```bash
# Build image
make build

# Or use script
./scripts/build.sh
```

Expected image size: <200MB

### 3. Deploy to Kubernetes

```bash
# Deploy all resources
make deploy

# Or use script
./scripts/deploy.sh --namespace noa-server
```

## What's Included

### Docker Files
- `Dockerfile` - Multi-stage build (builder → production)
- `.dockerignore` - Optimized build context
- `docker-compose.yml` - Production orchestration
- `.env.example` - Environment template

### Kubernetes Manifests (`/k8s`)
- `deployment.yaml` - 3 replicas, rolling updates
- `service.yaml` - ClusterIP & LoadBalancer
- `configmap.yaml` - Configuration
- `secret.yaml` - Sensitive data
- `hpa.yaml` - Auto-scaling (3-10 pods)
- `redis.yaml` - Redis deployment

### Scripts (`/scripts`)
- `build.sh` - Build Docker images
- `deploy.sh` - Deploy to Kubernetes
- `create-docker-infrastructure.sh` - Setup helper

### Helper Files (`/docker`)
- `health-check.sh` - Container health check

## Common Commands

```bash
# Development
make dev              # Start development environment
make test             # Run tests

# Building
make build            # Build production image

# Kubernetes
make deploy           # Deploy to Kubernetes
kubectl get pods -n noa-server                    # Check pods
kubectl logs -n noa-server -l app=message-queue-api -f   # View logs
kubectl port-forward -n noa-server svc/message-queue-api 8081:8081  # Port forward
```

## Architecture

```
┌─────────────────────┐
│   Load Balancer     │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  API Pods (3-10)    │
│  - Security hardened │
│  - Auto-scaling     │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Redis Service     │
└─────────────────────┘
```

## Security Features

- Non-root user (nodejs:1000)
- Read-only filesystem
- All capabilities dropped
- Security scanning ready
- TLS support

## Resource Requirements

### Production
- CPU: 100m request, 500m limit
- Memory: 256Mi request, 1Gi limit
- Min replicas: 3
- Max replicas: 10
- Auto-scaling: 70% CPU, 80% memory

## Environment Variables

Required:
- `NODE_ENV` - production/development
- `API_PORT` - API port (default: 8081)
- `REDIS_HOST` - Redis hostname
- `REDIS_PORT` - Redis port (default: 6379)

See `.env.example` for complete list.

## Troubleshooting

### Container won't start
```bash
docker logs <container-id>
docker inspect <container-id> | grep Health
```

### Kubernetes pod issues
```bash
kubectl logs -n noa-server <pod-name>
kubectl describe pod -n noa-server <pod-name>
```

### Redis connection
```bash
kubectl exec -it -n noa-server <pod-name> -- sh
nc -zv redis-service 6379
```

## Next Steps

1. Review `.env.example` and configure
2. Run `make build` to build image
3. Test locally with `make dev`
4. Deploy to Kubernetes with `make deploy`
5. Monitor with `kubectl get pods -n noa-server`

## Documentation

- Dockerfile: Multi-stage Alpine-based build
- Kubernetes: Production-ready manifests
- Security: Hardened configuration
- Auto-scaling: HPA with CPU/memory targets

## Support

- GitHub Issues: [repository-url]/issues
- Documentation: `/docs`
- Makefile help: `make help`

---

**Production Ready**: Follows industry best practices for security, performance, and reliability.
