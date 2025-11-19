# SOP - Standard Operating Procedures

<!-- Living document of how we work -->
<!-- Version: 1.0.0 | Last Updated: 2025-01-10 -->

## 📋 Table of Contents

1. [Development Standards](#development-standards)
2. [Deployment Procedures](#deployment-procedures)
3. [Architecture Guidelines](#architecture-guidelines)
4. [Backup & Recovery](#backup--recovery)
5. [File & Folder Organization](#file--folder-organization)
6. [Goals & Metrics](#goals--metrics)

---

## 1. Development Standards

### 1.1 Code Style Guidelines

#### Python

```python
# Use type hints
def calculate_total(price: float, quantity: int) -> float:
    """Calculate total with consistent docstring format."""
    return price * quantity

# Constants in UPPER_CASE
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30
```

#### JavaScript/TypeScript

```typescript
// Use const/let, never var
const CONFIG = {
  apiUrl: process.env.API_URL,
  timeout: 5000,
};

// Async/await over promises
async function fetchData(): Promise<Data> {
  const response = await api.get('/data');
  return response.data;
}
```

### 1.2 Git Workflow

#### Branch Naming

- `feature/description-of-feature`
- `bugfix/issue-number-description`
- `hotfix/critical-issue-description`
- `release/v1.2.3`

#### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, docs, style, refactor, test, chore

Example:

```
feat(auth): add two-factor authentication

- Implement TOTP-based 2FA
- Add QR code generation for authenticator apps
- Update user model with 2FA fields

Closes #123
```

### 1.3 Testing Requirements

#### Coverage Targets

- Unit Tests: ≥80% coverage
- Integration Tests: All API endpoints
- E2E Tests: Critical user paths

#### Test Structure

```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Component interaction tests
├── e2e/           # Full workflow tests
└── fixtures/      # Test data
```

### 1.4 Code Review Process

**Before Submitting PR:**

- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Security considerations addressed

**Review Checklist:**

- [ ] Logic is correct and efficient
- [ ] Error handling is comprehensive
- [ ] No credentials or secrets in code
- [ ] Performance impact considered
- [ ] Backwards compatibility maintained

### 1.5 AI/ML Development Tools

#### Claude Code + llama.cpp MCP Integration

**Local Neural Processing Setup:**

```bash
# Navigate to llama.cpp package
cd ~/noa-server/packages/llama.cpp

# Launch Claude Code with MCP neural processing (bypasses permission checks)
(praisonai_env) deflex@FlexNetOS-1001:~/noa-server/packages/llama.cpp$ claude --dangerously-skip-permissions

# Verify MCP server connection
claude mcp list
# Expected: neural-processing: ✓ Connected
```

**Available Neural Tools in Claude Code:**

- `chat_completion`: Generate text responses using llama.cpp models
- `stream_chat`: Real-time streaming chat responses
- `benchmark_model`: Performance testing and inference speed measurement
- `validate_model`: GGUF model file integrity verification
- `get_system_info`: Neural processing system configuration details
- `list_available_models`: Browse available GGUF models in models directory

**MCP Server Configuration:**

- **Server**: `neural-processing` (llama.cpp MCP server)
- **Location**: `~/noa-server/packages/llama.cpp/shims/http_bridge.py`
- **Models**: GGUF format in `~/noa-server/packages/llama.cpp/models/`
- **Acceleration**: CUDA enabled with VMM (Virtual Memory Management) support
- **Environment**: `praisonai_env` Python virtual environment

**Prerequisites:**

- Claude Code: Latest version (`npm install -g @anthropic-ai/claude-code`)
- Python 3.7+: With virtual environment support
- llama.cpp: Built with CUDA support (recommended for performance)
- MCP Library: `pip install mcp` in virtual environment

**Model Directory Structure:**

```bash
/home/deflex/noa-server/packages/llama.cpp/models/
├── llama-7b-q4.gguf          # 7B parameter model, Q4 quantization
├── llama-13b-q4.gguf         # 13B parameter model, Q4 quantization
├── codellama-7b.gguf         # Code-focused model
├── mistral-7b.gguf           # Mistral architecture
└── vocabulary/               # Vocabulary-only files
    ├── ggml-vocab-llama.gguf
    └── ggml-vocab-gpt-2.gguf
```

---

## 2. Deployment Procedures

---

## 2. Deployment Procedures

### 2.1 Pre-Deployment Checklist

#### Automated Checks (CI/CD)

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Security scan clean (no high/critical)
- [ ] Code coverage meets threshold
- [ ] Linting passes

#### Manual Verification

- [ ] Release notes prepared
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Monitoring alerts configured

### 2.2 Deployment Process

#### Step-by-Step

```bash
# 1. Tag the release
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# 2. Run deployment script
./scripts/deploy.sh production v1.2.3

# 3. Verify deployment
curl https://api.example.com/health

# 4. Run smoke tests
npm run test:smoke

# 5. Update status page
./scripts/update-status.sh "Deployment complete"
```

### 2.3 Rollback Procedure

```bash
# Immediate rollback (within 5 minutes)
./scripts/rollback.sh immediate

# Standard rollback
./scripts/rollback.sh v1.2.2

# Database rollback (if needed)
./scripts/db-rollback.sh migration-name
```

---

## 3. Architecture Guidelines

### 3.1 System Design Principles

- **Single Responsibility**: Each service/module has one job
- **Loose Coupling**: Minimize dependencies between components
- **High Cohesion**: Related functionality stays together
- **DRY**: Don't Repeat Yourself (within reason)
- **YAGNI**: You Aren't Gonna Need It

### 3.2 Service Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  API Gateway │────▶│   Services  │
└─────────────┘     └─────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌─────────────┐     ┌─────────────┐
                    │    Cache    │     │   Database  │
                    └─────────────┘     └─────────────┘
```

### 3.3 Technology Stack

#### Approved Technologies

- **Languages**: Python 3.11+, TypeScript 5+, Rust 1.75+
- **Frameworks**: FastAPI, React 18+, Next.js 14+
- **Databases**: PostgreSQL 15+, Redis 7+
- **Infrastructure**: Docker, Kubernetes, AWS/GCP

#### Adding New Technologies

1. Document the problem it solves
2. Proof of concept required
3. Team review and approval
4. Update this document

---

## 4. Backup & Recovery

### 4.1 Backup Schedule

| Component | Frequency       | Type        | Retention | Location |
| --------- | --------------- | ----------- | --------- | -------- |
| Database  | Daily 02:00 UTC | Full        | 30 days   | S3       |
| Database  | Hourly          | Incremental | 7 days    | S3       |
| Files     | Daily 03:00 UTC | Incremental | 30 days   | S3       |
| Files     | Weekly Sunday   | Full        | 90 days   | S3       |
| Configs   | On change       | Version     | Forever   | Git      |

### 4.2 Backup Verification

```bash
# Daily automated verification
./scripts/verify-backup.sh --date yesterday

# Manual verification
aws s3 ls s3://backups/database/
pg_restore --list backup_file.sql
```

### 4.3 Recovery Procedures

#### RTO (Recovery Time Objective): 4 hours

#### RPO (Recovery Point Objective): 1 hour

**Database Recovery:**

```bash
# 1. Stop application
kubectl scale deployment api --replicas=0

# 2. Restore database
./scripts/restore-db.sh --backup s3://backups/db/backup.sql

# 3. Verify data integrity
./scripts/verify-db.sh

# 4. Restart application
kubectl scale deployment api --replicas=3
```

---

## 5. File & Folder Organization

### 5.1 Project Structure

```
project-root/
├── .github/                 # GitHub specific files
│   ├── workflows/          # CI/CD pipelines
│   └── ISSUE_TEMPLATE/     # Issue templates
├── .orchestration/         # Task management
│   ├── current.todo        # Active tasks
│   ├── backlog.todo        # Future tasks
│   ├── sop.md             # This file
│   └── sot.md             # Source of truth
├── src/                    # Source code
│   ├── api/               # API endpoints
│   ├── core/              # Business logic
│   ├── models/            # Data models
│   └── utils/             # Utilities
├── tests/                  # Test suites
├── docs/                   # Documentation
│   ├── api/               # API documentation
│   ├── architecture/      # System design
│   └── runbooks/          # Operational guides
├── scripts/                # Utility scripts
├── configs/                # Configuration files
└── infrastructure/         # IaC definitions
```

### 5.2 Naming Conventions

- **Files**: `lowercase-with-dashes.ext`
- **Directories**: `lowercase_with_underscores/`
- **Classes**: `PascalCase`
- **Functions**: `snake_case` (Python) / `camelCase` (JS/TS)
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `IPascalCase` (TypeScript)

### 5.3 Documentation Standards

Every directory should have a README.md with:

- Purpose of the directory
- File descriptions
- Dependencies
- How to run/test
- Links to related docs

---

## 6. Goals & Metrics

### 6.1 Quarterly Objectives (Q1 2025)

| Objective            | Key Results                   | Status      |
| -------------------- | ----------------------------- | ----------- |
| Improve Performance  | <100ms API response time      | 🟡 85ms avg |
| Increase Reliability | 99.9% uptime                  | 🟢 99.95%   |
| Enhance Security     | Zero critical vulnerabilities | 🟢 Achieved |
| Reduce Tech Debt     | <20% debt ratio               | 🔴 25%      |

### 6.2 Key Performance Indicators (KPIs)

#### Development Metrics

- **Deployment Frequency**: 2x per week (target: daily)
- **Lead Time**: 3 days (target: <1 day)
- **MTTR**: 2 hours (target: <1 hour)
- **Change Failure Rate**: 5% (target: <3%)

#### System Metrics

- **Availability**: 99.95% (target: 99.99%)
- **Response Time (p95)**: 150ms (target: <100ms)
- **Error Rate**: 0.1% (target: <0.05%)
- **Customer Satisfaction**: 4.2/5 (target: 4.5/5)

### 6.3 Monitoring & Alerting

#### Alert Priorities

- **P1 (Critical)**: System down, data loss risk
  - Response: Immediate, all hands
  - SLA: 15 minutes

- **P2 (High)**: Degraded performance, partial outage
  - Response: Within 1 hour
  - SLA: 4 hours

- **P3 (Medium)**: Non-critical issues
  - Response: Business hours
  - SLA: 24 hours

- **P4 (Low)**: Minor issues, improvements
  - Response: Best effort
  - SLA: 1 week

---

## 📚 References

- [12 Factor App](https://12factor.net/)
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/)
- [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🔄 Document History

| Version | Date       | Author | Changes          |
| ------- | ---------- | ------ | ---------------- |
| 1.0.0   | 2025-01-10 | System | Initial creation |

---

## ✅ Annual Review Checklist

- [ ] Review and update all procedures
- [ ] Validate backup/recovery procedures
- [ ] Update technology stack
- [ ] Refresh security guidelines
- [ ] Review and adjust metrics/goals
- [ ] Archive obsolete sections
- [ ] Team training on updates
