# Production Readiness Plan for MCP Final

**Version:** 1.0
**Date:** 2025-10-27
**Policy:** Heal, DO NOT HARM. Upgrades Only, No downgrades.

---

## Executive Summary

This plan transforms `/mcp-final` into a production-ready MCP (Model Context Protocol) platform by consolidating scattered components, standardizing naming conventions, and adding enterprise-grade features while preserving ALL existing functionality.

### Current Issues Identified

1. **3 separate UI bundles** (model_gateway_ui_bundle, model_gateway_ui_upgrade, model_gateway_ui_upgrade2) with overlapping code
2. Inconsistent naming conventions (snake_case bundles vs kebab-case components)
3. Empty placeholder directories (ui/, components/, charts/)
4. No clear separation between source, deployments, and infrastructure
5. Lack of production configurations (environments, secrets management, monitoring)
6. No centralized testing or CI/CD structure
7. Documentation scattered across multiple READMEs

### Guiding Principles

- **PRESERVE:** All existing functionality must be retained
- **MERGE:** Combine duplicates, keeping all features from all versions
- **UPGRADE:** Add modern features, security, monitoring, and best practices
- **STANDARDIZE:** Apply consistent naming and structure
- **DOCUMENT:** Comprehensive documentation for all components

---

## Phase 1: Directory Structure Reorganization

### 1.1 Proposed Production-Ready Structure

```
mcp-final/
├── src/                              # All source code
│   ├── server/                       # MCP server (from mcp_stack_helm_skeleton/mcp-server)
│   │   ├── src/
│   │   ├── dist/
│   │   ├── package.json
│   │   └── README.md
│   ├── gateway/                      # Model gateway (consolidated from 3 bundles)
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   ├── ui/                          # Consolidated UI dashboard
│   │   ├── src/
│   │   │   ├── components/          # React components
│   │   │   ├── pages/               # Page components
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── services/            # API services
│   │   │   └── utils/               # Utilities
│   │   ├── public/
│   │   ├── package.json
│   │   └── README.md
│   ├── libs/                        # Shared libraries
│   │   ├── envelope/                # CloudEvents envelope
│   │   ├── tracecontext/            # OpenTelemetry utils
│   │   └── common/                  # Shared utilities
│   ├── agents/                      # All agents consolidated
│   │   ├── rollout/
│   │   ├── cost/
│   │   ├── safety/
│   │   └── common/
│   ├── services/                    # Backend services
│   │   ├── rollout-applier/
│   │   ├── agent-mesh/
│   │   ├── mcp-graph/
│   │   └── apo/                     # Auto-Plug Operator
│   ├── adapters/                    # Data adapters
│   │   ├── db-postgres/
│   │   ├── db-sqlite/
│   │   └── vector-qdrant/
│   └── wasm/                        # WASM components
│       ├── sdk/
│       ├── abi/
│       └── pool/
│
├── infrastructure/                   # All infrastructure as code
│   ├── helm/                        # Helm charts
│   │   ├── mcp-stack/              # Core stack chart
│   │   ├── control-plane/          # Control plane charts
│   │   │   ├── spire/
│   │   │   ├── vault/
│   │   │   ├── nexus/
│   │   │   ├── cas-vfs/
│   │   │   └── argocd-apps/
│   │   ├── gateway/                # Gateway chart
│   │   ├── ui/                     # UI chart
│   │   ├── gatekeeper/             # Policy charts
│   │   │   ├── invariants/
│   │   │   └── plan-bins/
│   │   └── _helpers/               # Chart helpers
│   ├── terraform/                   # Terraform modules (NEW)
│   │   ├── aws/
│   │   ├── gcp/
│   │   └── azure/
│   └── docker/                      # Dockerfiles
│       ├── server.Dockerfile
│       ├── gateway.Dockerfile
│       ├── ui.Dockerfile
│       └── cas-vfsd.Dockerfile
│
├── deployments/                     # Environment-specific configs (NEW)
│   ├── local/
│   │   ├── .env.example
│   │   ├── docker-compose.yml
│   │   └── README.md
│   ├── dev/
│   │   ├── values.yaml
│   │   └── secrets.example.yaml
│   ├── staging/
│   │   └── values.yaml
│   └── production/
│       ├── values.yaml
│       └── security-config.yaml
│
├── policies/                        # Centralized policies
│   ├── gatekeeper/                 # OPA Gatekeeper policies
│   │   ├── plan-annotations.rego
│   │   ├── image-by-digest.rego
│   │   └── provider-allowlist.rego
│   ├── opa/                        # OPA bundle policies
│   └── spire/                      # SPIRE configs
│       └── registration-examples/
│
├── config/                          # Configuration management (NEW)
│   ├── nats/                       # NATS configs
│   ├── otel/                       # OpenTelemetry configs
│   ├── openfeature/                # Feature flags
│   └── secrets/                    # Secret templates
│       └── .gitkeep
│
├── scripts/                         # Utility scripts
│   ├── setup/
│   │   ├── install-local.sh
│   │   └── install-k8s.sh
│   ├── build/
│   │   ├── build-all.sh
│   │   └── build-images.sh
│   ├── deploy/
│   │   ├── deploy-dev.sh
│   │   └── deploy-prod.sh
│   └── utils/
│       ├── generate-certs.sh
│       └── backup.sh
│
├── tools/                          # Development tools
│   ├── mcp-cli/                   # CLI tools
│   ├── shims/                     # /usr/bin shims
│   └── home-skel/                 # ~/.mcp skeleton
│
├── tests/                          # All tests (NEW)
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── load/
│
├── docs/                           # Documentation
│   ├── README.md                  # Main documentation
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── data-flow.md
│   │   └── security.md
│   ├── guides/
│   │   ├── quick-start.md
│   │   ├── installation.md
│   │   ├── configuration.md
│   │   └── troubleshooting.md
│   ├── api/
│   │   ├── server-api.md
│   │   ├── gateway-api.md
│   │   └── openapi.yaml
│   └── operations/
│       ├── deployment.md
│       ├── monitoring.md
│       └── disaster-recovery.md
│
├── .github/                        # CI/CD workflows (NEW)
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── build-images.yml
│   │   ├── deploy-dev.yml
│   │   ├── deploy-staging.yml
│   │   └── security-scan.yml
│   └── CODEOWNERS
│
├── monitoring/                     # Monitoring configs (NEW)
│   ├── grafana/
│   │   └── dashboards/
│   ├── prometheus/
│   │   └── rules/
│   └── alerts/
│
├── .env.example                   # Environment template (NEW)
├── .gitignore                     # Git ignore rules (NEW)
├── .dockerignore                  # Docker ignore rules (NEW)
├── Makefile                       # Build automation (NEW)
├── package.json                   # Root package.json (workspace) (NEW)
├── tsconfig.json                  # Root TypeScript config (NEW)
├── README.md                      # Main README (ENHANCED)
├── CONTRIBUTING.md               # Contribution guidelines (NEW)
├── LICENSE                       # License file (NEW)
└── CHANGELOG.md                  # Version changelog (NEW)
```

