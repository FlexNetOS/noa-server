#!/bin/bash
# Creates all Kubernetes manifests

set -e
K8S_DIR="$(dirname "$0")"
cd "$K8S_DIR"

echo "Creating Kubernetes manifests..."

# deployment.yaml
cat > deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: message-queue-api
  namespace: noa-server
  labels:
    app: message-queue-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: message-queue-api
  template:
    metadata:
      labels:
        app: message-queue-api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: message-queue-api
          image: noa/message-queue-api:latest
          imagePullPolicy: IfNotPresent
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            capabilities:
              drop:
                - ALL
          ports:
            - name: http
              containerPort: 8081
          env:
            - name: NODE_ENV
              value: "production"
            - name: REDIS_HOST
              valueFrom:
                configMapKeyRef:
                  name: message-queue-config
                  key: REDIS_HOST
            - name: REDIS_PORT
              valueFrom:
                configMapKeyRef:
                  name: message-queue-config
                  key: REDIS_PORT
          envFrom:
            - configMapRef:
                name: message-queue-config
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 1Gi
          volumeMounts:
            - name: logs
              mountPath: /app/logs
            - name: tmp
              mountPath: /tmp
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 15
            periodSeconds: 5
      volumes:
        - name: logs
          emptyDir: {}
        - name: tmp
          emptyDir: {}
EOF

# service.yaml
cat > service.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: message-queue-api
  namespace: noa-server
  labels:
    app: message-queue-api
spec:
  type: ClusterIP
  selector:
    app: message-queue-api
  ports:
    - name: http
      port: 8081
      targetPort: http
---
apiVersion: v1
kind: Service
metadata:
  name: message-queue-api-external
  namespace: noa-server
  labels:
    app: message-queue-api
spec:
  type: LoadBalancer
  selector:
    app: message-queue-api
  ports:
    - name: http
      port: 80
      targetPort: http
EOF

# configmap.yaml
cat > configmap.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: message-queue-config
  namespace: noa-server
data:
  NODE_ENV: "production"
  API_PORT: "8081"
  LOG_LEVEL: "info"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  ENABLE_WEBSOCKET: "true"
  ENABLE_METRICS: "true"
EOF

# secret.yaml
cat > secret.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: message-queue-secrets
  namespace: noa-server
type: Opaque
data:
  REDIS_PASSWORD: ""
  JWT_SECRET: c3VwZXItc2VjcmV0LWp3dC1rZXk=
EOF

# hpa.yaml
cat > hpa.yaml << 'EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: message-queue-api-hpa
  namespace: noa-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: message-queue-api
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
EOF

# redis.yaml
cat > redis.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: noa-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: noa-server
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
EOF

echo "✓ Created deployment.yaml"
echo "✓ Created service.yaml"
echo "✓ Created configmap.yaml"
echo "✓ Created secret.yaml"
echo "✓ Created hpa.yaml"
echo "✓ Created redis.yaml"
echo ""
echo "Kubernetes manifests created successfully!"

