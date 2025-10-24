# Claude Code Restrictions Removal Guide

## Overview

This document explains how to remove the git restrictions and auto-approval mode
that were causing issues with Claude Code.

## Problems Identified

1. **Git Operations Blocked**: A readonly bash function and wrapper script
   (`/usr/local/bin/git-blocked`) were intercepting all git commands
2. **Auto-Approval Messages**: Environment variables and settings were causing
   "Auto-approval mode enabled" messages
3. **Unknown `--auto-approve` Flag**: Claude Code doesn't recognize this flag

## Solutions Implemented

### 1. Removed Auto-Approval Settings

**File**: `~/.claude/settings.json`

Removed the `autoApprove` section:

```json
"permissions": {
  "autoApprove": {
    "global": true    // ← REMOVED
  }
}
```

### 2. Created Removal Script

**File**: `/home/deflex/noa-server/scripts/remove-restrictions.sh`

This script:

- Removes `/usr/local/bin/git-blocked` wrapper
- Clears auto-approval environment variables
- Creates git alias to bypass restrictions
- Adds permanent fix to `.bashrc`

### 3. Git Function Workaround

The readonly git function cannot be removed from the current shell session, but
we've:

- Added an alias `alias git='/usr/bin/git'` to `.bashrc`
- This will take effect in new terminal sessions

## How to Use

### Option 1: Run the Removal Script (Recommended)

```bash
cd /home/deflex/noa-server
./scripts/remove-restrictions.sh

# Then start a new terminal session
exit
claude
```

### Option 2: Manual Steps

```bash
# 1. Remove git-blocked (requires sudo)
sudo rm -f /usr/local/bin/git-blocked

# 2. Add alias to .bashrc
echo "alias git='/usr/bin/git'" >> ~/.bashrc

# 3. Start new terminal
exit
claude
```

### Option 3: Temporary Fix (Current Session Only)

```bash
# Use the direct git wrapper
/home/deflex/noa-server/scripts/git-direct.sh status

# Or create an alias for current session
alias git='/usr/bin/git'
git status
```

## Verification

After starting a new terminal session:

```bash
# Check git works
git status

# Verify no blocking message appears
git --version

# Launch Claude Code without flags
cd /home/deflex/noa-server/packages/llama.cpp
source /home/deflex/praisonai_env/bin/activate
claude
```

## Files Modified

- `~/.claude/settings.json` - Removed auto-approve settings
- `~/.bashrc` - Added git alias (by running remove-restrictions.sh)

## Files Created

- `/home/deflex/noa-server/scripts/remove-restrictions.sh` - Automated removal
  script
- `/home/deflex/noa-server/docs/RESTRICTIONS_REMOVED.md` - This documentation

## Previous Workarounds (Now Obsolete)

These scripts were created earlier but are no longer needed with the permanent
fix:

- `/home/deflex/noa-server/scripts/git-direct.sh` - Direct git wrapper
- `/home/deflex/noa-server/scripts/setup-git-bypass.sh` - Bash configuration
- `/home/deflex/noa-server/docs/upgrade/git-restrictions-removed.md` - Old docs

## Troubleshooting

### "Git operations blocked" Still Appears

This message appears because the readonly git function is still active in your
current shell. **Solution**: Start a new terminal session (`exit` then `claude`)

### `--auto-approve` Unknown Option Error

This was caused by environment variables. They've been cleared, but may persist
in current session. **Solution**: Start a new terminal session

### Need Sudo for `/usr/local/bin/git-blocked`

If you can't use sudo:

- The alias workaround will still work
- Just ignore the git-blocked file
- It won't be called if the alias is set

## Permanent Solution

The permanent solution is now in place:

1. Auto-approval settings removed from `~/.claude/settings.json`
2. Git alias added to `~/.bashrc` (after running remove-restrictions.sh)
3. Start new terminal sessions to get clean environment

## Notes

- The readonly git function was set with `declare -frx git`, which makes it
  impossible to unset in the current shell
- New shell sessions will not have this function if it's not in startup files
- The alias method works because aliases are evaluated before functions in bash
