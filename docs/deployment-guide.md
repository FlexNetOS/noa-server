# NOA Server Deployment Guide

## Overview

This guide covers the complete deployment process for NOA Server across different environments using automated deployment scripts with safety checks, rollback capabilities, and monitoring integration.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Strategies](#deployment-strategies)
3. [Environment Setup](#environment-setup)
4. [Deployment Scripts](#deployment-scripts)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Emergency Response](#emergency-response)

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.11.0
- PostgreSQL (for database)
- Redis (for caching)
- nginx (for load balancing)

### Basic Deployment

```bash
# Deploy to staging
cd /home/deflex/noa-server/scripts/deploy
./deploy-staging.sh

# Deploy to production (requires approval)
./deploy-production.sh
```

## Deployment Strategies

### 1. Standard Deployment

Simple deployment with brief downtime.

```bash
./deploy.sh staging standard
```

**Use cases:**
- Development environments
- Staging deployments
- Low-traffic periods

**Features:**
- Quick deployment
- Minimal complexity
- Automatic rollback on failure

### 2. Blue-Green Deployment

Zero-downtime deployment using two parallel environments.

```bash
./deploy.sh production blue-green
```

**Use cases:**
- Production deployments
- High-availability requirements
- Large applications

**Features:**
- Zero downtime
- Instant rollback capability
- Traffic monitoring
- Gradual environment switching

**How it works:**
1. Deploy to inactive environment (blue/green)
2. Run health checks on new environment
3. Warm up caches (60s)
4. Switch traffic to new environment
5. Monitor for errors (5 minutes)
6. Automatic rollback if error rate >5%
7. Keep old environment running for 1 hour

### 3. Canary Deployment

Gradual rollout with automatic rollback on anomaly detection.

```bash
./deploy.sh production canary
```

**Use cases:**
- High-risk deployments
- Major version changes
- Production with strict SLAs

**Features:**
- Gradual traffic increase (10% → 25% → 50% → 100%)
- Real-time anomaly detection
- Automatic rollback on high error rates
- Minimal blast radius

**Traffic phases:**
1. **10% canary** - Initial testing (5 minutes)
2. **25% canary** - Expanded testing (5 minutes)
3. **50% canary** - Half traffic (5 minutes)
4. **100% canary** - Full rollout (5 minutes)

**Rollback triggers:**
- Error rate >5%
- Canary error rate >3% higher than stable
- Health check failures

## Environment Setup

### 1. Configure Environment Variables

Copy and customize environment files:

```bash
cd /home/deflex/noa-server

# Staging
cp scripts/deploy/.env.staging.example .env.staging
nano .env.staging

# Production
cp scripts/deploy/.env.production.example .env.production
nano .env.production
```

**Required variables:**
- `NODE_ENV` - Environment name
- `API_PORT` - Application port
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key (optional)

**Notification variables (optional):**
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications
- `NOTIFICATION_EMAIL` - Email for critical alerts
- `DISCORD_WEBHOOK_URL` - Discord webhook

### 2. Configure Deployment Settings

Edit deployment configuration:

```bash
nano scripts/deploy/configs/deploy-config.json
```

**Key settings:**
- `requireApproval` - Require manual approval (production)
- `runTests` - Run tests before deployment
- `createBackup` - Create pre-deployment backup
- `errorThreshold` - Maximum acceptable error rate (%)
- `healthCheckRetries` - Health check retry attempts

### 3. Setup Load Balancer (nginx)

For blue-green and canary deployments:

```bash
sudo nano /etc/nginx/sites-available/noa-server
```

**Example configuration:**

```nginx
upstream noa_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://noa_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://noa_backend/health;
        access_log off;
    }
}
```

Enable and restart nginx:

```bash
sudo ln -s /etc/nginx/sites-available/noa-server /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Deployment Scripts

### Main Deployment Script

`deploy.sh` - Comprehensive deployment with all safety checks

```bash
./deploy.sh <environment> <strategy>

# Examples:
./deploy.sh staging standard
./deploy.sh production blue-green
./deploy.sh production canary
```

**Environment variables:**
- `DRY_RUN=true` - Test deployment without making changes
- `SKIP_TESTS=true` - Skip test execution (not recommended)
- `SKIP_BACKUP=true` - Skip pre-deployment backup (not recommended)
- `AUTO_APPROVE=true` - Skip approval prompt (use with caution)

### Pre-Deployment Checks

`pre-deploy-checks.sh` - Validate environment before deployment

```bash
./pre-deploy-checks.sh staging
```

**Checks performed:**
- Git repository status
- Dependencies installed
- Environment variables set
- Database connectivity
- Redis connectivity
- AI provider availability
- Disk space (>10GB required)
- Memory availability (>2GB required)
- Security audit (no high/critical vulnerabilities)

### Health Checks

`health-check.sh` - Comprehensive health validation

```bash
./health-check.sh production
```

**Checks performed:**
- API endpoint health (with retries)
- Response time validation (<1s)
- Database connectivity
- Redis connectivity
- AI provider availability
- System resources (CPU, memory, disk)
- Application process status

### Database Migrations

`migrate-db.sh` - Run database migrations with backup/rollback

```bash
./migrate-db.sh production
```

**Supported ORMs:**
- Prisma
- TypeORM
- Sequelize
- Knex

**Features:**
- Automatic backup before migration
- Migration validation
- Automatic rollback on failure
- Compressed backups

### Rollback

`rollback.sh` - Rollback to previous deployment

```bash
# Interactive mode (select from list)
./rollback.sh production

# Automatic mode (rollback to most recent)
./rollback.sh production auto
```

**Rollback includes:**
- Database restoration
- Application files restoration
- Configuration restoration
- Service restart
- Health validation

## Rollback Procedures

### Automatic Rollback

Automatic rollback is triggered when:
- Health checks fail after deployment
- Error rate exceeds threshold (5%)
- Database migration fails
- Deployment validation fails

### Manual Rollback

#### Step 1: List Available Backups

```bash
./rollback.sh production
```

This displays the last 10 backups with:
- Backup ID
- Date/time
- Size

#### Step 2: Select Backup

Enter the backup number when prompted.

#### Step 3: Confirm Rollback

Review backup details and confirm rollback.

#### Step 4: Validation

After rollback, health checks are automatically run to validate the restored deployment.

### Emergency Rollback

For critical situations:

```bash
# Immediate rollback to most recent backup
./rollback.sh production auto

# Or manually switch traffic in nginx
sudo nano /etc/nginx/sites-available/noa-server
# Change proxy_pass port
sudo systemctl reload nginx
```

## Monitoring

### Real-time Monitoring

During deployment:

```bash
# Monitor deployment progress
tail -f scripts/deploy/logs/deploy-*.log

# Monitor application logs
pm2 logs noa-server

# Monitor system resources
htop
```

### Post-Deployment Monitoring

```bash
# Run health checks
./health-check.sh production

# Monitor for 5 minutes
./monitor-deployment.sh production 300

# Check error rates
curl http://localhost:3000/health
```

### Metrics to Watch

**Application metrics:**
- Response time (<1s)
- Error rate (<1%)
- Request throughput
- Active connections

**System metrics:**
- CPU usage (<80%)
- Memory usage (<80%)
- Disk usage (<90%)
- Network I/O

**Database metrics:**
- Connection pool usage
- Query performance
- Replication lag (if applicable)

## Troubleshooting

### Deployment Fails at Pre-Checks

**Issue:** Pre-deployment checks fail

**Solutions:**
1. Check environment variables in `.env.<environment>`
2. Verify database connectivity
3. Ensure sufficient disk space (>10GB)
4. Review security audit results
5. Check git repository status

### Deployment Fails During Build

**Issue:** Build or test failures

**Solutions:**
1. Review build logs in `scripts/deploy/logs/`
2. Verify dependencies are up-to-date
3. Check TypeScript compilation errors
4. Review failing tests
5. Ensure Node.js version is compatible (>=20.0.0)

### Health Checks Fail After Deployment

**Issue:** Health checks fail, triggering rollback

**Solutions:**
1. Check application logs for errors
2. Verify database migrations completed
3. Check Redis connectivity
4. Review environment variables
5. Verify port configuration

### High Error Rate During Canary

**Issue:** Canary deployment reports high error rates

**Solutions:**
1. Review application logs for errors
2. Check database query performance
3. Verify API dependencies are available
4. Review configuration changes
5. Consider rolling back manually

### Database Migration Fails

**Issue:** Database migration errors

**Solutions:**
1. Review migration logs in `scripts/deploy/logs/`
2. Check database permissions
3. Verify migration files are valid
4. Review database schema conflicts
5. Restore from backup if needed:
   ```bash
   cd scripts/deploy/backups/db-pre-migration-*
   gunzip -c dump.sql.gz | psql $DATABASE_URL
   ```

### Load Balancer Configuration Issues

**Issue:** nginx configuration errors

**Solutions:**
1. Test configuration:
   ```bash
   sudo nginx -t
   ```
2. Review nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```
3. Verify port configuration
4. Check upstream server health
5. Restore backup configuration:
   ```bash
   sudo mv /etc/nginx/sites-available/noa-server.backup /etc/nginx/sites-available/noa-server
   sudo systemctl reload nginx
   ```

## Emergency Response

### Critical Production Issue

**Immediate actions:**

1. **Alert team** - Notify all stakeholders
2. **Assess impact** - Check error rates and affected users
3. **Quick decision** - Rollback or fix forward?

#### Option 1: Rollback (Recommended for Unknown Issues)

```bash
# Immediate rollback
cd /home/deflex/noa-server/scripts/deploy
./rollback.sh production auto

# Verify rollback
./health-check.sh production

# Notify team
# (Automatic notifications sent if configured)
```

#### Option 2: Fix Forward (For Known Issues)

```bash
# Apply hotfix
git checkout main
# Make fix
git commit -m "hotfix: critical issue"
git push

# Deploy hotfix with fast strategy
AUTO_APPROVE=true ./deploy.sh production standard

# Monitor closely
./monitor-deployment.sh production 600
```

### Database Corruption

**Recovery steps:**

1. **Stop application**
   ```bash
   sudo systemctl stop noa-server
   ```

2. **Restore database from backup**
   ```bash
   cd scripts/deploy/backups
   # Find most recent backup
   ls -lt | head

   # Restore
   gunzip -c backup-*/database/dump.sql.gz | psql $DATABASE_URL
   ```

3. **Verify database integrity**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```

4. **Restart application**
   ```bash
   sudo systemctl start noa-server
   ./health-check.sh production
   ```

### Complete System Failure

**Disaster recovery:**

1. **Switch to backup infrastructure** (if available)
2. **Restore from latest backup**
3. **Verify all services**
4. **Gradual traffic restoration**
5. **Post-mortem analysis**

## Best Practices

### Before Deployment

- [ ] Review all code changes
- [ ] Run full test suite locally
- [ ] Update CHANGELOG.md
- [ ] Review database migrations
- [ ] Check dependency updates
- [ ] Verify environment variables
- [ ] Schedule maintenance window (if needed)

### During Deployment

- [ ] Monitor deployment logs
- [ ] Watch system metrics
- [ ] Be ready to rollback
- [ ] Keep communication channels open
- [ ] Document any issues

### After Deployment

- [ ] Verify health checks
- [ ] Monitor error rates (24-48 hours)
- [ ] Review performance metrics
- [ ] Update documentation
- [ ] Notify stakeholders of completion

## Deployment Checklist

### Staging Deployment

- [ ] Pull latest code from repository
- [ ] Run pre-deployment checks
- [ ] Review test results
- [ ] Execute deployment
- [ ] Verify health checks
- [ ] Smoke test key features

### Production Deployment

- [ ] Complete staging deployment first
- [ ] Schedule deployment window
- [ ] Notify stakeholders
- [ ] Create database backup
- [ ] Run pre-deployment checks
- [ ] Obtain deployment approval
- [ ] Execute deployment (blue-green recommended)
- [ ] Monitor deployment (minimum 5 minutes)
- [ ] Verify health checks
- [ ] Smoke test critical features
- [ ] Monitor error rates (24 hours)
- [ ] Send completion notification

## Support

For deployment issues or questions:

- **Documentation:** `/docs/deployment-guide.md`
- **Logs:** `/scripts/deploy/logs/`
- **Backups:** `/scripts/deploy/backups/`

---

**Last Updated:** 2025-10-23
**Version:** 1.0.0
