# Issue: Fix failing Autonomous Monitoring workflow: switch to pnpm

The `Autonomous Monitoring` workflow is failing because it relies on `npm ci` and `npm` caching, but the repository appears to be using `pnpm` (indicated by `pnpm-lock.yaml` and the absence of `package-lock.json`).

**Error:**
`Dependencies lock file is not found ... Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock`

**Solution:**
Update `.github/workflows/autonomous-monitoring.yml` to:
1. Install `pnpm`.
2. Use `cache: 'pnpm'` in `setup-node`.
3. Use `pnpm install` instead of `npm ci`.
4. Update `npm run` commands to `pnpm run`.