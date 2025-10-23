# Message Queue API - Docker Quick Start

Production-ready containerization with Docker, Docker Compose, and Kubernetes orchestration.

## Quick Start (3 Steps)

### 1. Local Development

```bash
# Start development environment
make dev

# Or manually
docker-compose -f docker-compose.dev.yml up
```

Access:
- API: http://localhost:8081
- Redis Commander: http://localhost:8082
- Mailhog: http://localhost:8025

### 2. Production Build

```bash
# Build and test
make build
make test-docker

# Or use script
./scripts/build.sh --production
```

Image size: <200MB

### 3. Deploy to Kubernetes

```bash
# Deploy
make deploy

# Or use script
./scripts/deploy.sh --namespace noa-server
```

## What's Included

### Docker Infrastructure

- **Multi-stage Dockerfile** (4 stages: builder, production, development, test)
- **Docker Compose** (production and development configurations)
- **Security hardening** (non-root user, read-only filesystem, capability drops)
- **Health checks** (HTTP endpoint monitoring)
- **Size optimization** (<200MB production image)

### Kubernetes Manifests

Located in `/k8s`:

- `namespace.yaml` - Namespace configuration
- `deployment.yaml` - Application deployment (3 replicas, rolling updates)
- `service.yaml` - ClusterIP, LoadBalancer, and Headless services
- `configmap.yaml` - Non-sensitive configuration
- `secret.yaml` - Sensitive data (passwords, tokens)
- `hpa.yaml` - Horizontal Pod Autoscaler (3-10 pods)
- `ingress.yaml` - HTTP/HTTPS routing with TLS
- `redis.yaml` - Redis deployment with persistence
- `network-policy.yaml` - Network isolation policies
- `poddisruptionbudget.yaml` - High availability during disruptions
- `servicemonitor.yaml` - Prometheus metrics collection

### Build & Deployment Scripts

Located in `/scripts`:

- `build.sh` - Build Docker images with versioning
- `push.sh` - Push images to Docker registry
- `deploy.sh` - Deploy to Kubernetes cluster
- `rollback.sh` - Rollback to previous version
- `test-deployment.sh` - Validate deployment health

### CI/CD Pipeline

Located in `/.github/workflows`:

- `docker.yml` - Complete CI/CD pipeline:
  - Test and lint
  - Security scanning (Trivy, Snyk)
  - Multi-platform builds
  - Image signing (cosign)
  - Staging deployment
  - Production deployment
  - Notifications

## Common Commands

### Development

```bash
make dev              # Start development environment
make dev-logs         # View logs
make dev-stop         # Stop environment
make dev-rebuild      # Rebuild and restart
```

### Building

```bash
make build            # Build production image
make build-dev        # Build development image
make build-all        # Build all images
make build-no-cache   # Build without cache
```

### Testing

```bash
make test             # Run tests locally
make test-docker      # Run tests in Docker
make test-deploy      # Test deployment health
make lint             # Run linter
```

### Kubernetes

```bash
make deploy           # Deploy to Kubernetes
make rollback         # Rollback deployment
make scale-up         # Scale to 5 replicas
make scale-down       # Scale to 1 replica
make status           # Show deployment status
make logs             # View application logs
make shell            # Open shell in pod
make port-forward     # Port forward to localhost
```

### Utilities

```bash
make clean            # Clean Docker resources
make clean-k8s        # Clean Kubernetes resources
make health           # Check application health
make size             # Show image sizes
make ci               # Run full CI pipeline locally
```

## Environment Variables

### Required

- `NODE_ENV` - Environment (production/development)
- `API_PORT` - API server port (default: 8081)
- `REDIS_HOST` - Redis hostname
- `REDIS_PORT` - Redis port (default: 6379)

### Optional

See `.env.example` for complete list.

## Security Features

1. **Non-root User** - Runs as `nodejs:1000`
2. **Read-only Filesystem** - Immutable root filesystem
3. **Capability Drops** - All Linux capabilities dropped
4. **Security Scanning** - Trivy and Snyk in CI/CD
5. **Image Signing** - Cosign signatures for releases
6. **Network Policies** - Isolated pod-to-pod communication
7. **TLS Termination** - HTTPS with automatic certificates

## Resource Requirements

### Development

- CPU: 100m request, 250m limit
- Memory: 128Mi request, 256Mi limit

### Production

- CPU: 100m request, 500m limit
- Memory: 256Mi request, 1Gi limit

### Auto-scaling

- Min replicas: 3
- Max replicas: 10
- Target CPU: 70%
- Target Memory: 80%

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs <container-id>

# Check health
docker inspect <container-id> | grep Health
```

### Kubernetes pod crashes

```bash
# Check pod logs
kubectl logs -n noa-server <pod-name>

# Describe pod
kubectl describe pod -n noa-server <pod-name>

# Check events
kubectl get events -n noa-server --sort-by='.lastTimestamp'
```

### Health check fails

```bash
# Test manually
curl http://localhost:8081/health

# Test from container
docker exec <container-id> /usr/local/bin/health-check
```

### Redis connection issues

```bash
# Test Redis from pod
kubectl exec -it -n noa-server <pod-name> -- sh
nc -zv redis-service 6379
```

## Performance Optimization

### Image Size Reduction

- Alpine base image (5MB base)
- Multi-stage builds
- Production dependencies only
- Aggressive .dockerignore

### Build Speed

- Layer caching
- Buildkit enabled
- Parallel builds
- Cache mount for dependencies

### Runtime Performance

- Health checks optimized
- Graceful shutdown (SIGTERM)
- Connection pooling
- Resource limits tuned

## Documentation

Complete documentation in `/docs`:

- `docker-deployment.md` - Full deployment guide
  - Docker setup and configuration
  - Kubernetes deployment strategies
  - Environment variables reference
  - Resource sizing recommendations
  - Troubleshooting guide
  - Security best practices

## CI/CD Integration

### GitHub Actions

Workflow triggers:
- Push to `main`, `develop`, `release/**`
- Pull requests
- Tags (v*)

Stages:
1. Test and lint
2. Security scan
3. Build and push
4. Deploy to staging (develop branch)
5. Deploy to production (tags)
6. Notifications

### Required Secrets

- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password
- `KUBECONFIG_STAGING` - Staging cluster config (base64)
- `KUBECONFIG_PRODUCTION` - Production cluster config (base64)
- `SNYK_TOKEN` - Snyk API token
- `CODECOV_TOKEN` - Codecov token
- `SLACK_WEBHOOK` - Slack webhook URL

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Ingress                       │
│            (TLS, Rate Limiting)                 │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Load Balancer                      │
│         (Service: ClusterIP)                    │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐  ┌────────▼───────┐
│  API Pod 1     │  │  API Pod 2     │
│ (Deployment)   │  │ (Deployment)   │
└───────┬────────┘  └────────┬───────┘
        │                    │
        └──────────┬─────────┘
                   │
        ┌──────────▼──────────┐
        │   Redis Service     │
        │  (Persistent)       │
        └─────────────────────┘
```

## Next Steps

1. Review `.env.example` and configure environment
2. Run `make dev` to start development environment
3. Build production image with `make build`
4. Test deployment with `make test-deploy`
5. Deploy to Kubernetes with `make deploy`
6. Monitor with `make status` and `make logs`

## Support

- Documentation: `/docs/docker-deployment.md`
- Issues: GitHub Issues
- Makefile help: `make help`

---

**Production Ready**: This containerization follows industry best practices for security, performance, and reliability.