### 1.2 Migration Strategy (NO DELETIONS)

**Key Principle:** All original bundles are PRESERVED in an `archive/` directory for reference and rollback capability.

---

## Phase 2: UI Consolidation Strategy

### 2.1 Merge Three UI Bundles - Preserve All Features

**Source Bundles:**
1. `model_gateway_ui_bundle/ui-dashboard/` - Base features
2. `model_gateway_ui_upgrade/ui-dashboard/` - OTel, structured output, WebRTC
3. `model_gateway_ui_upgrade2/ui-dashboard/` - SSE streaming, tenants, costs, traces

**Consolidation Approach:**
- Start with upgrade2 (most feature-rich)
- Add any missing features from upgrade1
- Add any missing features from base bundle
- Upgrade to modern React patterns
- Add TypeScript for type safety

### 2.2 Target UI Architecture

```
src/ui/
├── src/
│   ├── components/               # Reusable components
│   │   ├── common/              # Buttons, inputs, cards, etc.
│   │   ├── layout/              # Header, sidebar, footer
│   │   ├── dashboard/           # Dashboard widgets
│   │   ├── gateway/             # Gateway-specific components
│   │   ├── tenants/             # Tenant management
│   │   ├── costs/               # Cost tracking
│   │   ├── traces/              # Trace viewer
│   │   └── charts/              # Data visualization
│   ├── pages/
│   │   ├── Dashboard.tsx        # Main dashboard
│   │   ├── Gateway.tsx          # Gateway management
│   │   ├── Traces.tsx           # Trace viewer
│   │   ├── Costs.tsx            # Cost tracking
│   │   ├── Tenants.tsx          # Tenant management
│   │   ├── Realtime.tsx         # WebRTC realtime
│   │   └── Settings.tsx         # Configuration
│   ├── hooks/
│   │   ├── useGateway.ts
│   │   ├── useTraces.ts
│   │   ├── useTenants.ts
│   │   ├── useCosts.ts
│   │   ├── useWebSocket.ts
│   │   └── useWebRTC.ts
│   ├── services/
│   │   ├── api.ts               # API client
│   │   ├── websocket.ts         # WebSocket/SSE client
│   │   ├── webrtc.ts            # WebRTC client
│   │   └── auth.ts              # Authentication
│   ├── store/                    # State management
│   │   ├── gatewayStore.ts
│   │   ├── tenantStore.ts
│   │   ├── costStore.ts
│   │   ├── traceStore.ts
│   │   └── userStore.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js           # NEW: Add Tailwind CSS
└── README.md
```

