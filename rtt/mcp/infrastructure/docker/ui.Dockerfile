# Multi-stage build for UI
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json* tsconfig.json ./

# Copy UI workspace package.json
COPY src/ui/package.json ./src/ui/package.json

# Install dependencies
RUN npm ci --verbose || npm install --verbose

# Copy UI source
COPY src/ui ./src/ui

# Build UI
RUN npm run build:ui || (cd src/ui && npm run build)

# Production image with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/src/ui/dist /usr/share/nginx/html

# Create nginx config file
RUN echo 'server { \n\
    listen 80; \n\
    server_name _; \n\
    \n\
    root /usr/share/nginx/html; \n\
    index index.html; \n\
    \n\
    # Enable gzip compression \n\
    gzip on; \n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \n\
    \n\
    # Main location \n\
    location / { \n\
        try_files $uri $uri/ /index.html; \n\
    } \n\
    \n\
    # API proxy \n\
    location /api { \n\
        proxy_pass http://gateway:8080; \n\
        proxy_set_header Host $host; \n\
        proxy_set_header X-Real-IP $remote_addr; \n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \n\
        proxy_set_header X-Forwarded-Proto $scheme; \n\
    } \n\
    \n\
    # Health check endpoint \n\
    location /health { \n\
        access_log off; \n\
        return 200 "healthy\\n"; \n\
        add_header Content-Type text/plain; \n\
    } \n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
