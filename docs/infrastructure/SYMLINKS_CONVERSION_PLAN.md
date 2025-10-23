# Symlinks Conversion Plan (infra-002)

**Date**: October 22, 2025
**Status**: Analysis Complete
**Task**: Convert external symlinks to portable code

## Current Symlinks Analysis

### Critical External Symlinks in `/packages`

| Symlink | Target | Type | Action Required |
|---------|--------|------|-----------------|
| `claude-flow-alpha` | `/home/deflex/noa-server/claude-flow` | Internal | ✅ Keep (internal reference) |
| `claude-cookbooks` | `../ai-dev-repos/anthropic-cookbook` | **External** | ⚠️ Convert to git submodule or vendor |
| `contains-studio-agents` | `../.claude/agents/contains-studio` | **External** | ⚠️ Convert to git submodule or vendor |
| `claude-code` | `/home/deflex/noa-server/claude-code` | Internal | ✅ Keep (internal reference) |
| `claude-flow.wiki` | `/home/deflex/noa-server/claude-flow/claude-flow-wiki` | Internal | ✅ Keep (internal reference) |
| `mcp-agent` | `/home/deflex/noa-server/mcp` | Internal | ✅ Keep (internal reference) |

### Recommendations

#### 1. Anthropic Cookbook (`claude-cookbooks`)
**Current**: Symlink to `../ai-dev-repos/anthropic-cookbook`
**Issue**: External dependency outside project root
**Solution**: Add as Git submodule

```bash
# Remove symlink
rm packages/claude-cookbooks

# Add as submodule
git submodule add https://github.com/anthropics/anthropic-cookbook.git packages/claude-cookbooks
git submodule update --init --recursive
```

**Alternative**: If modifications are made, vendor the code:
```bash
# Copy and track in main repo
cp -r ../ai-dev-repos/anthropic-cookbook packages/claude-cookbooks
git add packages/claude-cookbooks
```

#### 2. Contains Studio Agents (`contains-studio-agents`)
**Current**: Symlink to `../.claude/agents/contains-studio`
**Issue**: External dependency outside project root
**Solution**: Vendor the code (likely custom/private)

```bash
# Remove symlink
rm packages/contains-studio-agents

# Copy agents directory
cp -r ../.claude/agents/contains-studio packages/contains-studio-agents

# Add to git
git add packages/contains-studio-agents
```

#### 3. Internal Symlinks (Keep)
The following symlinks are internal to the project and should be kept:
- `claude-flow-alpha` → Internal workspace package
- `claude-code` → Internal workspace package
- `claude-flow.wiki` → Internal documentation
- `mcp-agent` → Internal workspace package

These can remain as symlinks or be converted to pnpm workspace references.

## Implementation Strategy

### Phase 1: Document Current State ✅
- [x] Identify all symlinks
- [x] Categorize as internal vs external
- [x] Determine conversion strategy

### Phase 2: Convert External Symlinks
Priority: **High**

**Step 1**: Handle Anthropic Cookbook
```bash
cd /home/deflex/noa-server
rm packages/claude-cookbooks
git submodule add https://github.com/anthropics/anthropic-cookbook.git packages/claude-cookbooks
```

**Step 2**: Vendor Contains Studio Agents
```bash
cd /home/deflex/noa-server
rm packages/contains-studio-agents
cp -r ../.claude/agents/contains-studio packages/contains-studio-agents
```

**Step 3**: Update package.json workspace references
Ensure `package.json` properly references the packages:
```json
{
  "workspaces": [
    "packages/*",
    "servers/*",
    "apps/*"
  ]
}
```

### Phase 3: Update Scripts and References
- Update any scripts that reference the old symlink paths
- Update import statements if necessary
- Update documentation

### Phase 4: Testing
- Verify all packages build correctly
- Verify workspace dependencies resolve
- Test on fresh clone (cross-platform compatibility)

## Cross-Platform Compatibility

### Benefits of Conversion
1. **Windows Compatibility**: Windows symlinks require admin privileges
2. **Docker/Container Compatibility**: Symlinks can break in containers
3. **CI/CD Reliability**: Eliminates symlink-related build failures
4. **Team Onboarding**: Simpler setup without external dependencies

### Git Submodules Best Practices
```bash
# Clone with submodules
git clone --recursive <repo-url>

# Or update existing clone
git submodule update --init --recursive

# Update submodules to latest
git submodule update --remote
```

## Rollback Plan

If issues arise, symlinks can be recreated:
```bash
# Restore anthropic-cookbook symlink
rm -rf packages/claude-cookbooks
ln -s ../ai-dev-repos/anthropic-cookbook packages/claude-cookbooks

# Restore contains-studio-agents symlink
rm -rf packages/contains-studio-agents
ln -s ../.claude/agents/contains-studio packages/contains-studio-agents
```

## Success Criteria

- ✅ No external symlinks in `packages/` directory
- ✅ All packages build successfully
- ✅ Cross-platform compatibility verified
- ✅ Documentation updated
- ✅ Team notified of changes

## Timeline

- **Analysis**: 0.5 days ✅ Complete
- **Implementation**: 0.5 days
- **Testing**: 0.5 days
- **Documentation**: 0.5 days
- **Total**: 2 days

## Next Steps

1. Get approval for conversion approach
2. Execute conversion (requires git operations - currently blocked)
3. Test builds on multiple platforms
4. Update team documentation
5. Mark infra-002 as complete
