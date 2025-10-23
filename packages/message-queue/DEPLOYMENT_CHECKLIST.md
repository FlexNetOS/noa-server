# Message Queue API - Production Deployment Checklist

## Pre-Deployment Checklist

### Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Configure `REDIS_HOST` and `REDIS_PORT`
- [ ] Set `REDIS_PASSWORD` if Redis requires authentication
- [ ] Configure `CORS_ORIGINS` for your domains
- [ ] Set `LOG_LEVEL` appropriately (info for production)
- [ ] Configure `JWT_SECRET` if authentication is enabled
- [ ] Review all environment variables in `.env.example`

### Docker Image Build
- [ ] Review `Dockerfile` for any custom changes needed
- [ ] Build production image: `make build`
- [ ] Verify image size is <200MB: `docker images | grep message-queue-api`
- [ ] Test image locally: `docker run -p 8081:8081 noa/message-queue-api:latest`
- [ ] Verify health endpoint: `curl http://localhost:8081/health`

### Docker Compose Testing
- [ ] Start services: `docker-compose up -d`
- [ ] Check container status: `docker-compose ps`
- [ ] Verify Redis connection: `docker-compose logs message-queue-api | grep Redis`
- [ ] Test API endpoints
- [ ] Check resource usage: `docker stats`
- [ ] Stop services: `docker-compose down`

### Kubernetes Pre-Flight
- [ ] Verify kubectl is installed: `kubectl version`
- [ ] Confirm cluster connection: `kubectl cluster-info`
- [ ] Check current context: `kubectl config current-context`
- [ ] Verify namespace exists or will be created: `kubectl get namespace noa-server`

### Kubernetes Configuration
- [ ] Review `k8s/configmap.yaml` and update values
- [ ] Update `k8s/secret.yaml` with base64-encoded secrets:
  - [ ] `REDIS_PASSWORD`: `echo -n 'password' | base64`
  - [ ] `JWT_SECRET`: `echo -n 'secret' | base64`
- [ ] Review resource requests/limits in `k8s/deployment.yaml`
- [ ] Adjust replica count if needed (default: 3)
- [ ] Review HPA settings in `k8s/hpa.yaml` (default: 3-10 replicas)
- [ ] Update Redis storage size in `k8s/redis.yaml` if needed

## Deployment Steps

### 1. Deploy to Kubernetes
```bash
# Option A: Using Makefile
make deploy

# Option B: Using script
./scripts/deploy.sh --namespace noa-server

# Option C: Manual kubectl
kubectl create namespace noa-server
kubectl apply -f k8s/configmap.yaml -n noa-server
kubectl apply -f k8s/secret.yaml -n noa-server
kubectl apply -f k8s/redis.yaml -n noa-server
kubectl apply -f k8s/deployment.yaml -n noa-server
kubectl apply -f k8s/service.yaml -n noa-server
kubectl apply -f k8s/hpa.yaml -n noa-server
```

### 2. Verify Deployment
- [ ] Check deployment status: `kubectl get deployment -n noa-server`
- [ ] Verify pods are running: `kubectl get pods -n noa-server`
- [ ] Check pod logs: `kubectl logs -n noa-server -l app=message-queue-api`
- [ ] Verify services: `kubectl get svc -n noa-server`
- [ ] Check HPA status: `kubectl get hpa -n noa-server`
- [ ] Describe deployment: `kubectl describe deployment/message-queue-api -n noa-server`

### 3. Test Deployment
- [ ] Port forward: `kubectl port-forward -n noa-server svc/message-queue-api 8081:8081`
- [ ] Test health endpoint: `curl http://localhost:8081/health`
- [ ] Test API endpoints
- [ ] Verify Redis connectivity from pods
- [ ] Check pod resource usage: `kubectl top pods -n noa-server`

