# Local Development Environment

Quick setup for local MCP Platform development.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- npm or yarn

## Quick Start

1. Start infrastructure services:
```bash
docker-compose up -d
```

2. Install dependencies:
```bash
cd ../../
npm install
```

3. Set up environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start services:
```bash
# Terminal 1: MCP Server
cd src/server
npm run dev

# Terminal 2: Gateway
cd src/gateway
npm run dev

# Terminal 3: UI
cd src/ui
npm run dev
```

## Access Points

- **UI Dashboard**: http://localhost:5173
- **Gateway API**: http://localhost:8080
- **MCP Server**: http://localhost:3000
- **Jaeger UI**: http://localhost:16686
- **NATS Monitoring**: http://localhost:8222

## Stop Services

```bash
docker-compose down
```

## Reset Data

```bash
docker-compose down -v
```
