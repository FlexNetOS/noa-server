# Noa Server Kubernetes Deployment Guide

## Overview

This guide covers deploying Noa Server to Kubernetes clusters using manifest-based deployments with Kustomize for environment management.

## Architecture

### Namespace Strategy

- **Development**: `noa-server-dev`
- **Staging**: `noa-server-staging`
- **Production**: `noa-server`

### Service Components

| Component | Replicas (Prod) | Resources | Scaling |
|-----------|----------------|-----------|---------|
| MCP | 2-10 | 250m-1000m CPU, 256-512Mi RAM | HPA enabled |
| Claude Flow | 2-8 | 500m-2000m CPU, 512Mi-1Gi RAM | HPA enabled |
| UI Dashboard | 3-15 | 250m-1500m CPU, 384-768Mi RAM | HPA enabled |
| Llama.cpp | 1 | 2-4 CPU, 2-4Gi RAM, 1 GPU | Manual |
| AgenticOS | 2 | 500m-2000m CPU, 512Mi-1Gi RAM | Manual |
| Redis | 1 | 100m-500m CPU, 128-256Mi RAM | Manual |
| PostgreSQL | 1 | 250m-1000m CPU, 256-512Mi RAM | Manual |

## Prerequisites

### Required Tools

```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# kustomize
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
sudo mv kustomize /usr/local/bin/

# helm (optional)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Cluster Requirements

- Kubernetes 1.27+
- 16GB+ total cluster memory
- 8+ vCPUs
- 100GB+ storage
- NGINX Ingress Controller
- cert-manager (for TLS)
- (Optional) NVIDIA device plugin for GPU support

## Quick Start

### 1. Build and Push Images

```bash
cd /home/deflex/noa-server

# Build Docker image
docker build -f docker/Dockerfile -t noa-server:latest .

# Tag for registry
docker tag noa-server:latest your-registry.io/noa-server:v0.0.1

# Push to registry
docker push your-registry.io/noa-server:v0.0.1
```

### 2. Update Image References

```bash
# Edit k8s/base/kustomization.yaml
# Update images section:
images:
- name: noa-server
  newName: your-registry.io/noa-server
  newTag: v0.0.1
```

### 3. Deploy to Development

```bash
# Create namespace
kubectl apply -f k8s/base/namespace.yaml

# Deploy using kustomize
kubectl apply -k k8s/overlays/dev/

# Verify deployment
kubectl get pods -n noa-server-dev
kubectl get services -n noa-server-dev
```

### 4. Deploy to Production

```bash
# Update secrets first!
kubectl create secret generic noa-server-secrets \
  --from-literal=POSTGRES_PASSWORD='your-secure-password' \
  --from-literal=REDIS_PASSWORD='your-redis-password' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  -n noa-server

# Deploy
kubectl apply -k k8s/overlays/prod/

# Monitor rollout
kubectl rollout status deployment/noa-mcp -n noa-server
kubectl rollout status deployment/noa-claude-flow -n noa-server
```

## Configuration Management

### ConfigMaps

```bash
# View current config
kubectl get configmap noa-server-config -n noa-server -o yaml

# Update config (creates new version)
kubectl create configmap noa-server-config \
  --from-literal=NODE_ENV=production \
  --from-literal=LOG_LEVEL=info \
  -n noa-server \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up changes
kubectl rollout restart deployment/noa-mcp -n noa-server
```

### Secrets Management

**Development:**

```bash
# Create from literals
kubectl create secret generic noa-server-secrets \
  --from-literal=POSTGRES_PASSWORD='devpass' \
  -n noa-server-dev
```

**Production (Sealed Secrets):**

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Seal a secret
echo -n 'my-secret-password' | kubectl create secret generic noa-server-secrets \
  --dry-run=client \
  --from-file=POSTGRES_PASSWORD=/dev/stdin \
  -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Apply sealed secret
kubectl apply -f sealed-secret.yaml -n noa-server
```

**Production (External Secrets Operator):**

```bash
# Install ESO
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Create SecretStore (AWS example)
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: noa-server
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: noa-server-sa
EOF

# Create ExternalSecret
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: noa-server-secrets
  namespace: noa-server
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: noa-server-secrets
  data:
  - secretKey: POSTGRES_PASSWORD
    remoteRef:
      key: noa-server/postgres
      property: password
EOF
```

## Storage Management

### Persistent Volumes

```bash
# View PVCs
kubectl get pvc -n noa-server

# Resize PVC (requires storage class support)
kubectl patch pvc noa-postgres-pvc -n noa-server \
  -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Backup PVC
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_dump -U noa noa > backup.sql
```

### Storage Classes

```yaml
# fast-ssd.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
allowVolumeExpansion: true
```

## Networking

### Ingress Configuration

```bash
# Install NGINX Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Service Mesh (Optional)

```bash
# Install Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
istioctl install --set profile=default -y

# Label namespace for sidecar injection
kubectl label namespace noa-server istio-injection=enabled

