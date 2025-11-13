#!/bin/sh
# Health Check Script for Message Queue API
set -e

API_HOST="${API_HOST:-0.0.0.0}"
API_PORT="${API_PORT:-8081}"
HEALTH_ENDPOINT="http://${API_HOST}:${API_PORT}/health"
TIMEOUT=5

if command -v curl > /dev/null 2>&1; then
    response=$(curl -f -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
elif command -v wget > /dev/null 2>&1; then
    response=$(wget -q -O /dev/null -T $TIMEOUT --server-response "$HEALTH_ENDPOINT" 2>&1 | grep "HTTP/" | awk '{print $2}' || echo "000")
else
    echo "ERROR: Neither curl nor wget available"
    exit 1
fi

if [ "$response" = "200" ]; then
    echo "Health check passed (HTTP $response)"
    exit 0
else
    echo "Health check failed (HTTP $response)"
    exit 1
fi
