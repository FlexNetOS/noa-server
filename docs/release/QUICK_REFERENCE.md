# Release Engineering Quick Reference

## Quick Commands

### Create Release

```bash
# Automated (recommended)
pnpm changeset
git commit -am "feat: new feature"
git push origin main
# → Triggers automatic release

# Manual
./scripts/release/create-release.sh patch
git push origin v1.0.1
```

### Deploy

```bash
# Staging
./scripts/release/deploy-blue-green.sh staging v1.0.0 canary-10

# Production
./scripts/release/deploy-blue-green.sh production v1.0.0 canary-10
```

### Rollback

```bash
# Quick rollback
./scripts/release/rollback.sh v1.0.0

# OR via kubectl
kubectl rollout undo deployment/noa-green -n production
```

### Feature Flags

```typescript
// Check flag
const enabled = await flags.isEnabled('feature', context);

// Get value
const value = await flags.getValue('feature', context, 'default');

// Percentage
const enabled = await flags.percentage('feature', context, 25);
```

## GitHub Actions

### Trigger Release

1. Go to Actions → Release Pipeline
2. Click "Run workflow"
3. Select release type (patch/minor/major)
4. Confirm

### Trigger Deployment

1. Go to Actions → Blue-Green Deployment
2. Click "Run workflow"
3. Select environment, version, strategy
4. Confirm

### Emergency Rollback

1. Go to Actions → Emergency Rollback
2. Click "Run workflow"
3. Enter version and reason
4. Wait for approval (production)
5. Confirm

## Health Checks

```bash
# Check deployment
kubectl get pods -n production -l app=noa

# Check service
kubectl get svc noa-service -n production

# Test endpoint
curl https://api.example.com/health

# View logs
kubectl logs -n production -l app=noa --tail=100 -f
```

## Monitoring

```bash
# Resource usage
kubectl top pods -n production

# Error rate
kubectl logs -n production -l app=noa --tail=500 | grep -c ERROR

# Active deployment
kubectl get service noa-service -n production -o jsonpath='{.spec.selector.color}'
```

## Common Issues

### Deployment stuck

```bash
kubectl describe pod -n production -l color=green
kubectl rollout restart deployment/noa-green -n production
```

### High error rate

```bash
./scripts/release/rollback.sh v1.0.0
```

### Service not accessible

```bash
kubectl get ingress -n production
kubectl describe service noa-service -n production
```

## File Locations

- Workflows: `.github/workflows/`
- Scripts: `scripts/release/`
- K8s: `k8s/deployments/blue-green/`
- Docs: `docs/release/`
- Feature Flags: `packages/feature-flags/`

## Documentation

- [Release Process](./RELEASE_PROCESS.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Rollback Guide](./ROLLBACK_GUIDE.md)
- [Feature Flags Guide](./FEATURE_FLAGS_GUIDE.md)

## Support

- Docs: `/docs/release/`
- Slack: #releases, #deployments
- On-call: PagerDuty
