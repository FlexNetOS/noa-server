#!/bin/bash

##############################################################################
# Production Deployment Script
#
# Production deployment with approval gates and safety checks.
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run deployment with production environment
# Default to blue-green strategy for production
exec "$SCRIPT_DIR/deploy.sh" production "${1:-blue-green}"
