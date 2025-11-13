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
