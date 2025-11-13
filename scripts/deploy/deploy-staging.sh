#!/bin/bash

##############################################################################
# Staging Deployment Script
#
# Quick deployment script for staging environment.
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run deployment with staging environment
exec "$SCRIPT_DIR/deploy.sh" staging "${1:-standard}"
