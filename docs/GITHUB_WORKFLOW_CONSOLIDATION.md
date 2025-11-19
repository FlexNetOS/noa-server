# GitHub Workflow Consolidation

## Date: October 24, 2025

## Summary
Consolidated all GitHub Actions workflows from 4 separate directories into the single root `.github/workflows/` directory to ensure all workflows actually run on GitHub.

## Problem Identified
- GitHub Actions only recognizes workflows in the root `.github/workflows/` directory
- Workflows in subdirectories (`opcode/`, `octelium/`, `claude-squad/`) were not being executed
- Multiple workflows had naming conflicts (e.g., multiple `release.yml` files)
- Maintenance overhead from scattered workflow locations

## Changes Made

### 1. Workflow Migration (39 total workflows)
- **From `opcode/.github/workflows/`** (7 workflows) → Root with `opcode-` prefix
- **From `octelium/.github/workflows/`** (7 workflows) → Root with `octelium-` prefix
- **From `claude-squad/.github/workflows/`** (5 workflows) → Root with `claude-squad-` prefix
- **Root workflows** (20 workflows) → Remained unchanged

### 2. Naming Convention Applied
All component workflows now use prefixes to avoid conflicts:
- `opcode-*.yml` - Opcode component workflows
- `octelium-*.yml` - Octelium component workflows
- `claude-squad-*.yml` - Claude Squad component workflows

### 3. Path Filters Added
Each component workflow now includes path filters to trigger only on relevant changes:
```yaml
on:
  push:
    paths:
      - 'opcode/**'  # Only trigger for component-specific changes
      - '.github/workflows/opcode-*.yml'
```

### 4. Working Directories Configured
All component workflows now specify their working directory:
```yaml
defaults:
  run:
    working-directory: ./opcode  # Component-specific directory
```

### 5. Tag Patterns Updated
Release workflows now use component-specific tag patterns:
- `opcode-v*` for Opcode releases
- `octelium-v*` for Octelium releases
- `claude-squad-v*` for Claude Squad releases

## Files Modified

### Opcode Workflows (7 files)
- `opcode-build-linux.yml`
- `opcode-build-macos.yml`
- `opcode-build-test.yml`
- `opcode-claude-code-review.yml`
- `opcode-claude.yml`
- `opcode-pr-check.yml`
- `opcode-release.yml`

### Octelium Workflows (7 files)
- `octelium-client-components.yml`
- `octelium-cluster-components.yml`
- `octelium-demo-cluster-install.yml`
- `octelium-e2e.yml`
- `octelium-release.yml`
- `octelium-sync.yml`
- `octelium-test-unit.yml`

### Claude Squad Workflows (5 files)
- `claude-squad-build.yml`
- `claude-squad-cla.yml`
- `claude-squad-deploy-pages.yml`
- `claude-squad-lint.yml`
- `claude-squad-release.yml`

## Benefits Achieved

✅ **All workflows now execute on GitHub** - No more dormant workflows
✅ **Single source of truth** - All CI/CD configuration in one location
✅ **No naming conflicts** - Clear prefixes prevent collisions
✅ **Component isolation** - Workflows only trigger for relevant changes
✅ **Easier maintenance** - All workflows visible in one directory
✅ **Better resource utilization** - Avoid duplicate jobs across components

## Backup Location
All original workflow files have been backed up to: `.github-workflows-backup/`

## Testing Recommendations

1. **Create test PRs** to verify path filters work correctly
2. **Test workflow triggers** by making changes to each component
3. **Verify working directories** are correctly set for build steps
4. **Test release workflows** with appropriate tags
5. **Monitor workflow runs** after deployment to ensure proper execution

## Migration Notes for Developers

- When creating new workflows for components, follow the naming convention
- Always add path filters to component-specific workflows
- Set working directories appropriately for component workflows
- Use component-specific tag patterns for releases
- Reference other workflows using their new prefixed names

## Rollback Plan
If issues arise, the original workflows can be restored from:
```bash
.github-workflows-backup/
├── root-workflows/       # Original root workflows
├── opcode-workflows/     # Original opcode workflows
├── octelium-workflows/   # Original octelium workflows
└── claude-squad-workflows/  # Original claude-squad workflows
```