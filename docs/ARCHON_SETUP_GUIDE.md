# Archon Integration Guide for NOA Server

## 📋 Table of Contents

- [Overview](#overview)
- [What is Archon?](#what-is-archon)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Integration with NOA Server](#integration-with-noa-server)
- [MCP Integration](#mcp-integration)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

---

## Overview

This guide provides comprehensive instructions for integrating **Archon** into the NOA Server project. Archon serves as a knowledge management backbone and MCP (Model Context Protocol) server that enables AI assistants to access documentation, manage tasks, and collaborate effectively.

**Location**: `/packages/archon/`

**Repository**: https://github.com/coleam00/Archon

**Status**: Beta release (actively maintained)

---

## What is Archon?

Archon is the **command center and operating system for AI coding assistants**. It provides:

### For Developers
- Sleek interface to manage knowledge, context, and tasks
- Web-based dashboard for project management
- Real-time collaboration capabilities

### For AI Assistants
- Model Context Protocol (MCP) server with standardized API
- Access to documentation and knowledge bases
- Task management integration
- Advanced RAG (Retrieval-Augmented Generation) capabilities

### Key Capabilities

**Knowledge Management**
- Smart web crawling for documentation sites
- Document processing (PDF, Word, Markdown, text)
- Code example extraction and indexing
- Vector search with semantic understanding
- Hybrid search (keyword + vector)

**AI Integration**
- MCP protocol for AI assistant connectivity
- Multi-LLM support (OpenAI, Anthropic, Ollama, Google Gemini)
- Advanced RAG strategies
- Real-time streaming responses

**Task Management**
- Hierarchical projects (Projects → Features → Tasks)
- AI-assisted task creation
- Progress tracking
- Real-time updates

---

## Architecture

### Microservices Structure

Archon uses a true microservices architecture:

```
┌─────────────────────────────────────────────────────┐
│  Frontend UI (React + Vite)         Port: 3737      │
├─────────────────────────────────────────────────────┤
│  Server API (FastAPI + SocketIO)    Port: 8181      │
├─────────────────────────────────────────────────────┤
│  MCP Server (HTTP Wrapper)          Port: 8051      │
├─────────────────────────────────────────────────────┤
│  Agents Service (PydanticAI)        Port: 8052      │
├─────────────────────────────────────────────────────┤
│  Database (Supabase/PostgreSQL + PGVector)          │
└─────────────────────────────────────────────────────┘
```

### Service Details

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| **Frontend** | archon-ui | 3737 | Web dashboard and controls |
| **Server** | archon-server | 8181 | Core API, web crawling, document processing |
| **MCP Server** | archon-mcp | 8051 | Model Context Protocol interface |
| **Agents** | archon-agents | 8052 | AI/ML operations, reranking (optional) |

### Technology Stack

**Frontend**
- React 18+ with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Socket.IO for real-time updates

**Backend**
- FastAPI (Python)
- Uvicorn HTTP server
- Socket.IO for WebSocket communication
- PydanticAI for agent framework

**Database**
- PostgreSQL (via Supabase)
- PGVector extension for vector embeddings

**AI/ML**
- OpenAI, Anthropic (Claude), Ollama, Google Gemini support
- Crawl4AI for web scraping
- Hybrid search and contextual embeddings

---

## Prerequisites

### Required Software

1. **Docker & Docker Desktop**
   - Version: Latest stable release
   - Required for containerized deployment
   - Download: https://www.docker.com/products/docker-desktop/

2. **Node.js 18+**
   - Required for frontend development (optional)
   - Download: https://nodejs.org/

3. **Supabase Account**
   - Free tier or self-hosted PostgreSQL 14+ with PGVector
   - Sign up: https://supabase.com/

4. **LLM API Key** (at least one)
   - OpenAI API key (recommended)
   - OR Anthropic API key
   - OR OpenRouter API key
   - OR Ollama running locally

### System Requirements

- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 2-8GB for model files and Docker images
- **OS**: Linux, macOS, Windows (with WSL2)
- **CPU**: 2+ cores recommended

---

## Installation & Setup

### Step 1: Navigate to Archon Directory

```bash
cd /home/user/noa-server/packages/archon
```

### Step 2: Environment Configuration

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` and configure the following:

```bash
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# ⚠️ IMPORTANT: Use the SERVICE ROLE key, NOT the anon key!
# Get it from: Supabase Dashboard → Project Settings → API → service_role key
# Use the LEGACY service role key (longer format)

# Service Ports (Optional - defaults shown)
HOST=localhost
ARCHON_SERVER_PORT=8181
ARCHON_MCP_PORT=8051
ARCHON_AGENTS_PORT=8052
ARCHON_UI_PORT=3737

# Logging (Optional)
LOG_LEVEL=INFO
LOGFIRE_TOKEN=

# Frontend Configuration (Optional)
VITE_ALLOWED_HOSTS=
VITE_SHOW_DEVTOOLS=false
PROD=false
```

### Step 3: Database Setup

1. Go to your Supabase project: https://supabase.com/dashboard
2. Open SQL Editor
3. Copy the contents of `migration/complete_setup.sql`
4. Paste and execute in SQL Editor

This creates all necessary tables, functions, triggers, and RLS policies.

### Step 4: Start Services with Docker

**Option A: Core Services Only (Recommended)**

```bash
docker compose up --build -d
```

This starts:
- archon-server (API)
- archon-mcp (MCP server)
- archon-frontend (UI)

**Option B: Include Agents Service**

```bash
docker compose --profile agents up --build -d
```

This also starts archon-agents for advanced AI operations.

### Step 5: API Key Configuration

1. Open http://localhost:3737
2. Complete the onboarding flow
3. Set your API key in Settings (OpenAI is default)

Alternative: Configure via Settings page after initial setup:
- Settings → Credentials → Add API key
- Select LLM provider (OpenAI, Anthropic, Ollama, Gemini)
- Set primary and reasoner models

---

## Configuration

### Environment Variables Reference

**Core Configuration**

```bash
# Database (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Service Discovery
SERVICE_DISCOVERY_MODE=docker_compose  # or 'kubernetes' or 'local'

# Ports
ARCHON_SERVER_PORT=8181    # API server
ARCHON_MCP_PORT=8051       # MCP server
ARCHON_AGENTS_PORT=8052    # Agents service
ARCHON_UI_PORT=3737        # Web UI
```

**Optional Configuration**

```bash
# Logging
LOG_LEVEL=INFO
LOGFIRE_TOKEN=your_logfire_token

# Docker Environment
DOCKER_ENV=true  # Set in docker-compose, false in .env

# MCP Transport
TRANSPORT=sse  # Server-Sent Events

# Agents
AGENTS_ENABLED=false  # Set to true to enable agents service
```

### Port Customization

To change default ports, update `.env`:

```bash
ARCHON_SERVER_PORT=8282
ARCHON_MCP_PORT=8151
ARCHON_UI_PORT=4040
```

Then restart services:

```bash
docker compose down
docker compose up -d --build
```

### Hostname Configuration

For remote access or custom domains:

```bash
HOST=192.168.1.100     # Use specific IP
HOST=archon.local      # Use custom domain
HOST=myserver.com      # Use public domain
```

---

## Integration with NOA Server

### Project Structure

```
noa-server/
├── packages/
│   └── archon/                    # Archon installation
│       ├── .env                   # Configuration
│       ├── docker-compose.yml     # Docker services
│       ├── python/                # Backend services
│       ├── archon-ui-main/        # Frontend
│       └── migration/             # Database migrations
├── docs/
│   └── ARCHON_SETUP_GUIDE.md     # This guide
└── .claude/
    └── config.json                # Claude Code configuration
```

### Integration Patterns

**1. Knowledge Base Integration**

Use Archon to manage NOA Server documentation:

```bash
# Crawl NOA Server documentation
# In Archon UI: Knowledge Base → Crawl Website
# URL: https://your-noa-server-docs.com
```

**2. Task Management Integration**

Create projects for NOA Server features:

```bash
# In Archon UI:
Projects → Create Project → "NOA Server Development"
Add Features → Add Tasks → Link to documentation
```

**3. MCP Integration with Claude Code**

Connect Claude Code to Archon MCP server:

```bash
# Add Archon MCP server
claude mcp add archon http://localhost:8051

# Verify connection
claude mcp list
```

**4. Shared Environment Variables**

Consider creating a shared `.env` in root for common config:

```bash
# /home/user/noa-server/.env.shared
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=sk-...

# Source in Archon:
# packages/archon/.env can reference: source ../../.env.shared
```

---

## MCP Integration

### Connecting AI Assistants

Archon provides **14 specialized MCP tools** for AI assistants.

### Supported Clients

- Claude Code
- Kiro
- Cursor
- Windsurf
- Claude Desktop
- Any MCP-compatible client

### Configuration for Claude Code

**Method 1: Using Claude CLI**

```bash
claude mcp add archon http://localhost:8051
```

**Method 2: Manual Configuration**

Edit `.claude/mcp.json`:

```json
{
  "servers": {
    "archon": {
      "url": "http://localhost:8051",
      "transport": "sse"
    }
  }
}
```

### Available MCP Tools

**Knowledge & RAG Tools**
- `query_knowledge_base` - Semantic search with RAG
- `hybrid_search` - Keyword + vector search
- `contextual_embeddings` - Context-aware embeddings
- `rerank_results` - Relevance reranking
- `extract_code_examples` - Code snippet extraction

**Task Management Tools**
- `create_task` - Create new tasks
- `read_task` - Get task details
- `update_task` - Modify task information
- `delete_task` - Remove tasks
- `list_tasks` - Query tasks by filters

**Project Operations**
- `list_projects` - Get all projects
- `get_project_context` - Full project information
- `access_documentation` - Retrieve project docs
- `manage_sources` - Documentation source management

---

## Usage Examples

### Example 1: Crawl Documentation

**Via UI:**
1. Open http://localhost:3737
2. Navigate to Knowledge Base
3. Click "Crawl Website"
4. Enter URL: `https://docs.anthropic.com`
5. Click Start Crawl

**Via MCP (in Claude Code):**
```
Use the Archon MCP server to crawl and index the Anthropic documentation at https://docs.anthropic.com
```

### Example 2: Create Project Structure

**Via UI:**
1. Projects → Create Project
2. Name: "NOA Server - Authentication Module"
3. Add Features:
   - User Registration
   - Login/Logout
   - Password Reset
4. Add Tasks for each feature

**Via MCP:**
```
Use Archon to create a new project called "NOA Server - Authentication Module" with features for user registration, login/logout, and password reset.
```

### Example 3: Query Knowledge Base

**Via MCP (in Claude Code):**
```
Search the Archon knowledge base for information about FastAPI authentication best practices
```

The MCP server will:
1. Perform semantic search
2. Use hybrid search if enabled
3. Rerank results for relevance
4. Return contextualized information

### Example 4: Upload Documents

**Via UI:**
1. Knowledge Base → Upload Document
2. Select PDF/Word/Markdown file
3. Wait for processing
4. Document is indexed and searchable

---

## Troubleshooting

### Common Issues

#### 1. Docker Connection Problems

**Symptom**: Frontend can't connect to backend

**Solution**:
- Ensure `DOCKER_ENV=true` in docker-compose.yml for archon-frontend
- Check backend is running: `curl http://localhost:8181/health`
- Verify port configuration in `.env`

#### 2. Supabase Authentication Failures

**Symptom**: "Permission denied" or "Failed to save" errors

**Solution**:
- Use **SERVICE ROLE key**, not anon key
- Use **legacy service role key** (longer format)
- Verify key in Supabase Dashboard → Settings → API

#### 3. Settings Page Save Failures

**Symptom**: Settings don't persist

**Status**: Known beta issue

**Workaround**: Edit `.env` file directly and restart services

#### 4. Knowledge Base Crawl Failures

**Symptom**: Crawling stops midway or doesn't start

**Solutions**:
- Try smaller documentation sets
- Check network connectivity
- Review logs: `docker compose logs -f archon-server`
- Verify Supabase connection

#### 5. Port Conflicts

**Symptom**: "Port already in use" errors

**Solutions**:
```bash
# Check what's using the port
lsof -i :3737

# Stop all containers
docker compose down

# Change port in .env
ARCHON_UI_PORT=4040

# Restart
docker compose up -d --build
```

#### 6. MCP Connection Issues

**Symptom**: Claude Code can't connect to Archon

**Solutions**:
- Verify MCP server is running: `curl http://localhost:8051`
- Check MCP configuration in Claude Code
- Ensure correct port in MCP client config
- Review logs: `docker compose logs -f archon-mcp`

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f archon-server
docker compose logs -f archon-mcp
docker compose logs -f archon-ui

# With timestamps
docker compose logs -f --timestamps

# Last 100 lines
docker compose logs --tail=100
```

### Resetting Database

**⚠️ WARNING: This deletes ALL Archon data!**

If you need to start fresh:

1. Run in Supabase SQL Editor: `migration/RESET_DB.sql`
2. Run setup again: `migration/complete_setup.sql`
3. Restart services: `docker compose up -d --build`
4. Reconfigure API keys and settings

---

## Advanced Features

### RAG Strategies

Archon supports multiple RAG strategies configurable in Settings:

**Hybrid Search**
- Combines keyword search (BM25) with vector search
- Better accuracy for technical documentation
- Configurable via `USE_HYBRID_SEARCH` setting

**Contextual Embeddings**
- Adds context to chunks before embedding
- Improves semantic understanding
- Configurable via `USE_CONTEXTUAL_EMBEDDINGS` setting

**Result Reranking**
- Re-scores results for relevance
- Uses lightweight reranking models
- Configurable via `USE_RERANKING` setting

### Multi-LLM Configuration

**Supported Providers**:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3.5, Claude 3)
- Google Gemini
- OpenRouter (100+ models)
- Ollama (local models)

**Configuration**:
- Primary Model: General tasks
- Reasoner Model: Complex planning and analysis

Set in Settings → Credentials → Model Configuration

### Agent Profiles

When agents service is enabled (`--profile agents`):

**Document Agent**
- Processes uploaded documents
- Intelligent chunking
- Metadata extraction

**RAG Agent**
- Handles knowledge base queries
- Applies RAG strategies
- Streams responses

**Task Agent**
- AI-assisted task creation
- Project planning
- Feature breakdown

### Crawler Configuration

Advanced crawler settings (in Settings → Crawler):

```bash
CRAWL_MAX_CONCURRENT=10        # Max concurrent pages
CRAWL_BATCH_SIZE=50            # URLs per batch
MEMORY_THRESHOLD_PERCENT=80    # Memory limit before throttling
DISPATCHER_CHECK_INTERVAL=0.5  # Memory check interval (seconds)
```

### Development Mode

For active Archon development:

```bash
# Hybrid mode (backend in Docker, frontend local)
make dev

# Full Docker mode
make dev-docker

# Run tests
make test

# Lint code
make lint
```

---

## Integration Checklist

- [ ] Archon cloned to `/packages/archon/`
- [ ] `.env` file configured with Supabase credentials
- [ ] Database migration executed in Supabase
- [ ] Docker services started successfully
- [ ] API key configured in Settings or `.env`
- [ ] UI accessible at http://localhost:3737
- [ ] MCP server accessible at http://localhost:8051
- [ ] MCP client configured (Claude Code)
- [ ] Test knowledge base crawl completed
- [ ] Test document upload completed
- [ ] Test project creation completed
- [ ] Integration guide documentation created

---

## Resources

### Official Links
- **GitHub Repository**: https://github.com/coleam00/Archon
- **Issues**: https://github.com/coleam00/Archon/issues
- **Discussions**: https://github.com/coleam00/Archon/discussions
- **Contributing Guide**: https://github.com/coleam00/Archon/blob/main/CONTRIBUTING.md

### Related Projects
- **mcp-crawl4ai-rag**: Web crawling and RAG
- **supabase-mcp**: MCP server for Supabase
- **mcp-mem0**: Long-term memory MCP server

### Community
- GitHub Discussions for questions
- GitHub Issues for bug reports
- Active community contributions welcome

---

## Quick Reference

### Essential Commands

```bash
# Start services
cd /home/user/noa-server/packages/archon
docker compose up -d --build

# With agents
docker compose --profile agents up -d --build

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Check service health
curl http://localhost:8181/health
curl http://localhost:8051/health
```

### Service URLs

- **Web UI**: http://localhost:3737
- **API Server**: http://localhost:8181
- **MCP Server**: http://localhost:8051
- **Agents Service**: http://localhost:8052
- **API Health**: http://localhost:8181/health

### Default Ports

- `3737` - Frontend UI
- `8181` - API Server
- `8051` - MCP Server
- `8052` - Agents Service (optional)

---

## Support

For issues specific to NOA Server integration:
- Create issue in NOA Server repository

For Archon-specific issues:
- GitHub Issues: https://github.com/coleam00/Archon/issues
- GitHub Discussions: https://github.com/coleam00/Archon/discussions

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-23
**Archon Version**: Beta (stable branch recommended)
