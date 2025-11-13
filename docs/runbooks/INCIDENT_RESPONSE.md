# Incident Response Runbook

## Overview

This runbook provides detailed procedures for responding to incidents across all
severity levels for NOA Server production systems.

## Severity Classification

### P0 - Critical (SEV1)

**Definition**: Complete outage or data loss affecting all users

**Response Time**: Immediate (5 minutes) **Update Frequency**: Every 15 minutes
**Escalation**: Immediate to Engineering Manager + CTO

**Examples**:

- API completely down (all requests failing)
- Database unavailable
- Authentication system broken
- Data corruption or loss
- Active security breach
- Complete infrastructure failure

### P1 - High (SEV2)

**Definition**: Major functionality impaired, affecting significant user
population

**Response Time**: 15 minutes **Update Frequency**: Every 30 minutes
**Escalation**: Engineering Manager within 30 minutes

**Examples**:

- API error rate >10%
- Response time >5s p95
- Single AI provider completely failing
- Partial data corruption
- Major feature unavailable
- Severe performance degradation

### P2 - Medium (SEV3)

**Definition**: Minor functionality issues affecting subset of users

**Response Time**: 1 hour **Update Frequency**: Every 2 hours **Escalation**:
Team Lead within 2 hours

**Examples**:

- API error rate 5-10%
- Response time 2-5s p95
- Non-critical feature unavailable
- Minor cache issues
- Elevated but acceptable latency

### P3 - Low (SEV4)

**Definition**: Minimal impact or cosmetic issues

**Response Time**: 24 hours **Update Frequency**: Daily **Escalation**: None

**Examples**:

- UI bugs
- Documentation errors
- Logging issues
- Minor performance optimization needed

## Incident Response Workflow

### Phase 1: Detection (0-5 minutes)

#### Automated Detection

```bash
# Alert received via PagerDuty/Slack
# Example: "P0 Alert: API Error Rate >50% for 5 minutes"

# 1. Acknowledge alert
# Click "Acknowledge" in PagerDuty within 5 minutes

# 2. Create incident channel
# Slack: /incident create "API High Error Rate"
# This creates #incident-YYYYMMDD-HH:MM channel

# 3. Initial assessment
# Check Grafana dashboard: https://grafana.noaserver.com/d/overview
# Check error logs: kubectl logs -f -l app=noa-mcp -n noa-server --tail=100
```

#### Manual Detection (User Report)

```bash
# 1. User reports issue via support ticket or Slack

# 2. Verify issue
curl https://api.noaserver.com/health
curl https://api.noaserver.com/api/v1/providers

# 3. Check monitoring for corroboration
# Grafana: https://grafana.noaserver.com

# 4. If confirmed, declare incident
# Slack: /incident create "API Issues - User Report"
```

#### Initial Severity Assessment

Use this decision tree:

```
Is the system completely down? → P0
Are >50% of users affected? → P0
Is there data loss or corruption? → P0
Are >25% of users affected? → P1
Is error rate >10%? → P1
Is response time >5s? → P1
Is error rate 5-10%? → P2
Is response time 2-5s? → P2
Is a minor feature broken? → P2
Is impact minimal? → P3
```

### Phase 2: Investigation (5-30 minutes)

#### Gather System Information

```bash
# 1. Check all pod status
kubectl get pods -n noa-server -o wide

# Expected: All pods in Running state
# Look for: CrashLoopBackOff, Error, Pending

# 2. Check recent deployments
kubectl rollout history deployment/noa-mcp -n noa-server
kubectl rollout history deployment/noa-claude-flow -n noa-server

# Note: Deployment in last 2 hours?

# 3. Check system resources
kubectl top nodes
kubectl top pods -n noa-server

# Look for: CPU/memory exhaustion

# 4. Check database connectivity
kubectl exec -it noa-postgres-0 -n noa-server -- psql -U noa -d noa -c "SELECT 1;"

# Expected: (1 row)

# 5. Check Redis connectivity
kubectl exec -it noa-redis-0 -n noa-server -- redis-cli ping

# Expected: PONG
```

#### Analyze Error Logs

