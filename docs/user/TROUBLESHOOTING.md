# Troubleshooting Guide

Common issues and solutions for Noa Server.

## 📋 Table of Contents

- [Installation Issues](#installation-issues)
- [Server Issues](#server-issues)
- [Swarm Issues](#swarm-issues)
- [Agent Issues](#agent-issues)
- [MCP Issues](#mcp-issues)
- [Neural Processing Issues](#neural-processing-issues)
- [Performance Issues](#performance-issues)
- [Network Issues](#network-issues)
- [Database Issues](#database-issues)
- [General Debugging](#general-debugging)

## Installation Issues

### Node.js Version Mismatch

**Problem**: Error about Node.js version

```
error: This package requires Node.js version >=18.0.0
```

**Solution**:

```bash
# Check current version
node --version

# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 18+
nvm install 18
nvm use 18

# Verify
node --version  # Should be v18.x.x or higher
```

### Dependency Installation Fails

**Problem**: npm install fails with errors

**Solution**:

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall with verbose logging
npm install --verbose

# If still failing, try with legacy peer deps
npm install --legacy-peer-deps
```

### Build Errors

**Problem**: `npm run build` fails

**Solution**:

```bash
# Check TypeScript version
npx tsc --version

# Clean build artifacts
npm run clean

# Rebuild
npm run build

# If still failing, check specific package
cd packages/core
npm run build
```

### Permission Errors

**Problem**: EACCES permission denied

**Solution**:

```bash
# Don't use sudo! Fix npm permissions instead
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall
npm install
```

## Server Issues

### Server Won't Start

**Problem**: Server fails to start

**Solution**:

```bash
# Check if port is in use
lsof -i :3000

# Kill process using port
kill -9 <PID>

# Check logs
npm run dev 2>&1 | tee server.log

# Check environment variables
cat .env

# Verify database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Server Crashes

**Problem**: Server crashes unexpectedly

**Solution**:

```bash
# Enable debug logging
export LOG_LEVEL=debug
export NODE_ENV=development

# Run with debugging
node --inspect dist/server.js

# Check memory usage
node --max-old-space-size=4096 dist/server.js

# Review crash logs
tail -f logs/error.log
```

### Health Check Fails

**Problem**: `/health` endpoint returns unhealthy

**Solution**:

```bash
# Detailed health check
curl http://localhost:3000/health?detailed=true

# Check individual components
curl http://localhost:3000/health/database
curl http://localhost:3000/health/mcp
curl http://localhost:3000/health/swarm

# Run diagnostics
npx claude-flow@alpha diagnostics --verbose
```

## Swarm Issues

### Swarm Won't Initialize

**Problem**: Swarm initialization fails

```bash
npx claude-flow@alpha swarm init --topology mesh
# Error: Failed to initialize swarm
```

**Solution**:

```bash
# Check MCP connection
claude mcp list

# Verify claude-flow is connected
# If not, add it
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Clear swarm cache
rm -rf .swarm/cache/*

# Retry with verbose logging
npx claude-flow@alpha swarm init \
  --topology mesh \
  --max-agents 5 \
  --verbose
```

### Swarm Status Shows Errors

**Problem**: Agents in error state

**Solution**:

```bash
# Check swarm status
npx claude-flow@alpha swarm status --verbose

# List agents with errors
npx claude-flow@alpha agent list --status error

# Check agent logs
npx claude-flow@alpha agent logs --name <agent-name>

# Restart failed agents
npx claude-flow@alpha agent restart --name <agent-name>

# Or restart entire swarm
npx claude-flow@alpha swarm restart
```

### Swarm Performance Degradation

**Problem**: Swarm running slowly

**Solution**:

```bash
# Check metrics
npx claude-flow@alpha metrics swarm

# Identify bottlenecks
npx claude-flow@alpha perf analyze

# Reduce agent count if overloaded
npx claude-flow@alpha swarm scale --agents 5

# Clear memory
npx claude-flow@alpha memory cleanup --older-than 1d

# Optimize topology
npx claude-flow@alpha swarm optimize
```

## Agent Issues

### Agent Spawn Fails

**Problem**: Cannot spawn agents

**Solution**:

```bash
# Check swarm status first
npx claude-flow@alpha swarm status

# Verify agent type exists
npx claude-flow@alpha agent types

# Check resource limits
npx claude-flow@alpha metrics system

# Try spawning with fewer resources
npx claude-flow@alpha agent spawn \
  --type coder \
  --memory-limit 512MB

# Check agent logs
npx claude-flow@alpha logs --component agent-spawner
```

### Agent Not Responding

**Problem**: Agent stuck or unresponsive

**Solution**:

```bash
# Check agent status
npx claude-flow@alpha agent status --name <agent-name>

# View agent logs
npx claude-flow@alpha agent logs \
  --name <agent-name> \
  --tail 100

# Send health check
npx claude-flow@alpha agent ping --name <agent-name>

# Restart agent
npx claude-flow@alpha agent restart --name <agent-name>

# If still stuck, force terminate
npx claude-flow@alpha agent stop \
  --name <agent-name> \
  --force
```

### Agent Memory Issues

**Problem**: Agent running out of memory

**Solution**:

```bash
# Check agent memory usage
npx claude-flow@alpha agent metrics \
  --name <agent-name> \
  --metric memory

# Increase memory limit
npx claude-flow@alpha agent configure \
  --name <agent-name> \
  --memory-limit 2GB

# Clear agent cache
npx claude-flow@alpha agent clear-cache --name <agent-name>

# Restart with higher limit
npx claude-flow@alpha agent restart \
  --name <agent-name> \
  --memory-limit 2GB
```

## MCP Issues

### MCP Server Not Connected

**Problem**: MCP server shows disconnected

**Solution**:

```bash
# List MCP servers
claude mcp list

# Remove and re-add
claude mcp remove claude-flow
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Check MCP logs
claude mcp logs claude-flow

# Restart Claude Code
# Exit and restart Claude Code application
```

### MCP Tool Not Found

**Problem**: MCP tool not available

```
Error: Tool mcp__claude-flow__swarm_init not found
```

**Solution**:

```bash
# Verify MCP server is running
claude mcp list
# Should show: claude-flow: ✓ Connected

# Restart MCP server
claude mcp restart claude-flow

# Check available tools
claude mcp tools claude-flow

# If tool still missing, reinstall
npm install -g claude-flow@alpha
claude mcp remove claude-flow
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

### MCP Timeout

**Problem**: MCP operations timeout

**Solution**:

```bash
# Increase timeout in Claude Code settings
# Or set environment variable
export MCP_TIMEOUT=60000

# Check network
ping localhost

# Restart MCP server with higher timeout
claude mcp remove claude-flow
claude mcp add claude-flow npx claude-flow@alpha mcp start --timeout 60000
```

## Neural Processing Issues

### CUDA Not Available

**Problem**: CUDA not detected

**Solution**:

```bash
# Check NVIDIA driver
nvidia-smi

# Check CUDA installation
nvcc --version

# Verify PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"

# If false, reinstall PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Verify in environment
cd packages/llama.cpp
source ~/praisonai_env/bin/activate
python -c "import torch; print(torch.cuda.is_available())"
```

### Model Not Found

**Problem**: Cannot load model

**Solution**:

```bash
# List available models
mcp__neural-processing__list_available_models

# Check model path
ls -lh packages/llama.cpp/models/

# Download model if missing
cd packages/llama.cpp/models
wget https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q4_K_M.gguf

# Verify model
mcp__neural-processing__validate_model \
  --model-path "models/llama-2-7b.Q4_K_M.gguf"
```

### Out of Memory (OOM)

**Problem**: Neural processing runs out of memory

**Solution**:

```bash
# Check GPU memory
nvidia-smi

# Use smaller model
mcp__neural-processing__chat_completion \
  --model "llama-2-7b" \
  --context-size 2048

# Reduce batch size
export LLAMA_BATCH_SIZE=128

# Enable memory mapping
export LLAMA_MMAP=1

# Or use CPU if GPU OOM
export CUDA_ENABLED=false
```

### Slow Inference

**Problem**: Model inference is slow

**Solution**:

```bash
# Verify CUDA is being used
mcp__neural-processing__get_system_info

# Check GPU utilization
nvidia-smi dmon

# Use quantized model (faster)
# Q4_K_M is faster than F16

# Benchmark model
mcp__neural-processing__benchmark_model \
  --model "llama-2-7b" \
  --iterations 10

# Optimize batch size
export LLAMA_BATCH_SIZE=512
```

## Performance Issues

### High CPU Usage

**Problem**: CPU usage at 100%

**Solution**:

```bash
# Check process CPU
top -p $(pgrep -f "node.*noa-server")

# Reduce concurrent tasks
npx claude-flow@alpha configure \
  --max-concurrent-tasks 5

# Reduce agent count
npx claude-flow@alpha swarm scale --agents 3

# Enable CPU throttling
export UV_THREADPOOL_SIZE=4
```

### High Memory Usage

**Problem**: Memory usage growing

**Solution**:

```bash
# Check memory
free -h

# Check Node.js heap
node --expose-gc --inspect dist/server.js

# Force garbage collection
kill -SIGUSR2 $(pgrep -f "node.*noa-server")

# Clear caches
npx claude-flow@alpha memory cleanup
npx claude-flow@alpha cache clear

# Reduce memory limit
node --max-old-space-size=2048 dist/server.js
```

### Slow Response Times

**Problem**: Operations taking too long

**Solution**:

```bash
# Check bottlenecks
npx claude-flow@alpha perf analyze

# Enable caching
npx claude-flow@alpha configure --cache-enabled true

# Use faster topology
npx claude-flow@alpha swarm init --topology star

# Reduce logging
export LOG_LEVEL=error

# Profile performance
node --prof dist/server.js
node --prof-process isolate-*.log > profile.txt
```

## Network Issues

### Connection Refused

**Problem**: Cannot connect to server

**Solution**:

```bash
# Check if server is running
ps aux | grep node

# Check port binding
netstat -tulpn | grep :3000

# Check firewall
sudo ufw status
sudo ufw allow 3000

# Try different port
export PORT=3001
npm run dev

# Check for proxy issues
unset HTTP_PROXY HTTPS_PROXY
```

### CORS Errors

**Problem**: CORS policy blocking requests

**Solution**:

```bash
# Update CORS config
cat > config/cors.json << EOF
{
  "enabled": true,
  "origins": ["http://localhost:3000", "http://localhost:8080"],
  "credentials": true,
  "methods": ["GET", "POST", "PUT", "DELETE"]
}
EOF

# Restart server
npm run dev
```

## Database Issues

### Connection Failed

**Problem**: Cannot connect to database

**Solution**:

```bash
# Test connection
psql $DATABASE_URL

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check connection string
echo $DATABASE_URL

# Test with explicit connection
psql -h localhost -U postgres -d noa_server
```

### Migration Errors

**Problem**: Database migrations fail

**Solution**:

```bash
# Check migration status
npm run db:migrate:status

# Rollback last migration
npm run db:migrate:rollback

# Clear migration lock
psql $DATABASE_URL -c "DELETE FROM migrations_lock"

# Re-run migrations
npm run db:migrate

# Reset database (CAUTION: destroys data)
npm run db:reset
```

## General Debugging

### Enable Debug Logging

```bash
# Environment variable
export LOG_LEVEL=debug
export DEBUG=*

# Or in .env
LOG_LEVEL=debug
DEBUG=noa:*

# Start server
npm run dev
```

### Collect Diagnostics

```bash
# Run diagnostics
npx claude-flow@alpha diagnostics --verbose > diagnostics.log

# System info
npx claude-flow@alpha system-info > system-info.json

# Export all logs
npx claude-flow@alpha logs export --all --output logs-$(date +%Y%m%d).tar.gz
```

### Clean Installation

If all else fails, try a clean installation:

```bash
# Backup data
npx claude-flow@alpha backup --output backup-$(date +%Y%m%d).tar.gz

# Clean everything
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf .swarm
rm -rf dist
rm package-lock.json

# Reinstall
npm install
npm run build

# Restore data
npx claude-flow@alpha restore --input backup-*.tar.gz

# Verify
npm run test
```

## Getting More Help

### Check Logs

```bash
# Application logs
tail -f logs/application.log

# Error logs
tail -f logs/error.log

# All logs
tail -f logs/*.log
```

### Community Support

- **GitHub Issues**:
  [Report a bug](https://github.com/your-org/noa-server/issues)
- **Discussions**:
  [Ask questions](https://github.com/your-org/noa-server/discussions)
- **Discord**: Join our [Discord server](#)
- **Email**: support@noa-server.com

### Before Reporting Issues

Include this information:

```bash
# System info
uname -a
node --version
npm --version

# Noa Server version
cat package.json | grep version

# Error logs
tail -100 logs/error.log

# Diagnostics
npx claude-flow@alpha diagnostics --verbose
```

---

**Still having issues?** Contact support with the diagnostic information above.
