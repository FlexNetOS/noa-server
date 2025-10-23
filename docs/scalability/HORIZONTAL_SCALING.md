# Horizontal Scaling Guide for Noa Server

## Table of Contents
1. [Overview](#overview)
2. [Scaling Strategies](#scaling-strategies)
3. [Kubernetes HPA Configuration](#kubernetes-hpa-configuration)
4. [Load Balancer Setup](#load-balancer-setup)
5. [Auto Scaling Groups (AWS)](#auto-scaling-groups-aws)
6. [Capacity Planning](#capacity-planning)
7. [Performance Testing](#performance-testing)
8. [Cost Optimization](#cost-optimization)
9. [Monitoring and Alerts](#monitoring-and-alerts)
10. [Troubleshooting](#troubleshooting)

## Overview

Horizontal scaling allows Noa Server to handle increased load by adding more instances rather than increasing the resources of existing instances. This guide covers both Kubernetes and AWS-based horizontal scaling implementations.

### Benefits of Horizontal Scaling

- **High Availability**: Multiple instances provide redundancy
- **Load Distribution**: Traffic is distributed across instances
- **Cost Efficiency**: Scale resources based on actual demand
- **Zero Downtime**: Rolling updates without service interruption
- **Geographic Distribution**: Deploy closer to users

### Architecture Components

```
┌─────────────────┐
│  Load Balancer  │ ◄── Distributes traffic
└────────┬────────┘
         │
    ┌────┴────┬─────────┬─────────┐
    │         │         │         │
┌───▼───┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐
│ App 1 │ │ App 2│ │ App 3│ │ App N│
└───────┘ └──────┘ └──────┘ └──────┘
```

## Scaling Strategies

### 1. Reactive Scaling

Scale based on current metrics:

- **CPU-based**: Scale when CPU > 70%
- **Memory-based**: Scale when memory > 80%
- **Request-based**: Scale when requests > 1000/s per instance
- **Response time**: Scale when P95 > 500ms

### 2. Predictive Scaling

Scale based on expected load:

- **Time-based**: Scale up before peak hours
- **Historical patterns**: Use ML to predict load
- **Event-driven**: Scale before known events

### 3. Scheduled Scaling

Pre-defined scaling schedule:

```yaml
# Scale up for business hours
- Weekdays 8 AM: 8 instances
- Weekdays 10 PM: 3 instances
- Weekends: 3 instances minimum
```

## Kubernetes HPA Configuration

### Basic Setup

1. **Deploy metrics-server**:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

2. **Apply HPA configuration**:
```bash
kubectl apply -f k8s/scaling/hpa/noa-server-hpa.yaml
```

3. **Verify HPA**:
```bash
kubectl get hpa -n noa-system
kubectl describe hpa noa-server-hpa -n noa-system
```

### Custom Metrics

Install Prometheus Adapter for custom metrics:

```bash
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-server.monitoring.svc
```

Configure custom metrics in HPA:

```yaml
metrics:
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "1000"
```

### Testing HPA

Generate load to test scaling:

```bash
# Run load test
kubectl run -it --rm load-generator --image=busybox --restart=Never -- /bin/sh -c \
  "while sleep 0.01; do wget -q -O- http://noa-server.noa-system.svc.cluster.local:3000/api/test; done"

# Watch HPA scaling
kubectl get hpa -n noa-system --watch
```

## Load Balancer Setup

### NGINX Ingress Controller

1. **Install NGINX Ingress**:
```bash
kubectl apply -f k8s/scaling/ingress/nginx-ingress.yaml
```

2. **Configure SSL/TLS**:
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f k8s/cert-manager/cluster-issuer.yaml
```

3. **Verify ingress**:
```bash
kubectl get ingress -n noa-system
kubectl describe ingress noa-server-ingress -n noa-system
```

### HAProxy Alternative

Deploy HAProxy for advanced load balancing:

```bash
kubectl apply -f k8s/scaling/ingress/haproxy-config.yaml
```

HAProxy provides:
- Multiple load balancing algorithms
- Advanced health checking
- Connection pooling
- Better WebSocket support

### Load Balancing Algorithms

#### Round Robin
Distributes requests evenly across all instances.

```nginx
upstream backend {
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
}
```

#### Least Connections
Routes to instance with fewest active connections.

```nginx
upstream backend {
    least_conn;
    server backend1.example.com;
    server backend2.example.com;
}
```

#### IP Hash
Ensures requests from same IP go to same instance (sticky sessions).

```nginx
upstream backend {
    ip_hash;
    server backend1.example.com;
    server backend2.example.com;
}
```

## Auto Scaling Groups (AWS)

### Terraform Deployment

1. **Initialize Terraform**:
```bash
cd terraform/scaling
terraform init
```

2. **Plan deployment**:
```bash
terraform plan -var-file=production.tfvars
```

3. **Apply configuration**:
```bash
terraform apply -var-file=production.tfvars
```

### Configuration Variables

Create `production.tfvars`:

```hcl
environment         = "production"
vpc_id             = "vpc-xxxxx"
private_subnet_ids = ["subnet-xxxxx", "subnet-yyyyy"]
public_subnet_ids  = ["subnet-aaaaa", "subnet-bbbbb"]
key_name           = "noa-server-key"
instance_type      = "t3.large"
min_size           = 3
max_size           = 20
desired_capacity   = 5
```

### Scaling Policies

#### Target Tracking

Automatically adjusts capacity to maintain target metric:

```hcl
resource "aws_autoscaling_policy" "cpu_target_tracking" {
  policy_type = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

#### Step Scaling

More aggressive scaling based on alarm severity:

```hcl
step_adjustment {
  scaling_adjustment = 100  # Double capacity
  metric_interval_lower_bound = 0
  metric_interval_upper_bound = 10
}

step_adjustment {
  scaling_adjustment = 200  # Triple capacity
  metric_interval_lower_bound = 10
}
```

## Capacity Planning

### Calculate Required Capacity

1. **Measure single instance capacity**:
   - Requests per second: 500 req/s
   - Concurrent connections: 100
   - CPU at capacity: 80%

2. **Calculate total capacity needed**:
   ```
   Peak traffic: 10,000 req/s
   Required instances: 10,000 / 500 = 20 instances
   Add 20% buffer: 20 * 1.2 = 24 instances
   ```

3. **Set scaling parameters**:
   ```yaml
   minReplicas: 5    # Handle minimum load
   maxReplicas: 30   # Handle peak + buffer
   targetCPU: 70%    # Scale before saturation
   ```

### Load Testing

Use k6 for load testing:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Spike to 500
    { duration: '5m', target: 500 },   // Stay at 500
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% errors
  },
};

export default function () {
  const response = http.get('https://noa-server.io/api/test');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

Run test:
```bash
k6 run --vus 100 --duration 30s load-test.js
```

## Performance Testing

### Benchmarking Tools

1. **Apache Bench**:
```bash
ab -n 10000 -c 100 https://noa-server.io/api/test
```

2. **wrk**:
```bash
wrk -t12 -c400 -d30s https://noa-server.io/api/test
```

3. **Artillery**:
```yaml
config:
  target: 'https://noa-server.io'
  phases:
    - duration: 60
      arrivalRate: 100
scenarios:
  - flow:
      - get:
          url: "/api/test"
```

### Performance Metrics

Monitor these key metrics:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Response time (P95) | < 500ms | > 1000ms |
| Error rate | < 0.1% | > 1% |
| CPU utilization | 50-70% | > 85% |
| Memory usage | 50-70% | > 85% |
| Request rate | - | Monitor trends |

## Cost Optimization

### Strategies

1. **Use Reserved Instances** (AWS):
   - Save up to 75% for predictable load
   - Reserved for minimum capacity (3 instances)

2. **Use Spot Instances** (AWS):
   - Save up to 90% for non-critical workloads
   - Configure ASG with mixed instances

3. **Right-size instances**:
   - Start with smaller instances
   - Use burstable instances (t3) for variable load
   - Upgrade only when consistently hitting limits

4. **Optimize scaling policies**:
   ```yaml
   scaleDown:
     stabilizationWindowSeconds: 300  # Wait 5 minutes
     policy: Min                       # Conservative scaling
   ```

### Cost Monitoring

```bash
# AWS Cost Explorer CLI
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Environment

# Kubernetes cost monitoring with Kubecost
kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Application Metrics**:
   - Request rate
   - Response time (P50, P95, P99)
   - Error rate
   - Active connections

2. **Infrastructure Metrics**:
   - CPU utilization
   - Memory usage
   - Disk I/O
   - Network throughput

3. **Scaling Metrics**:
   - Current replica count
   - Desired replica count
   - Scaling events
   - Time to scale

### Prometheus Queries

```promql
# Request rate per instance
rate(http_requests_total[5m])

# Average response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Scaling events
rate(kube_horizontalpodautoscaler_status_current_replicas[5m])
```

### Alert Rules

```yaml
groups:
- name: scaling-alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate detected"

  - alert: SlowResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    annotations:
      summary: "Slow response time detected"
```

## Troubleshooting

### Common Issues

#### 1. Instances Not Scaling

**Symptoms**:
- HPA shows "unknown" metrics
- Replicas stay at minimum

**Solutions**:
```bash
# Check metrics-server
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl logs -n kube-system -l k8s-app=metrics-server

# Verify resource requests are set
kubectl get deployment noa-server -n noa-system -o yaml | grep -A 5 resources
```

#### 2. Rapid Scaling (Flapping)

**Symptoms**:
- Frequent scale up/down events
- Unstable replica count

**Solutions**:
```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 60
  scaleDown:
    stabilizationWindowSeconds: 300
```

#### 3. Health Check Failures

**Symptoms**:
- New instances terminated immediately
- Load balancer shows unhealthy targets

**Solutions**:
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30  # Increase startup time
  periodSeconds: 10
  timeoutSeconds: 5
  successThreshold: 2      # Require 2 successful checks
```

#### 4. Uneven Load Distribution

**Symptoms**:
- Some instances overloaded while others idle
- Inconsistent response times

**Solutions**:
- Enable session affinity/sticky sessions
- Adjust load balancing algorithm
- Check for connection pooling issues

### Debug Commands

```bash
# Kubernetes
kubectl get hpa -n noa-system --watch
kubectl describe hpa noa-server-hpa -n noa-system
kubectl top pods -n noa-system
kubectl logs -n noa-system -l app=noa-server --tail=100

# AWS
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names noa-server-asg-production
aws autoscaling describe-scaling-activities --auto-scaling-group-name noa-server-asg-production
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization
```

## Best Practices

1. **Set resource requests and limits** for predictable scaling
2. **Use multiple scaling metrics** to avoid one-dimensional scaling
3. **Configure stabilization windows** to prevent flapping
4. **Implement graceful shutdown** for zero-downtime deployments
5. **Monitor scaling events** and adjust policies based on patterns
6. **Test scaling behavior** under load regularly
7. **Document capacity planning** decisions
8. **Use canary deployments** for safe rollouts at scale
9. **Implement circuit breakers** for external dependencies
10. **Plan for zone/region failures** with multi-AZ deployment

## References

- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [AWS Auto Scaling Best Practices](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Prometheus Adapter](https://github.com/kubernetes-sigs/prometheus-adapter)

---

**Last Updated**: 2025-10-22
**Version**: 1.0.0
**Maintainer**: DevOps Team
