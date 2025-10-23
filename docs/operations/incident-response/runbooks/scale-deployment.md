# Scale Deployment Runbook

## Overview

Guide for scaling deployments up or down in Kubernetes.

## Prerequisites

- kubectl access
- Understanding of resource limits
- Knowledge of service dependencies

## Manual Scaling

### Scale Deployment

```bash
# Scale to specific replica count
kubectl scale deployment/<deployment-name> -n <namespace> --replicas=<count>

# Example: Scale API to 10 replicas
kubectl scale deployment/api -n production --replicas=10

# Verify scaling
kubectl get deployment api -n production
kubectl get pods -n production -l app=api
```

### Scale StatefulSet

```bash
# Scale statefulset
kubectl scale statefulset/<statefulset-name> -n <namespace> --replicas=<count>

# Example: Scale database replicas
kubectl scale statefulset/postgres -n database --replicas=3

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n database --timeout=300s
```

### Scale to Zero (Maintenance)

```bash
# Scale down to zero
kubectl scale deployment/api -n production --replicas=0

# Verify no pods running
kubectl get pods -n production -l app=api
```

## Horizontal Pod Autoscaler (HPA)

### Create HPA

```bash
# Create HPA based on CPU
kubectl autoscale deployment api -n production \
  --min=3 --max=20 --cpu-percent=70

# Create HPA based on memory
kubectl autoscale deployment api -n production \
  --min=3 --max=20 --memory-percent=80
```

### Check HPA Status

```bash
# Get HPA status
kubectl get hpa -n production

# Describe HPA
kubectl describe hpa api -n production

# Watch HPA in real-time
watch kubectl get hpa -n production
```

### Update HPA

```bash
# Update min/max replicas
kubectl patch hpa api -n production -p \
  '{"spec":{"minReplicas":5,"maxReplicas":30}}'

# Update target CPU utilization
kubectl patch hpa api -n production -p \
  '{"spec":{"targetCPUUtilizationPercentage":60}}'
```

### Delete HPA

```bash
# Remove autoscaling
kubectl delete hpa api -n production
```

## Service-Specific Scaling

### API Service

```bash
# Scale up during high traffic
kubectl scale deployment/api -n production --replicas=15

# Verify distribution
kubectl get pods -n production -l app=api -o wide

# Check resource usage
kubectl top pods -n production -l app=api
```

### Worker Pods

```bash
# Scale workers for batch processing
kubectl scale deployment/worker -n production --replicas=20

# Monitor queue depth
kubectl exec -n messaging rabbitmq-0 -- rabbitmqctl list_queues
```

### Frontend

```bash
# Scale frontend for traffic spike
kubectl scale deployment/web -n production --replicas=10
```

## Advanced Scaling

### Vertical Pod Autoscaler (VPA)

```bash
# Create VPA
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 100m
        memory: 256Mi
      maxAllowed:
        cpu: 4
        memory: 8Gi
EOF
```

### Cluster Autoscaler

```bash
# Check cluster autoscaler status
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml

# View autoscaler logs
kubectl logs -f -n kube-system deployment/cluster-autoscaler
```

## Scaling Strategies

### Gradual Scale Up

```bash
# Scale in stages
kubectl scale deployment/api -n production --replicas=8
sleep 60  # Wait for pods to stabilize
kubectl scale deployment/api -n production --replicas=12
sleep 60
kubectl scale deployment/api -n production --replicas=15
```

### Emergency Scale Up

```bash
# Immediate scale for incident
kubectl scale deployment/api -n production --replicas=20

# Monitor pod creation
watch kubectl get pods -n production -l app=api

# Check if resources available
kubectl get nodes
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Scale Down During Low Traffic

```bash
# Reduce replicas
kubectl scale deployment/api -n production --replicas=3

# Verify no impact
curl https://api.noaserver.com/health
```

## Resource Considerations

### Check Node Capacity

```bash
# View node resources
kubectl top nodes

# Check available capacity
kubectl describe nodes | grep -A 5 "Allocatable"

# View pod resource usage
kubectl top pods -n production --sort-by=memory
```

### Update Resource Limits

```bash
# Increase memory limits before scaling
kubectl set resources deployment/api -n production \
  --limits=memory=4Gi,cpu=2 \
  --requests=memory=2Gi,cpu=1

# Restart to apply changes
kubectl rollout restart deployment/api -n production
```

## Verification

### Check Scaling Success

```bash
# Verify replica count
kubectl get deployment api -n production

# Check all pods are Running
kubectl get pods -n production -l app=api

# Verify load distribution
kubectl top pods -n production -l app=api

# Check logs for errors
kubectl logs -n production -l app=api --tail=50 | grep ERROR
```

### Load Testing

```bash
# Run load test after scaling
kubectl run load-test --image=williamyeh/hey:latest -i --rm --restart=Never -- \
  -z 30s -c 100 https://api.noaserver.com/health
```

## Troubleshooting

### Pods Not Scaling Up

**Check HPA**:
```bash
kubectl describe hpa api -n production
```

**Check Resource Availability**:
```bash
kubectl describe nodes | grep -A 5 "Non-terminated Pods"
```

**Check Pod Events**:
```bash
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
```

### Pods Stuck in Pending

**Check Resource Constraints**:
```bash
kubectl describe pod <pending-pod> -n production
```

**Add Nodes**:
```bash
# Trigger cluster autoscaler or manually add nodes
```

### Uneven Load Distribution

**Check Service**:
```bash
kubectl describe svc api -n production
```

**Verify Pod Labels**:
```bash
kubectl get pods -n production -l app=api --show-labels
```

## Scaling Limits

### Recommended Limits

- **API Service**: 3-30 replicas
- **Worker Pods**: 1-50 replicas
- **Frontend**: 2-20 replicas
- **Database**: 1-3 replicas (stateful)

### Resource Per Pod

- **API Pod**: 1 CPU, 2Gi memory
- **Worker Pod**: 2 CPU, 4Gi memory
- **Frontend Pod**: 0.5 CPU, 1Gi memory

## Automated Scaling Rules

### CPU-Based Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Custom Metrics Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa-custom
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

## Post-Scaling Checks

- [ ] Deployment shows correct replica count
- [ ] All pods are Running and Ready
- [ ] Load is distributed evenly
- [ ] Response times are normal
- [ ] Error rate is stable
- [ ] Resource usage is within limits

## Related Runbooks

- [Restart Service](./restart-service.md)
- [High Latency Playbook](../playbooks/high-latency.md)
- [Resource Optimization](./resource-optimization.md)
