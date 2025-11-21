# Multi-stage build for Gateway
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json* tsconfig.json ./

# Copy all necessary package.json files
COPY src/gateway/package.json ./src/gateway/package.json
COPY src/libs ./src/libs

# Install ALL dependencies
RUN npm ci --verbose || npm install --verbose

# Copy gateway source
COPY src/gateway ./src/gateway

# Build
RUN npm run build:gateway || (cd src/gateway && npm run build)

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/src/gateway/dist ./dist
COPY --from=builder /app/src/gateway/package.json ./package.json

# Install production dependencies only
RUN npm ci --production --ignore-scripts || npm install --production --ignore-scripts

# Security: run as non-root
RUN addgroup -g 1001 -S gateway && \
    adduser -S gateway -u 1001 && \
    chown -R gateway:gateway /app

USER gateway

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
