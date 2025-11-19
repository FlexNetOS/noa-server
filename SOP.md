# SOP - Standard Operating Procedures

<!-- Living document of how we work -->
<!-- Version: 2.0.0 | Last Updated: 2025-10-22 23:55 UTC -->

## 📋 Table of Contents

1. [Development Standards](#1-development-standards)
2. [Task Management](#2-task-management)
3. [Deployment Procedures](#3-deployment-procedures)
4. [Architecture Guidelines](#4-architecture-guidelines)
5. [Backup & Recovery](#5-backup--recovery)
6. [File & Folder Organization](#6-file--folder-organization)
7. [Goals & Metrics](#7-goals--metrics)
8. [AI/ML Development Tools](#8-aiml-development-tools)

---

## 1. Development Standards

### 1.1 Code Style Guidelines

#### Python

```python
# Use type hints and docstrings
def calculate_total(price: float, quantity: int) -> float:
    """
    Calculate total cost with quantity.

    Args:
        price: Unit price in dollars
        quantity: Number of items

    Returns:
        Total cost in dollars

    Raises:
        ValueError: If price or quantity is negative
    """
    if price < 0 or quantity < 0:
        raise ValueError("Price and quantity must be non-negative")
    return price * quantity

# Constants in UPPER_SNAKE_CASE
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30
API_VERSION = "v1"

# Use dataclasses for data containers
from dataclasses import dataclass

@dataclass
class User:
    id: int
    username: str
    email: str
```

#### JavaScript/TypeScript

```typescript
// Use const/let, never var
const CONFIG = {
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  timeout: 5000,
} as const;

// Prefer async/await over raw promises
async function fetchData(): Promise<Data> {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch data', { error });
    throw new DataFetchError('Unable to retrieve data', { cause: error });
  }
}

// Use interfaces for object shapes
interface User {
  id: number;
  username: string;
  email: string;
}

// Use type guards
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj &&
    'email' in obj
  );
}
```

### 1.2 Git Workflow

#### Branch Naming Convention

```
<type>/<ticket-id>-<short-description>

Types:
- feature/    New feature or enhancement
- bugfix/     Bug fix
- hotfix/     Critical production fix
- release/    Release preparation
- refactor/   Code refactoring
- docs/       Documentation only
- test/       Test additions or modifications

Examples:
- feature/TASK-123-user-authentication
- bugfix/TASK-456-fix-login-error
- hotfix/critical-security-patch
- refactor/TASK-789-optimize-queries
```

#### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <subject>

[optional body]

[optional footer]

Types:
- feat:      New feature
- fix:       Bug fix
- docs:      Documentation changes
- style:     Code style changes (formatting, no logic change)
- refactor:  Code refactoring
- perf:      Performance improvements
- test:      Test additions or modifications
- chore:     Build process or auxiliary tool changes
- ci:        CI/CD changes

Example:
feat(auth): add two-factor authentication

- Implement TOTP-based 2FA using speakeasy library
- Add QR code generation for authenticator apps
- Update user model with 2FA fields and recovery codes
- Add middleware to enforce 2FA for sensitive operations

Closes TASK-123
Breaking Change: Requires database migration
```

#### Git Workflow Steps

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/TASK-123-new-feature

# 2. Make changes and commit frequently
git add .
git commit -m "feat(scope): add component X"

# 3. Keep branch updated with main
git fetch origin
git rebase origin/main

# 4. Push branch and create PR
git push origin feature/TASK-123-new-feature

# 5. After PR approval, squash and merge
# (done via GitHub UI)

# 6. Delete local and remote branch
git checkout main
git branch -d feature/TASK-123-new-feature
git push origin --delete feature/TASK-123-new-feature
```

### 1.3 Testing Requirements

#### Coverage Targets

- **Unit Tests**: ≥80% line coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user paths
- **Performance Tests**: Key operations under load

#### Test Structure

```
tests/
├── unit/              # Fast, isolated tests
│   ├── models/
│   ├── services/
│   └── utils/
├── integration/       # Component interaction tests
│   ├── api/
│   ├── database/
│   └── external/
├── e2e/              # Full workflow tests
│   ├── user-flows/
│   └── critical-paths/
├── performance/       # Load and stress tests
│   ├── benchmarks/
│   └── load-tests/
└── fixtures/         # Test data
    ├── users.json
    ├── products.json
    └── factories/
```

#### Test Naming Convention

```python
# Pattern: test_<unit>_<scenario>_<expected_result>

def test_calculate_total_with_positive_values_returns_product():
    """Should return price * quantity for positive inputs."""
    result = calculate_total(10.0, 5)
    assert result == 50.0

def test_calculate_total_with_negative_price_raises_error():
    """Should raise ValueError when price is negative."""
    with pytest.raises(ValueError):
        calculate_total(-10.0, 5)
```

### 1.4 Code Review Process

#### Before Submitting PR

**Automated Checks (CI/CD must pass)**

- [ ] All tests pass locally
- [ ] Code linting passes
- [ ] Type checking passes
- [ ] Security scan passes
- [ ] Build succeeds

**Manual Verification**

- [ ] Code follows style guidelines
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Backwards compatibility maintained
- [ ] Database migrations included if needed

#### PR Template

```markdown
## Description

Brief description of changes and motivation.

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work
      as expected)
- [ ] Documentation update

## Related Issues

Closes TASK-123 Related to TASK-456

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

[Add screenshots here]

## Checklist

- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Deployment Notes

Any special deployment considerations, migration steps, or configuration changes
required.
```

#### Review Checklist

**Code Quality**

- [ ] Logic is correct and efficient
- [ ] Error handling is comprehensive
- [ ] Edge cases are considered
- [ ] Code is readable and maintainable
- [ ] No code duplication (DRY principle)
- [ ] Functions/methods are single-purpose
- [ ] Variable/function names are descriptive

**Security**

- [ ] No credentials or secrets in code
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Authentication/authorization checks
- [ ] Sensitive data encrypted

**Performance**

- [ ] No N+1 query problems
- [ ] Database queries optimized
- [ ] Caching strategy appropriate
- [ ] Resource cleanup (connections, files)
- [ ] No memory leaks
- [ ] Asynchronous operations where appropriate

**Testing**

- [ ] Tests are meaningful and valuable
- [ ] Edge cases are tested
- [ ] Error paths are tested
- [ ] Mocks/stubs used appropriately
- [ ] Tests are fast and isolated

---

## 2. Task Management

### 2.1 Task Lifecycle

```
┌──────────┐
│  Create  │  New task identified
└────┬─────┘
     │
     ▼
┌──────────┐
│  Triage  │  Evaluate and estimate (backlog.todo)
└────┬─────┘
     │
     ▼
┌──────────┐
│Prioritize│  Assign priority P0-P3
└────┬─────┘
     │
     ▼
┌──────────┐
│ Schedule │  Move to current sprint (current.todo)
└────┬─────┘
     │
     ▼
┌──────────┐     ┌──────────┐
│   Work   │────▶│ Blocked  │  If dependencies
└────┬─────┘     └────┬─────┘
     │                │
     │                ▼
     │           (Resolve blockers)
     │                │
     ◀────────────────┘
     │
     ▼
┌──────────┐
│  Review  │  Code review and QA
└────┬─────┘
     │
     ▼
┌──────────┐
│ Complete │  Mark done in current.todo
└────┬─────┘
     │
     ▼
┌──────────┐
│ Archive  │  Move to SOT.md
└──────────┘
```

### 2.2 Task Priority Definitions

#### P0 - Critical (Same Day)

**Criteria:**

- Production system down or severely degraded
- Data loss or corruption risk
- Active security breach
- Legal/compliance violation

**Process:**

1. Create incident in #incidents Slack channel
2. Page on-call engineer immediately
3. Add to current.todo with [P0] tag
4. Notify engineering manager and stakeholders
5. Update status page
6. Start incident response procedure (See section 3.4)

**SLA:** Resolution within same day **Escalation:** Immediate all-hands

#### P1 - High (24-48 hours)

**Criteria:**

- Major feature broken or severely degraded
- Blocking other team members
- Significant user impact
- Revenue-impacting bug

**Process:**

1. Post in #engineering Slack channel
2. Add to current.todo with [P1] tag
3. Assign to responsible team/individual
4. Notify stakeholders
5. Daily status updates required

**SLA:** Resolution within 24-48 hours **Escalation:** Manager notification if
not progressing

#### P2 - Normal (This Week)

**Criteria:**

- Regular development work
- Feature enhancements
- Non-critical bugs
- Improvements and optimizations

**Process:**

1. Add to current.todo with [P2] tag
2. Assign during sprint planning
3. Standard development workflow
4. Weekly updates in standup

**SLA:** Resolution within current sprint **Escalation:** Standard sprint
planning

#### P3 - Low (Future)

**Criteria:**

- Nice to have features
- Research and exploration
- Technical debt cleanup
- Documentation improvements

**Process:**

1. Add to current.todo with [P3] tag
2. Work on when capacity allows
3. May be deferred to future sprints

**SLA:** Best effort, next sprint or later **Escalation:** None required

### 2.3 Task Entry Guidelines

#### Required Fields

```markdown
- [ ] [PRIORITY] Task description @category #tags due:YYYY-MM-DD
  - ID: TASK-XXX (unique identifier)
  - Context: Why this task exists
  - Success: Definition of done
  - Dependencies: Prerequisites (TASK-XXX)
  - Assigned: Owner
  - Estimated: Time in hours
  - Tags: Relevant tags
```

#### Optional Fields

```markdown
- Status: Additional status notes
- Blocker: What's blocking progress
- Impact: Business/user impact
- Risk: Technical risks
- Notes: Additional context
```

#### Example

```markdown
- [ ] [P2] Implement user authentication API @backend #api #security
      due:2025-10-25
  - ID: TASK-301
  - Context: Users need to securely log in to access protected resources
  - Success: JWT-based auth with login, logout, and token refresh endpoints
  - Dependencies: TASK-295 (database schema)
  - Assigned: Backend Team
  - Estimated: 8 hours
  - Tags: #authentication #jwt #security
  - Risk: Token storage and refresh logic complexity
  - Impact: Blocks all user-facing features
```

### 2.4 Daily Operations

#### Morning Standup (9:30 AM Daily)

**Format:** 15 minutes, timeboxed

Each team member answers:

1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or help needed?

**Best Practices:**

- Update current.todo before standup
- Focus on progress, not excuses
- Take detailed discussions offline
- Update task status in real-time
- Flag blockers immediately

#### End of Day

**Checklist:**

- [ ] Update current.todo with task progress
- [ ] Mark completed tasks with [x]
- [ ] Document any blockers
- [ ] Commit code changes
- [ ] Update PRs with review feedback
- [ ] Post updates in relevant Slack channels

### 2.5 Weekly Operations

#### Monday - Sprint Planning (2:00 PM)

**Duration:** 1-2 hours

**Agenda:**

1. Review last sprint completion (15 min)
2. Backlog grooming (30 min)
3. Select tasks for current sprint (30 min)
4. Estimate and assign tasks (15 min)
5. Commit to sprint goals (10 min)

**Artifacts:**

- Updated current.todo with sprint tasks
- Sprint goals documented
- Team capacity planned
- Dependencies identified

#### Wednesday - Mid-Sprint Sync (3:00 PM)

**Duration:** 30 minutes

**Agenda:**

1. Review sprint progress
2. Identify risks to sprint goal
3. Adjust priorities if needed
4. Address blockers

#### Friday - Sprint Review & Retro (4:00 PM)

**Duration:** 1 hour

**Sprint Review (30 min):**

1. Demo completed work
2. Review sprint goals achievement
3. Discuss what shipped

**Retrospective (30 min):**

1. What went well?
2. What could improve?
3. Action items for next sprint

**Artifacts:**

- Move completed tasks to SOT.md
- Update metrics in current.todo
- Document lessons learned
- Create improvement tasks

---

## 3. Deployment Procedures

### 3.1 Deployment Environments

| Environment    | Purpose             | Deployment            | Data                 | Monitoring      |
| -------------- | ------------------- | --------------------- | -------------------- | --------------- |
| **Local**      | Development         | Manual                | Synthetic            | Logs only       |
| **Dev**        | Integration testing | Auto (main branch)    | Anonymized prod copy | Basic           |
| **Staging**    | Pre-prod validation | Auto (release branch) | Anonymized prod copy | Full            |
| **Production** | Live users          | Manual approval       | Real data            | Full + alerting |

### 3.2 Pre-Deployment Checklist

#### Automated Checks (CI/CD Pipeline)

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E tests pass
- [ ] Security scan clean (no high/critical vulnerabilities)
- [ ] Code coverage meets threshold (≥80%)
- [ ] Linting passes with no errors
- [ ] Build succeeds
- [ ] Docker image builds successfully
- [ ] Dependency vulnerabilities checked

#### Manual Verification

- [ ] Release notes prepared and reviewed
- [ ] Database migrations tested in staging
- [ ] Rollback plan documented
- [ ] Stakeholders notified (email + Slack)
- [ ] Monitoring alerts configured
- [ ] Feature flags configured (if applicable)
- [ ] Load testing completed for major changes
- [ ] Security review completed (if needed)
- [ ] Documentation updated
- [ ] API version compatibility checked

### 3.3 Deployment Process

#### Step-by-Step Deployment

```bash
# 1. Final pre-deployment check
./scripts/pre-deploy-check.sh

# 2. Create release tag
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# 3. Build and push Docker image
docker build -t myapp:v1.2.3 .
docker tag myapp:v1.2.3 registry.example.com/myapp:v1.2.3
docker push registry.example.com/myapp:v1.2.3

# 4. Run database migrations (if applicable)
kubectl exec -it db-pod -- ./scripts/migrate.sh

# 5. Deploy to production
./scripts/deploy.sh production v1.2.3

# 6. Wait for rollout to complete
kubectl rollout status deployment/myapp

# 7. Verify deployment health
curl https://api.example.com/health
./scripts/smoke-tests.sh

# 8. Monitor metrics for 15 minutes
# Watch dashboards: response times, error rates, resource usage

# 9. Update status page
./scripts/update-status.sh "Deployment v1.2.3 complete"

# 10. Notify stakeholders
./scripts/notify-deployment.sh v1.2.3 success
```

#### Deployment Windows

- **Preferred**: Tuesday-Thursday, 10:00 AM - 2:00 PM EST
- **Avoided**: Friday afternoons, weekends, holidays
- **Critical fixes**: Anytime with approval

### 3.4 Incident Response Procedure

#### Severity Levels

| Level     | Definition        | Response Time | Team           |
| --------- | ----------------- | ------------- | -------------- |
| **SEV-1** | Complete outage   | Immediate     | All hands      |
| **SEV-2** | Major degradation | 15 minutes    | On-call + lead |
| **SEV-3** | Minor issue       | 1 hour        | On-call        |

#### Incident Response Steps

**1. Detection (0-5 minutes)**

- Monitor alert triggers or user report
- Verify incident is real
- Determine severity level
- Create incident channel in Slack (#incident-YYYYMMDD-XXX)

**2. Response (5-15 minutes)**

- Page appropriate team (see severity table)
- Assign incident commander
- Post initial update to status page
- Begin incident log in shared document

**3. Investigation (15-60 minutes)**

- Review monitoring dashboards
- Check recent deployments
- Examine logs and traces
- Identify root cause
- Document findings in incident log

**4. Mitigation (varies)**

- Apply immediate fix or rollback
- Verify mitigation successful
- Monitor recovery metrics
- Update status page

**5. Resolution (varies)**

- Confirm all systems normal
- Close incident channel
- Post final status update
- Schedule post-mortem

**6. Post-Mortem (within 48 hours)**

- Timeline of events
- Root cause analysis
- What went well / poorly
- Action items to prevent recurrence
- Share with team

### 3.5 Rollback Procedure

#### When to Rollback

- Error rate >1% increase
- Response time >2x baseline
- Any data corruption detected
- Critical feature broken
- Security vulnerability introduced

#### Immediate Rollback (< 5 minutes)

```bash
# 1. Stop new deployments
kubectl rollout pause deployment/myapp

# 2. Revert to previous version
kubectl rollout undo deployment/myapp

# 3. Wait for rollback completion
kubectl rollout status deployment/myapp

# 4. Verify health
curl https://api.example.com/health

# 5. Notify team
./scripts/notify-rollback.sh
```

#### Standard Rollback

```bash
# 1. Identify previous good version
kubectl rollout history deployment/myapp

# 2. Rollback to specific revision
kubectl rollout undo deployment/myapp --to-revision=42

# 3. Database rollback (if needed)
./scripts/db-rollback.sh migration-name

# 4. Verify and monitor
./scripts/smoke-tests.sh
```

---

## 4. Architecture Guidelines

### 4.1 System Design Principles

#### Core Principles

1. **Single Responsibility Principle (SRP)**
   - Each class/module has one reason to change
   - Functions do one thing well

2. **Loose Coupling**
   - Minimize dependencies between components
   - Use interfaces and dependency injection
   - Prefer composition over inheritance

3. **High Cohesion**
   - Related functionality stays together
   - Clear module boundaries

4. **DRY (Don't Repeat Yourself)**
   - Extract common patterns into reusable components
   - But don't over-abstract prematurely

5. **YAGNI (You Aren't Gonna Need It)**
   - Don't build features speculatively
   - Add complexity only when needed

6. **Separation of Concerns**
   - Presentation / Business Logic / Data Access
   - Clean architecture layers

#### Design Patterns (Approved)

- **Factory**: Object creation
- **Strategy**: Interchangeable algorithms
- **Observer**: Event-driven communication
- **Decorator**: Extend functionality
- **Repository**: Data access abstraction
- **Dependency Injection**: Loose coupling

### 4.2 Service Architecture

```
┌────────────────────────────────────────────────┐
│                  API Gateway                    │
│  (Rate limiting, Auth, Routing, API versioning)│
└───────────┬────────────────────────┬────────────┘
            │                        │
    ┌───────▼────────┐      ┌────────▼──────────┐
    │  Auth Service  │      │  Business Logic   │
    │  (JWT, OAuth)  │      │    Services       │
    └───────┬────────┘      └────────┬──────────┘
            │                        │
            │      ┌─────────────────┼──────────┐
            │      │                 │          │
    ┌───────▼──────▼─────┐  ┌────────▼────┐ ┌──▼────────┐
    │   Cache (Redis)    │  │  Database   │ │  Queue    │
    │ (Sessions, Tokens) │  │ (PostgreSQL)│ │ (RabbitMQ)│
    └────────────────────┘  └─────────────┘ └───────────┘
```

### 4.3 Technology Stack

#### Approved Technologies

**Backend**

- **Languages**: Python 3.11+, TypeScript 5+, Rust 1.75+
- **Frameworks**: FastAPI, Express.js, Next.js 14+
- **API**: REST, GraphQL (Apollo), gRPC

**Frontend**

- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand, React Query
- **Styling**: Tailwind CSS, CSS Modules
- **Build**: Vite, Next.js

**Data**

- **Primary Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Search**: Elasticsearch 8+
- **Message Queue**: RabbitMQ 3.12+

**Infrastructure**

- **Containers**: Docker, Kubernetes
- **Cloud**: AWS (primary), GCP (backup)
- **CI/CD**: GitHub Actions
- **Monitoring**: Datadog, Sentry
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

#### Adding New Technologies

**Approval Process:**

1. Document the problem it solves
2. Explain why existing tools insufficient
3. Create proof of concept
4. Security and licensing review
5. Team discussion and approval
6. Update this document
7. Add to dependency management

**Evaluation Criteria:**

- [ ] Active community and maintenance
- [ ] Compatible with existing stack
- [ ] Adequate documentation
- [ ] Security track record
- [ ] Licensing compatible
- [ ] Team skill availability or training plan
- [ ] Performance benchmarks
- [ ] Cost analysis

---

## 5. Backup & Recovery

### 5.1 Backup Schedule

| Component    | Frequency       | Type        | Retention | Location | Encryption    |
| ------------ | --------------- | ----------- | --------- | -------- | ------------- |
| **Database** | Daily 02:00 UTC | Full        | 30 days   | AWS S3   | AES-256       |
| **Database** | Hourly          | Incremental | 7 days    | AWS S3   | AES-256       |
| **Database** | Real-time       | WAL         | 24 hours  | AWS S3   | AES-256       |
| **Files**    | Daily 03:00 UTC | Incremental | 30 days   | AWS S3   | AES-256       |
| **Files**    | Weekly (Sunday) | Full        | 90 days   | AWS S3   | AES-256       |
| **Configs**  | On change       | Version     | Forever   | Git      | N/A           |
| **Secrets**  | On change       | Encrypted   | Forever   | Vault    | Vault-managed |

### 5.2 Backup Verification

#### Automated Verification (Daily)

```bash
# Runs daily at 04:00 UTC
./scripts/verify-backup.sh --date yesterday

# Checks:
# - Backup file exists
# - File size within expected range
# - File integrity (checksum)
# - Restore test on sample data
```

#### Manual Verification (Monthly)

```bash
# First Friday of month

# 1. List recent backups
aws s3 ls s3://backups/database/ --recursive | tail -10

# 2. Download latest backup
aws s3 cp s3://backups/database/latest.sql.gz ./

# 3. Verify backup structure
pg_restore --list latest.sql.gz | head -20

# 4. Perform test restore to staging
./scripts/restore-db.sh --target staging --backup latest.sql.gz

# 5. Run smoke tests on restored data
./scripts/smoke-test-db.sh staging

# 6. Document results
# Update SOT.md with verification status
```

### 5.3 Recovery Procedures

#### Recovery Objectives

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour

#### Database Recovery

**Full Database Restore:**

```bash
# 1. Declare incident and notify stakeholders
./scripts/notify-incident.sh "Database recovery in progress"

# 2. Stop application (prevent writes)
kubectl scale deployment api --replicas=0

# 3. Backup current state (even if corrupted)
pg_dump -h db-host -U postgres -F c -f emergency-backup.dump

# 4. Download backup file
aws s3 cp s3://backups/database/2025-10-22-02-00.sql.gz ./

# 5. Restore database
gunzip 2025-10-22-02-00.sql.gz
psql -h db-host -U postgres -d postgres -f 2025-10-22-02-00.sql

# 6. Verify data integrity
./scripts/verify-db.sh

# 7. Run database migrations if needed
./scripts/migrate.sh

# 8. Restart application
kubectl scale deployment api --replicas=3

# 9. Monitor application health
kubectl logs -f deployment/api
curl https://api.example.com/health

# 10. Verify user-facing functionality
./scripts/smoke-tests.sh

# 11. Resolve incident
./scripts/notify-incident.sh "Database recovery complete"
```

**Point-in-Time Recovery (PITR):**

```bash
# Restore to specific timestamp using WAL

# 1. Stop application
kubectl scale deployment api --replicas=0

# 2. Restore base backup
pg_basebackup -D /var/lib/postgresql/data -P

# 3. Configure recovery
cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'aws s3 cp s3://backups/wal/%f %p'
recovery_target_time = '2025-10-22 14:30:00 UTC'
EOF

# 4. Start PostgreSQL (auto-recovery)
systemctl start postgresql

# 5. Verify recovery point
psql -c "SELECT pg_last_xact_replay_timestamp();"

# 6. Promote to primary
pg_ctl promote

# 7. Restart application
kubectl scale deployment api --replicas=3
```

#### File Recovery

```bash
# 1. Identify file/directory to restore
# 2. Find appropriate backup
aws s3 ls s3://backups/files/2025-10-22/

# 3. Restore file
aws s3 cp s3://backups/files/2025-10-22/path/to/file ./

# 4. Verify file integrity
md5sum file
# Compare with backup manifest

# 5. Move to production location
sudo cp file /production/path/
sudo chown app:app /production/path/file
```

---

## 6. File & Folder Organization

### 6.1 Project Structure

```
project-root/
├── .github/                    # GitHub-specific files
│   ├── workflows/             # CI/CD pipelines
│   │   ├── ci.yml
│   │   ├── deploy.yml
│   │   └── security-scan.yml
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .claude/                   # Claude Code configuration
│   ├── config.json
│   └── hooks/
│
├── current.todo               # Active tasks (THIS SYSTEM)
├── backlog.todo               # Future tasks
├── SOP.md                     # Standard Operating Procedures (THIS FILE)
├── SOT.md                     # Source of Truth
│
├── src/                       # Source code
│   ├── api/                   # API layer
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── controllers/
│   ├── core/                  # Business logic
│   │   ├── services/
│   │   ├── models/
│   │   └── validators/
│   ├── database/              # Database layer
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── repositories/
│   ├── utils/                 # Utilities
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   └── validators.ts
│   └── types/                 # TypeScript types
│
├── tests/                     # Test suites
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── performance/
│   └── fixtures/
│
├── docs/                      # Documentation
│   ├── api/                   # API documentation
│   │   ├── openapi.yaml
│   │   └── README.md
│   ├── architecture/          # System design docs
│   │   ├── diagrams/
│   │   ├── decisions/         # ADRs
│   │   └── README.md
│   ├── runbooks/              # Operational guides
│   │   ├── incident-response.md
│   │   ├── deployment.md
│   │   └── troubleshooting.md
│   └── guides/                # User guides
│
├── scripts/                   # Utility scripts
│   ├── deploy.sh
│   ├── backup-db.sh
│   ├── verify-backup.sh
│   └── smoke-tests.sh
│
├── infrastructure/            # Infrastructure as Code
│   ├── terraform/             # Terraform configs
│   ├── kubernetes/            # K8s manifests
│   │   ├── base/
│   │   └── overlays/
│   └── docker/                # Dockerfiles
│
├── config/                    # Configuration files
│   ├── development.json
│   ├── staging.json
│   ├── production.json
│   └── .env.example
│
├── templates/                 # Task and document templates
│   ├── tasks/
│   └── docs/
│
├── package.json               # Node.js dependencies
├── tsconfig.json              # TypeScript config
├── .eslintrc.json             # ESLint config
├── .prettierrc                # Prettier config
├── docker-compose.yml         # Local development
└── README.md                  # Project overview
```

### 6.2 Naming Conventions

#### Files

- **Source files**: `lowercase-with-dashes.ts`
- **React components**: `PascalCase.tsx`
- **Test files**: `filename.test.ts`
- **Config files**: `lowercase.config.ts`

#### Directories

- **General**: `lowercase-with-dashes/`
- **Component folders**: `PascalCase/` (React)

#### Code Elements

- **Classes**: `PascalCase`
- **Interfaces**: `IPascalCase` or `PascalCase`
- **Types**: `PascalCase`
- **Functions**: `camelCase` (TS/JS), `snake_case` (Python)
- **Variables**: `camelCase` (TS/JS), `snake_case` (Python)
- **Constants**: `UPPER_SNAKE_CASE`
- **Private members**: `_camelCase` or `#camelCase`

### 6.3 Documentation Standards

#### README.md Requirements

Every directory should have a README.md with:

```markdown
# [Directory Name]

## Purpose

Brief description of what this directory contains and why it exists.

## Structure

Overview of important files and subdirectories.

## Usage

How to use/run the code in this directory.

## Dependencies

List of dependencies and requirements.

## Related Documentation

Links to relevant documentation.

## Owners

Team or individuals responsible for this code.
```

---

## 7. Goals & Metrics

### 7.1 Quarterly Objectives (Q4 2025)

| Objective                        | Key Results              | Target | Current | Status         |
| -------------------------------- | ------------------------ | ------ | ------- | -------------- |
| **Improve Performance**          | API p95 response time    | <100ms | 85ms    | 🟢 Achieved    |
| **Increase Reliability**         | System uptime            | 99.9%  | 99.95%  | 🟢 Exceeded    |
| **Enhance Security**             | Critical vulnerabilities | 0      | 0       | 🟢 Achieved    |
| **Reduce Tech Debt**             | Code debt ratio          | <20%   | 25%     | 🔴 At risk     |
| **Improve Developer Experience** | Deployment time          | <10min | 15min   | 🟡 In progress |
| **Increase Test Coverage**       | Overall coverage         | >80%   | 78%     | 🟡 In progress |

### 7.2 Key Performance Indicators (KPIs)

#### Development Metrics (DORA Metrics)

| Metric                           | Current | Target  | Trend | Status |
| -------------------------------- | ------- | ------- | ----- | ------ |
| **Deployment Frequency**         | 2x/week | Daily   | ↗️    | 🟡     |
| **Lead Time for Changes**        | 3 days  | <1 day  | →     | 🟡     |
| **Mean Time to Recovery (MTTR)** | 2 hours | <1 hour | ↘️    | 🟢     |
| **Change Failure Rate**          | 5%      | <3%     | ↘️    | 🟡     |

#### System Metrics

| Metric                        | Current    | Target | Alert Threshold | Status |
| ----------------------------- | ---------- | ------ | --------------- | ------ |
| **Availability (Uptime)**     | 99.95%     | 99.99% | <99.9%          | 🟢     |
| **API Response Time (p95)**   | 85ms       | <100ms | >200ms          | 🟢     |
| **API Response Time (p99)**   | 150ms      | <200ms | >500ms          | 🟢     |
| **Error Rate**                | 0.1%       | <0.05% | >0.5%           | 🟡     |
| **Request Rate**              | 3.4k req/s | -      | >10k req/s      | 🟢     |
| **Database Query Time (p95)** | 18ms       | <20ms  | >50ms           | 🟢     |

#### Business Metrics

| Metric                           | Current  | Target    | Trend | Status |
| -------------------------------- | -------- | --------- | ----- | ------ |
| **Customer Satisfaction (CSAT)** | 4.2/5    | 4.5/5     | ↗️    | 🟡     |
| **Net Promoter Score (NPS)**     | 42       | 50        | ↗️    | 🟡     |
| **Support Ticket Volume**        | 150/week | <100/week | →     | 🟡     |
| **Feature Adoption Rate**        | 65%      | >70%      | ↗️    | 🟡     |

### 7.3 Monitoring & Alerting

#### Alert Priorities

**P1 - Critical (SEV-1)**

- System down or unavailable
- Data loss or corruption
- Security breach
- **Response**: Immediate, all hands
- **SLA**: 15 minutes to acknowledge
- **Notification**: Page on-call, #incidents channel, status page

**P2 - High (SEV-2)**

- Degraded performance (>2x baseline)
- Partial outage
- High error rate (>1%)
- **Response**: Within 1 hour
- **SLA**: 4 hours to mitigate
- **Notification**: On-call engineer, #engineering channel

**P3 - Medium (SEV-3)**

- Non-critical issues
- Minor performance degradation
- Resource warnings
- **Response**: Business hours
- **SLA**: 24 hours
- **Notification**: #engineering channel

**P4 - Low**

- Minor issues
- Improvements needed
- Informational alerts
- **Response**: Best effort
- **SLA**: 1 week
- **Notification**: Email digest

#### Key Alerts Configuration

```yaml
# Example alert definitions

# Critical alerts
- name: api_down
  condition: http_check_failed > 3
  severity: P1
  notification: pagerduty, slack-incidents

- name: database_down
  condition: postgres_up == 0
  severity: P1
  notification: pagerduty, slack-incidents

- name: high_error_rate
  condition: error_rate > 1%
  duration: 5m
  severity: P1
  notification: pagerduty, slack-incidents

# High priority alerts
- name: slow_api_response
  condition: api_response_p95 > 200ms
  duration: 10m
  severity: P2
  notification: slack-engineering

- name: high_memory_usage
  condition: memory_usage > 85%
  duration: 15m
  severity: P2
  notification: slack-engineering

# Medium priority alerts
- name: disk_space_warning
  condition: disk_usage > 75%
  duration: 30m
  severity: P3
  notification: slack-engineering
```

---

## 8. AI/ML Development Tools

### 8.1 Claude Code + llama.cpp MCP Integration

#### Setup Instructions

**1. Navigate to llama.cpp Package**

```bash
cd ~/noa-server/packages/llama.cpp
```

**2. Activate Python Environment**

```bash
source ~/praisonai_env/bin/activate
# Or on Windows: praisonai_env\Scripts\activate
```

**3. Launch Claude Code with MCP**

```bash
# Bypass permission checks for MCP
claude --dangerously-skip-permissions
```

**4. Verify MCP Connection**

```bash
# Inside Claude Code
claude mcp list

# Expected output:
# ✓ neural-processing: Connected
```

#### Available MCP Tools

**Neural Processing Tools**

- `chat_completion` - Generate text responses using llama.cpp models
- `stream_chat` - Real-time streaming chat responses
- `benchmark_model` - Performance testing and inference speed measurement
- `validate_model` - GGUF model file integrity verification
- `get_system_info` - Neural processing system configuration details
- `list_available_models` - Browse available GGUF models in models directory

#### Configuration

**MCP Server:**

- **Name**: `neural-processing`
- **Type**: llama.cpp MCP bridge
- **Location**: `~/noa-server/packages/llama.cpp/shims/http_bridge.py`
- **Port**: 8080 (configurable)
- **Protocol**: HTTP with JSON-RPC

**Model Storage:**

- **Directory**: `~/noa-server/packages/llama.cpp/models/`
- **Format**: GGUF (GPT-Generated Unified Format)
- **Organization**:
  ```
  models/
  ├── llama-7b-q4.gguf          # 7B parameter, Q4 quantization
  ├── llama-13b-q4.gguf         # 13B parameter, Q4 quantization
  ├── codellama-7b.gguf         # Code-specialized model
  ├── mistral-7b.gguf           # Mistral architecture
  └── vocabulary/
      ├── ggml-vocab-llama.gguf
      └── ggml-vocab-gpt-2.gguf
  ```

**Hardware Acceleration:**

- **CUDA**: Enabled with VMM (Virtual Memory Management)
- **GPU**: NVIDIA with compute capability 6.0+
- **Fallback**: CPU-only mode with optimized kernels

#### Prerequisites

**System Requirements:**

- **Claude Code**: Latest version (`npm install -g @anthropic-ai/claude-code`)
- **Python**: 3.7+ with virtual environment support
- **llama.cpp**: Built with CUDA support (recommended)
- **MCP Library**: `pip install mcp` in virtual environment
- **Memory**: 8GB+ RAM, 4GB+ VRAM (for GPU acceleration)

**Installation:**

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Setup Python environment
python3 -m venv ~/praisonai_env
source ~/praisonai_env/bin/activate

# Install MCP dependencies
pip install mcp anthropic

# Build llama.cpp with CUDA
cd ~/noa-server/packages/llama.cpp
make LLAMA_CUDA=1

# Download models (example)
wget https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q4_K_M.gguf \
  -O models/llama-7b-q4.gguf
```

#### Usage Examples

**Chat Completion:**

```python
# Using MCP tool in Claude Code
chat_completion(
    model="llama-7b-q4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain quantum computing in simple terms."}
    ],
    temperature=0.7,
    max_tokens=500
)
```

**Model Benchmarking:**

```python
# Benchmark inference performance
benchmark_model(
    model="llama-7b-q4",
    prompt="Write a Python function to calculate fibonacci numbers",
    num_runs=10
)
# Returns: avg_tokens_per_sec, avg_latency_ms, throughput
```

**Model Validation:**

```python
# Validate GGUF file integrity
validate_model(
    model_path="models/llama-7b-q4.gguf"
)
# Returns: file_size, quantization, architecture, parameter_count, checksum
```

#### Troubleshooting

**MCP Connection Failed:**

```bash
# Check MCP server status
ps aux | grep http_bridge.py

# Restart MCP server
pkill -f http_bridge.py
python ~/noa-server/packages/llama.cpp/shims/http_bridge.py &

# Check logs
tail -f ~/noa-server/packages/llama.cpp/logs/mcp-server.log
```

**CUDA Not Available:**

```bash
# Verify CUDA installation
nvidia-smi

# Check llama.cpp build
cd ~/noa-server/packages/llama.cpp
./main --help | grep cuda
# Should show: CUDA support: enabled

# Rebuild with CUDA
make clean
make LLAMA_CUDA=1
```

**Model Loading Issues:**

```bash
# Verify model file
ls -lh models/llama-7b-q4.gguf

# Test model loading
./main -m models/llama-7b-q4.gguf -p "Test" -n 10

# Check model format
file models/llama-7b-q4.gguf
# Should show: GGUF model file
```

---

## 📚 References

### Industry Standards

- [12 Factor App](https://12factor.net/) - Modern application development
  principles
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/) - Site
  reliability engineering
- [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/) -
  Cloud architecture best practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web application
  security risks

### Internal Documentation

- [Current Tasks](./current.todo) - Active tasks in progress
- [Backlog](./backlog.todo) - Future work and ideas
- [Source of Truth](./SOT.md) - System state and completed work
- [API Documentation](./docs/api/) - API specifications
- [Architecture Docs](./docs/architecture/) - System design

### External Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Database
  reference
- [Redis Documentation](https://redis.io/documentation) - Cache reference
- [Kubernetes Docs](https://kubernetes.io/docs/) - Container orchestration
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Language
  reference

---

## 🔄 Document History

| Version | Date       | Author | Changes                                           |
| ------- | ---------- | ------ | ------------------------------------------------- |
| 2.0.0   | 2025-10-22 | System | Complete rewrite with task management integration |
| 1.0.0   | 2025-01-10 | System | Initial creation                                  |

---

## ✅ Annual Review Checklist

**Due: Q1 each year**

- [ ] Review and update all procedures
- [ ] Validate backup/recovery procedures with live drill
- [ ] Update technology stack and approve new tools
- [ ] Refresh security guidelines based on threat landscape
- [ ] Review and adjust metrics/goals based on business objectives
- [ ] Archive obsolete sections
- [ ] Conduct team training on significant updates
- [ ] Update runbooks based on incident learnings
- [ ] Review and update on-call rotation and escalation paths
- [ ] Validate monitoring alerts and thresholds

---

_This is a living document. Propose changes via PR to keep it current._ _Last
Updated: 2025-10-22 23:55 UTC_ _Next Review: 2026-01-01_ _Owner: Engineering
Team_
