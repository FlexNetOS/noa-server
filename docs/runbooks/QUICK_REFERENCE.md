# Quick Reference Card

## Emergency Contacts

```
Primary On-Call: PagerDuty (auto-page)
Backup On-Call: PagerDuty (15min escalation)
Engineering Manager: engineering-manager@noaserver.com
CTO (P0 only): cto@noaserver.com
DevOps Team: #devops on Slack
Incident Hotline: #incidents on Slack
```

## Critical URLs

```
Production Dashboards:
- Operational: https://grafana.noaserver.com/d/operational
- Errors: https://grafana.noaserver.com/d/errors
- Latency: https://grafana.noaserver.com/d/latency

Monitoring:
- Prometheus: https://prometheus.noaserver.com
- AlertManager: https://alertmanager.noaserver.com
- Kibana: https://kibana.noaserver.com

Status & Support:
- Status Page: https://status.noaserver.com
- Admin Panel: https://admin.noaserver.com
```

## Common Commands

### Health Checks

```bash
# Check all pods
kubectl get pods -n noa-server

# Check service health
curl https://api.noaserver.com/health
curl https://api.noaserver.com/api/v1/providers

# Check database
kubectl exec -it noa-postgres-0 -n noa-server -- psql -U noa -d noa -c "SELECT 1;"

# Check Redis
kubectl exec -it noa-redis-0 -n noa-server -- redis-cli ping
```

### Logs

```bash
# Stream logs from MCP service
kubectl logs -f -l app=noa-mcp -n noa-server --tail=100

# Search for errors
kubectl logs -l app=noa-mcp -n noa-server --since=1h | grep ERROR

# Logs from crashed pod
kubectl logs noa-mcp-abc123 -n noa-server --previous
```

### Scaling

```bash
# Scale up MCP service
kubectl scale deployment noa-mcp --replicas=6 -n noa-server

# Check HPA status
kubectl get hpa -n noa-server

# Check resource usage
kubectl top pods -n noa-server
```

### Deployment

```bash
# Rollback deployment
kubectl rollout undo deployment/noa-mcp -n noa-server

# Check rollout status
kubectl rollout status deployment/noa-mcp -n noa-server

# Restart deployment
kubectl rollout restart deployment/noa-mcp -n noa-server
```

### Database

```bash
# Connection count
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Kill long query
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT pg_terminate_backend(<pid>);"

# Vacuum database
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "VACUUM ANALYZE;"
```

## Incident Severity

```
P0 (Critical): Complete outage, data loss
- Response: Immediate (5 min)
- Page: Primary + Backup + Manager
- Update: Every 15 min

P1 (High): Major degradation
- Response: 15 min
- Page: Primary
- Update: Every 30 min

P2 (Medium): Minor issues
- Response: 1 hour
- Notify: Slack
- Update: Every 2 hours

P3 (Low): Cosmetic issues
- Response: 24 hours
- Notify: Email
- Update: Daily
```

## Alert Quick Actions

```
HighErrorRate (>10%):
1. Check recent deployments
2. Rollback if deployed <30min ago
3. Check AI provider status
4. Check database connectivity

HighLatency (p95 >2s):
1. Check database query performance
2. Check cache hit rate
3. Scale up if CPU >70%

DatabaseConnectionPoolExhausted:
1. Check active connections
2. Kill long-running queries
3. Restart application pods

ProviderFailure:
1. Check provider status page
2. Enable failover to backup provider
3. Update status page

DiskSpaceLow (<15%):
1. Clear old logs
2. Vacuum database
3. Expand PVC if needed
```

## Prometheus Queries

```
# Error rate
(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Requests per second
sum(rate(http_requests_total[5m]))

# Database connections
pg_stat_database_numbackends{datname="noa"}

# Cache hit rate
sum(rate(cache_hits_total[5m])) / sum(rate(cache_requests_total[5m]))
```

## Backup & Restore

```bash
# Create backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n noa-server

# List backups
aws s3 ls s3://noa-backups/postgres/ --recursive | tail -20

# Restore from backup
# 1. Stop application
kubectl scale deployment --all --replicas=0 -n noa-server

# 2. Download backup
aws s3 cp s3://noa-backups/postgres/latest.dump ./restore.dump

# 3. Restore
kubectl cp ./restore.dump noa-server/noa-postgres-0:/tmp/restore.dump
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_restore -U noa -d noa -v /tmp/restore.dump

# 4. Restart application
kubectl scale deployment noa-mcp --replicas=3 -n noa-server
```

## Performance Thresholds