```bash
# 1. Check MCP service logs
kubectl logs -f -l app=noa-mcp -n noa-server --tail=200 | grep -E "(ERROR|FATAL|Exception)"

# Look for patterns:
# - Database connection errors
# - Timeout errors
# - AI provider API errors
# - Rate limit errors

# 2. Check Claude Flow logs
kubectl logs -f -l app=noa-claude-flow -n noa-server --tail=200 | grep ERROR

# 3. Check recent Prometheus alerts
curl http://prometheus.noaserver.com/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'

# 4. Check error rate trend
# Grafana: https://grafana.noaserver.com/d/errors
# Query: rate(http_requests_total{status=~"5.."}[5m])
```

#### Check Recent Changes

```bash
# 1. Recent deployments
kubectl rollout history deployment -n noa-server

# 2. Recent config changes
kubectl get events -n noa-server --sort-by='.lastTimestamp' | grep ConfigMap

# 3. Recent git commits
git log --oneline --since="2 hours ago"

# 4. Check CI/CD pipeline
# Jenkins/GitHub Actions: Review recent builds
```

#### Identify Impact Scope

```bash
# 1. Check request rate
# Prometheus query: sum(rate(http_requests_total[5m]))
# Compare to baseline (e.g., 1000 req/min)

# 2. Check affected endpoints
# Prometheus: rate(http_requests_total{status=~"5.."}[5m]) by (endpoint)

# 3. Check user-facing impact
# - Customer support tickets (Zendesk/Jira)
# - Social media mentions (@noaserver)
# - Status page reports (status.noaserver.com)

# 4. Estimate affected users
# Prometheus: count(count by (user_id) (http_requests_total{status=~"5.."}))
```

### Phase 3: Mitigation (30-60 minutes)

#### Immediate Actions by Issue Type

##### Database Connection Errors

```bash
# 1. Check database pod
kubectl get pods -n noa-server | grep postgres
kubectl logs noa-postgres-0 -n noa-server --tail=100

# 2. Check connection pool exhaustion
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# If >80 connections (pool limit):
# 3. Restart application pods to reset connections
kubectl rollout restart deployment/noa-mcp -n noa-server

# 4. If database pod down, restart it
kubectl delete pod noa-postgres-0 -n noa-server
# StatefulSet will recreate automatically

# 5. If persistent, failover to replica (see DATABASE_MAINTENANCE.md)
```

##### High Error Rate (>10%)

```bash
# 1. Identify error cause from logs
kubectl logs -l app=noa-mcp -n noa-server --tail=500 | grep ERROR | sort | uniq -c | sort -rn | head -10

# 2. If AI provider errors:
# Check provider status pages:
# - Anthropic: https://status.anthropic.com
# - OpenAI: https://status.openai.com

# Enable circuit breaker for failing provider
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl -X POST http://localhost:8001/api/v1/admin/circuit-breaker/claude/open

# 3. If recent deployment caused issue:
# Rollback immediately
kubectl rollout undo deployment/noa-mcp -n noa-server
kubectl rollout status deployment/noa-mcp -n noa-server

# 4. Monitor error rate after mitigation
# Expected: Error rate drops below 5% within 5 minutes
```

##### High Latency (p95 >2s)

```bash
# 1. Check if specific endpoint is slow
# Prometheus: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) by (endpoint)

# 2. Check database query performance
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 3. Check cache hit rate
# Prometheus: sum(rate(cache_hits_total[5m])) / sum(rate(cache_requests_total[5m]))
# Expected: >60%

# If low cache hit rate:
# Restart Redis to clear stale connections
kubectl rollout restart statefulset/noa-redis -n noa-server

# 4. Scale up pods if needed
kubectl scale deployment/noa-mcp --replicas=6 -n noa-server

# 5. Enable rate limiting to reduce load
kubectl apply -f k8s/overlays/prod/rate-limit-strict.yaml
```

##### Memory Leak or OOM Kills

