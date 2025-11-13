# Scaling Runbook

## Overview

This runbook provides procedures for scaling NOA Server infrastructure both
horizontally (adding more instances) and vertically (increasing resource
allocation). It covers manual scaling, auto-scaling configuration, and capacity
planning.

## When to Scale

### Indicators for Scaling Up

- CPU utilization >70% sustained for 15+ minutes
- Memory utilization >80% sustained for 10+ minutes
- Response time p95 >1s sustained for 10+ minutes
- Queue depth >1000 messages for 5+ minutes
- Error rate >2% (may indicate resource exhaustion)
- Request rate approaching capacity (>80% of max throughput)

### Indicators for Scaling Down

- CPU utilization <30% sustained for 1+ hour
- Memory utilization <40% sustained for 1+ hour
- Request rate dropped significantly (<50% of baseline)
- Over-provisioned resources (cost optimization)

## Horizontal Scaling (Adding Instances)

### Manual Horizontal Scaling

#### Scale API Pods

```bash
# Current replica count
kubectl get deployment noa-mcp -n noa-server

# Scale MCP service from 3 to 6 replicas
kubectl scale deployment noa-mcp --replicas=6 -n noa-server

# Monitor rollout
kubectl rollout status deployment/noa-mcp -n noa-server

# Verify new pods running
kubectl get pods -l app=noa-mcp -n noa-server -o wide

# Expected: 6/6 pods in Running state
```

#### Scale Claude Flow Pods

```bash
# Scale Claude Flow from 2 to 5 replicas
kubectl scale deployment noa-claude-flow --replicas=5 -n noa-server

# Monitor
kubectl rollout status deployment/noa-claude-flow -n noa-server

# Verify load distributed
kubectl top pods -l app=noa-claude-flow -n noa-server
```

#### Scale UI Dashboard

```bash
# Scale UI from 3 to 8 replicas
kubectl scale deployment noa-ui --replicas=8 -n noa-server

# Verify load balancer distributing traffic
kubectl get endpoints noa-ui -n noa-server
```

#### Scale Worker Pool

```bash
# Scale background workers from 2 to 4
kubectl scale deployment noa-workers --replicas=4 -n noa-server

# Monitor queue depth decreasing
# Prometheus: rate(queue_depth[5m])
```

### Validation After Horizontal Scaling

```bash
# 1. Check all pods healthy
kubectl get pods -n noa-server | grep -E "(mcp|claude-flow|ui)"

# 2. Verify load distributed evenly
kubectl top pods -l app=noa-mcp -n noa-server

# CPU and memory should be roughly equal across pods

# 3. Monitor request distribution
# Grafana dashboard: https://grafana.noaserver.com/d/scaling
# Verify requests distributed across all pods

# 4. Check response time improved
# Prometheus: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
# Expected: <1s p95

# 5. Monitor for 15 minutes
# Watch for any errors or performance issues
```

## Vertical Scaling (Increasing Resources)

### Increase Pod Resources

#### Increase Memory Limits

```bash
# Current resource limits
kubectl describe deployment noa-mcp -n noa-server | grep -A 5 "Limits:"

# Patch deployment to increase memory from 512Mi to 1Gi
kubectl patch deployment noa-mcp -n noa-server --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "1Gi"},
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/memory", "value": "768Mi"}
  ]'

# This will trigger rolling restart
kubectl rollout status deployment/noa-mcp -n noa-server

# Verify new limits
kubectl describe pod -l app=noa-mcp -n noa-server | grep -A 5 "Limits:"
```

#### Increase CPU Limits

```bash
# Increase CPU from 500m to 1000m (0.5 to 1 core)
kubectl patch deployment noa-mcp -n noa-server --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/cpu", "value": "1000m"},
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/cpu", "value": "750m"}
  ]'

# Monitor rollout
kubectl rollout status deployment/noa-mcp -n noa-server
```

### Database Scaling

