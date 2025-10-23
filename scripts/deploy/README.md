# Deployment Scripts

Comprehensive deployment automation for NOA Server with safety checks, rollback capabilities, and monitoring integration.

## Quick Start

```bash
# Deploy to staging
./deploy-staging.sh

# Deploy to production (requires approval)
./deploy-production.sh

# Deploy with specific strategy
./deploy.sh production blue-green
./deploy.sh production canary
```

## Available Scripts

### Main Scripts

- **deploy.sh** - Main deployment orchestrator
- **deploy-staging.sh** - Quick staging deployment
- **deploy-production.sh** - Production deployment with safety checks
- **pre-deploy-checks.sh** - Pre-deployment validation
- **health-check.sh** - Health validation
- **rollback.sh** - Rollback to previous version
- **migrate-db.sh** - Database migration with backup
- **deploy-blue-green.sh** - Blue-green deployment
- **deploy-canary.sh** - Canary deployment
- **backup-before-deploy.sh** - Pre-deployment backup
- **monitor-deployment.sh** - Deployment monitoring

### Utility Scripts

- **utils/colors.sh** - Terminal color definitions
- **utils/logging.sh** - Logging utilities
- **utils/notifications.sh** - Multi-channel notifications (Slack, Email, Discord)

## Deployment Strategies

### Standard Deployment

Simple deployment with brief downtime.

```bash
./deploy.sh staging standard
```

### Blue-Green Deployment

Zero-downtime deployment using parallel environments.

```bash
./deploy.sh production blue-green
```

**Features:**
- Zero downtime
- Instant rollback
- Traffic monitoring
- Old environment retention (1 hour)

### Canary Deployment

Gradual rollout with automatic rollback.

```bash
./deploy.sh production canary
```

**Traffic phases:**
- 10% → 25% → 50% → 100%
- 5 minutes per phase
- Automatic rollback on anomalies

## Configuration

### Environment Variables

Create environment files:

```bash
cp .env.staging.example ../../.env.staging
cp .env.production.example ../../.env.production
```

Edit with your configuration:
- Database URLs
- Redis URLs
- API keys
- Notification webhooks

### Deployment Configuration

Edit `configs/deploy-config.json` for:
- Approval requirements
- Error thresholds
- Health check retries
- Notification settings
- Backup retention

## Pre-Deployment Checks

Automatic checks before deployment:

- ✓ Git repository status
- ✓ Dependencies installed
- ✓ Environment variables set
- ✓ Database connectivity
- ✓ Redis connectivity
- ✓ AI provider availability
- ✓ Disk space (>10GB)
- ✓ Memory (>2GB)
- ✓ Security audit

## Health Checks

Post-deployment validation:

- ✓ API health endpoint
- ✓ Response time (<1s)
- ✓ Database connection
- ✓ Redis connection
- ✓ AI providers
- ✓ System resources
- ✓ Process status

## Rollback

### Automatic Rollback

Triggered on:
- Health check failures
- High error rate (>5%)
- Migration failures
- Validation failures

### Manual Rollback

```bash
# Interactive (select from list)
./rollback.sh production

# Automatic (most recent backup)
./rollback.sh production auto
```

## Monitoring

### During Deployment

```bash
# View deployment logs
tail -f logs/deploy-*.log

# Monitor health
./monitor-deployment.sh production 300
```

### After Deployment

```bash
# Run health checks
./health-check.sh production

# View deployment history
ls -lt backups/
```

## Notifications

Configure notification channels in environment files:

**Slack:**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Email:**
```bash
NOTIFICATION_EMAIL=devops@example.com
```

**Discord:**
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Notifications sent on:
- Deployment start
- Deployment success
- Deployment failure
- Rollback events

## Directory Structure

```
deploy/
├── deploy.sh                    # Main deployment script
├── deploy-staging.sh            # Staging deployment
├── deploy-production.sh         # Production deployment
├── pre-deploy-checks.sh         # Pre-deployment checks
├── health-check.sh              # Health validation
├── rollback.sh                  # Rollback script
├── migrate-db.sh                # Database migrations
├── deploy-blue-green.sh         # Blue-green deployment
├── deploy-canary.sh             # Canary deployment
├── backup-before-deploy.sh      # Backup script
├── monitor-deployment.sh        # Monitoring script
├── utils/
│   ├── colors.sh                # Color definitions
│   ├── logging.sh               # Logging utilities
│   └── notifications.sh         # Notification utilities
├── configs/
│   └── deploy-config.json       # Deployment configuration
├── logs/                        # Deployment logs
├── backups/                     # Deployment backups
├── .env.staging.example         # Staging env template
├── .env.production.example      # Production env template
└── README.md                    # This file
```

## Troubleshooting

### Deployment Fails

Check logs:
```bash
tail -f logs/deploy-*.log
```

Review pre-checks:
```bash
./pre-deploy-checks.sh staging
```

### Health Checks Fail

Run health checks manually:
```bash
./health-check.sh production
```

Check application logs:
```bash
pm2 logs noa-server
# or
journalctl -u noa-server -f
```

### Rollback Needed

Immediate rollback:
```bash
./rollback.sh production auto
```

## Best Practices

1. **Always test in staging first**
2. **Use blue-green for production**
3. **Enable notifications**
4. **Review logs after deployment**
5. **Monitor for 24 hours post-deployment**
6. **Keep backups for 30 days**
7. **Document deployment issues**

## Emergency Procedures

### Critical Production Issue

```bash
# 1. Immediate rollback
./rollback.sh production auto

# 2. Verify rollback
./health-check.sh production

# 3. Investigate issue
tail -f logs/rollback-*.log
```

### Database Issue

```bash
# 1. Stop application
sudo systemctl stop noa-server

# 2. Restore database
cd backups/db-pre-migration-*/
gunzip -c dump.sql.gz | psql $DATABASE_URL

# 3. Restart application
sudo systemctl start noa-server
```

## Documentation

Full documentation: `/docs/deployment-guide.md`

## Support

For issues or questions:
- Review logs in `/scripts/deploy/logs/`
- Check backups in `/scripts/deploy/backups/`
- Consult `/docs/deployment-guide.md`