### 4. Monitoring Setup
- [ ] Configure log aggregation (ELK/Loki)
- [ ] Set up metrics collection (Prometheus)
- [ ] Create dashboards (Grafana)
- [ ] Configure alerts
- [ ] Set up uptime monitoring

## Post-Deployment

### Scaling
- [ ] Monitor HPA behavior: `kubectl get hpa -n noa-server -w`
- [ ] Manually scale if needed: `kubectl scale deployment/message-queue-api -n noa-server --replicas=5`
- [ ] Verify pod distribution across nodes

### Security
- [ ] Apply network policies (if created)
- [ ] Verify pod security context: `kubectl describe pod -n noa-server <pod-name> | grep "Security Context"`
- [ ] Check for security vulnerabilities: `trivy image noa/message-queue-api:latest`
- [ ] Review RBAC permissions
- [ ] Enable pod security policies

### Performance
- [ ] Load test the API
- [ ] Monitor response times
- [ ] Check Redis performance
- [ ] Optimize resource requests/limits based on usage
- [ ] Review HPA scaling thresholds

### Documentation
- [ ] Document deployment procedure
- [ ] Create runbook for common issues
- [ ] Document monitoring and alerting
- [ ] Share access credentials securely
- [ ] Update team wiki/documentation

## Rollback Plan

### If Deployment Fails
```bash
# View recent events
kubectl get events -n noa-server --sort-by='.lastTimestamp'

# Check pod logs
kubectl logs -n noa-server <pod-name> --previous

# Describe failing pod
kubectl describe pod -n noa-server <pod-name>

# Rollback deployment
kubectl rollout undo deployment/message-queue-api -n noa-server

# Or delete and redeploy
kubectl delete -f k8s/ -n noa-server
# Fix issues, then redeploy
kubectl apply -f k8s/ -n noa-server
```

## Maintenance Tasks

### Regular Checks
- [ ] Monitor pod health daily
- [ ] Review logs for errors weekly
- [ ] Check resource usage weekly
- [ ] Update dependencies monthly
- [ ] Review and rotate secrets quarterly
- [ ] Disaster recovery drill quarterly

### Updates
- [ ] Build new image with version tag
- [ ] Push to registry
- [ ] Update deployment with new image
- [ ] Monitor rollout
- [ ] Verify functionality
- [ ] Keep rollback ready

## Troubleshooting

### Pod Won't Start
1. Check logs: `kubectl logs -n noa-server <pod-name>`
2. Check events: `kubectl describe pod -n noa-server <pod-name>`
3. Verify image exists: `docker pull noa/message-queue-api:latest`
4. Check resource availability: `kubectl top nodes`

### Pod CrashLoopBackOff
1. Check logs: `kubectl logs -n noa-server <pod-name> --previous`
2. Verify environment variables
3. Check Redis connectivity
4. Review resource limits
5. Check application errors

### Service Not Accessible
1. Check service: `kubectl get svc -n noa-server`
2. Verify endpoints: `kubectl get endpoints -n noa-server`
3. Test from within cluster: `kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://message-queue-api:8081/health`
4. Check network policies

### High Resource Usage
1. Check metrics: `kubectl top pods -n noa-server`
2. Review HPA scaling: `kubectl get hpa -n noa-server`
3. Check for memory leaks in logs
4. Profile application if needed
5. Adjust resource limits

## Success Metrics

- [ ] All pods running and healthy
- [ ] Health checks passing
- [ ] API responding correctly
- [ ] HPA scaling working
- [ ] Logs being collected
- [ ] Metrics being recorded
- [ ] Alerts configured
- [ ] Team trained on operations

## Sign-Off

- [ ] Development team approved
- [ ] DevOps team approved
- [ ] Security team reviewed
- [ ] Stakeholders notified
- [ ] Documentation complete
- [ ] Monitoring active
- [ ] Runbook available

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Version**: _____________
**Environment**: Production / Staging / Development
**Status**: Success / Partial / Failed

**Notes**:
