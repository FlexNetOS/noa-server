# Noa Server Infrastructure Overview

## Executive Summary

This document provides a comprehensive overview of the Noa Server infrastructure architecture, deployment strategies, and operational guidelines for Phase 1 implementation.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Ingress Layer                         │
│              (NGINX / K8s Ingress / Load Balancer)          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐       ┌───────▼────────┐
│  UI Dashboard  │       │   API Gateway   │
│   (Port 9200)  │       │                 │
└───────┬────────┘       └───────┬─────────┘
        │                         │
        └──────────┬──────────────┘
                   │
        ┌──────────┴────────────┐
        │                       │
┌───────▼────────┐    ┌────────▼────────┐
│  MCP Service   │    │  Claude Flow    │
│  (Port 8001)   │◄───┤  (Port 9100)    │
└───────┬────────┘    └────────┬────────┘
        │                      │
        ├──────────┬───────────┤
        │          │           │
┌───────▼─────┐ ┌─▼──────┐ ┌─▼────────────┐
│  Llama.cpp  │ │ Redis  │ │  PostgreSQL  │
│ (Port 9300) │ │ Cache  │ │   Database   │
└─────────────┘ └────────┘ └──────────────┘
        │
┌───────▼──────────┐
│    AgenticOS     │
│   (Port 9400)    │
└──────────────────┘
```

### Service Inventory

| Service | Type | Port | Technology | Purpose |
|---------|------|------|------------|---------|
| MCP | Backend | 8001 | Node.js | Model Context Protocol coordination |
| Claude Flow | Backend | 9100 | Node.js | AI workflow orchestration |
| UI Dashboard | Frontend | 9200 | Next.js 14 | Web interface |
| Llama.cpp | ML Service | 9300 | Python/C++ | Neural processing |
| AgenticOS | Backend | 9400 | Python | Agent system management |
| PostgreSQL | Database | 5432 | PostgreSQL 16 | Primary data store |
| Redis | Cache | 6379 | Redis 7 | Session & cache layer |

## Deployment Options

### Option 1: Docker Compose (Development & Small Production)

**Use Cases:**
- Local development
- Single-server deployments
- Testing and QA environments
- Small production (<1000 users)

**Pros:**
- Simple setup and configuration
- Easy local development
- Lower resource requirements
- Quick iteration

**Cons:**
- Limited scalability
- Manual orchestration
- Single point of failure
- No auto-scaling

**Quick Start:**
```bash
cd /home/deflex/noa-server
docker-compose -f docker/docker-compose.yml up -d
```

### Option 2: Kubernetes (Production)

**Use Cases:**
- Production deployments
- High availability requirements
- Auto-scaling needs
- Multi-region deployments

**Pros:**
- Horizontal auto-scaling
- Self-healing capabilities
- Rolling updates
- Service mesh integration
- Multi-cloud support

**Cons:**
- Complex setup
- Higher learning curve
- More resource overhead
- Requires cluster management

**Quick Start:**
```bash
kubectl apply -k k8s/overlays/prod/
```

### Option 3: Hybrid (Recommended for Phase 1)

**Strategy:**
- Development: Docker Compose
- Staging: Kubernetes (single cluster)
- Production: Kubernetes (multi-cluster)

## Infrastructure Components

### Container Orchestration

**Docker:**
- Multi-stage builds for optimization
- Security hardening (non-root, read-only FS)
- Health checks on all services
- Resource limits enforced
- Volume management for persistence

**Kubernetes:**
- Namespace isolation per environment
- RBAC for security
- Horizontal Pod Autoscaling (HPA)
- Persistent Volume Claims (PVC)
- Service mesh ready (Istio compatible)

### Networking

**Docker Compose:**
- Bridge network (172.28.0.0/16)
- Service discovery via DNS
- Port mapping to host

**Kubernetes:**
- ClusterIP services for internal communication
- Ingress for external access
- Network policies for security
- Service mesh for advanced routing

### Storage

**Persistent Volumes:**
- MCP data: 5GB
- Claude Flow data: 10GB
- UI Dashboard data: 5GB
- Llama.cpp models: 50GB (read-only)
- AgenticOS data: 10GB
- PostgreSQL: 20GB
- Redis: 5GB

**Storage Classes:**
- Standard: HDD-backed, default
- Fast-SSD: SSD-backed for databases
- Shared: NFS/EFS for multi-pod access

### Security

**Docker:**
- Non-root user (UID 1000/1001)
- Read-only root filesystem
- Dropped capabilities
- Secrets via environment variables
- Image scanning with Trivy

**Kubernetes:**
- Pod Security Standards (restricted)
- Network policies
- RBAC authorization
- Secret encryption at rest
- TLS for all external traffic
- Image pull secrets

## Resource Requirements

### Minimum (Development)

- **CPU**: 4 vCPUs
- **Memory**: 8GB RAM
- **Storage**: 50GB
- **Network**: 100 Mbps

### Recommended (Production)

- **CPU**: 16 vCPUs (across cluster)
- **Memory**: 32GB RAM
- **Storage**: 200GB SSD
- **Network**: 1 Gbps
- **GPU**: 1x NVIDIA GPU for Llama.cpp (optional)

### Per-Service Resources

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| MCP | 250m | 1000m | 256Mi | 512Mi |
| Claude Flow | 500m | 2000m | 512Mi | 1Gi |
| UI Dashboard | 250m | 1500m | 384Mi | 768Mi |
| Llama.cpp | 2000m | 4000m | 2Gi | 4Gi |
| AgenticOS | 500m | 2000m | 512Mi | 1Gi |
| PostgreSQL | 250m | 1000m | 256Mi | 512Mi |
| Redis | 100m | 500m | 128Mi | 256Mi |

## Environment Strategy

### Development

**Characteristics:**
- Single replica for all services
- Reduced resource limits
- Debug logging enabled
- Hot reload enabled
- Mock external APIs

**Configuration:**
```bash
NODE_ENV=development
LOG_LEVEL=debug
REPLICAS=1
```

### Staging

**Characteristics:**
- Production-like configuration
- 2 replicas for critical services
- Info-level logging
- Real external API integration
- Performance testing enabled

**Configuration:**
```bash
NODE_ENV=staging
LOG_LEVEL=info
REPLICAS=2
```

### Production

**Characteristics:**
- High availability (3+ replicas)
- Auto-scaling enabled
- Warn-level logging
- Full monitoring and alerting
- Backup automation

**Configuration:**
```bash
NODE_ENV=production
LOG_LEVEL=warn
MIN_REPLICAS=3
MAX_REPLICAS=15
```

## Health Monitoring

### Health Check Endpoints

All services expose:
- `/health` - Liveness probe
- `/health/ready` - Readiness probe
- `/health/startup` - Startup probe

### Monitoring Stack

**Metrics:**
- Prometheus for metrics collection
- Grafana for visualization
- Custom dashboards per service

**Logging:**
- Fluent Bit for log collection
- Elasticsearch for log storage
- Kibana for log analysis

**Tracing:**
- Jaeger for distributed tracing
- OpenTelemetry instrumentation

## Scaling Strategy

### Horizontal Scaling (Auto-scaling)

**Triggers:**
- CPU utilization > 70%
- Memory utilization > 80%
- Custom metrics (requests/sec)

**Services with HPA:**
- MCP: 2-10 replicas
- Claude Flow: 2-8 replicas
- UI Dashboard: 3-15 replicas

### Vertical Scaling

**Triggers:**
- Consistent resource exhaustion
- OOM kills
- CPU throttling

**Approach:**
- Use Vertical Pod Autoscaler (VPA)
- Manual resource limit adjustments
- Review and optimize code

### Database Scaling

**PostgreSQL:**
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Query optimization
- Partitioning for large tables

**Redis:**
- Redis Sentinel for HA
- Redis Cluster for sharding
- Separate cache and session stores

## Backup & Disaster Recovery

### Backup Strategy

**Databases:**
- Automated daily backups
- Point-in-time recovery enabled
- 30-day retention
- Off-site backup storage

**Persistent Volumes:**
- Volume snapshots daily
- 7-day retention
- Cross-region replication

**Configuration:**
- GitOps approach (all configs in Git)
- Sealed Secrets for sensitive data
- Regular disaster recovery drills

### Recovery Procedures

**RTO (Recovery Time Objective):** 1 hour
**RPO (Recovery Point Objective):** 15 minutes

**Steps:**
1. Identify failure scope
2. Switch to backup region (if applicable)
3. Restore from latest backup
4. Verify service health
5. Resume traffic

## CI/CD Pipeline

### Build Pipeline

```
Code Push → Git → Build Image → Security Scan → Push to Registry
```

### Deployment Pipeline

```
Registry → Dev Deploy → Integration Tests → Staging Deploy →
Performance Tests → Manual Approval → Production Deploy → Smoke Tests
```

### Tools

- **Source Control:** Git
- **CI/CD:** GitHub Actions / GitLab CI / Jenkins
- **Image Registry:** Docker Hub / ECR / GCR / ACR
- **Security Scanning:** Trivy, Snyk
- **Deployment:** Kubectl, Helm, ArgoCD

## Security Best Practices

1. **Container Security**
   - Non-root users
   - Read-only filesystems
   - Minimal base images (Alpine)
   - Regular image updates

2. **Network Security**
   - TLS everywhere
   - Network policies
   - Service mesh encryption
   - WAF for ingress

3. **Access Control**
   - RBAC enforcement
   - Least privilege principle
   - Service accounts per service
   - Regular access audits

4. **Secret Management**
   - External secret stores (Vault, AWS Secrets Manager)
   - Encrypted at rest
   - Rotation policies
   - Never in source control

5. **Compliance**
   - Audit logging enabled
   - Regular security scans
   - Penetration testing
   - Compliance monitoring

## Cost Optimization

### Strategies

1. **Right-sizing**
   - Monitor actual resource usage
   - Adjust requests/limits accordingly
   - Use VPA for recommendations

2. **Spot Instances**
   - Use spot/preemptible instances for dev/staging
   - Batch processing workloads

3. **Auto-scaling**
   - Scale down during off-hours
   - Use cluster autoscaler

4. **Resource Efficiency**
   - Shared resources where possible
   - Efficient caching strategies
   - Database query optimization

5. **Cost Monitoring**
   - Cloud cost dashboards
   - Budget alerts
   - Regular cost reviews

## Migration Path

### Phase 1 (Current)
- Docker Compose for development
- Basic health checks
- Manual deployment
- Single environment

### Phase 2 (1-2 months)
- Kubernetes for staging
- CI/CD pipeline
- Basic monitoring
- Two environments (dev, staging)

### Phase 3 (3-6 months)
- Production Kubernetes deployment
- Full observability stack
- Auto-scaling enabled
- Multi-region setup

### Phase 4 (6-12 months)
- Service mesh (Istio)
- Advanced auto-scaling
- Chaos engineering
- Global CDN

## Troubleshooting Guide

### Common Issues

**Service Won't Start:**
- Check logs: `docker logs <container>` or `kubectl logs <pod>`
- Verify environment variables
- Check resource availability
- Verify dependencies are healthy

**High Memory Usage:**
- Check for memory leaks
- Review resource limits
- Scale horizontally
- Optimize code

**Slow Performance:**
- Check database queries
- Review cache hit rates
- Analyze network latency
- Profile application code

**Database Connection Issues:**
- Verify connection pool settings
- Check network connectivity
- Review firewall rules
- Validate credentials

## Documentation Index

1. [Docker Guide](./DOCKER_GUIDE.md) - Complete Docker deployment guide
2. [Kubernetes Guide](./KUBERNETES_GUIDE.md) - Kubernetes deployment and operations
3. [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Complete variable reference
4. [Health Checks](./HEALTH_CHECKS.md) - Health check implementation guide
5. [Security Best Practices](./SECURITY_BEST_PRACTICES.md) - Security guidelines

## Support & Maintenance

### Regular Tasks

**Daily:**
- Monitor health dashboards
- Review error logs
- Check resource utilization

**Weekly:**
- Review performance metrics
- Update dependencies
- Security scan reviews
- Backup verification

**Monthly:**
- Cost optimization review
- Capacity planning
- Security audits
- Disaster recovery drills

**Quarterly:**
- Architecture review
- Technology stack updates
- Performance benchmarking
- Training and documentation updates

## Conclusion

This infrastructure provides a solid foundation for Noa Server deployment across development, staging, and production environments. The dual-approach (Docker Compose + Kubernetes) offers flexibility while maintaining production-grade reliability and scalability.

For questions or issues, refer to the detailed guides in this documentation directory.
