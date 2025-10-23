<!-- filepath: /home/deflex/workspace/tools/setup-todo-hooks.sh -->
#!/bin/bash

# Setup script for todo completion hooks
# Initializes the hook system and NOA service integration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/todo-hooks"

echo "Setting up todo completion hooks..."

# Create hooks directory
mkdir -p "$HOOKS_DIR"

# Make scripts executable
chmod +x "$SCRIPT_DIR/todo_helper.sh" 2>/dev/null || true
chmod +x "$HOOKS_DIR"/*.sh 2>/dev/null || true

# Create NOA service directories if they don't exist
mkdir -p "$HOME/noa-server/packages/auth-service/verifications"
mkdir -p "$HOME/noa-server/packages/audit-logger/events"

# Install fswatch if not present (for watch mode)
if ! command -v fswatch &> /dev/null; then
    echo "Installing fswatch for real-time monitoring..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y fswatch
    else
        echo "Please install fswatch manually for watch mode support"
    fi
fi

# Add alias to bashrc if not present
if ! grep -q "alias todo=" "$HOME/.bashrc"; then
    echo "" >> "$HOME/.bashrc"
    echo "# Todo helper alias" >> "$HOME/.bashrc"
    echo "alias todo='$SCRIPT_DIR/todo_helper.sh'" >> "$HOME/.bashrc"
    echo "Added 'todo' alias to ~/.bashrc"
fi

# Test the setup
echo ""
echo "Testing hook system..."
export TASK_JSON='{"priority":"P2","category":"@testing","description":"Test task"}'
export COMPLETION_TIMESTAMP="$(date '+%Y-%m-%d %H:%M')"
export TODO_FILE="$HOME/noa-server/packages/ui-dashboard/current.todo"

for hook in "$HOOKS_DIR"/*.sh; do
    if [[ -x "$hook" ]]; then
        echo "Testing: $(basename "$hook")"
        if "$hook" > /dev/null 2>&1; then
            echo "  ✓ Hook is functional"
        else
            echo "  ⚠ Hook needs configuration"
        fi
    fi
done

echo ""
echo "✅ Todo hook system setup complete!"
echo ""
echo "Quick start:"
echo "  1. Mark task complete: todo complete 'task pattern'"
echo "  2. Watch mode: todo watch"
echo "  3. View stats: todo stats"
echo ""
echo "Hooks installed in: $HOOKS_DIR"
echo "Logs available at: ~/logs/applications/"