### 2.3 All Features Preserved & Enhanced

**From base bundle:**
- ✅ Basic dashboard
- ✅ Gateway configuration
- ✅ Request monitoring

**From upgrade1:**
- ✅ OTel GenAI spans visualization
- ✅ Structured output display (Ajv validation)
- ✅ WebRTC/TURN realtime lane

**From upgrade2:**
- ✅ SSE streaming support
- ✅ Per-tenant token budgets
- ✅ Real-time cost tracking UI
- ✅ Trace links with OpenTelemetry integration

**NEW Enhancements:**
- 🆕 Dark mode support
- 🆕 Responsive mobile design
- 🆕 Accessibility (WCAG 2.1 AA)
- 🆕 Internationalization (i18n) ready
- 🆕 TypeScript throughout
- 🆕 Modern state management (Zustand)
- 🆕 Component library (shadcn/ui)
- 🆕 Advanced data visualization

---

## Phase 3: Gateway Consolidation

### 3.1 Merge Gateway Implementations - All Features Retained

**Source:**
- `model_gateway_ui_bundle/model-gateway/`
- `model_gateway_ui_upgrade/model-gateway/`
- `model_gateway_ui_upgrade2/model-gateway/`

**Target:** `src/gateway/`

**All Features Combined:**
- ✅ OpenAI-compatible endpoints
- ✅ Anthropic integration
- ✅ llama.cpp support
- ✅ OpenRouter/LiteLLM routing
- ✅ SSE streaming
- ✅ Per-tenant management (from upgrade2)
- ✅ Cost caps and tracking
- ✅ OTel GenAI spans (from upgrade1)
- ✅ WebRTC realtime support (from upgrade1)
- ✅ Structured output coercion with Ajv (from upgrade1)
- ✅ Trace recording and retrieval

**NEW Enhancements:**
- 🆕 Rate limiting per tenant
- 🆕 Request queuing and prioritization
- 🆕 Advanced caching strategies
- 🆕 Failover and retry logic
- 🆕 Comprehensive error handling
- 🆕 Health check endpoints
- 🆕 Metrics endpoints (Prometheus)

---

## Phase 4: Naming Convention Standardization

### 4.1 Directory Naming Rules

**Apply consistently:**
- **Source code:** `kebab-case` (e.g., `mcp-server`, `model-gateway`)
- **Infrastructure:** `kebab-case` (e.g., `mcp-stack`, `control-plane`)
- **Documentation:** `kebab-case` (e.g., `quick-start.md`)
- **Configuration files:** `.lowercase` or `lowercase.ext`

### 4.2 File Naming Rules

- **TypeScript/JavaScript:** `camelCase.ts` for modules, `PascalCase.tsx` for components
- **React components:** `PascalCase.tsx`
- **Utilities:** `kebab-case.ts`
- **Tests:** `*.test.ts` or `*.spec.ts`
- **Types:** `types.ts` or `*.types.ts`
- **Configuration:** `lowercase.config.ts`

---

## Phase 5: Production Configuration

### 5.1 Environment Management

**Create environment hierarchy:**

