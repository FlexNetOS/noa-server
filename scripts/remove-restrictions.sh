#!/bin/bash
# Remove Git Restrictions and Auto-Approval Mode
# This script removes all Truth Verification System restrictions

echo "Removing Claude Code restrictions..."

# Step 1: Remove git-blocked wrapper (requires sudo)
if [ -f /usr/local/bin/git-blocked ]; then
    echo "Removing git-blocked wrapper..."
    sudo rm -f /usr/local/bin/git-blocked && echo "✓ git-blocked removed" || echo "⚠ Could not remove git-blocked (needs sudo)"
fi

# Step 2: Remove readonly git function from current shell
# Since we can't unset a readonly function, we need to start a new shell
# But we can override it with an alias that takes precedence
echo "Creating git alias to bypass function..."
alias git='/usr/bin/git'

# Step 3: Clear auto-approval environment variables
unset CLAUDE_AUTO_APPROVE 2>/dev/null
unset CLAUDE_FLOW_AUTO_APPROVE 2>/dev/null
unset CLAUDE_GLOBAL_AUTO_APPROVE 2>/dev/null
echo "✓ Auto-approval environment variables cleared"

# Step 4: Add permanent fix to .bashrc if not already present
if ! grep -q "# CLAUDE CODE FIX: Direct git access" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# CLAUDE CODE FIX: Direct git access" >> ~/.bashrc
    echo "alias git='/usr/bin/git'" >> ~/.bashrc
    echo "✓ Added permanent git alias to ~/.bashrc"
else
    echo "✓ Git alias already in ~/.bashrc"
fi

# Step 5: Instructions for complete removal
cat << 'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RESTRICTIONS REMOVED - Next Steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For the changes to take full effect:

1. Start a NEW terminal session:
   exit            # Close current terminal
   claude          # Start fresh Claude Code session

2. Or reload your shell configuration:
   source ~/.bashrc

3. Verify git works:
   git status

The readonly git function cannot be removed in the current shell,
but starting a new terminal will give you a clean environment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

echo "✓ Restrictions removal script complete"
