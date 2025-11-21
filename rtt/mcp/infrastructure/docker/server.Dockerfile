# Multi-stage build for MCP Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files first
COPY package.json package-lock.json* tsconfig.json ./

# Copy all necessary package.json files for workspaces
COPY src/server/package.json ./src/server/package.json
COPY src/libs ./src/libs

# Install ALL dependencies (including workspaces)
RUN npm ci --verbose || npm install --verbose

# Copy server source
COPY src/server ./src/server

# Build the server
RUN npm run build:server || (cd src/server && npm run build)

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files and package files
COPY --from=builder /app/src/server/dist ./dist
COPY --from=builder /app/src/server/package.json ./package.json

# Install production dependencies only
RUN npm ci --production --ignore-scripts || npm install --production --ignore-scripts

# Security: run as non-root
RUN addgroup -g 1001 -S mcp && \
    adduser -S mcp -u 1001 && \
    chown -R mcp:mcp /app

USER mcp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