```yaml
# deployments/production/values.yaml
environment: production

mcp-server:
  replicas: 3
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2000m"
      memory: "2Gi"

  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

  security:
    runAsNonRoot: true
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    seccompProfile:
      type: RuntimeDefault

  podDisruptionBudget:
    enabled: true
    minAvailable: 2

gateway:
  replicas: 5

  rateLimit:
    enabled: true
    requestsPerMinute: 1000
    burstSize: 100

  cors:
    enabled: true
    allowedOrigins:
      - "https://app.example.com"
      - "https://dashboard.example.com"

  cache:
    enabled: true
    ttl: 300
    maxSize: "1Gi"

ui:
  replicas: 2
  cdn:
    enabled: true
    provider: "cloudflare"

observability:
  otel:
    endpoint: "https://otel-collector.prod.svc.cluster.local:4317"
    samplingRate: 0.1
    exporters:
      - jaeger
      - prometheus

  metrics:
    enabled: true
    prometheus: true
    port: 9090

  logging:
    level: "info"
    format: "json"
    retention: "30d"

spire:
  enabled: true
  trustDomain: "production.example.com"
  nodeAttestor: "k8s_psat"

vault:
  enabled: true
  address: "https://vault.prod.svc.cluster.local:8200"
  authMethod: "kubernetes"

gatekeeper:
  enabled: true
  enforcementAction: "deny"
  auditInterval: 60

nats:
  tls:
    enabled: true
    verify: true
  jetstream:
    enabled: true
    maxMemory: "4Gi"
    maxFile: "10Gi"

backup:
  enabled: true
  schedule: "0 2 * * *"
  retention: 30
  destination: "s3://backups/mcp-prod"
```

### 5.2 Secrets Management

```yaml
# deployments/production/secrets.example.yaml
# DO NOT commit actual secrets - use Vault/External Secrets Operator

apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: mcp-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: mcp-secrets
    creationPolicy: Owner
  data:
    - secretKey: OPENROUTER_API_KEY
      remoteRef:
        key: mcp/production/api-keys
        property: openrouter
    - secretKey: ANTHROPIC_API_KEY
      remoteRef:
        key: mcp/production/api-keys
        property: anthropic
    - secretKey: DATABASE_URL
      remoteRef:
        key: mcp/production/database
        property: url
    - secretKey: JWT_SECRET
      remoteRef:
        key: mcp/production/auth
        property: jwt_secret
    - secretKey: NATS_TOKEN
      remoteRef:
        key: mcp/production/nats
        property: token
```

### 5.3 Local Development Environment

```bash
# deployments/local/.env.example
# Copy to .env and fill in your values

# Server
MCP_TRANSPORT=http
PORT=3000
NODE_ENV=development

# Gateway
GATEWAY_PORT=8080
OPENROUTER_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mcp_dev

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=mcp-server-local

# NATS
NATS_URL=nats://localhost:4222

# Feature Flags
OPENFEATURE_PROVIDER=env
```

```yaml
# deployments/local/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mcp_dev
      POSTGRES_USER: mcp
      POSTGRES_PASSWORD: development
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nats:
    image: nats:latest
    ports:
      - "4222:4222"
      - "8222:8222"
    command: "-js -m 8222"

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"

volumes:
  postgres_data:
```

---

## Phase 6: Security Hardening

### 6.1 Image Security

