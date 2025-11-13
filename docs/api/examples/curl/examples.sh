#!/bin/bash
# NOA Server API - cURL Examples
# Complete collection of API endpoints with authentication

set -e

# Configuration
BASE_URL="${NOA_API_URL:-http://localhost:3000/api/v1}"
EMAIL="${NOA_EMAIL:-test@example.com}"
PASSWORD="${NOA_PASSWORD:-SecureP@ssw0rd123!}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Store tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""

# ==========================================
# AUTHENTICATION
# ==========================================

log_section "Authentication Examples"

# Register user
log_info "Registering new user..."
curl -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"${EMAIL}"'",
    "password": "'"${PASSWORD}"'",
    "metadata": {
      "firstName": "Test",
      "lastName": "User"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n\n" || true

# Login
log_info "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"${EMAIL}"'",
    "password": "'"${PASSWORD}"'"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

# Extract tokens
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token.refreshToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  log_info "Login successful! Token: ${ACCESS_TOKEN:0:20}..."
else
  log_error "Login failed!"
  exit 1
fi

# Refresh token
log_info "Refreshing access token..."
curl -X POST "${BASE_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'"${REFRESH_TOKEN}"'"
  }' \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Create API key
log_info "Creating API key..."
curl -X POST "${BASE_URL}/auth/api-keys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "name": "Test API Key",
    "expiresIn": 31536000,
    "scopes": ["inference:read", "inference:write"]
  }' \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# List API keys
log_info "Listing API keys..."
curl -X GET "${BASE_URL}/auth/api-keys" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# ==========================================
# AI INFERENCE
# ==========================================

log_section "AI Inference Examples"

# Chat completion
log_info "Chat completion..."
curl -X POST "${BASE_URL}/inference/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful AI assistant."
      },
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ],
    "model": "gpt-4",
    "config": {
      "temperature": 0.7,
      "max_tokens": 1000
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Streaming chat completion
log_info "Streaming chat completion..."
curl -N -X POST "${BASE_URL}/inference/stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Count from 1 to 5."
      }
    ],
    "model": "gpt-3.5-turbo",
    "config": {
      "stream": true,
      "temperature": 0.7
    }
  }'
echo -e "\n"

# Generate embeddings
log_info "Generating embeddings..."
curl -X POST "${BASE_URL}/inference/embeddings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "input": "The quick brown fox jumps over the lazy dog",
    "model": "text-embedding-ada-002"
  }' \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.data[0].embedding | length'

# List models
log_info "Listing available models..."
curl -X GET "${BASE_URL}/models" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.models[] | {id, provider, name}'

# Switch model
log_info "Switching to Claude..."
curl -X POST "${BASE_URL}/models/switch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "provider": "claude",
    "model": "claude-3-5-sonnet-20241022"
  }' \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Get provider status
log_info "Getting provider status..."
curl -X GET "${BASE_URL}/status/providers" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# ==========================================
# MESSAGE QUEUE
# ==========================================

log_section "Message Queue Examples"

# Publish message
log_info "Publishing message to queue..."
MESSAGE_RESPONSE=$(curl -s -X POST "${BASE_URL}/queue/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "queue": "ai-inference",
    "payload": {
      "type": "chat_completion",
      "model": "gpt-4",
      "messages": [
        {
          "role": "user",
          "content": "Background task"
        }
      ]
    },
    "priority": "high",
    "ttl": 3600
  }')

echo "$MESSAGE_RESPONSE" | jq '.'
MESSAGE_ID=$(echo "$MESSAGE_RESPONSE" | jq -r '.messageId')

# Publish batch
log_info "Publishing batch messages..."
curl -X POST "${BASE_URL}/queue/publish/batch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "messages": [
      {
        "queue": "ai-inference",
        "payload": {"type": "task1"},
        "priority": "normal"
      },
      {
        "queue": "ai-inference",
        "payload": {"type": "task2"},
        "priority": "high"
      }
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Consume messages
log_info "Consuming messages from queue..."
CONSUME_RESPONSE=$(curl -s -X GET "${BASE_URL}/queue/consume?queue=ai-inference&limit=5&timeout=5" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "$CONSUME_RESPONSE" | jq '.'

# Get queue status
log_info "Getting queue status..."
curl -X GET "${BASE_URL}/queue/status?queue=ai-inference" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Get queue statistics
log_info "Getting queue statistics..."
curl -X GET "${BASE_URL}/queue/stats?period=1h" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# ==========================================
# MONITORING
# ==========================================

log_section "Monitoring Examples"

# Health check
log_info "Health check..."
curl -X GET "${BASE_URL%/api/v1}/health" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Readiness probe
log_info "Readiness probe..."
curl -X GET "${BASE_URL%/api/v1}/health/ready" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Liveness probe
log_info "Liveness probe..."
curl -X GET "${BASE_URL%/api/v1}/health/live" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Detailed health
log_info "Detailed health status..."
curl -X GET "${BASE_URL%/api/v1}/health/detailed" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Prometheus metrics (plain text)
log_info "Prometheus metrics..."
curl -X GET "${BASE_URL%/api/v1}/metrics" \
  -w "\nHTTP Status: %{http_code}\n\n" | head -20

# JSON metrics
log_info "JSON metrics..."
curl -X GET "${BASE_URL%/api/v1}/metrics/api" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# System status
log_info "System status..."
curl -X GET "${BASE_URL%/api/v1}/status" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n" | jq '.'

# Submit custom metric
log_info "Submitting custom metric..."
curl -X POST "${BASE_URL%/api/v1}/metrics/custom" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d '{
    "name": "custom_operations_total",
    "value": 1,
    "type": "counter",
    "labels": {
      "operation": "test_example"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n\n"

# ==========================================
# CLEANUP
# ==========================================

log_section "Cleanup"

# Logout
log_info "Logging out..."
curl -X POST "${BASE_URL}/auth/logout" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n\n"

log_info "Examples completed successfully!"
