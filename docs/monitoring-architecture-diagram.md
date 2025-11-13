# NOA Server Monitoring Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     NOA Server Application Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ MCP      │  │ Claude   │  │ Neural   │  │ UI       │  │ Other    │ │
│  │ Server   │  │ Flow     │  │ Process  │  │ Server   │  │ Services │ │
│  │ :8001    │  │ :9100    │  │ :8080    │  │ :9200    │  │          │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
└───────┼─────────────┼─────────────┼─────────────┼─────────────┼────────┘
        │             │             │             │             │
        │ Health      │ Health      │ Health      │ Health      │ Health
        │ Endpoint    │ Endpoint    │ Endpoint    │ Endpoint    │ Endpoint
        │             │             │             │             │
        └─────────────┴─────────────┴─────────────┴─────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                         │
        ▼                                                         ▼
┌───────────────────────────┐                     ┌───────────────────────────┐
│  Health Check Monitor     │                     │   Metrics Collector       │
│  (scripts/monitoring/)    │                     │   (scripts/monitoring/)   │
│                           │                     │                           │
│  • Check every 30s        │                     │  • Collect every 10s      │
│  • Timeout: 5s            │                     │  • System metrics         │
│  • Retries: 3             │                     │  • App metrics            │
│  • Parallel checks        │                     │  • Business metrics       │
│  • Failure tracking       │                     │  • Custom metrics         │
│                           │                     │                           │
│  Status: healthy          │                     │  Output: JSONL            │
│         unhealthy         │                     │  Retention: 30 days       │
│         error             │                     │  Storage: data/metrics/   │
└─────────┬─────────────────┘                     └──────────┬────────────────┘
          │                                                  │
          │ Failed Check                                     │ Metrics Data
          │ (retries exceeded)                               │
          ▼                                                  │
┌───────────────────────────┐                               │
│  Self-Healing Engine      │                               │
│  (scripts/monitoring/)    │                               │
│                           │                               │
│  Strategies:              │                               │
│  1. Service Restart       │                               │
│  2. Safe Restart          │                               │
│  3. Dependency Check      │                               │
│  4. Graceful Restart      │                               │
│  5. Scale Up              │                               │
│  6. Rollback              │                               │
│  7. Graceful Degradation  │                               │
│                           │                               │
│  Max Restarts: 5          │                               │
│  Cooldown: 60s            │                               │
└─────────┬─────────────────┘                               │
          │                                                  │
          │ Healing Actions                                 │
          │                                                  │
          ▼                                                  │