**Add to CI/CD:**

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  snyk-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  cosign-sign:
    needs: [trivy-scan, snyk-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Sign container images
        run: |
          cosign sign --key cosign.key \
            ghcr.io/${{ github.repository }}/mcp-server:${{ github.sha }}
```

### 6.2 Runtime Security

**Network Policies:**

```yaml
# infrastructure/helm/mcp-stack/templates/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-server-netpol
spec:
  podSelector:
    matchLabels:
      app: mcp-server
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: gateway
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: nats
      ports:
        - protocol: TCP
          port: 4222
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
        podSelector:
          matchLabels:
            k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
```

**Pod Security Standards:**

```yaml
# infrastructure/helm/mcp-stack/templates/podsecurity.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 6.3 Authentication & Authorization

**JWT Authentication:**

```typescript
// src/gateway/src/middleware/auth.ts
import { verify } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const verified = verify(token, process.env.JWT_SECRET!);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

export const checkTenantAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { tenant } = req.body;
  const userTenants = req.user?.tenants || [];

  if (!userTenants.includes(tenant) && !userTenants.includes('*')) {
    return res.status(403).json({ error: 'Tenant access denied' });
  }

  next();
};
```

**RBAC Policies:**

```yaml
# policies/gatekeeper/rbac-rules.rego
package mcp.rbac

default allow = false

# Admin can do anything
allow {
  input.user.role == "admin"
}

# Developers can deploy to dev namespace
allow {
  input.user.role == "developer"
  input.namespace == "mcp-dev"
  input.action == "deploy"
}

# Viewers can only read
allow {
  input.user.role == "viewer"
  input.action == "read"
}
```

---

## Phase 7: Monitoring & Observability

### 7.1 Grafana Dashboards

```json
// monitoring/grafana/dashboards/mcp-overview.json
{
  "dashboard": {
    "title": "MCP Platform Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Token Usage",
        "targets": [
          {
            "expr": "sum(rate(llm_tokens_total[5m])) by (tenant, model)"
          }
        ]
      },
      {
        "title": "Cost per Tenant",
        "targets": [
          {
            "expr": "sum(llm_cost_total) by (tenant)"
          }
        ]
      }
    ]
  }
}
```

### 7.2 Prometheus Rules

```yaml
# monitoring/prometheus/rules/mcp-alerts.yaml
groups:
  - name: mcp-alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests/sec"

      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "P95 latency is {{ $value }}s"

      - alert: TenantBudgetExceeded
        expr: |
          llm_cost_total > llm_budget_limit
        labels:
          severity: warning
        annotations:
          summary: "Tenant {{ $labels.tenant }} exceeded budget"

      - alert: SpireCertExpiringSoon
        expr: |
          (spire_cert_expiry_timestamp - time()) < 86400
        labels:
          severity: warning
        annotations:
          summary: "SPIRE certificate expiring in < 24h"

      - alert: PodCrashLooping
        expr: |
          rate(kube_pod_container_status_restarts_total[15m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"
```

### 7.3 OpenTelemetry Configuration

```yaml
# config/otel/collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  resource:
    attributes:
      - key: environment
        value: ${ENVIRONMENT}
        action: insert

  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  jaeger:
    endpoint: jaeger-collector:14250
    tls:
      insecure: false

  prometheus:
    endpoint: 0.0.0.0:9090

  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [jaeger, logging]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [prometheus, logging]
```

---

## Phase 8: Testing Infrastructure

### 8.1 Test Structure

```
tests/
├── unit/
│   ├── server/
│   │   ├── server.test.ts
│   │   ├── tools.test.ts
│   │   └── resources.test.ts
│   ├── gateway/
│   │   ├── router.test.ts
│   │   ├── upstreams.test.ts
│   │   └── tenants.test.ts
│   ├── ui/
│   │   ├── components/
│   │   └── hooks/
│   └── libs/
│       ├── envelope.test.ts
│       └── tracecontext.test.ts
├── integration/
│   ├── api/
│   │   ├── server-api.test.ts
│   │   └── gateway-api.test.ts
│   ├── gateway-upstreams/
│   │   ├── openai.test.ts
│   │   ├── anthropic.test.ts
│   │   └── llamacpp.test.ts
│   └── database/
│       └── postgres.test.ts
├── e2e/
│   ├── user-flows/
│   │   ├── chat-flow.spec.ts
│   │   ├── tenant-management.spec.ts
│   │   └── cost-tracking.spec.ts
│   └── playwright.config.ts
├── load/
│   ├── k6/
│   │   ├── server-load.js
│   │   ├── gateway-load.js
│   │   └── streaming-load.js
│   └── results/
├── security/
│   ├── penetration/
│   │   └── api-security.test.ts
│   └── dependency-scan/
└── chaos/
    └── litmus-experiments/
        ├── pod-delete.yaml
        └── network-delay.yaml
```

### 8.2 Testing Configuration

```json
// package.json (root)
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:load": "k6 run tests/load/k6/gateway-load.js",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

```typescript
// tests/unit/gateway/router.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { routeChat } from '../../../src/gateway/src/router_chat';

describe('Gateway Router', () => {
  it('should route to OpenAI-compatible upstream', async () => {
    const request = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }]
    };

    const response = await routeChat(request, 'test-id', mockSpan);

    expect(response).toBeDefined();
    expect(response.choices).toHaveLength(1);
  });

  it('should enforce tenant budget limits', async () => {
    const request = {
      tenant: 'limited-tenant',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }]
    };

    await expect(routeChat(request, 'test-id', mockSpan))
      .rejects.toThrow('Budget exceeded');
  });
});
```

---

## Phase 9: CI/CD Pipeline

### 9.1 Main CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint code
        run: npm run lint

      - name: Type check
        run: npm run type-check

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/coverage-final.json

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [server, gateway, ui]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.component }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: infrastructure/docker/${{ matrix.component }}.Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Sign image with Cosign
        run: |
          cosign sign --yes \
            ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.component }}@${{ steps.build.outputs.digest }}

  e2e-test:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  deploy-dev:
    needs: e2e-test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: development
    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3

      - name: Deploy to dev
        run: |
          kubectl config use-context dev-cluster
          helm upgrade --install mcp-stack \
            infrastructure/helm/mcp-stack \
            -n mcp-dev \
            --create-namespace \
            -f deployments/dev/values.yaml \
            --set image.tag=${{ github.sha }}

  deploy-staging:
    needs: e2e-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        run: |
          kubectl config use-context staging-cluster
          helm upgrade --install mcp-stack \
            infrastructure/helm/mcp-stack \
            -n mcp-staging \
            --create-namespace \
            -f deployments/staging/values.yaml \
            --set image.tag=${{ github.sha }}

      - name: Run smoke tests
        run: npm run test:smoke -- --env=staging

  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: |
          kubectl config use-context prod-cluster
          helm upgrade --install mcp-stack \
            infrastructure/helm/mcp-stack \
            -n mcp \
            --create-namespace \
            -f deployments/production/values.yaml \
            --set image.tag=${{ github.sha }} \
            --wait \
            --timeout 10m

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/mcp-server -n mcp
          kubectl rollout status deployment/gateway -n mcp

      - name: Run smoke tests
        run: npm run test:smoke -- --env=production

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'MCP Platform deployed to production'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Phase 10: Documentation

### 10.1 Documentation Structure

```
docs/
├── README.md                      # Documentation hub
├── architecture/
│   ├── overview.md               # System architecture
│   ├── data-flow.md              # Data flow diagrams
│   ├── security.md               # Security architecture
│   ├── scalability.md            # Scaling strategy
│   └── decisions/                # Architecture Decision Records
│       ├── 001-use-nats.md
│       ├── 002-spire-for-identity.md
│       └── 003-tenant-isolation.md
├── guides/
│   ├── quick-start.md            # 5-minute quick start
│   ├── installation.md           # Detailed installation
│   ├── configuration.md          # Configuration guide
│   ├── development.md            # Development guide
│   ├── deployment.md             # Deployment guide
│   └── troubleshooting.md        # Common issues
├── api/
│   ├── server-api.md             # MCP Server API
│   ├── gateway-api.md            # Gateway API
│   ├── openapi.yaml              # OpenAPI spec
│   └── websocket-api.md          # WebSocket/SSE API
├── operations/
│   ├── deployment.md             # Deployment procedures
│   ├── monitoring.md             # Monitoring guide
│   ├── disaster-recovery.md      # DR procedures
│   ├── backup-restore.md         # Backup/restore
│   ├── scaling.md                # Scaling guide
│   └── runbooks/                 # Operational runbooks
│       ├── high-error-rate.md
│       ├── database-issues.md
│       └── spire-cert-renewal.md
└── reference/
    ├── configuration.md          # All config options
    ├── metrics.md                # Available metrics
    ├── alerts.md                 # Alert reference
    └── cli.md                    # CLI reference
