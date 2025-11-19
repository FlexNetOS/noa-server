---
title: Troubleshooting Guide
category: Operations
last_updated: 2025-10-23
---

# Troubleshooting Guide

> Common issues and solutions for NOA Server

## Common Issues

### Cannot Connect to Database

**Symptoms:**

- `Error: ECONNREFUSED`
- `Connection timeout`
- `Database unavailable`

**Solutions:**

1. **Check database is running:**

   ```bash
   # PostgreSQL
   pg_isready -h localhost -p 5432

   # Docker
   docker ps | grep postgres
   ```

2. **Verify connection string:**

   ```bash
   # Check .env file
   cat .env | grep DATABASE_URL

   # Test connection
   psql $DATABASE_URL
   ```

3. **Check firewall rules:**

   ```bash
   # Allow PostgreSQL port
   sudo ufw allow 5432
   ```

4. **Review logs:**
   ```bash
   # PostgreSQL logs
   tail -f /var/log/postgresql/postgresql-14-main.log
   ```

### Redis Connection Failed

**Symptoms:**

- `Redis connection refused`
- `Cache unavailable`
- `Session errors`

**Solutions:**

1. **Start Redis:**

   ```bash
   # Linux
   sudo systemctl start redis

   # Docker
   docker-compose up -d redis
   ```

2. **Check Redis status:**

   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. **Verify configuration:**
   ```bash
   cat .env | grep REDIS_URL
   ```

### API Key Invalid

**Symptoms:**

- `401 Unauthorized`
- `Invalid API key`

**Solutions:**

1. **Verify API key format:**

   ```bash
   # Should start with sk-
   echo $OPENAI_API_KEY
   ```

2. **Regenerate API key:**
   - Log in to provider dashboard
   - Generate new API key
   - Update environment variables

3. **Check key permissions:**
   - Ensure key has necessary permissions
   - Verify key is not expired

### Rate Limit Exceeded

**Symptoms:**

- `429 Too Many Requests`
- `Rate limit exceeded`

**Solutions:**

1. **Check rate limit headers:**

   ```bash
   curl -I https://api.noa-server.io/v1/health
   ```

2. **Implement retry with backoff:**

   ```typescript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
         } else {
           throw error;
         }
       }
     }
   }
   ```

3. **Upgrade tier:**
   - Consider upgrading to Pro tier
   - Contact sales for Enterprise tier

### Memory Leak

**Symptoms:**

- Increasing memory usage
- OOM errors
- Slow performance

**Solutions:**

1. **Monitor memory usage:**

   ```bash
   # Node.js heap snapshot
   node --inspect app.js

   # Process memory
   ps aux | grep node

   # Docker stats
   docker stats
   ```

2. **Enable heap profiling:**

   ```bash
   node --max-old-space-size=4096 --expose-gc app.js
   ```

3. **Check for common causes:**
   - Unclosed database connections
   - Event listener leaks
   - Large cache buildup
   - Circular references

4. **Use heap snapshot:**
   ```bash
   # Chrome DevTools
   chrome://inspect
   ```

### Slow API Response

**Symptoms:**

- High latency
- Timeout errors
- Degraded performance

**Solutions:**

1. **Check system resources:**

   ```bash
   # CPU usage
   top

   # Memory usage
   free -h

   # Disk I/O
   iostat -x 1
   ```

2. **Enable caching:**

   ```bash
   # Update .env
   CACHE_ENABLED=true
   CACHE_TTL=3600
   ```

3. **Optimize database queries:**

   ```bash
   # Enable query logging
   LOG_LEVEL=debug

   # Analyze slow queries
   EXPLAIN ANALYZE SELECT ...
   ```

4. **Use connection pooling:**
   ```bash
   DATABASE_POOL_MAX=20
   ```

### Docker Build Fails

**Symptoms:**

- Build errors
- Dependency issues
- Network timeouts

**Solutions:**

1. **Clear Docker cache:**

   ```bash
   docker system prune -a
   docker build --no-cache -t noa-server .
   ```

2. **Check disk space:**

   ```bash
   df -h
   docker system df
   ```

3. **Update base images:**

   ```bash
   docker pull node:18-alpine
   ```

4. **Review Dockerfile:**
   - Check syntax
   - Verify package versions
   - Test locally

### TypeScript Compilation Errors

**Symptoms:**

- Type errors
- Build failures
- Module not found

**Solutions:**

1. **Clean build:**

   ```bash
   pnpm clean
   rm -rf node_modules
   pnpm install
   pnpm build
   ```

2. **Update TypeScript:**

   ```bash
   pnpm add -D typescript@latest
   ```

3. **Check tsconfig.json:**

   ```json
   {
     "compilerOptions": {
       "strict": true,
       "skipLibCheck": true
     }
   }
   ```

4. **Regenerate types:**
   ```bash
   pnpm prisma generate
   ```

### Tests Failing

**Symptoms:**

- Test failures
- Timeout errors
- Flaky tests

**Solutions:**

1. **Run tests in isolation:**

   ```bash
   pnpm test -- --testNamePattern="specific test"
   ```

2. **Check test database:**

   ```bash
   # Reset test database
   NODE_ENV=test pnpm db:reset
   ```

3. **Increase timeout:**

   ```typescript
   jest.setTimeout(10000);
   ```

4. **Clean test artifacts:**
   ```bash
   pnpm test:clean
   ```

## Debugging Tools

### Logging

```bash
# Enable debug logging
DEBUG=noa:* pnpm dev

# Filter specific modules
DEBUG=noa:database,noa:cache pnpm dev

# Save logs to file
pnpm dev 2>&1 | tee app.log
```

### Profiling

```bash
# CPU profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect app.js
# Open chrome://inspect
```

### Database Debugging

```bash
# Query logging
LOG_QUERIES=true pnpm dev

# Prisma Studio
pnpm prisma studio

# Direct database access
psql $DATABASE_URL
```

## Getting Help

### Check Status

- [Service Status](https://status.noa-server.io)
- [GitHub Issues](https://github.com/noa-server/issues)

### Community Support

- [Discord](https://discord.gg/noa-server)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/noa-server)
- [GitHub Discussions](https://github.com/noa-server/discussions)

### Contact Support

- Email: support@noa-server.io
- Enterprise: enterprise@noa-server.io

**[← Back to Documentation Index](../INDEX.md)**
