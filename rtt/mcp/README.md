# MCP Platform - Production Ready

A production-ready Model Context Protocol (MCP) platform with gateway, UI, observability, and enterprise-grade features.

## Overview

MCP Platform provides a complete solution for deploying and managing LLM-powered applications with:

- **MCP Server**: Standards-compliant MCP server with tool execution
- **Model Gateway**: Multi-provider LLM gateway with cost tracking and tenant isolation
- **Dashboard UI**: Real-time monitoring and management interface
- **Full Observability**: OpenTelemetry traces, Prometheus metrics, structured logging
- **Enterprise Features**: Multi-tenancy, budgets, rate limiting, security policies

## Features

### Core Capabilities

- ✅ OpenAI-compatible API with multi-provider routing
- ✅ Per-tenant cost tracking and budget enforcement
- ✅ Real-time dashboard with trace visualization
- ✅ SSE streaming support
- ✅ WebRTC/TURN realtime lane
- ✅ OpenTelemetry GenAI spans
- ✅ Structured output validation

### Infrastructure

- ✅ Kubernetes-ready with Helm charts
- ✅ Multi-environment deployment configs (local/dev/staging/prod)
- ✅ CI/CD pipelines (GitHub Actions)
- ✅ Docker multi-stage builds
- ✅ Health checks and readiness probes

### Security

- ✅ SPIRE-based service identity
- ✅ Vault integration for secrets
- ✅ Gatekeeper policy enforcement
- ✅ Network policies
- ✅ Image scanning and signing
- ✅ Pod security standards

### Observability

- ✅ Distributed tracing (Jaeger)
- ✅ Metrics (Prometheus)
- ✅ Dashboards (Grafana)
- ✅ Structured logging
- ✅ Alerting rules

## Quick Start

### Local Development

```bash
# 1. Start infrastructure
cd deployments/local
docker-compose up -d

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Install and build
npm install
npm run build

# 4. Start services
make dev  # or start each service individually
```

Access:
- **UI**: http://localhost:5173
- **Gateway**: http://localhost:8080
- **MCP Server**: http://localhost:3000
- **Jaeger**: http://localhost:16686

### Kubernetes Deployment

```bash
# Build and push images
make docker-build
docker push ghcr.io/yourorg/mcp-server:latest
docker push ghcr.io/yourorg/mcp-gateway:latest
docker push ghcr.io/yourorg/mcp-ui:latest

# Deploy to Kubernetes
helm upgrade --install mcp infrastructure/helm/mcp-stack \
  -n mcp --create-namespace \
  -f deployments/production/values.yaml \
  --set image.tag=latest
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Dashboard                         │
│              (React + TypeScript + Tailwind)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Model Gateway                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ OpenAI   │  │Anthropic │  │llama.cpp │  │OpenRouter│   │
│  │ Compat   │  │ Adapter  │  │ Adapter  │  │  Adapter │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  Features: Tenants | Budgets | Rate Limiting | Caching     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       MCP Server                             │
│     Tools | Resources | Prompts | Sampling                  │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure                             │
│  NATS | PostgreSQL | Redis | Qdrant | OPA | SPIRE | Vault │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
mcp-final/
├── src/                      # Source code
│   ├── server/              # MCP server
│   ├── gateway/             # Model gateway
│   ├── ui/                  # React dashboard
│   ├── libs/                # Shared libraries
│   ├── agents/              # Agent implementations
│   ├── services/            # Backend services
│   └── adapters/            # Data adapters
├── infrastructure/          # Infrastructure as Code
│   ├── helm/               # Helm charts
│   ├── terraform/          # Terraform modules
│   └── docker/             # Dockerfiles
├── deployments/            # Environment configs
│   ├── local/
│   ├── dev/
│   ├── staging/
│   └── production/
├── policies/               # Policy definitions
│   ├── gatekeeper/
│   ├── opa/
│   └── spire/
├── monitoring/             # Monitoring configs
│   ├── grafana/
│   ├── prometheus/
│   └── alerts/
├── tests/                  # Test suites
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

## Documentation

- [Production Plan](PRODUCTION_PLAN.md) - Complete production readiness plan
- [Changelog](CHANGELOG.md) - Version history and changes
- [Contributing](CONTRIBUTING.md) - Development guidelines

## Development

```bash
# Install dependencies
make install

# Run tests
make test

# Lint code
make lint

# Build all components
make build

# Run locally
make dev

# Build Docker images
make docker-build
```

## Deployment

```bash
# Deploy to local environment
make deploy-local

# Deploy to dev
make deploy-dev

# Deploy to staging
make deploy-staging

# Deploy to production (with confirmation)
make deploy-prod
```

## Configuration

See [`.env.example`](.env.example) for all available configuration options.

Key environment variables:

```env
# API Keys
OPENROUTER_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql://...

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Features
GATEWAY_ENABLE_STREAMING=true
GATEWAY_ENABLE_RATE_LIMIT=true
```

## Monitoring

### Metrics

Access Prometheus metrics at:
- Gateway: `http://localhost:8080/metrics`
- Server: `http://localhost:3000/metrics`

### Traces

View traces in Jaeger UI: `http://localhost:16686`

### Dashboards

Grafana dashboards are available in [`monitoring/grafana/dashboards/`](monitoring/grafana/dashboards/)

### Alerts

Alert rules are defined in [`monitoring/prometheus/rules/`](monitoring/prometheus/rules/)

## Security

### Best Practices

1. **Use strong API keys** and rotate regularly
2. **Enable HTTPS/TLS** in production
3. **Set tenant budgets** to prevent cost overruns
4. **Configure rate limits** to prevent abuse
5. **Enable SPIRE** for service identity
6. **Use Vault** for secrets management
7. **Enforce policies** with Gatekeeper

### Security Scanning

```bash
# Run security scans
make security-scan

# Scan Docker images
trivy image ghcr.io/yourorg/mcp-server:latest
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT

## Support

- Documentation: [docs/](docs/)
- Issues: GitHub Issues
- Discussions: GitHub Discussions

## Acknowledgments

This platform consolidates and enhances features from multiple development iterations:
- Base MCP server implementation
- Gateway with multi-provider support
- UI dashboard with real-time updates
- Enterprise features (tenants, budgets, observability)

**Philosophy: Heal, DO NOT HARM. Upgrades Only, No Downgrades.**

All original functionality has been preserved and enhanced with production-ready features.