```

### 10.2 Key Documentation Files

**docs/guides/quick-start.md:**
```markdown
# Quick Start Guide

Get MCP Platform running locally in 5 minutes.

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

## Steps

1. Clone and install:
   \`\`\`bash
   git clone <repo>
   cd mcp-final
   npm install
   \`\`\`

2. Start dependencies:
   \`\`\`bash
   cd deployments/local
   docker-compose up -d
   \`\`\`

3. Configure environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your API keys
   \`\`\`

4. Start services:
   \`\`\`bash
   # Terminal 1: MCP Server
   cd src/server
   npm run dev

   # Terminal 2: Gateway
   cd src/gateway
   npm run dev

   # Terminal 3: UI
   cd src/ui
   npm run dev
   \`\`\`

5. Open http://localhost:5173

Done! 🎉
```

---

## Phase 11: Build Automation

### 11.1 Makefile

```makefile
# Makefile
.PHONY: help install build test deploy clean

help:
	@echo "MCP Platform - Available commands:"
	@echo "  make install        - Install all dependencies"
	@echo "  make build          - Build all components"
	@echo "  make test           - Run all tests"
	@echo "  make lint           - Lint code"
	@echo "  make docker-build   - Build Docker images"
	@echo "  make deploy-local   - Deploy to local environment"
	@echo "  make deploy-dev     - Deploy to dev environment"
	@echo "  make deploy-prod    - Deploy to production"
	@echo "  make clean          - Clean build artifacts"

install:
	npm ci
	cd src/server && npm ci
	cd src/gateway && npm ci
	cd src/ui && npm ci

build:
	npm run build
	cd src/server && npm run build
	cd src/gateway && npm run build
	cd src/ui && npm run build

test:
	npm run test

lint:
	npm run lint
	npm run type-check

docker-build:
	docker build -f infrastructure/docker/server.Dockerfile -t mcp-server:latest .
	docker build -f infrastructure/docker/gateway.Dockerfile -t mcp-gateway:latest .
	docker build -f infrastructure/docker/ui.Dockerfile -t mcp-ui:latest .

deploy-local:
	cd deployments/local && docker-compose up -d

deploy-dev:
	helm upgrade --install mcp-stack infrastructure/helm/mcp-stack \
		-n mcp-dev --create-namespace \
		-f deployments/dev/values.yaml

deploy-prod:
	@echo "⚠️  Deploying to PRODUCTION - are you sure? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ]; then \
		helm upgrade --install mcp-stack infrastructure/helm/mcp-stack \
			-n mcp --create-namespace \
			-f deployments/production/values.yaml; \
	fi

clean:
	rm -rf node_modules
	rm -rf src/*/node_modules
	rm -rf src/*/dist
	find . -name "*.log" -delete
```