```bash
# 1. Check pod memory usage
kubectl top pods -n noa-server --sort-by=memory

# 2. Check for OOMKilled pods
kubectl get pods -n noa-server -o json | jq '.items[] | select(.status.containerStatuses[]?.lastState.terminated.reason=="OOMKilled")'

# 3. Increase memory limits temporarily
kubectl patch deployment noa-mcp -n noa-server --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"}]'

# 4. Restart affected pods
kubectl delete pod -l app=noa-mcp -n noa-server

# 5. Schedule memory profiling investigation
# Create ticket for follow-up
```

##### AI Provider Failures

```bash
# 1. Check provider health
curl https://api.anthropic.com/v1/models
curl https://api.openai.com/v1/models

# 2. Enable failover to backup provider
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl -X POST http://localhost:8001/api/v1/admin/providers/failover \
  -H "Content-Type: application/json" \
  -d '{"primary":"claude","fallback":"openai"}'

# 3. Monitor failover effectiveness
# Prometheus: sum(rate(ai_requests_total[5m])) by (provider)
# Expected: Traffic shifts to fallback provider
```

### Phase 4: Communication

#### Internal Communication (Slack)

```
# Post in #incident-<timestamp> channel

[INITIAL ALERT - 14:35 UTC]
Severity: P0 / P1 / P2 / P3
Status: Investigating
Issue: High API error rate (45%) detected at 14:30 UTC
Impact: All users experiencing intermittent failures
Teams Notified: @oncall-engineers @engineering-manager
Next Update: 14:50 UTC

---

[UPDATE - 14:50 UTC]
Status: Identified
Root Cause: Database connection pool exhaustion due to long-running queries
Mitigation: Restarting application pods to reset connection pool
Expected Recovery: 15:00 UTC
Next Update: 15:05 UTC

---

[RESOLVED - 15:05 UTC]
Status: Resolved
Fix Applied: Restarted application pods, connection pool healthy
Verification: Error rate dropped to 0.5%, response time normal
Follow-up: Post-mortem scheduled for tomorrow 10am
```

#### External Communication (Status Page)

```
# For P0/P1 incidents, update https://status.noaserver.com

[INVESTIGATING - 14:35 UTC]
We are investigating reports of elevated error rates affecting the API.

[IDENTIFIED - 14:50 UTC]
We have identified the issue as database connection pool exhaustion
and are working on a resolution. Users may experience intermittent
failures when making API requests.

[MONITORING - 15:00 UTC]
A fix has been deployed and we are monitoring the results.

[RESOLVED - 15:05 UTC]
The issue has been resolved. All systems are operating normally.
We apologize for any inconvenience.
```

#### Customer Communication

```
# For P0 incidents, email to affected customers

Subject: Service Disruption Notification - [Date]

Dear NOA Server Customer,

We experienced a service disruption today from 14:30 to 15:05 UTC
affecting API availability. During this time, you may have experienced
elevated error rates when making API requests.

What happened:
A database connection pool exhaustion caused intermittent API failures.

What we did:
We restarted our application services to reset the connection pool and
implemented additional monitoring to prevent recurrence.

Impact:
Approximately 45% of API requests failed during the 35-minute incident window.

Next steps:
We are conducting a thorough investigation and will implement preventive
measures to avoid similar issues in the future.

We sincerely apologize for the disruption and appreciate your patience.

Best regards,
NOA Server Engineering Team
```

### Phase 5: Resolution (1-4 hours)

#### Root Cause Analysis

```bash
# 1. Deep dive into logs
# Export logs for detailed analysis
kubectl logs -l app=noa-mcp -n noa-server --since=2h > /tmp/incident-logs.txt

# Analyze patterns
grep ERROR /tmp/incident-logs.txt | cut -d' ' -f5- | sort | uniq -c | sort -rn

# 2. Database query analysis
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT query, calls, total_exec_time, mean_exec_time FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 20;"

# 3. Review recent changes
git log --oneline --since="4 hours ago" --until="30 minutes ago"

# 4. Check system metrics around incident time
# Grafana: https://grafana.noaserver.com
# Time range: 2 hours before to 1 hour after incident
# Metrics: CPU, memory, disk I/O, network, error rates

# 5. Correlate events
# Timeline:
# 14:15 - Deployment of new feature X
# 14:25 - Gradual increase in database connections
# 14:30 - Connection pool exhausted, errors spike
# 14:50 - Pods restarted, connections reset
# 15:05 - System fully recovered
```

