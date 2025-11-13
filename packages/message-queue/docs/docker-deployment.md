# Message Queue API - Docker Deployment Guide

Complete guide for containerizing and deploying the Message Queue API with Docker, Docker Compose, and Kubernetes.

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Setup](#docker-setup)
- [Docker Compose](#docker-compose)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Variables](#environment-variables)
- [Resource Sizing](#resource-sizing)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Quick Start

### Local Development with Docker Compose

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your configuration
nano .env

# 3. Start services
docker-compose -f docker-compose.dev.yml up

# 4. Access services
# - API: http://localhost:8081
# - Redis Commander: http://localhost:8082
# - Mailhog: http://localhost:8025
```

### Production Deployment

```bash
# 1. Build production image
./scripts/build.sh --production

# 2. Push to registry
./scripts/push.sh --registry your-registry.io

# 3. Deploy to Kubernetes
./scripts/deploy.sh --namespace noa-server
```

## Docker Setup

### Building Images

The Dockerfile supports multi-stage builds with three targets:

#### 1. Production Image (Default)

```bash
# Build production image
docker build -t noa/message-queue-api:latest --target production .

# Image size: <200MB
# User: non-root (nodejs:1000)
# Security: hardened, read-only filesystem
```

#### 2. Development Image

```bash
# Build development image
docker build -t noa/message-queue-api:dev --target development .

# Features:
# - Hot-reload enabled
# - Debug ports exposed (9229)
# - Volume mounts for source code
```

#### 3. Test Image

```bash
# Build test image
docker build -t noa/message-queue-api:test --target test .

# Features:
# - Includes test dependencies
# - Runs test suite automatically
```

### Using Build Scripts

```bash
# Build all images
./scripts/build.sh --all

# Build with custom registry
./scripts/build.sh --registry gcr.io/my-project

# Build and push
./scripts/build.sh --production --push

# Build without cache
./scripts/build.sh --no-cache
```

### Verifying Image Size

```bash
# Check image size
docker images noa/message-queue-api:latest

# Expected: <200MB for production image

# Inspect image layers
docker history noa/message-queue-api:latest
```

## Docker Compose

### Production Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f message-queue-api

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Development Compose

```bash
# Start with hot-reload
docker-compose -f docker-compose.dev.yml up

# Rebuild after package changes
docker-compose -f docker-compose.dev.yml up --build

# Run specific service
docker-compose -f docker-compose.dev.yml up message-queue-api

# Access Redis Commander
open http://localhost:8082
```

### Include Optional Tools

```bash
# Start with Redis Commander
docker-compose --profile tools up -d
```

### Scaling Services

```bash
# Scale API to 3 replicas
docker-compose up -d --scale message-queue-api=3
```

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify cluster connection
kubectl cluster-info
```

### Manual Deployment

#### Step 1: Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

#### Step 2: Apply ConfigMap and Secrets

```bash
# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Create secrets (edit first!)
kubectl apply -f k8s/secret.yaml
```

#### Step 3: Deploy Redis

```bash
# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Wait for Redis
kubectl wait --for=condition=available --timeout=300s deployment/redis -n noa-server
```

#### Step 4: Deploy Application

```bash
# Deploy API
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s deployment/message-queue-api -n noa-server
```

#### Step 5: Setup Ingress

```bash
# Apply Ingress
kubectl apply -f k8s/ingress.yaml

# Get Ingress IP
kubectl get ingress -n noa-server
```

### Automated Deployment

```bash
# Deploy everything
./scripts/deploy.sh

# Deploy to specific namespace
./scripts/deploy.sh --namespace noa-server-staging

# Skip Redis deployment
./scripts/deploy.sh --skip-redis

# Force recreate secrets
./scripts/deploy.sh --force-secrets
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n noa-server -l app=message-queue-api

# Check services
kubectl get svc -n noa-server

# Check HPA status
kubectl get hpa -n noa-server

# View logs
kubectl logs -n noa-server -l app=message-queue-api -f

# Port forward for local access
kubectl port-forward -n noa-server svc/message-queue-api 8081:8081
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment/message-queue-api -n noa-server --replicas=5

# Check HPA status (auto-scaling)
kubectl get hpa -n noa-server

# Describe HPA
kubectl describe hpa message-queue-api-hpa -n noa-server
```

### Rolling Updates

```bash
# Update image version
kubectl set image deployment/message-queue-api \
  message-queue-api=noa/message-queue-api:v1.2.0 \
  -n noa-server

# Check rollout status
kubectl rollout status deployment/message-queue-api -n noa-server

# View rollout history
kubectl rollout history deployment/message-queue-api -n noa-server
```

### Rollback

```bash
# Rollback to previous version
./scripts/rollback.sh

# Rollback to specific revision
./scripts/rollback.sh --revision 3

# Show rollout history
./scripts/rollback.sh --history

# Dry run
./scripts/rollback.sh --dry-run
```

## Environment Variables

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (production/development) | `production` |
| `API_PORT` | API server port | `8081` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `ENABLE_WEBSOCKET` | Enable WebSocket support | `true` |
| `ENABLE_METRICS` | Enable Prometheus metrics | `true` |
| `AUTH_ENABLED` | Enable authentication | `false` |
| `REDIS_PASSWORD` | Redis password (if required) | - |
| `JWT_SECRET` | JWT signing secret | - |

### Secrets Management

#### Kubernetes Secrets

```bash
# Create secret from literal
kubectl create secret generic message-queue-secrets \
  --from-literal=REDIS_PASSWORD='your-password' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  -n noa-server

# Create secret from file
kubectl create secret generic message-queue-secrets \
  --from-env-file=.env.production \
  -n noa-server

# Update existing secret
kubectl create secret generic message-queue-secrets \
  --from-literal=REDIS_PASSWORD='new-password' \
  --dry-run=client -o yaml | kubectl apply -f -
```

#### Docker Compose Secrets

```bash
# Use .env file
docker-compose --env-file .env.production up -d

# Override specific variables
REDIS_PASSWORD=mypassword docker-compose up -d
```

## Resource Sizing

### Development Environment

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 250m
    memory: 256Mi
```

**Suitable for**: Local development, testing

### Staging Environment

```yaml
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

**Suitable for**: Integration testing, QA

### Production Environment

```yaml
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 1Gi
```

**Suitable for**: Production workloads with HPA

### High-Load Production

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi
```

**Suitable for**: High-throughput, low-latency requirements

### Calculating Resource Needs

**Formula for minimum replicas**:
```
min_replicas = ceil(expected_rps / (single_pod_capacity * 0.7))
```

**Example**:
- Expected RPS: 1000
- Single pod capacity: 200 RPS
- Safety margin: 30%

```
min_replicas = ceil(1000 / (200 * 0.7)) = ceil(7.14) = 8 pods
```

## Troubleshooting

### Common Issues

#### 1. Image Too Large (>200MB)

```bash
# Check image size
docker images noa/message-queue-api:latest

# Analyze layers
docker history noa/message-queue-api:latest

# Solution: Review .dockerignore
cat .dockerignore
```

#### 2. Container Crashes on Startup

```bash
# Check logs
docker logs <container-id>

# Check health status
docker inspect <container-id> | grep Health

# Common causes:
# - Missing environment variables
# - Redis not accessible
# - Port already in use
```

#### 3. Kubernetes Pod CrashLoopBackOff

```bash
# Check pod logs
kubectl logs -n noa-server <pod-name>

# Check pod events
kubectl describe pod -n noa-server <pod-name>

# Check resource limits
kubectl top pod -n noa-server <pod-name>

# Common solutions:
# - Increase memory limits
# - Fix environment variables
# - Check Redis connectivity
```

#### 4. Redis Connection Failed

```bash
# Test Redis connection from pod
kubectl exec -it -n noa-server <pod-name> -- sh
nc -zv redis-service 6379

# Check Redis logs
kubectl logs -n noa-server -l app=redis

# Verify Redis service
kubectl get svc -n noa-server redis-service
```

#### 5. Health Check Failing

```bash
# Manual health check
curl http://localhost:8081/health

# Check from within container
docker exec <container-id> /usr/local/bin/health-check

# Debug health check script
docker exec -it <container-id> sh
cat /usr/local/bin/health-check
```

#### 6. HPA Not Scaling

```bash
# Check HPA status
kubectl get hpa -n noa-server

# Check metrics server
kubectl top pods -n noa-server

# Check HPA events
kubectl describe hpa message-queue-api-hpa -n noa-server

# Common causes:
# - Metrics server not installed
# - Resource requests not set
# - Target metrics not reached
```

### Debug Commands

```bash
# Enter running container
docker exec -it <container-id> sh

# Check container processes
docker exec <container-id> ps aux

# Check container network
docker exec <container-id> netstat -tulpn

# View container environment
docker exec <container-id> env

# Check file permissions
docker exec <container-id> ls -la /app
```

### Performance Debugging

```bash
# Monitor resource usage
docker stats <container-id>

# Profile Node.js application
docker exec <container-id> node --prof dist/server.js

# Check container metrics
kubectl top pod -n noa-server -l app=message-queue-api

# View Prometheus metrics
curl http://localhost:8081/metrics
```

## Security Best Practices

### Image Security

1. **Use specific base image versions**
   ```dockerfile
   FROM node:20.10.0-alpine  # Not node:20 or node:latest
   ```

2. **Run as non-root user**
   ```dockerfile
   USER nodejs
   ```

3. **Read-only root filesystem**
   ```yaml
   securityContext:
     readOnlyRootFilesystem: true
   ```

4. **Drop all capabilities**
   ```yaml
   securityContext:
     capabilities:
       drop:
         - ALL
   ```

5. **Regular security scans**
   ```bash
   # Scan with Trivy
   trivy image noa/message-queue-api:latest

   # Scan with Snyk
   snyk container test noa/message-queue-api:latest
   ```

### Network Security

1. **Use network policies**
   ```bash
   kubectl apply -f k8s/network-policy.yaml
   ```

2. **Enable TLS for Ingress**
   - Use cert-manager for automatic certificates
   - Force HTTPS redirect

3. **Restrict CORS origins**
   ```bash
   CORS_ORIGINS=https://app.example.com,https://admin.example.com
   ```

### Secret Management

1. **Never commit secrets to git**
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   echo "*.key" >> .gitignore
   ```

2. **Use Kubernetes secrets**
   ```bash
   # Encrypt secrets at rest
   kubectl create secret generic ...
   ```

3. **Consider external secret management**
   - HashiCorp Vault
   - AWS Secrets Manager
   - Azure Key Vault

### Runtime Security

1. **Regular updates**
   ```bash
   # Update base image regularly
   docker pull node:20-alpine
   ./scripts/build.sh --production
   ```

2. **Monitor for vulnerabilities**
   - Enable Dependabot
   - Use Snyk integration
   - Subscribe to security advisories

3. **Implement rate limiting**
   ```yaml
   RATE_LIMIT_ENABLED: "true"
   RATE_LIMIT_MAX_REQUESTS: "100"
   ```

### Compliance

1. **Image signing**
   ```bash
   # Sign images with cosign
   cosign sign noa/message-queue-api:latest
   ```

2. **Audit logs**
   ```bash
   # Enable audit logging in Kubernetes
   kubectl apply -f k8s/audit-policy.yaml
   ```

3. **Security context**
   ```yaml
   securityContext:
     runAsNonRoot: true
     runAsUser: 1000
     allowPrivilegeEscalation: false
   ```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Internal Wiki: [wiki-url]
- DevOps Team: devops@example.com
