#!/bin/bash
# Kubernetes Deployment Script

set -e

NAMESPACE="${NAMESPACE:-noa-server}"
SERVICE_NAME="message-queue-api"

echo "Deploying to Kubernetes..."
echo "Namespace: ${NAMESPACE}"

# Create namespace if it doesn't exist
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Apply Kubernetes manifests
kubectl apply -f k8s/configmap.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/secret.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/redis.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/deployment.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/service.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/hpa.yaml -n "${NAMESPACE}"

# Wait for deployment
echo "Waiting for deployment..."
kubectl wait --for=condition=available --timeout=300s \
    deployment/"${SERVICE_NAME}" -n "${NAMESPACE}"

echo "✓ Deployment complete!"
kubectl get pods -n "${NAMESPACE}" -l app="${SERVICE_NAME}"