#### Implement Permanent Fix

```bash
# Example: Fix slow database query causing connection exhaustion

# 1. Identify slow query
# Found: SELECT * FROM requests WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'
# Issue: Missing index on (status, created_at)

# 2. Create database migration
cat > packages/database-optimizer/migrations/20241023_add_requests_status_created_index.sql <<EOF
-- Add index to improve query performance
CREATE INDEX CONCURRENTLY idx_requests_status_created
ON requests (status, created_at)
WHERE status = 'pending';
EOF

# 3. Test migration in staging
kubectl exec -it noa-postgres-0 -n noa-server-staging -- \
  psql -U noa -d noa < /migrations/20241023_add_requests_status_created_index.sql

# Verify performance improvement
# EXPLAIN ANALYZE query - check execution time

# 4. Deploy to production during next maintenance window
# Schedule for low-traffic time (2am-4am UTC)
```

#### Deploy Fix

```bash
# 1. Create PR with fix
git checkout -b fix/slow-query-incident-20241023
git add packages/database-optimizer/migrations/
git commit -m "fix: add index to prevent connection pool exhaustion"
git push origin fix/slow-query-incident-20241023

# 2. Get expedited code review
# Tag reviewers in PR: @oncall-engineers
# Request fast-track review due to production incident

# 3. Merge and deploy
# Use canary deployment for safety
kubectl apply -k k8s/overlays/prod-canary/

# 4. Monitor canary for 30 minutes
# Verify no regression in error rates or latency

# 5. Promote canary to production
kubectl apply -k k8s/overlays/prod/
```

### Phase 6: Post-Incident Review (24-48 hours)

#### Schedule Post-Mortem

```
# Send calendar invite within 24 hours of resolution

Meeting: Post-Mortem - API Outage [Date]
When: [Next business day] 10:00am
Duration: 1 hour
Attendees:
  - Incident Commander
  - Engineering Manager
  - All responders
  - Product Manager
  - Customer Success lead

Agenda:
1. Timeline review (10 min)
2. Root cause analysis (15 min)
3. What went well (10 min)
4. What could be improved (15 min)
5. Action items (10 min)
```

#### Post-Mortem Template

````markdown
# Post-Mortem: API High Error Rate Incident

**Date**: 2024-10-23 **Severity**: P1 **Duration**: 35 minutes (14:30 - 15:05
UTC) **Impact**: 45% of API requests failed **Incident Commander**: Jane Doe

## Summary

On October 23, 2024, NOA Server API experienced elevated error rates (45%) for
35 minutes due to database connection pool exhaustion caused by inefficient
database queries introduced in a recent deployment.

## Timeline (UTC)

- 14:15 - Deployment of feature X to production
- 14:25 - Database connection pool utilization starts increasing
- 14:30 - Connection pool exhausted, error rate spikes to 45%
- 14:30 - Alert fired: "API Error Rate >10%"
- 14:32 - On-call engineer acknowledged alert
- 14:35 - Incident declared (P1), #incident-20241023-1430 created
- 14:40 - Root cause identified: database connection exhaustion
- 14:45 - Decision made to restart application pods
- 14:50 - Application pods restarted
- 14:55 - Connection pool recovered, error rate dropped to 2%
- 15:00 - Error rate stabilized at <1%
- 15:05 - Incident resolved

## Root Cause

A new feature deployed at 14:15 introduced an inefficient database query:

```sql
SELECT * FROM requests WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'
```
````

This query lacked an index on (status, created_at), causing full table scans. As
request volume increased, queries took 5-10 seconds each, exhausting the
database connection pool (max 100 connections).

## Impact

- **Users Affected**: All API users
- **Requests Failed**: Approximately 15,750 requests over 35 minutes
- **Revenue Impact**: Estimated $X in lost usage
- **Customer Complaints**: 23 support tickets filed

## What Went Well

1. Alert fired quickly (immediate detection)
2. On-call engineer responded within 2 minutes
3. Root cause identified within 15 minutes
4. Effective communication to stakeholders
5. Quick mitigation via pod restart
6. No data loss occurred

