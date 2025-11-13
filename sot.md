# SOT - Single Source of Truth

<!-- Master reference for system state and completed work -->
<!-- Auto-updated: 2025-01-10 09:00 UTC -->

## 🎯 Quick Navigation

- [System Status](#system-status-dashboard)
- [Master Directory](#master-file-directory)
- [Completed Tasks](#completed-tasks-archive)
- [Glossary](#glossary)
- [Version Info](#version-history)

---

## 📊 System Status Dashboard

### Core Services Health

| Service            | Status      | Uptime | Version | Last Check | Alert             |
| ------------------ | ----------- | ------ | ------- | ---------- | ----------------- |
| API Gateway        | 🟢 Active   | 99.99% | v2.3.1  | 09:00      | -                 |
| Auth Service       | 🟢 Active   | 99.98% | v1.5.0  | 09:00      | -                 |
| Database (Primary) | 🟢 Active   | 100%   | 15.5    | 09:00      | -                 |
| Database (Replica) | 🟢 Active   | 100%   | 15.5    | 09:00      | -                 |
| Cache Layer        | 🟡 Degraded | 99.5%  | 7.2.3   | 08:58      | High memory (85%) |
| Message Queue      | 🟢 Active   | 100%   | 3.12.0  | 09:00      | -                 |
| File Storage       | 🟢 Active   | 100%   | -       | 09:00      | -                 |
| CDN                | 🟢 Active   | 100%   | -       | 09:00      | -                 |
| Monitoring         | 🟢 Active   | 100%   | 2.47.0  | 09:00      | -                 |

### Infrastructure Metrics

```
┌─────────────────────────────────────────┐
│ CPU Usage:        [████░░░░░░] 42%      │
│ Memory:           [███████░░░] 73%      │
│ Disk (Primary):   [██████░░░░] 61%      │
│ Disk (Backup):    [████░░░░░░] 38%      │
│ Network In:       523 Mbps              │
│ Network Out:      892 Mbps              │
│ Active Users:     1,247                 │
│ Request Rate:     3,450 req/s           │
└─────────────────────────────────────────┘
```

### Critical Thresholds

- 🟢 Normal: All metrics within normal range
- 🟡 Warning: 80-90% resource utilization
- 🔴 Critical: >90% utilization or service down

---

## 📁 Master File Directory

### Project Root Structure

```
/
├── 📂 .github/                    [Config for GitHub]
├── 📂 .orchestration/             [Task management - THIS SYSTEM]
│   ├── 📄 current.todo           [Active tasks]
│   ├── 📄 backlog.todo           [Future work]
│   ├── 📄 sop.md                 [Operating procedures]
│   └── 📄 sot.md                 [THIS FILE]
├── 📂 src/                       [Source code]
│   ├── 📂 api/                   [API implementation]
│   ├── 📂 core/                  [Business logic]
│   ├── 📂 models/                [Data models]
│   └── 📂 utils/                 [Utilities]
├── 📂 tests/                     [Test suites]
├── 📂 docs/                      [Documentation]
└── 📂 infrastructure/            [IaC definitions]
```

### Key File Locations

#### Configuration Files

- **Environment Config**: `/configs/.env.example`
- **Docker Config**: `/docker-compose.yml`
- **Kubernetes**: `/k8s/manifests/`
- **CI/CD Pipeline**: `/.github/workflows/`

#### Documentation

- **API Spec**: `/docs/api/openapi.yaml` [→ View](./docs/api/openapi.yaml)
- **Architecture**: `/docs/architecture/README.md`
  [→ View](./docs/architecture/README.md)
- **Runbooks**: `/docs/runbooks/` [→ Directory](./docs/runbooks/)
- **Contributing**: `/CONTRIBUTING.md` [→ View](./CONTRIBUTING.md)

#### Source Code Entry Points

- **API Server**: `/src/api/server.py`
- **Worker Process**: `/src/workers/main.py`
- **CLI Tool**: `/src/cli/main.py`
- **Frontend**: `/frontend/src/index.tsx`

---

## ✅ Completed Tasks Archive

### 2025 - Q1

#### January 2025

| Date       | ID       | Task                             | Outcome     | Time | Artifacts                     |
| ---------- | -------- | -------------------------------- | ----------- | ---- | ----------------------------- |
| 2025-01-10 | TASK-127 | Audit chatmode configuration     | ✅ Complete | 2h   | `/outputs/chatmode_audit.md`  |
| 2025-01-09 | TASK-126 | Implement authentication service | ✅ Complete | 8h   | PR [#234](link), `/src/auth/` |
| 2025-01-08 | TASK-125 | Database migration v3            | ✅ Complete | 4h   | `/migrations/v3/*.sql`        |
| 2025-01-07 | TASK-124 | Fix memory leak in cache layer   | ✅ Complete | 6h   | PR [#232](link)               |
| 2025-01-06 | TASK-123 | Add rate limiting to API         | ✅ Complete | 5h   | PR [#231](link)               |

#### Task Completion Stats

- **Total Completed (Q1)**: 5 tasks
- **Story Points**: 34
- **Average Completion Time**: 5 hours
- **On-Time Delivery**: 80%

### 2024 - Q4 Summary

- **Total Tasks**: 48
- **Story Points**: 213
- **Major Milestones**: v1.0 release, Security audit passed

---

## 📖 Glossary

### Technical Terms

| Term      | Definition                        | Context/Usage                    |
| --------- | --------------------------------- | -------------------------------- |
| **API**   | Application Programming Interface | REST API at api.example.com      |
| **CI/CD** | Continuous Integration/Deployment | GitHub Actions pipeline          |
| **IaC**   | Infrastructure as Code            | Terraform configurations         |
| **K8s**   | Kubernetes                        | Container orchestration platform |
| **MTTR**  | Mean Time To Recovery             | Target: <1 hour                  |
| **P95**   | 95th percentile                   | Response time metric             |
| **PR**    | Pull Request                      | Code review process              |
| **RTO**   | Recovery Time Objective           | Max downtime: 4 hours            |
| **RPO**   | Recovery Point Objective          | Max data loss: 1 hour            |
| **SLA**   | Service Level Agreement           | 99.9% uptime guarantee           |
| **SOT**   | Single Source of Truth            | This document                    |
| **SOP**   | Standard Operating Procedures     | Process documentation            |

### Project-Specific Terms

| Term              | Definition                       | Reference                    |
| ----------------- | -------------------------------- | ---------------------------- |
| **Agent**         | Autonomous task executor         | `/src/agents/`               |
| **Chatmode**      | Configuration for agent behavior | `/.orchestration/chatmodes/` |
| **Orchestration** | Task management system           | `/.orchestration/`           |
| **Pipeline**      | Data processing workflow         | `/src/pipelines/`            |

---

## 🔄 Version History

### Current Production

- **Version**: v1.5.0
- **Released**: 2025-01-09
- **Changes**: Authentication service, performance improvements
- **Breaking Changes**: None

### Previous Stable

- **Version**: v1.4.2
- **Released**: 2025-01-05
- **Changes**: Bug fixes, security patches

### Upcoming Release

- **Version**: v1.6.0
- **Target Date**: 2025-01-20
- **Planned Features**:
  - Enhanced monitoring dashboard
  - Multi-region support
  - Advanced caching strategies

### Version Support Policy

- **Current**: Full support
- **Current -1**: Security patches only
- **Current -2**: End of life

---

## 📈 Performance Baselines

### API Response Times (P95)

| Endpoint        | Baseline | Current | Target | Status |
| --------------- | -------- | ------- | ------ | ------ |
| GET /health     | 10ms     | 8ms     | <10ms  | ✅     |
| GET /api/users  | 100ms    | 85ms    | <100ms | ✅     |
| POST /api/auth  | 200ms    | 180ms   | <150ms | ⚠️     |
| GET /api/search | 500ms    | 450ms   | <300ms | ❌     |

### Database Query Performance

| Query Type          | Baseline | Current | Status |
| ------------------- | -------- | ------- | ------ |
| Simple SELECT       | 5ms      | 3ms     | ✅     |
| JOIN (2 tables)     | 20ms     | 18ms    | ✅     |
| Complex aggregation | 100ms    | 95ms    | ✅     |
| Full text search    | 200ms    | 220ms   | ⚠️     |

---

## 🔗 External Dependencies

### Third-Party Services

| Service  | Purpose        | Status    | Contract   |
| -------- | -------------- | --------- | ---------- |
| AWS S3   | File storage   | 🟢 Active | Enterprise |
| SendGrid | Email delivery | 🟢 Active | Pro        |
| Stripe   | Payments       | 🟢 Active | Standard   |
| Datadog  | Monitoring     | 🟢 Active | Pro        |
| GitHub   | Source control | 🟢 Active | Enterprise |

### Package Dependencies

- **Critical Security Updates Required**: 0
- **Minor Updates Available**: 12
- **Last Audit**: 2025-01-10
- **Next Scheduled Audit**: 2025-01-17

---

## 🚨 Active Incidents

### Current Issues

| ID      | Severity | Issue                   | Started          | Owner  | Status        |
| ------- | -------- | ----------------------- | ---------------- | ------ | ------------- |
| INC-042 | P3       | High cache memory usage | 2025-01-10 08:30 | DevOps | Investigating |

### Recent Resolutions (Last 7 Days)

| ID      | Issue                    | Duration | Root Cause   | Fix               |
| ------- | ------------------------ | -------- | ------------ | ----------------- |
| INC-041 | API timeout spike        | 2h       | Memory leak  | Patched in v1.5.0 |
| INC-040 | Database connection pool | 30m      | Config error | Updated settings  |

---

## 📝 Quick Commands

### Status Checks

```bash
# System health
curl https://api.example.com/health

# Database status
psql -c "SELECT version();"

# Cache status
redis-cli ping

# Current deployments
kubectl get deployments
```

### Common Operations

```bash
# View logs
kubectl logs -f deployment/api

# Scale service
kubectl scale deployment/api --replicas=5

# Database backup
./scripts/backup-db.sh

# Clear cache
redis-cli FLUSHDB
```

---

## 🔒 Security Status

- **Last Security Scan**: 2025-01-10 02:00
- **Vulnerabilities**: 0 Critical, 0 High, 3 Medium, 7 Low
- **SSL Certificate Expiry**: 2025-03-15 (64 days)
- **Last Penetration Test**: 2024-12-15
- **Compliance Status**: SOC2 ✅, GDPR ✅, HIPAA ⏳

---

## 📅 Maintenance Windows

### Scheduled Maintenance

| Date       | Time (UTC)  | Duration | Impact | Description            |
| ---------- | ----------- | -------- | ------ | ---------------------- |
| 2025-01-15 | 02:00-04:00 | 2h       | Low    | Database maintenance   |
| 2025-01-22 | 03:00-03:30 | 30m      | None   | Backup verification    |
| 2025-02-01 | 00:00-06:00 | 6h       | Medium | Infrastructure upgrade |

---

## 📞 Contacts

### On-Call Rotation

- **Current**: John Doe (john@example.com)
- **Next**: Jane Smith (jane@example.com)
- **Escalation**: Tech Lead (lead@example.com)

### Key Stakeholders

- **Product Owner**: product@example.com
- **Infrastructure**: devops@example.com
- **Security**: security@example.com

---

_This document is automatically updated. Last sync: 2025-01-10 09:00:00 UTC_
_Source: System monitoring tools, CI/CD pipeline, task management system_