```
Metric               Warning  Critical  Action
Error Rate           >2%      >5%       Investigate/Rollback
Response Time p95    >1s      >2s       Scale/Optimize
Database Connections >70      >90       Restart/Investigate
Cache Hit Rate       <60%     <40%      Restart Redis
CPU Usage            >70%     >90%      Scale Up
Memory Usage         >80%     >95%      Scale Up/Investigate
Queue Depth          >500     >1000     Scale Workers
```

## Rollback Procedures

```bash
# Blue-Green Rollback (2 min)
kubectl patch ingress noa-server-ingress -n noa-server \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "noa-mcp"}]'

# Canary Rollback (1 min)
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary-weight="0" --overwrite
kubectl delete deployment noa-mcp-canary -n noa-server

# Rolling Update Rollback (2-5 min)
kubectl rollout undo deployment/noa-mcp -n noa-server
```

## Circuit Breaker Control

```bash
# Open circuit breaker (stop sending requests to provider)
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl -X POST http://localhost:8001/api/v1/admin/circuit-breaker/claude/open

# Close circuit breaker (resume normal operation)
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl -X POST http://localhost:8001/api/v1/admin/circuit-breaker/claude/close

# Check circuit breaker status
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl http://localhost:8001/api/v1/admin/circuit-breaker/status
```

## Maintenance Windows

```
Scheduled Maintenance: Sunday 2am-4am UTC
Low Traffic: 2am-8am UTC
Peak Traffic: 12pm-8pm UTC
High Traffic: 8am-12pm, 8pm-2am UTC
```

## Runbook Quick Links

```
Deployment: /docs/runbooks/DEPLOYMENT_RUNBOOK.md
Incidents: /docs/runbooks/INCIDENT_RESPONSE.md
Scaling: /docs/runbooks/SCALING_RUNBOOK.md
Backups: /docs/runbooks/BACKUP_RESTORE.md
Monitoring: /docs/runbooks/MONITORING_RUNBOOK.md
Troubleshooting API: /docs/runbooks/TROUBLESHOOTING_API.md
Troubleshooting DB: /docs/runbooks/TROUBLESHOOTING_DATABASE.md
Emergency: /docs/runbooks/EMERGENCY_PROCEDURES.md
```

## Incident Response Workflow

```
1. DETECT
   - Alert fires or user report
   - Acknowledge within 5 min

2. ASSESS
   - Determine severity (P0-P3)
   - Create incident channel
   - Notify stakeholders

3. INVESTIGATE
   - Check monitoring dashboards
   - Analyze error logs
   - Review recent changes

4. MITIGATE
   - Quick fix (rollback, restart, scale)
   - Verify recovery
   - Update status page

5. RESOLVE
   - Root cause analysis
   - Permanent fix
   - Validate solution

6. REVIEW
   - Schedule post-mortem (24-48h)
   - Document learnings
   - Create action items
```

## Common Error Patterns

```
"ECONNREFUSED 5432" → Database down, check postgres pod
"ETIMEDOUT" → Network timeout, check external services
"Too many connections" → Connection pool exhausted, restart pods
"429 Too Many Requests" → Rate limit hit, check rate limits
"502 Bad Gateway" → Upstream unavailable, check dependencies
"Out of memory" → Memory limit exceeded, increase limits
"Circuit breaker open" → Provider failures, check status
"Deadlock detected" → Database deadlock, investigate queries
```

## Status Page Updates

```
INVESTIGATING:
We are investigating reports of [issue description].

IDENTIFIED:
We have identified the issue affecting [service] and are working on a resolution.

MONITORING:
A fix has been deployed and we are monitoring the results.

RESOLVED:
The issue has been resolved. All systems operating normally.
```

## Kubernetes Contexts

```bash
# Switch to production context
kubectl config use-context noa-production

# Switch to staging context
kubectl config use-context noa-staging

# Current context
kubectl config current-context
```

## Key Metrics to Monitor

```
1. Request Rate: 500-2000 req/min (normal range)
2. Error Rate: <1% (warning at 2%, critical at 5%)
3. Response Time p95: <1s (warning at 1s, critical at 2s)
4. Database Connections: <80/100 (warning at 70, critical at 90)
5. Cache Hit Rate: >60% (warning at 60%, critical at 40%)
6. CPU Usage: <70% (warning at 70%, critical at 90%)
7. Memory Usage: <80% (warning at 80%, critical at 95%)
```

## Print This Card

```
Print this quick reference card and keep it handy during on-call shifts.
Review it before your on-call rotation begins.
Update it when you discover new useful commands or procedures.
```

---

**Last Updated**: 2024-10-23 **Version**: 1.0.0 **Maintained By**: SRE Team
