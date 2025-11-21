# Release Engineering Documentation

Comprehensive documentation for the Noa Server release engineering and
deployment infrastructure.

## Quick Links

- **[Quick Reference](./QUICK_REFERENCE.md)** - Command cheatsheet for common
  tasks
- **[Release Process](./RELEASE_PROCESS.md)** - Complete release workflow guide
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Blue-green deployment
  procedures
- **[Rollback Guide](./ROLLBACK_GUIDE.md)** - Emergency rollback procedures
- **[Feature Flags Guide](./FEATURE_FLAGS_GUIDE.md)** - Feature flag usage and
  strategies
- **[Architecture](./ARCHITECTURE.md)** - System architecture and diagrams

## Getting Started

### For Developers

If you're shipping a new feature:

1. **Create a changeset**

   ```bash
   pnpm changeset
   ```

2. **Commit and push**

   ```bash
   git commit -am "feat: new feature"
   git push origin main
   ```

3. **Automatic release triggered**
   - CI builds and tests
   - Version bumped
   - Release created
   - Packages published

### For DevOps

If you're deploying to production:

1. **Deploy to staging first**

   ```bash
   ./scripts/release/deploy-blue-green.sh staging v1.0.0 canary-10
   ```

2. **Monitor and validate**
   - Check health endpoints
   - Review error rates
   - Verify functionality

3. **Deploy to production**

   ```bash
   ./scripts/release/deploy-blue-green.sh production v1.0.0 canary-10
   ```

4. **Monitor deployment**
   - Watch metrics
   - Be ready to rollback
   - Verify success

### For Emergency Rollback

If something goes wrong:

```bash
# Quick rollback
./scripts/release/rollback.sh v1.0.0

# OR via GitHub Actions
Actions → Emergency Rollback → Run workflow
```

## Documentation Guide

### 1. Quick Reference

**File**: `QUICK_REFERENCE.md`

**Contents**:

- Command cheatsheet
- Common operations
- Troubleshooting
- File locations

**Use when**: You need a quick command or reminder

### 2. Release Process

**File**: `RELEASE_PROCESS.md`

**Contents**:

- Semantic versioning
- Release types (major, minor, patch)
- Automated pipeline
- Pre-releases and RCs
- Hotfix procedures
- Release checklist

**Use when**: Creating or managing releases

### 3. Deployment Guide

**File**: `DEPLOYMENT_GUIDE.md`

**Contents**:

- Blue-green deployment strategy
- Traffic migration strategies
- Kubernetes infrastructure
- Health checks and monitoring
- Production deployment workflow
- Best practices

**Use when**: Deploying to staging or production

### 4. Rollback Guide

**File**: `ROLLBACK_GUIDE.md`

**Contents**:

- Emergency procedures
- Rollback scenarios
- Database rollback
- Kubernetes rollback commands
- Post-rollback procedures
- Incident documentation

**Use when**: Emergency or planned rollback needed

### 5. Feature Flags Guide

**File**: `FEATURE_FLAGS_GUIDE.md`

**Contents**:

- Feature flag setup
- Rollout strategies
- A/B testing
- LaunchDarkly integration
- Custom provider
- Best practices

**Use when**: Implementing gradual rollouts or A/B tests

### 6. Architecture

**File**: `ARCHITECTURE.md`

**Contents**:

- System diagrams
- Component architecture
- Deployment flow
- Security architecture
- Performance optimization
- Disaster recovery

**Use when**: Understanding the system design

## Common Scenarios

### Scenario: Ship a New Feature

1. Develop feature locally
2. Write tests (coverage > 80%)
3. Create changeset: `pnpm changeset`
4. Open PR, get approval
5. Merge to main
6. Automatic release triggered
7. Deploy to staging
8. Validate in staging
9. Deploy to production
10. Monitor metrics

### Scenario: Gradual Feature Rollout

1. Implement feature with feature flag
2. Deploy code (flag disabled)
3. Enable for internal team
4. Enable for beta testers
5. Gradual rollout: 10% → 25% → 50% → 100%
6. Monitor each stage
7. Remove flag after 2 weeks

### Scenario: Emergency Hotfix

1. Create hotfix branch from main
2. Apply critical fix
3. Create patch release
4. Deploy to staging (fast validation)
5. Deploy to production
6. Merge hotfix back to main
7. Incident report

### Scenario: Rollback Production

