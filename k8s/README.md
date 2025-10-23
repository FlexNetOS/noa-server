# Noa Server Kubernetes Deployment

Complete Kubernetes deployment configuration with Helm charts and Kustomize overlays.

## Quick Start

### Helm Deployment
```bash
helm install noa-server ./k8s/helm/noa-server --namespace noa-server --create-namespace
```

### Kustomize Deployment
```bash
kubectl apply -k k8s/overlays/prod
```

See full documentation in /home/deflex/noa-server/docs/k8s/
