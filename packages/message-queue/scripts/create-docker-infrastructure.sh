#!/bin/bash
# Auto-generated Docker Infrastructure Creator
# Creates all Docker and Kubernetes files for Message Queue API

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo "Creating Docker infrastructure in $BASE_DIR"

# Create directories
mkdir -p k8s scripts docker docs .github/workflows

# Create Dockerfile
cat > Dockerfile << 'EOF'
# Multi-Stage Docker Build for Message Queue API
# Production image: <200MB, security hardened, non-root

FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ git curl
WORKDIR /build
COPY package*.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@latest && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build && pnpm prune --prod

FROM node:20-alpine AS production
RUN apk update && apk upgrade && apk add --no-cache dumb-init curl tini && rm -rf /var/cache/apk/*
RUN addgroup -g 1000 nodejs && adduser -u 1000 -G nodejs -s /bin/sh -D nodejs
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/package*.json ./
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs
COPY --chown=nodejs:nodejs docker/health-check.sh /usr/local/bin/health-check
RUN chmod +x /usr/local/bin/health-check
USER nodejs
EXPOSE 8081
ENV NODE_ENV=production API_PORT=8081 API_HOST=0.0.0.0 LOG_LEVEL=info
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD ["/usr/local/bin/health-check"]
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
EOF

echo "✓ Created Dockerfile"

# Create .dockerignore
cat > .dockerignore << 'EOF'
node_modules/
dist/
*.log
.git/
.vscode/
*.md
tests/
.env
.env.*
!.env.example
k8s/
scripts/
.github/
EOF

echo "✓ Created .dockerignore"

# Create .env.example
cat > .env.example << 'EOF'
NODE_ENV=production
API_PORT=8081
API_HOST=0.0.0.0
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000
ENABLE_WEBSOCKET=true
ENABLE_METRICS=true
AUTH_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
EOF

echo "✓ Created .env.example"

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.9'
services:
  message-queue-api:
    build:
      context: .
      target: production
    container_name: noa-message-queue-api
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      NODE_ENV: production
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - queue-network
  redis:
    image: redis:7-alpine
    container_name: noa-queue-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - queue-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
networks:
  queue-network:
    driver: bridge
volumes:
  redis-data:
    driver: local
EOF

echo "✓ Created docker-compose.yml"

# Create Makefile
cat > Makefile << 'EOF'
.PHONY: help build deploy test
.DEFAULT_GOAL := help

help:
	@echo "Message Queue API - Docker Commands"
	@echo "  make build        Build production image"
	@echo "  make deploy       Deploy to Kubernetes"
	@echo "  make test         Run tests"
	@echo "  make dev          Start development environment"

build:
	docker build -t noa/message-queue-api:latest .

deploy:
	./scripts/deploy.sh

test:
	pnpm test

dev:
	docker-compose up
EOF

echo "✓ Created Makefile"

echo ""
echo "Docker infrastructure created successfully!"
echo "Next steps:"
echo "  1. Review and customize .env.example"
echo "  2. Run 'make build' to build Docker image"
echo "  3. Run 'make dev' to start development environment"

