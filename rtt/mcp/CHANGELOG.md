# Changelog

All notable changes to MCP Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-27

### Added - Production Consolidation

#### Infrastructure
- Complete production-ready directory structure
- Multi-environment deployment configurations (local/dev/staging/prod)
- Helm charts for all components and control plane services
- Docker multi-stage builds with security hardening
- CI/CD pipeline with GitHub Actions
- Makefile for build automation

#### UI Dashboard (Consolidated from 3 versions)
- TypeScript-based React application
- Modern stack: Vite, Tailwind CSS, Zustand, TanStack Query
- Dark mode support
- Real-time dashboard with all metrics
- Tenant management interface
- Cost tracking visualization
- Trace viewer with APM integration
- Responsive design
- All features from base, upgrade1, and upgrade2

#### Gateway (Consolidated from 3 versions)
- Multi-provider LLM routing (OpenRouter, Anthropic, llama.cpp)
- SSE streaming support
- Per-tenant management and isolation
- Token budget tracking and enforcement
- Cost calculation and limits
- OpenTelemetry GenAI spans
- Structured output validation
- WebRTC/TURN realtime support
- Rate limiting
- Request caching
- All features from all versions preserved

#### MCP Server
- Standards-compliant MCP implementation
- Tool execution framework
- Resource management
- Prompt handling
- OpenTelemetry integration
- Health check endpoints

#### Observability
- OpenTelemetry collector configuration
- Grafana dashboards
- Prometheus alert rules
- Structured logging
- Distributed tracing with Jaeger
- Comprehensive metrics

#### Security
- SPIRE service identity integration
- Vault secrets management
- Gatekeeper policy enforcement
- Network policies
- Pod security standards
- Image scanning in CI
- Security headers (Helmet)

#### Libraries & Services
- Envelope library (CloudEvents)
- Tracecontext utilities
- Rollout agent
- Cost tracking agent
- Safety agent
- APO (Auto-Plug Operator)
- Agent Mesh
- MCP Graph service
- Rollout applier
- Database adapters (PostgreSQL, SQLite, Qdrant)

#### Documentation
- Comprehensive README
- Production readiness plan
- API documentation
- Architecture guides
- Operations runbooks
- Development guides
- Deployment procedures

### Changed

- Reorganized all code into clean directory structure
- Standardized naming conventions (kebab-case)
- Upgraded to modern React patterns and TypeScript
- Centralized configuration management
- Improved error handling across all services
- Enhanced security with non-root containers

### Technical Details

**Migration Strategy:**
- All original bundles preserved in source
- Features merged from:
  - `mcp_stack_helm_skeleton` → `src/server/`
  - `model_gateway_ui_bundle` (base)
  - `model_gateway_ui_upgrade` (OTel, WebRTC)
  - `model_gateway_ui_upgrade2` (Streaming, Tenants) → `src/gateway/` + `src/ui/`
  - `mcp_control_plane_bundle` → `infrastructure/helm/control-plane/`
  - `mcp_next_*_bundle` → `src/libs/`, `src/agents/`, `src/services/`
  - `mcp_policy_identity_addon` → `policies/`

**Philosophy:**
- **Heal, DO NOT HARM**
- **Upgrades Only, No Downgrades**
- All existing functionality preserved
- New features added
- Production-ready enhancements
- No features removed

### Highlights

🚀 **Production Ready**: Complete platform ready for deployment
🔒 **Enterprise Security**: SPIRE, Vault, Gatekeeper, policies
📊 **Full Observability**: Traces, metrics, logs, dashboards
💰 **Cost Management**: Per-tenant budgets and tracking
🎨 **Modern UI**: TypeScript, React, Tailwind, dark mode
🏗️ **Clean Architecture**: Well-organized, maintainable code
📦 **Easy Deployment**: Docker, Kubernetes, Helm charts
🧪 **Quality**: Linting, type checking, testing infrastructure
📚 **Well Documented**: Comprehensive guides and references

## [Pre-1.0.0] - Historical Versions

### model_gateway_ui_upgrade2 (v0.3.0)
- Added SSE streaming
- Added per-tenant token budgets
- Added cost tracking UI
- Added trace links

### model_gateway_ui_upgrade (v0.2.0)
- Added OTel GenAI spans
- Added structured output
- Added WebRTC/TURN support

### model_gateway_ui_bundle (v0.1.0)
- Initial gateway implementation
- Basic UI dashboard
- Multi-provider support