---

## Phase 12: Migration Execution Checklist

### 12.1 Pre-Migration

- [ ] Create backup of current mcp-final directory
- [ ] Document all existing environment variables
- [ ] Export all current configurations
- [ ] Tag current state in git
- [ ] Notify team of migration

### 12.2 Migration Steps (Preserve All)

**Step 1: Archive Original Bundles**
- [ ] Create `archive/original-bundles/` directory
- [ ] Copy all bundle directories to archive
- [ ] Verify archive integrity

**Step 2: Create New Structure**
- [ ] Create all new directories
- [ ] Set up root workspace
- [ ] Create configuration files

**Step 3: Migrate MCP Server**
- [ ] Copy server to `src/server/`
- [ ] Update package.json
- [ ] Test server builds and runs

**Step 4: Consolidate Gateway**
- [ ] Analyze all 3 gateway versions
- [ ] Create feature matrix
- [ ] Merge to `src/gateway/`
- [ ] Preserve all features
- [ ] Test all upstream integrations

**Step 5: Consolidate UI**
- [ ] Analyze all 3 UI versions
- [ ] Create component inventory
- [ ] Merge to `src/ui/`
- [ ] Migrate to TypeScript
- [ ] Test all features

**Step 6: Organize Infrastructure**
- [ ] Move Helm charts to `infrastructure/helm/`
- [ ] Create Dockerfiles in `infrastructure/docker/`
- [ ] Update chart references

**Step 7: Consolidate Libraries**
- [ ] Move to `src/libs/`
- [ ] Update import paths
- [ ] Test library integrations

**Step 8: Consolidate Agents**
- [ ] Move to `src/agents/`
- [ ] Preserve all agent types
- [ ] Update configurations

**Step 9: Organize Policies**
- [ ] Move to `policies/`
- [ ] Organize by type
- [ ] Document policy purposes

**Step 10: Create Deployments**
- [ ] Set up deployment configs
- [ ] Create environment-specific values
- [ ] Add secret templates

**Step 11: Add Production Features**
- [ ] CI/CD workflows
- [ ] Monitoring configs
- [ ] Security configurations
- [ ] Testing infrastructure

**Step 12: Documentation**
- [ ] Write comprehensive docs
- [ ] Create runbooks
- [ ] Update README
- [ ] Add CONTRIBUTING guide

**Step 13: Validation**
- [ ] All services build
- [ ] All tests pass
- [ ] Local deployment works
- [ ] K8s deployment works
- [ ] All integrations tested

**Step 14: Cleanup (Optional)**
- [ ] Keep archive for reference
- [ ] Remove empty directories
- [ ] Update .gitignore

### 12.3 Post-Migration

- [ ] Update CI/CD to use new structure
- [ ] Update documentation
- [ ] Train team on new structure
- [ ] Monitor for issues
- [ ] Gather feedback

---

## Phase 13: Production Readiness Checklist

### 13.1 Technical Requirements