#### Increase PostgreSQL Resources

```bash
# Method 1: Modify StatefulSet (requires downtime)
kubectl patch statefulset noa-postgres -n noa-server --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"},
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/cpu", "value": "1000m"}
  ]'

# Delete pod to apply changes
kubectl delete pod noa-postgres-0 -n noa-server
# StatefulSet will recreate with new resources

# Method 2: Vertical Pod Autoscaler (recommended)
# See Auto-Scaling section below
```

#### Increase PostgreSQL Storage

```bash
# Check current storage
kubectl get pvc noa-postgres-pvc -n noa-server

# Increase PVC size from 20Gi to 50Gi
# Note: Requires storage class with allowVolumeExpansion: true
kubectl patch pvc noa-postgres-pvc -n noa-server \
  -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Monitor expansion (may take several minutes)
kubectl get pvc noa-postgres-pvc -n noa-server -w

# Verify new size in pod
kubectl exec -it noa-postgres-0 -n noa-server -- df -h /var/lib/postgresql/data
```

### Redis Scaling

#### Increase Redis Memory

```bash
# Update Redis memory limit
kubectl patch statefulset noa-redis -n noa-server --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "1Gi"}
  ]'

# Restart Redis pod
kubectl delete pod noa-redis-0 -n noa-server

# Update Redis max memory config
kubectl exec -it noa-redis-0 -n noa-server -- redis-cli CONFIG SET maxmemory 900mb
kubectl exec -it noa-redis-0 -n noa-server -- redis-cli CONFIG REWRITE
```

## Auto-Scaling

### Horizontal Pod Autoscaler (HPA)

#### Configure HPA for MCP Service

```bash
# Create HPA for MCP service
# Scale between 3-10 replicas based on CPU/memory
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: noa-mcp-hpa
  namespace: noa-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: noa-mcp
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
EOF

# Verify HPA created
kubectl get hpa noa-mcp-hpa -n noa-server

# Monitor HPA status
kubectl describe hpa noa-mcp-hpa -n noa-server

# Watch HPA in action
kubectl get hpa -n noa-server -w
```

#### Configure HPA for Claude Flow

```bash
# Create HPA with custom metrics (request rate)
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: noa-claude-flow-hpa
  namespace: noa-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: noa-claude-flow
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
EOF
```

#### Configure HPA for UI Dashboard

```bash
# UI scales based on concurrent connections
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: noa-ui-hpa
  namespace: noa-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: noa-ui
  minReplicas: 3
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Pods
    pods:
      metric:
        name: active_connections
      target:
        type: AverageValue
        averageValue: "500"
EOF
```

#### Update HPA Limits

```bash
# Increase max replicas during high-traffic event
kubectl patch hpa noa-mcp-hpa -n noa-server \
  -p '{"spec":{"maxReplicas":20}}'

# Decrease min replicas during low-traffic period
kubectl patch hpa noa-mcp-hpa -n noa-server \
  -p '{"spec":{"minReplicas":2}}'

# Adjust CPU threshold
kubectl patch hpa noa-mcp-hpa -n noa-server --type='json' \
  -p='[{"op": "replace", "path": "/spec/metrics/0/resource/target/averageUtilization", "value": 80}]'
```

### Vertical Pod Autoscaler (VPA)

#### Install VPA

```bash
# Install VPA components
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh

# Verify VPA components running
kubectl get pods -n kube-system | grep vpa
```

#### Configure VPA for MCP Service

```bash
# Create VPA in recommendation mode (doesn't auto-apply)
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: noa-mcp-vpa
  namespace: noa-server
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: noa-mcp
  updatePolicy:
    updateMode: "Off"  # Recommendation mode
  resourcePolicy:
    containerPolicies:
    - containerName: noa-mcp
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
EOF

# View VPA recommendations
kubectl describe vpa noa-mcp-vpa -n noa-server

# Apply recommendations manually if appropriate
```

#### Enable VPA Auto-Update