# Verify injection
kubectl get pods -n noa-server
```

## Scaling

### Horizontal Pod Autoscaling

```bash
# View HPA status
kubectl get hpa -n noa-server

# Manually scale (overrides HPA temporarily)
kubectl scale deployment noa-mcp --replicas=5 -n noa-server

# Update HPA limits
kubectl patch hpa noa-mcp-hpa -n noa-server \
  -p '{"spec":{"maxReplicas":20}}'
```

### Vertical Pod Autoscaling

```bash
# Install VPA
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh

# Create VPA
cat <<EOF | kubectl apply -f -
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
    updateMode: "Auto"
EOF
```

### Cluster Autoscaling

Depends on cloud provider. Example for AWS:

```bash
# Install cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Configure autoscaler
kubectl -n kube-system edit deployment cluster-autoscaler
# Set --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/<cluster-name>
```

## GPU Support (Llama.cpp)

### Install NVIDIA Device Plugin

```bash
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.0/nvidia-device-plugin.yml

# Verify
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.allocatable.nvidia\.com/gpu}{"\n"}{end}'
```

### Label GPU Nodes

```bash
# Label nodes with GPU
kubectl label nodes <node-name> accelerator=nvidia-gpu

# Verify llama.cpp deployment
kubectl get pods -n noa-server -l app=noa-llama-cpp -o wide
```

## Monitoring

### Metrics Server

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View metrics
kubectl top nodes
kubectl top pods -n noa-server
```

### Prometheus & Grafana

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Login: admin / prom-operator
```

### Custom Metrics

```yaml
# ServiceMonitor for MCP service
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: noa-mcp-monitor
  namespace: noa-server
spec:
  selector:
    matchLabels:
      app: noa-mcp
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

## Logging

### Fluentd/Fluent Bit

```bash
# Install Fluent Bit
helm repo add fluent https://fluent.github.io/helm-charts
helm install fluent-bit fluent/fluent-bit \
  --namespace logging --create-namespace

# Configure output (example: Elasticsearch)
helm upgrade fluent-bit fluent/fluent-bit \
  --set backend.type=es \
  --set backend.es.host=elasticsearch.logging.svc.cluster.local
```

### EFK Stack

```bash
# Install Elasticsearch
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch -n logging

# Install Kibana
helm install kibana elastic/kibana -n logging

# Install Filebeat
helm install filebeat elastic/filebeat -n logging
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n noa-server

# Check events
kubectl get events -n noa-server --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n noa-server --previous
```

#### ImagePullBackOff

```bash
# Check image pull secrets
kubectl get pods <pod-name> -n noa-server -o jsonpath='{.spec.imagePullSecrets}'

# Create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=your-registry.io \
  --docker-username=user \
  --docker-password=pass \
  -n noa-server

# Add to service account
kubectl patch serviceaccount noa-server-sa -n noa-server \
  -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

#### CrashLoopBackOff

```bash
# Get logs from crashed pod
kubectl logs <pod-name> -n noa-server --previous

# Exec into running pod for debugging
kubectl exec -it <pod-name> -n noa-server -- sh

# Check resource limits
kubectl describe pod <pod-name> -n noa-server | grep -A 5 "Limits:"
```

### Health Check Debugging

```bash
# Test liveness probe manually
kubectl exec -it <pod-name> -n noa-server -- curl localhost:8001/health

# Disable probes temporarily for debugging
kubectl patch deployment noa-mcp -n noa-server --type=json \
  -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/livenessProbe"}]'
```

## Disaster Recovery

### Backup Strategy

```bash
# Backup all manifests
kubectl get all,configmaps,secrets,pvc -n noa-server -o yaml > noa-backup.yaml

# Backup etcd (if you have access)
ETCDCTL_API=3 etcdctl snapshot save snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Backup PVCs using Velero
velero backup create noa-backup --include-namespaces noa-server
```

### Restore Procedures

```bash
# Restore from manifests
kubectl apply -f noa-backup.yaml

# Restore using Velero
velero restore create --from-backup noa-backup
```

## Security Best Practices

1. **Use Network Policies** to restrict pod-to-pod communication
2. **Enable Pod Security Standards** (restricted mode)
3. **Use RBAC** with least privilege principle
4. **Scan images** with Trivy or similar tools
5. **Encrypt secrets** at rest and in transit
6. **Use service accounts** per application
7. **Enable audit logging**
8. **Regular security updates**

## Production Checklist

- [ ] All secrets externalized (Sealed Secrets/ESO)
- [ ] Resource limits configured
- [ ] HPA configured and tested
- [ ] PDB (Pod Disruption Budget) configured
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Logging aggregation setup
- [ ] TLS certificates configured
- [ ] Network policies applied
- [ ] RBAC permissions reviewed
- [ ] Image scanning integrated
- [ ] Disaster recovery plan tested

## Migration from Docker Compose

See [Docker to Kubernetes Migration Guide](./DOCKER_TO_K8S_MIGRATION.md)

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