**Infrastructure:**
- [ ] Multi-AZ/region deployment
- [ ] Auto-scaling configured
- [ ] Load balancers configured
- [ ] CDN for UI assets
- [ ] Database replication
- [ ] Backup automation

**Security:**
- [ ] HTTPS/TLS everywhere
- [ ] mTLS for inter-service communication
- [ ] Secrets in Vault/External Secrets
- [ ] Network policies enforced
- [ ] Pod security standards
- [ ] Image scanning in CI
- [ ] Signed container images
- [ ] RBAC configured
- [ ] Audit logging enabled

**Observability:**
- [ ] Distributed tracing
- [ ] Metrics collection
- [ ] Log aggregation
- [ ] Dashboards created
- [ ] Alerts configured
- [ ] SLIs/SLOs defined
- [ ] Error tracking (Sentry)

**Reliability:**
- [ ] Health checks
- [ ] Readiness probes
- [ ] Liveness probes
- [ ] Graceful shutdown
- [ ] Circuit breakers
- [ ] Retry logic
- [ ] Rate limiting
- [ ] Pod disruption budgets

**Performance:**
- [ ] Load testing completed
- [ ] Performance benchmarks
- [ ] Caching strategy
- [ ] Database indexes
- [ ] Query optimization

**Data:**
- [ ] Database backups
- [ ] Backup testing
- [ ] Disaster recovery plan
- [ ] Data retention policies
- [ ] GDPR compliance

### 13.2 Operational Requirements

- [ ] On-call rotation
- [ ] Incident response procedures
- [ ] Runbooks for common issues
- [ ] Change management process
- [ ] Deployment procedures
- [ ] Rollback procedures
- [ ] Cost monitoring
- [ ] Budget alerts
- [ ] SLA agreements

### 13.3 Documentation Requirements

- [ ] Architecture documentation
- [ ] API documentation
- [ ] Deployment guides
- [ ] Operations guides
- [ ] Troubleshooting guides
- [ ] Security policies
- [ ] Compliance documentation

---

## Timeline & Resources

### Estimated Timeline: 4-6 Weeks

**Week 1: Foundation**
- Directory restructuring
- Root workspace setup
- Archive original bundles

**Week 2: Consolidation**
- UI bundle consolidation
- Gateway consolidation
- Library organization

**Week 3: Infrastructure**
- Helm chart reorganization
- Docker configuration
- Deployment configs

**Week 4: Production Features**
- Security hardening
- Monitoring setup
- CI/CD pipeline

**Week 5: Testing & Documentation**
- Test infrastructure
- Comprehensive documentation
- Runbook creation

**Week 6: Validation & Launch**
- End-to-end testing
- Load testing
- Production deployment
- Team training

### Resources Needed

- **Development:** 2-3 developers
- **DevOps:** 1 engineer
- **QA:** 1 tester
- **Documentation:** 1 technical writer (optional)

---

## Success Metrics

### Technical Metrics
- Build time < 5 minutes
- Test coverage > 80%
- All security scans passing
- Zero critical vulnerabilities
- P95 latency < 500ms
- 99.9% uptime

### Operational Metrics
- Deployment time < 15 minutes
- Mean time to recovery < 30 minutes
- Incident response time < 5 minutes
- Documentation coverage 100%

### Business Metrics
- Developer onboarding time < 1 day
- Feature deployment frequency
- Cost per request
- Customer satisfaction

---

## Risk Mitigation

### Identified Risks

1. **Data loss during migration**
   - Mitigation: Archive all original bundles, test thoroughly

2. **Feature regression**
   - Mitigation: Comprehensive testing, feature matrix validation

3. **Breaking changes**
   - Mitigation: Maintain backward compatibility, versioned APIs

4. **Performance degradation**
   - Mitigation: Load testing before and after

5. **Security vulnerabilities**
   - Mitigation: Security scanning, penetration testing

### Rollback Plan

If issues arise:
1. Revert to archived bundles
2. Use previous git tag
3. Rollback Helm deployments
4. Restore from backups if needed

---

## Conclusion

This plan transforms `/mcp-final` into a production-ready platform while strictly adhering to the principle: **"Heal, DO NOT HARM. Upgrades Only, No downgrades."**

Every component is preserved, enhanced, and organized for scalability, security, and operational excellence.

### Next Steps

1. Review and approve this plan
2. Assemble team and resources
3. Create detailed sprint plans
4. Begin Phase 1 execution
5. Regular progress reviews

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Maintained By:** MCP Platform Team
