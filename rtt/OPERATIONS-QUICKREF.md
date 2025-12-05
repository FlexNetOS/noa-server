# RTT v1.0.0 Operations - Quick Reference Card

## Health Check
```bash
./scripts/health-check.sh
```

## Deployment
```bash
./scripts/deploy.sh manual       # Development
./scripts/deploy.sh systemd      # Production server
./scripts/deploy.sh docker       # Containers
./scripts/deploy.sh kubernetes   # K8s cluster
./scripts/deploy.sh vercel       # Serverless
```

## View Logs
```bash
# Latest logs
tail -f .rtt/logs/*.log

# JSON logs with filtering
cat .rtt/logs/*.json.log | jq 'select(.level == "ERROR")'

# Last 50 log entries
tail -50 .rtt/logs/*.log

# Find errors
grep ERROR .rtt/logs/*.log
```

## View Metrics
```bash
# All metrics
cat .rtt/metrics/*.json | jq

# Just counters
cat .rtt/metrics/*.json | jq '.counters'

# Timing stats
cat .rtt/metrics/*.json | jq '.timings'

# Latest metrics
ls -t .rtt/metrics/*.json | head -1 | xargs cat | jq
```

## Common Operations
```bash
# Full system check
./scripts/health-check.sh && echo "System healthy"

# View recent activity
tail -20 .rtt/logs/*.log

# Check disk usage
du -sh .rtt/*

# Count generated connectors
find .rtt/drivers/generated -name "*.py" | wc -l

# Verify WAL chain
ls -lh .rtt/wal/*.wal.json
```

## Troubleshooting
```bash
# Check for errors in logs
grep -r ERROR .rtt/logs/

# View exception traces
cat .rtt/logs/*.json.log | jq 'select(.exception)'

# Check recent failures
cat .rtt/metrics/*.json | jq '.counters | with_entries(select(.key | contains("error")))'

# Rebuild from bootstrap
python3 auto/00-bootstrap.py
```

## Monitoring Integration
```bash
# Export metrics for monitoring
cat .rtt/metrics/*.json | jq -r '.counters | to_entries[] | "\(.key):\(.value)"'

# Count operations
cat .rtt/metrics/*.json | jq '.counters | add'

# Check log size
du -sh .rtt/logs
```

## Key Directories
- `.rtt/logs/` - Log files (JSON + text)
- `.rtt/metrics/` - Metrics snapshots
- `.rtt/wal/` - Write-ahead log
- `.rtt/manifests/` - Symbol manifests
- `.rtt/drivers/generated/` - Generated connectors
- `.rtt/cache/` - Content-addressed storage

## Log Files
- `rtt.bootstrap.log` - Bootstrap operations
- `rtt.scanner.log` - Symbol scanning
- `rtt.connector.log` - Connector generation
- `*.json.log` - Structured JSON logs

## Exit Codes
- `0` - Success
- `1` - Error/failure
- Health check returns 1 if any check fails

## Performance
- Health check: ~2-3 seconds
- Bootstrap: ~0.5 seconds
- Connector gen: ~1-2 seconds per connector
- Logging overhead: <1ms per entry
- Metrics overhead: <0.3ms per metric

## Documentation
- Full guide: `docs/OPERATIONS.md`
- Implementation: `OPERATIONS-IMPLEMENTATION-REPORT.md`
- Summary: `OPERATIONS-SUMMARY.md`

---
RTT v1.0.0 | Production Operations
