# Multi-stage Dockerfile for Noa Server
# Optimized for production with security best practices

# ================================
# Stage 1: Base Node.js Environment
# ================================
FROM node:20-alpine AS node-base

# Install security updates and required dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    tini \
    curl \
    ca-certificates && \
    rm -rf /var/cache/apk/*

# Set secure environment
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_AUDIT=true

WORKDIR /app

# ================================
# Stage 2: Python Base Environment
# ================================
FROM python:3.12-alpine AS python-base

RUN apk update && apk upgrade && \
    apk add --no-cache \
    build-base \
    curl \
    ca-certificates \
    libffi-dev \
    openssl-dev && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# ================================
# Stage 3: Dependencies Builder
# ================================
FROM node-base AS dependencies

# Copy dependency manifests
COPY package*.json pnpm-workspace.yaml ./
COPY packages/*/package*.json ./packages/

# Install pnpm and dependencies
RUN npm install -g pnpm@9.11.0 && \
    pnpm install --frozen-lockfile --prod

# ================================
# Stage 4: Application Builder
# ================================
FROM node-base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build 2>/dev/null || echo "No build step defined"

# ================================
# Stage 5: MCP Services
# ================================
FROM node-base AS mcp-service

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app ./

# Health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:${MCP_PORT:-8001}/health || exit 1' > /health-check.sh && \
    chmod +x /health-check.sh

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["/health-check.sh"]

USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "mcp/server.js"]

# ================================
# Stage 6: Claude Flow Service
# ================================
FROM node-base AS claude-flow-service

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/claude-flow ./claude-flow
COPY package.json ./

RUN echo '#!/bin/sh\ncurl -f http://localhost:${CLAUDE_FLOW_PORT:-9100}/health || exit 1' > /health-check.sh && \
    chmod +x /health-check.sh

EXPOSE 9100

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["/health-check.sh"]

USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npx", "claude-flow", "mcp", "start"]

# ================================
# Stage 7: UI Dashboard
# ================================
FROM node-base AS ui-dashboard

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/packages/contains-studio-dashboard/.next ./packages/contains-studio-dashboard/.next
COPY packages/contains-studio-dashboard/package.json ./packages/contains-studio-dashboard/
COPY packages/contains-studio-dashboard/next.config.ts ./packages/contains-studio-dashboard/
COPY packages/contains-studio-dashboard/public ./packages/contains-studio-dashboard/public

WORKDIR /app/packages/contains-studio-dashboard

RUN echo '#!/bin/sh\ncurl -f http://localhost:${UI_PORT:-9200}/api/health || exit 1' > /health-check.sh && \
    chmod +x /health-check.sh

EXPOSE 9200

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["/health-check.sh"]

USER node

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "start"]

# ================================
# Stage 8: Llama.cpp Neural Service
# ================================
FROM python-base AS llama-service

# Install llama.cpp dependencies
RUN apk add --no-cache \
    cmake \
    git \
    make \
    g++ \
    linux-headers

COPY packages/llama.cpp ./packages/llama.cpp
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir flask gunicorn

WORKDIR /app/packages/llama.cpp

# Build llama.cpp
RUN cmake -B build -DGGML_CUDA=ON -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --config Release -j$(nproc)

RUN echo '#!/bin/sh\ncurl -f http://localhost:${LLAMA_PORT:-9300}/health || exit 1' > /health-check.sh && \
    chmod +x /health-check.sh

EXPOSE 9300

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["/health-check.sh"]

# Create non-root user
RUN addgroup -g 1001 llama && \
    adduser -D -u 1001 -G llama llama && \
    chown -R llama:llama /app

USER llama

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["python", "shims/http_bridge.py"]

# ================================
# Stage 9: AgenticOS Service
# ================================
FROM python-base AS agenticos-service

COPY srv/agenticos ./srv/agenticos
COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

WORKDIR /app/srv/agenticos

RUN echo '#!/bin/sh\ncurl -f http://localhost:${AGENTICOS_PORT:-9400}/health || exit 1' > /health-check.sh && \
    chmod +x /health-check.sh

EXPOSE 9400

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["/health-check.sh"]

RUN addgroup -g 1001 agentic && \
    adduser -D -u 1001 -G agentic agentic && \
    chown -R agentic:agentic /app

USER agentic

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["python", "agents/main.py"]

# ================================
# Stage 10: Production (Default)
# ================================
FROM mcp-service AS production

# This is the default production image
# Individual services can be built using --target flag
