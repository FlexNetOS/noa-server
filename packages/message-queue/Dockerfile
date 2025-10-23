# ================================
# Multi-Stage Docker Build for Message Queue API
# Optimized for production: <200MB, security hardened, non-root
# ================================

# ================================
# Stage 1: Builder
# ================================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Set working directory
WORKDIR /build

# Copy package files for dependency installation
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm globally
RUN npm install -g pnpm@latest

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN pnpm run build

# Prune development dependencies
RUN pnpm prune --prod

# ================================
# Stage 2: Production Runtime
# ================================
FROM node:20-alpine AS production

# Install security updates and runtime dependencies
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tini && \
    rm -rf /var/cache/apk/*

# Create non-root user and group
RUN addgroup -g 1000 nodejs && \
    adduser -u 1000 -G nodejs -s /bin/sh -D nodejs

# Set working directory
WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /build/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /build/package*.json ./

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Health check script
COPY --chown=nodejs:nodejs docker/health-check.sh /usr/local/bin/health-check
RUN chmod +x /usr/local/bin/health-check

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 8081

# Environment variables (can be overridden)
ENV NODE_ENV=production \
    API_PORT=8081 \
    API_HOST=0.0.0.0 \
    LOG_LEVEL=info

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["/usr/local/bin/health-check"]

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the server
CMD ["node", "dist/server.js"]

# ================================
# Stage 3: Development (hot-reload)
# ================================
FROM node:20-alpine AS development

# Install development tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Create logs directory
RUN mkdir -p /app/logs

# Expose API and debug ports
EXPOSE 8081 9229

ENV NODE_ENV=development \
    API_PORT=8081 \
    LOG_LEVEL=debug

# Start with hot-reload
CMD ["pnpm", "run", "start:dev"]

# ================================
# Stage 4: Test Runner
# ================================
FROM node:20-alpine AS test

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source and tests
COPY . .

# Run tests
CMD ["pnpm", "test"]

# ================================
# Build metadata
# ================================
LABEL maintainer="Noa Server Team" \
      version="1.0.0" \
      description="Message Queue API - Production-ready containerized service" \
      org.opencontainers.image.source="https://github.com/noa-server/message-queue" \
      org.opencontainers.image.vendor="Noa Server" \
      org.opencontainers.image.licenses="MIT"
