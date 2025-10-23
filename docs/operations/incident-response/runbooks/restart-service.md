# Restart Service Runbook

## Overview

Quick reference for restarting services in Kubernetes.

## Prerequisites

- kubectl access
- Namespace access
- Understanding of service dependencies

## Basic Restart

### Restart Deployment

```bash
# Restart all pods in deployment
kubectl rollout restart deployment/<deployment-name> -n <namespace>

# Example
kubectl rollout restart deployment/api -n production

# Wait for rollout to complete
kubectl rollout status deployment/api -n production
```

### Restart Specific Pod

```bash
# Delete pod (will be recreated by deployment)
kubectl delete pod <pod-name> -n <namespace>

# Example
kubectl delete pod api-7d9f8c6b5-xyz123 -n production

# Verify new pod is running
kubectl get pods -n production -l app=api
```

### Restart StatefulSet

```bash
# Restart statefulset (ordered restart)
kubectl rollout restart statefulset/<statefulset-name> -n <namespace>

# Example
kubectl rollout restart statefulset/postgres -n database

# Watch restart process
kubectl rollout status statefulset/postgres -n database
```

## Graceful Restart

### With Zero Downtime

```bash
# Update deployment to trigger rolling restart
kubectl patch deployment api -n production -p \
  '{"spec":{"template":{"metadata":{"annotations":{"restartedAt":"'$(date +%s)'"}}}}}'

# Monitor progress
watch kubectl get pods -n production -l app=api
```

### Drain and Restart Node

```bash
# Cordon node (prevent new pods)
kubectl cordon <node-name>

# Drain node gracefully
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Restart node (if needed)
ssh <node-name> "sudo reboot"

# Uncordon node
kubectl uncordon <node-name>
```

## Service-Specific Restarts

### API Service

```bash
kubectl rollout restart deployment/api -n production
kubectl rollout status deployment/api -n production
kubectl logs -f -n production -l app=api | head -50
```

### Database

```bash
# WARNING: May cause brief downtime
kubectl rollout restart statefulset/postgres -n database
kubectl wait --for=condition=ready pod/postgres-0 -n database --timeout=300s
kubectl exec -n database postgres-0 -- psql -U admin -c "SELECT 1"
```

### Cache (Redis)

```bash
kubectl rollout restart statefulset/redis -n cache
kubectl wait --for=condition=ready pod/redis-0 -n cache --timeout=120s
kubectl exec -n cache redis-0 -- redis-cli ping
```

### Worker Pods

```bash
kubectl rollout restart deployment/worker -n production
kubectl get pods -n production -l app=worker
```

## Verification

### Check Pod Status

```bash
# Get all pods
kubectl get pods -n production

# Check pod details
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production --tail=100

# Check events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
```

### Verify Service Health

```bash
# Check endpoint
curl https://api.noaserver.com/health

# Check from within cluster
kubectl run curl --image=curlimages/curl -i --rm --restart=Never -- \
  curl http://api.production.svc.cluster.local/health
```

## Troubleshooting

### Pod Won't Start

```bash
# Check pod events
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production

# Check previous pod logs (if crashed)
kubectl logs <pod-name> -n production --previous
```

### Pod Stuck in Terminating

```bash
# Force delete pod
kubectl delete pod <pod-name> -n production --grace-period=0 --force
```

### Rollout Stuck

```bash
# Check rollout status
kubectl rollout status deployment/api -n production

# Undo rollout
kubectl rollout undo deployment/api -n production

# Check history
kubectl rollout history deployment/api -n production
```

## Emergency Procedures

### Force Restart All Pods

```bash
# WARNING: Causes downtime
kubectl delete pods --all -n production
```

### Restart Cluster

```bash
# Only in extreme circumstances
# Contact infrastructure team
```

## Post-Restart Checks

- [ ] All pods are Running
- [ ] No CrashLoopBackOff errors
- [ ] Service responds to health checks
- [ ] Logs show no errors
- [ ] Metrics are normal

## Related Runbooks

- [Rollback Deployment](./rollback-deployment.md)
- [Scale Deployment](./scale-deployment.md)
- [Database Failure Playbook](../playbooks/database-failure.md)
