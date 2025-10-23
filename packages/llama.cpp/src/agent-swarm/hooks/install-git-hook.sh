#!/bin/bash

###############################################################################
# Git Hook Installer
# Installs the agent integration pre-commit hook into .git/hooks
###############################################################################

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Installing Agent Integration Git Hook"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Find git root
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$GIT_ROOT" ]; then
  echo "❌ ERROR: Not a git repository"
  echo "   Please run this script from within a git repository"
  exit 1
fi

echo "✓ Git repository found: $GIT_ROOT"

# Check if .git/hooks directory exists
HOOKS_DIR="$GIT_ROOT/.git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌ ERROR: Hooks directory not found: $HOOKS_DIR"
  exit 1
fi

echo "✓ Hooks directory found: $HOOKS_DIR"

# Source hook file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_HOOK="$SCRIPT_DIR/git-pre-commit"

if [ ! -f "$SOURCE_HOOK" ]; then
  echo "❌ ERROR: Source hook not found: $SOURCE_HOOK"
  exit 1
fi

echo "✓ Source hook found: $SOURCE_HOOK"

# Target hook file
TARGET_HOOK="$HOOKS_DIR/pre-commit"

# Backup existing hook if present
if [ -f "$TARGET_HOOK" ]; then
  BACKUP_FILE="$TARGET_HOOK.backup.$(date +%Y%m%d_%H%M%S)"
  echo ""
  echo "⚠️  Existing pre-commit hook found"
  echo "   Creating backup: $(basename $BACKUP_FILE)"
  cp "$TARGET_HOOK" "$BACKUP_FILE"
fi

# Copy hook
echo ""
echo "📋 Installing pre-commit hook..."
cp "$SOURCE_HOOK" "$TARGET_HOOK"

# Make executable
chmod +x "$TARGET_HOOK"

echo "✓ Hook installed and made executable"

# Verify installation
if [ -x "$TARGET_HOOK" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ SUCCESS! Agent integration hook installed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "The hook will automatically run on every commit."
  echo ""
  echo "📝 What happens on commit:"
  echo "   1. Detects new agent files in staged changes"
  echo "   2. Automatically triggers integration pipeline"
  echo "   3. Updates configs, docs, and registry"
  echo "   4. Validates cross-references"
  echo ""
  echo "⚙️  Configuration:"
  echo "   Edit: $TARGET_HOOK"
  echo "   Set enabled: true/false"
  echo "   Set blockOnFailure: true/false"
  echo ""
  echo "🔧 To bypass the hook on a specific commit:"
  echo "   git commit --no-verify"
  echo ""
  echo "🗑️  To uninstall:"
  echo "   rm $TARGET_HOOK"
  echo ""
else
  echo ""
  echo "❌ ERROR: Hook installation failed"
  exit 1
fi