## What Could Be Improved

1. Database query performance not caught in staging
2. No connection pool monitoring alerts
3. Deployment process didn't include database query analysis
4. Rollback took longer than expected (need automation)
5. Customer communication was delayed

## Action Items

| Action                                 | Owner   | Due Date   | Status      |
| -------------------------------------- | ------- | ---------- | ----------- |
| Add index to requests table            | Jane    | 2024-10-24 | Done        |
| Implement connection pool alerts       | Bob     | 2024-10-25 | In Progress |
| Add query performance tests to CI/CD   | Alice   | 2024-10-30 | Planned     |
| Automate rollback for high error rates | Charlie | 2024-11-05 | Planned     |
| Improve status page auto-updates       | Dave    | 2024-11-10 | Planned     |
| Update deployment runbook              | Eve     | 2024-10-26 | In Progress |

## Lessons Learned

1. Always profile database queries before deploying to production
2. Monitor connection pool utilization, not just database health
3. Implement automated rollback for error rate >10%
4. Improve load testing to catch performance regressions
5. Enhance observability for database query performance

````

#### Share Learnings

```bash
# 1. Post summary in engineering channel
# Slack: #engineering

[POST-MORTEM SUMMARY]
Incident: API High Error Rate - Oct 23
Root Cause: Unindexed database query
Duration: 35 minutes
Action Items: 6 items assigned

Key Learnings:
- Always profile queries before production
- Monitor connection pool utilization
- Implement automated rollbacks

Full report: https://docs.noaserver.com/postmortems/2024-10-23-api-error-rate

---

# 2. Update runbooks
# Add new procedures learned from incident
vim docs/runbooks/TROUBLESHOOTING_DATABASE.md

# 3. Implement preventive measures
# Create tickets for all action items
# Assign owners and due dates
````

## Incident Response Tools

### Required Access

- **PagerDuty**: On-call scheduling and alerts
- **Grafana**: https://grafana.noaserver.com
- **Prometheus**: https://prometheus.noaserver.com
- **Kibana**: https://kibana.noaserver.com
- **Kubectl**: Kubernetes cluster access
- **Database Admin**: PostgreSQL access
- **Status Page**: https://status.noaserver.com/admin

### Monitoring Dashboards

```
Grafana Dashboards:
- Overview: https://grafana.noaserver.com/d/overview
- Errors: https://grafana.noaserver.com/d/errors
- Latency: https://grafana.noaserver.com/d/latency
- Database: https://grafana.noaserver.com/d/database
- Redis: https://grafana.noaserver.com/d/redis
- Deployment: https://grafana.noaserver.com/d/deployment
```

### Communication Channels

```
Slack:
- #incidents - All incidents
- #incident-<timestamp> - Specific incident
- #oncall - On-call coordination
- #engineering - Engineering team

Email:
- incidents@noaserver.com - Incident reports
- oncall@noaserver.com - On-call coordination

Status Page:
- https://status.noaserver.com
```

## Quick Reference Commands

```bash
# Check system health
kubectl get pods -n noa-server
kubectl get nodes

# Check recent alerts
curl http://prometheus.noaserver.com/api/v1/alerts | jq

# Check error rate
# Prometheus: rate(http_requests_total{status=~"5.."}[5m])

# Rollback deployment
kubectl rollout undo deployment/noa-mcp -n noa-server

# Restart service
kubectl rollout restart deployment/noa-mcp -n noa-server

# Scale up pods
kubectl scale deployment/noa-mcp --replicas=6 -n noa-server

# View logs
kubectl logs -f -l app=noa-mcp -n noa-server --tail=100

# Database connection count
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

## Related Documentation

- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)
- [Troubleshooting Guides](./TROUBLESHOOTING_*.md)
- [Monitoring Guide](../infrastructure/MONITORING_GUIDE.md)
- [On-Call Guide](./ONCALL_GUIDE.md)

## Emergency Contacts

- On-call Primary: PagerDuty
- On-call Backup: PagerDuty
- Engineering Manager: engineering-manager@noaserver.com
- CTO: cto@noaserver.com
- DevOps Team: #devops on Slack
