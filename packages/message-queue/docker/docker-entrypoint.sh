#!/bin/sh
# ================================
# Docker Entrypoint Script
# Initialization and environment setup
# ================================

set -e

echo "==================================="
echo "Message Queue API - Starting..."
echo "==================================="

# Print environment info
echo "Node Version: $(node --version)"
echo "Environment: ${NODE_ENV:-production}"
echo "API Port: ${API_PORT:-8081}"
echo "Redis Host: ${REDIS_HOST:-localhost}"
echo "==================================="

# Create logs directory if it doesn't exist
mkdir -p /app/logs
chown -R nodejs:nodejs /app/logs 2>/dev/null || true

# Wait for Redis to be ready
wait_for_redis() {
    echo "Waiting for Redis at ${REDIS_HOST:-localhost}:${REDIS_PORT:-6379}..."

    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if nc -z "${REDIS_HOST:-localhost}" "${REDIS_PORT:-6379}" 2>/dev/null; then
            echo "Redis is ready!"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: Redis not ready, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "ERROR: Redis failed to become ready after $max_attempts attempts"
    return 1
}

# Check if netcat is available for Redis check
if command -v nc > /dev/null 2>&1; then
    wait_for_redis || exit 1
else
    echo "WARNING: netcat not available, skipping Redis connection check"
    sleep 5
fi

# Run database migrations if needed
if [ -f "/app/scripts/migrate.js" ]; then
    echo "Running database migrations..."
    node /app/scripts/migrate.js || echo "WARNING: Migration failed or not applicable"
fi

# Execute the main command
echo "Starting application..."
echo "==================================="

exec "$@"
