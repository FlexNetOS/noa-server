# Archon Quick Start Guide

## 🚀 Quick Setup (5 minutes)

This is a condensed guide to get Archon up and running quickly. For detailed instructions, see [ARCHON_SETUP_GUIDE.md](./ARCHON_SETUP_GUIDE.md).

---

## Prerequisites

- Docker Desktop installed
- Supabase account (free tier)
- OpenAI API key (or Anthropic/Ollama)

---

## Setup Steps

### 1. Navigate to Archon

```bash
cd /home/user/noa-server/packages/archon
```

### 2. Configure Environment

```bash
# .env file is already created, just edit it:
nano .env

# Add your credentials:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# ⚠️ IMPORTANT: Use SERVICE ROLE key, not anon key!
```

Get credentials from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

### 3. Setup Database

1. Go to Supabase SQL Editor
2. Run the contents of: `migration/complete_setup.sql`

### 4. Start Services

```bash
# Core services (recommended)
docker compose up -d --build

# Or with agents service
docker compose --profile agents up -d --build
```

### 5. Configure API Key

1. Open: http://localhost:3737
2. Complete onboarding
3. Set your OpenAI/Anthropic API key

---

## Verify Installation

```bash
# Check services are running
docker compose ps

# Test API health
curl http://localhost:8181/health

# Test MCP server
curl http://localhost:8051
```

---

## Connect Claude Code

```bash
# Add Archon MCP server
claude mcp add archon http://localhost:8051

# Verify connection
claude mcp list
```

---

## Quick Test

1. **Web Crawl**: http://localhost:3737 → Knowledge Base → Crawl Website → `https://docs.anthropic.com`
2. **Upload Doc**: Knowledge Base → Upload PDF
3. **Create Project**: Projects → Create Project
4. **Test MCP**: In Claude Code, ask to query Archon knowledge base

---

## Service URLs

- **Web UI**: http://localhost:3737
- **API**: http://localhost:8181
- **MCP**: http://localhost:8051
- **Agents**: http://localhost:8052 (if enabled)

---

## Common Issues

**"Permission denied" errors**
→ Use SERVICE ROLE key from Supabase, not anon key

**Port conflicts**
→ Edit `.env` to change ports, then restart

**Frontend can't connect**
→ Ensure `DOCKER_ENV=true` in docker-compose.yml

**Services won't start**
→ Check Docker is running: `docker ps`

---

## Next Steps

- Read full guide: [ARCHON_SETUP_GUIDE.md](./ARCHON_SETUP_GUIDE.md)
- Crawl your documentation
- Create projects for your codebase
- Use MCP tools in Claude Code

---

## Stop Services

```bash
docker compose down
```

---

**Need Help?** See [ARCHON_SETUP_GUIDE.md](./ARCHON_SETUP_GUIDE.md) for detailed troubleshooting.