```bash
# Switch VPA to auto-update mode
# WARNING: This will restart pods when recommendations change
kubectl patch vpa noa-mcp-vpa -n noa-server \
  -p '{"spec":{"updatePolicy":{"updateMode":"Auto"}}}'

# Monitor VPA updates
kubectl get vpa noa-mcp-vpa -n noa-server -w
```

### Cluster Autoscaler

#### Configure Cluster Autoscaler (AWS)

```bash
# Install cluster autoscaler
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/noa-cluster
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
EOF

# Monitor cluster autoscaler
kubectl logs -f deployment/cluster-autoscaler -n kube-system
```

## Load Balancing

### NGINX Ingress Load Balancing

```bash
# View current ingress configuration
kubectl get ingress noa-server-ingress -n noa-server -o yaml

# Update load balancing algorithm to round-robin
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/upstream-hash-by='$request_uri' --overwrite

# Sticky sessions (if needed)
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/affinity="cookie" \
  nginx.ingress.kubernetes.io/session-cookie-name="route" \
  nginx.ingress.kubernetes.io/session-cookie-expires="172800"
```

### Service Load Balancing

```bash
# View service endpoints
kubectl get endpoints noa-mcp -n noa-server

# Check load distribution
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl http://noa-mcp:8001/api/v1/metrics | grep request_count
```

## Monitoring Scaling Operations

### Key Metrics to Monitor

```bash
# CPU utilization per pod
kubectl top pods -n noa-server --sort-by=cpu

# Memory utilization per pod
kubectl top pods -n noa-server --sort-by=memory

# Request rate per pod
# Prometheus: rate(http_requests_total[5m]) by (pod)

# Error rate during scaling
# Prometheus: rate(http_requests_total{status=~"5.."}[5m])

# Response time during scaling
# Prometheus: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Pod count over time
kubectl get hpa -n noa-server -w
```

### Grafana Dashboards

```
Scaling Dashboards:
- Autoscaling Overview: https://grafana.noaserver.com/d/autoscaling
- Pod Utilization: https://grafana.noaserver.com/d/pod-utilization
- Cluster Capacity: https://grafana.noaserver.com/d/cluster-capacity
- Load Distribution: https://grafana.noaserver.com/d/load-distribution
```

## Capacity Planning

### Calculate Required Capacity

```bash
# Current capacity metrics
# Request rate: 1000 req/min
# Pod count: 3
# CPU per pod: 500m (0.5 cores)
# Memory per pod: 512Mi

# Per-pod capacity: 1000 req/min ÷ 3 pods = 333 req/min per pod

# Target capacity for growth (2x current load)
# Required: 2000 req/min
# Required pods: 2000 ÷ 333 = 6 pods

# Calculate resource needs
# Total CPU: 6 pods × 500m = 3000m (3 cores)
# Total Memory: 6 pods × 512Mi = 3Gi

# Check cluster capacity
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Load Testing Before Scaling

```bash
# Run load test with k6
k6 run --vus 100 --duration 5m load-test.js

# Monitor during load test
watch -n 5 kubectl top pods -n noa-server

# Check auto-scaling trigger
kubectl get hpa -n noa-server -w

# Verify scaling meets demand
# Expected: HPA scales pods to handle load
```

### Scaling Schedule

```
# Typical scaling schedule for NOA Server:

Low traffic (2am-8am UTC):
- MCP: 2-3 replicas
- Claude Flow: 2 replicas
- UI: 3 replicas

Medium traffic (8am-12pm, 8pm-2am UTC):
- MCP: 3-5 replicas
- Claude Flow: 2-4 replicas
- UI: 3-6 replicas

High traffic (12pm-8pm UTC):
- MCP: 5-10 replicas
- Claude Flow: 4-8 replicas
- UI: 6-12 replicas

