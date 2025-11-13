#!/bin/bash

##############################################################################
# Logging Utilities
##############################################################################

# Load colors if not already loaded
if [ -z "$GREEN" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$SCRIPT_DIR/colors.sh"
fi

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_debug() {
    if [ "${DEBUG:-false}" = "true" ]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

log_success() {
    echo -e "${BOLD_GREEN}[SUCCESS]${NC} $1"
}