┌───────────────────────────┐                               │
│  Alert System             │                               │
│                           │                               │
│  Channels:                │                               │
│  • Console                │◀──────────────────────────────┘
│  • File (logs/alerts/)    │   Alert Rules
│  • Webhook (optional)     │   • High error rate > 5%
│  • Email (optional)       │   • Service down
│                           │   • High latency > 1s
│  Rules:                   │   • Memory > 85%
│  • Critical (auto-heal)   │   • CPU > 90%
│  • Warning (notify)       │
│                           │
│  Cooldown: 1-10 min       │
└───────────────────────────┘
          │
          │ Logs & Metrics
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Real-Time Dashboard (http://localhost:9300)                    │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  System Health   │  │  CPU Usage       │  │ Memory Usage  │ │
│  │  Status Grid     │  │  Gauge           │  │ Gauge         │ │
│  │                  │  │                  │  │               │ │
│  │  ✓ mcp-server    │  │      45.2%       │  │    67.8%      │ │
│  │  ✓ claude-flow   │  │  ████████░░      │  │  ███████████  │ │
│  │  ✓ neural-proc   │  │                  │  │               │ │
│  │  ✓ ui-server     │  │                  │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Error Rate      │  │  Latency         │  │ Throughput    │ │
│  │  Line Chart      │  │  Line Chart      │  │ Bar Chart     │ │
│  │                  │  │                  │  │               │ │
│  │      0.5%        │  │     120ms        │  │   850 req/s   │ │
│  │  ────────────    │  │  ────────────    │  │  ████████     │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                  │
│  Technology: Server-Sent Events (SSE)                           │
│  Refresh: Every 5 seconds                                       │
│  API: REST endpoints at /api/*                                  │
└──────────────────────────────────────────────────────────────────┘
          │
          │ Dashboard Access
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Operators / DevOps / SRE Team                                  │
│                                                                  │
│  • View real-time system health                                 │
│  • Monitor performance metrics                                  │
│  • Investigate incidents                                        │
│  • Review self-healing actions                                  │
│  • Access via browser: http://localhost:9300                    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────┐
│  Services    │
│  (App Layer) │
└──────┬───────┘
       │
       │ HTTP/HTTPS
       │
       ▼
┌──────────────────┐         ┌────────────────┐
│ Health Check     │────────▶│ Health Results │
│ Monitor          │         │ Map            │
│ • Interval: 30s  │         └────────┬───────┘
│ • Timeout: 5s    │                  │
│ • Parallel       │                  │
└──────┬───────────┘                  │
       │                              │
       │ Failed Check                 │
       │ (retries > 3)                │
       │                              │
       ▼                              │
┌──────────────────┐                  │
│ Self-Healing     │                  │
│ Decision Engine  │                  │
│                  │                  │
│ 1. Select        │                  │
│    Strategy      │                  │
│ 2. Execute       │                  │
│    Healing       │                  │
│ 3. Verify        │                  │
│    Health        │                  │
└──────┬───────────┘                  │
       │                              │
       │ Healing Logs                 │
       │                              │
       ▼                              │
┌──────────────────┐                  │
│ Logging System   │                  │
│ • logs/alerts/   │                  │
│ • logs/self-     │                  │
│   healing/       │                  │
│ • Daily rotation │                  │
└──────────────────┘                  │
                                      │
┌──────────────────┐                  │
│ System Metrics   │                  │
│ • CPU, Memory    │                  │
│ • Disk, Network  │                  │
│ • Load Average   │                  │
└──────┬───────────┘                  │
       │                              │
       │ Every 10s                    │
       │                              │
       ▼                              │
┌──────────────────┐                  │
│ Metrics          │                  │
│ Collector        │                  │
│                  │                  │
│ • Counters       │                  │
│ • Gauges         │                  │
│ • Histograms     │                  │
└──────┬───────────┘                  │
       │                              │
       │ JSONL                        │
       │                              │
       ▼                              │
┌──────────────────┐                  │
│ Metrics Storage  │                  │
│ data/metrics/    │                  │
│ • Daily files    │                  │
│ • 30-day         │                  │
│   retention      │                  │
│ • Compression    │                  │
└──────┬───────────┘                  │
       │                              │
       └──────────┬───────────────────┘
                  │
                  │ Read Metrics & Health
                  │
                  ▼
          ┌───────────────┐
          │ Alert Engine  │
          │               │
          │ Evaluate:     │
          │ • Rules       │
          │ • Thresholds  │
          │ • Conditions  │
          │               │
          │ Trigger:      │
          │ • Notify      │
          │ • Auto-heal   │
          │ • Scale       │
          └───────┬───────┘
                  │
                  │ Alert Events
                  │
                  ▼
          ┌───────────────┐
          │ Dashboard API │
          │               │
          │ REST:         │
          │ /api/health   │
          │ /api/metrics  │
          │ /api/status   │
          │               │
          │ SSE:          │
          │ /api/sse      │
          └───────┬───────┘
                  │
                  │ HTTP/SSE
                  │
                  ▼
          ┌───────────────┐
          │ Web Dashboard │
          │ :9300         │
          │               │
          │ • Real-time   │
          │ • Gauges      │
          │ • Charts      │
          │ • Status      │
          └───────────────┘
```

## Deployment Topology

### Local Development

```
┌─────────────────────────────────────────┐
│  Developer Workstation                  │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  npm run monitor:start            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Process Manager: Direct Node.js        │
│  • health-check.js (PID: 12345)        │
│  • metrics-collector.js (PID: 12346)   │
│  • dashboard.js (PID: 12347)           │
│                                         │
│  Access: http://localhost:9300          │
└─────────────────────────────────────────┘
```

### Production (Kubernetes)

```
┌───────────────────────────────────────────────────────────────┐
│  Kubernetes Cluster (namespace: monitoring)                   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Deployment: health-check-monitor                       │ │
│  │  • Replicas: 1-3 (HPA)                                  │ │
│  │  • Resources: 128Mi / 256Mi, 100m / 200m                │ │
│  │  • Liveness: 30s delay, 60s period                      │ │
│  │  • Readiness: 10s delay, 30s period                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Deployment: metrics-collector                          │ │
│  │  • Replicas: 1                                          │ │
│  │  • Resources: 256Mi / 512Mi, 200m / 500m                │ │
│  │  • PVC: 10Gi (metrics-storage)                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Deployment: self-healing-controller                    │ │
│  │  • Replicas: 1                                          │ │
│  │  • ServiceAccount: self-healing-sa                      │ │
│  │  • RBAC: ClusterRole (deployments, pods, events)        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Service: metrics-collector                             │ │
│  │  • Port: 9300                                           │ │
│  │  • Type: ClusterIP                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  Access: kubectl port-forward svc/metrics-collector 9300:9300 │
└────────────────────────────────────────────────────────────────┘
```

## CI/CD Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow                                       │
│  Trigger: Push, PR, Schedule (every 6h), Manual                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Job 1: Health Check Tests                              │ │
│  │  • Validate config                                       │ │
│  │  • Run dry-run                                           │ │
│  │  • Test error handling                                   │ │
│  │  • Upload logs                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Job 2: Metrics Collection Tests                        │ │
│  │  • Run collection                                        │ │
│  │  • Verify output                                         │ │
│  │  • Test thresholds                                       │ │
│  │  • Upload data                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Job 3: Self-Healing Tests                              │ │
│  │  • Test strategies                                       │ │
│  │  • Verify logs                                           │ │
│  │  • Upload logs                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Job 4: Integration Tests                               │ │
│  │  • Initialize components                                 │ │
│  │  • Simulate failures                                     │ │
│  │  • Trigger healing                                       │ │
│  │  • Generate report                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Job 5: Deployment Readiness (main only)                │ │
│  │  • Validate K8s manifests (kubeval)                      │ │
│  │  • Check config completeness                             │ │
│  │  • Generate deployment status                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Job 6: Performance Benchmark (schedule/manual)         │ │
│  │  • Benchmark metrics collection                          │ │
│  │  • Measure latency (avg/min/max)                         │ │
│  │  • Upload results                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## File Organization

```
noa-server/
├── config/monitoring/
│   └── monitoring-config.json          # Primary configuration
│
├── scripts/monitoring/
│   ├── health-check.js                 # Health monitoring
│   ├── self-healing.js                 # Recovery strategies
│   ├── metrics-collector.js            # Metrics collection
│   ├── dashboard.js                    # Web dashboard
│   ├── start-monitoring.sh             # Start all components
│   ├── stop-monitoring.sh              # Stop all components
│   └── status-monitoring.sh            # Status check
│
├── tests/monitoring/
│   ├── health-check.test.js            # Health tests
│   ├── metrics-collector.test.js       # Metrics tests
│   └── self-healing.test.js            # Healing tests
│
├── k8s/deployments/
│   └── monitoring-stack.yaml           # K8s manifests
│
├── .github/workflows/
│   └── monitoring-ci.yml               # CI/CD pipeline
│
├── docs/
│   ├── automation-phase7-report.md     # Technical report
│   ├── MONITORING_QUICKSTART.md        # Quick start guide
│   └── monitoring-architecture-diagram.md  # This file
│
├── logs/
│   ├── monitoring/                     # Component logs
│   │   ├── health-check.log
│   │   ├── metrics-collector.log
│   │   ├── dashboard.log
│   │   └── pids/                       # Process IDs
│   ├── alerts/                         # Alert logs
│   └── self-healing/                   # Healing action logs
│
└── data/
    └── metrics/                        # Metrics storage (JSONL)
        ├── metrics-2025-10-22.jsonl
        ├── metrics-2025-10-23.jsonl
        └── ...
```

---

**Architecture Version**: 1.0.0 **Last Updated**: 2025-10-22 **Status**:
Production Ready