1. Detect issue (monitoring/alerts)
2. Assess severity
3. Execute rollback: `./scripts/release/rollback.sh v1.0.0`
4. Verify health
5. Document incident
6. Root cause analysis
7. Prevent recurrence

## Infrastructure Overview

### GitHub Workflows

```
.github/workflows/
├── release.yml              # Automated release pipeline
├── deploy-blue-green.yml    # Blue-green deployment
└── rollback.yml             # Emergency rollback
```

### Release Scripts

```
scripts/release/
├── create-release.sh        # Version and tag creation
├── build-artifacts.sh       # Multi-platform builds
├── publish-packages.sh      # NPM publishing
├── deploy-blue-green.sh     # Deployment orchestration
├── switch-traffic.sh        # Traffic migration
├── smoke-tests.sh           # Validation tests
└── rollback.sh              # Quick rollback
```

### Kubernetes Resources

```
k8s/deployments/blue-green/
├── blue-deployment.yaml     # Blue environment
├── green-deployment.yaml    # Green environment
└── service.yaml             # Services, HPA, PDB, Ingress
```

### Feature Flags Package

```
packages/feature-flags/
├── src/
│   ├── FeatureFlagManager.ts      # Main manager
│   ├── providers/                  # LaunchDarkly, Custom
│   └── strategies/                 # Percentage, User
└── tests/                          # Comprehensive tests
```

## Key Metrics

### Deployment Performance

- Frequency: 5-10 deployments/week
- Duration: < 10 minutes
- Success Rate: > 95%
- Zero Downtime: 100%

### Reliability

- MTTR: < 5 minutes
- Rollback Time: < 2 minutes
- Uptime: 99.9%

### Quality

- Test Coverage: > 80%
- Security Vulnerabilities: 0 critical
- Documentation: 100%

## Support

### Documentation

- All guides in `/docs/release/`
- Implementation report: `/docs/PHASE7_IMPLEMENTATION_REPORT.md`

### Communication

- **Slack**: #releases, #deployments
- **On-call**: PagerDuty
- **Email**: devops@example.com

### Resources

- GitHub Issues: Report problems
- GitHub Discussions: Ask questions
- Runbooks: `/docs/runbooks/`

## Training

### Required Reading

1. Quick Reference (5 min)
2. Release Process (20 min)
3. Deployment Guide (30 min)
4. Rollback Guide (15 min)

### Hands-On Training

1. Create test release in dev
2. Deploy to staging
3. Practice rollback
4. Use feature flags

### Certification

- Complete training modules
- Perform supervised deployment
- Execute test rollback
- Pass knowledge quiz

## Best Practices

### Development

1. Always create changesets
2. Write comprehensive tests
3. Update documentation
4. Use feature flags for risky changes
5. Test in staging first

### Deployment

1. Deploy during business hours
2. Monitor actively during deployment
3. Keep old version running (1 replica)
4. Gradual traffic migration
5. Have rollback plan ready

### Operations

1. Automate everything
2. Monitor continuously
3. Document incidents
4. Learn from failures
5. Improve processes

## Troubleshooting

### Common Issues

**Deployment Stuck**

- Check pod status: `kubectl get pods -n production`
- View events: `kubectl get events -n production`
- Restart rollout: `kubectl rollout restart deployment/noa-green -n production`

**High Error Rate**

- View logs: `kubectl logs -n production -l app=noa --tail=100`
- Check metrics dashboard
- Execute rollback if needed

**Feature Flag Not Working**

- Verify provider connection
- Check context data
- Review cache settings
- Test with debug logging

### Getting Help

1. Check documentation
2. Search previous incidents
3. Ask in #deployments Slack
4. Contact on-call engineer
5. Escalate if needed

## Changelog

### Version 1.0.0 (2025-10-22)

- Initial release engineering infrastructure
- Automated release pipeline
- Blue-green deployment system
- Rollback procedures
- Feature flags package
- Comprehensive documentation

## Contributing

### Documentation Updates

1. Create feature branch
2. Update relevant docs
3. Test all commands
4. Submit PR with clear description
5. Get review from DevOps team

### Infrastructure Changes

1. Discuss in #devops
2. Create RFC (Request for Comments)
3. Get approval from team
4. Implement in dev/staging
5. Document changes
6. Roll out to production

## License

Internal documentation for Noa Server project.

---

**Last Updated**: 2025-10-22 **Maintained By**: DevOps Team **Version**: 1.0.0