# Configure HPA min/max replicas accordingly
```

## Cost Optimization

### Right-Sizing Workloads

```bash
# Use VPA recommendations to right-size
kubectl describe vpa noa-mcp-vpa -n noa-server

# Example output:
# Recommendation:
#   Container: noa-mcp
#   Lower Bound: cpu: 300m, memory: 384Mi
#   Target: cpu: 450m, memory: 512Mi
#   Upper Bound: cpu: 800m, memory: 1Gi

# Apply VPA recommendations:
kubectl patch deployment noa-mcp -n noa-server --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/cpu", "value": "450m"},
    {"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/memory", "value": "512Mi"}
  ]'
```

### Scheduled Scaling

```bash
# Create CronJob to scale down during low traffic
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-low-traffic
  namespace: noa-server
spec:
  schedule: "0 2 * * *"  # 2am UTC daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - kubectl scale deployment noa-mcp --replicas=2 -n noa-server
          restartPolicy: OnFailure
EOF

# Create CronJob to scale up before peak traffic
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-peak-traffic
  namespace: noa-server
spec:
  schedule: "0 11 * * *"  # 11am UTC daily (1 hour before peak)
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: kubectl
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - kubectl scale deployment noa-mcp --replicas=6 -n noa-server
          restartPolicy: OnFailure
EOF
```

## Troubleshooting Scaling Issues

### Pods Not Scaling Up

```bash
# Check HPA status
kubectl describe hpa noa-mcp-hpa -n noa-server

# Common issues:
# 1. Metrics server not installed
kubectl get apiservice v1beta1.metrics.k8s.io

# 2. Resource limits not set
kubectl describe deployment noa-mcp -n noa-server | grep -A 5 "Limits:"

# 3. Max replicas reached
kubectl get hpa noa-mcp-hpa -n noa-server
# Check current replicas vs maxReplicas

# 4. Insufficient cluster capacity
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Pods Scaling Too Aggressively

```bash
# Increase stabilization window
kubectl patch hpa noa-mcp-hpa -n noa-server --type='json' \
  -p='[{"op": "replace", "path": "/spec/behavior/scaleUp/stabilizationWindowSeconds", "value": 180}]'

# Reduce scale-up rate
kubectl patch hpa noa-mcp-hpa -n noa-server --type='json' \
  -p='[{"op": "replace", "path": "/spec/behavior/scaleUp/policies/0/value", "value": 25}]'
```

### Uneven Load Distribution

```bash
# Check pod ready status
kubectl get pods -l app=noa-mcp -n noa-server -o wide

# Check service endpoints
kubectl get endpoints noa-mcp -n noa-server

# Verify load balancer health checks
kubectl describe svc noa-mcp -n noa-server

# Test from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  sh -c 'for i in $(seq 1 10); do curl -s http://noa-mcp:8001/health; done'
```

## Best Practices

1. **Set Resource Requests and Limits**: Always define CPU/memory requests and
   limits
2. **Use HPA for Stateless Services**: Auto-scale API and worker pods
3. **Monitor Before Scaling**: Check metrics before manual scaling
4. **Test Scaling in Staging**: Validate scaling procedures in non-production
5. **Gradual Scaling**: Scale incrementally, monitor between changes
6. **Document Scaling Events**: Record when and why you scaled
7. **Review VPA Recommendations**: Periodically review and right-size workloads
8. **Enable Cluster Autoscaler**: Let cluster scale nodes automatically
9. **Set Appropriate HPA Windows**: Avoid thrashing with proper stabilization
10. **Load Test Regularly**: Validate capacity planning with realistic load
    tests

## Related Documentation

- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Performance Tuning](./PERFORMANCE_TUNING.md)
- [Kubernetes Guide](../infrastructure/KUBERNETES_GUIDE.md)
- [Monitoring Guide](../infrastructure/MONITORING_GUIDE.md)

## Support

- DevOps Team: #devops on Slack
- On-call Engineer: PagerDuty
- Capacity Planning: capacity-planning@noaserver.com
