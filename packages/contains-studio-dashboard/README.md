# Contains Studio Dashboard

📚 [Master Documentation Index](docs/INDEX.md)


Real-time monitoring and control dashboard for Contains Studio Agents platform.

## Features

- **Real-Time Agent Monitoring**: Track all 37 specialized AI agents across 7
  domains
- **Workflow Management**: Submit and monitor automated feature development
  workflows
- **System Health Monitoring**: Real-time CPU, memory, disk, and network metrics
- **Interactive Controls**: Submit feature requests and control agent workflows
- **WebSocket Integration**: Live updates via Socket.IO for instant feedback

## Quick Start

### Prerequisites

- Node.js 18+
- Contains Studio Agents package installed
- Docker services running (PostgreSQL, Redis, MongoDB)

### Installation

```bash
# Navigate to dashboard directory
cd /home/deflex/noa-server/packages/contains-studio-dashboard

# Install dependencies
npm install

# Start development servers (Next.js + WebSocket)
npm run dev
```

The dashboard will be available at:

- Frontend: http://localhost:3000
- WebSocket Server: http://localhost:3001

### Production Build

```bash
# Build for production
npm run build

# Start production servers
npm start
```

## Architecture

### Frontend (Next.js 15 + React 19)

- **App Router**: Modern Next.js app directory structure
- **shadcn/ui**: 48+ accessible UI components
- **Tailwind CSS 4**: Utility-first styling
- **Real-time Updates**: Socket.IO client integration
- **Type Safety**: Full TypeScript coverage

### Backend (WebSocket Server)

- **Socket.IO**: Real-time bidirectional communication
- **Maestro Integration**: Direct connection to Contains Studio Agents
- **Event Bridge**: Translates Maestro events to dashboard updates
- **Express**: Health check and API endpoints

## Dashboard Tabs

### Overview

- System statistics and quick metrics
- Active workflows with real-time progress
- System health overview
- Quick access to create new features

### Agents (37 total)

- Browse all agents by domain
- Filter by status, domain, or capabilities
- View agent performance metrics
- See current tasks and completion rates

### Workflows

- View all workflows (active, pending, completed)
- Monitor phase-by-phase progress
- See assigned agents and timelines
- Submit new feature requests

### System Health

- Real-time resource monitoring
- Docker service status
- Service uptime and response times
- Performance metrics

### Documentation

- Quick links to all documentation
- Health check reports
- Integration guides
- Setup instructions

## Components

### Key React Components

- `<AgentGrid />` - Display and filter all agents
- `<AgentCard />` - Individual agent status card
- `<WorkflowTimeline />` - Phase-by-phase workflow visualization
- `<SystemHealth />` - Real-time system metrics
- `<FeatureRequestForm />` - Submit new workflows

### Custom Hooks

- `useAgents()` - Subscribe to agent state updates
- `useWorkflows()` - Subscribe to workflow progress
- `useSystemMetrics()` - Real-time system health data

## WebSocket Events

### Client → Server

- `workflow:submit` - Submit new feature request
- `agents:list` - Request current agent states
- `workflows:list` - Request workflow list
- `system:status` - Request system state

### Server → Client

- `agents:list` - All agent states
- `agent:status` - Individual agent status change
- `workflows:list` - All workflows
- `workflow:created` - New workflow started
- `workflow:progress` - Phase transition
- `workflow:complete` - Workflow finished
- `system:status` - Complete system state
- `system:metrics` - Real-time health metrics (2s interval)

## Configuration

### Environment Variables

Create `.env.local` file:

```env
DATABASE_URL="postgresql://dev:dev@localhost:5432/contains_studio"
REDIS_URL="redis://localhost:6379"
MONGODB_URL="mongodb://localhost:27017/contains_studio"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
FRONTEND_URL="http://localhost:3000"
WS_PORT=3001
```

## Development

### File Structure

```
contains-studio-dashboard/
├── src/
│   ├── app/                      # Next.js pages
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Main dashboard
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (48 files)
│   │   └── dashboard/           # Custom dashboard components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities and helpers
│   └── types/                   # TypeScript definitions
├── server/
│   └── index.ts                 # WebSocket server + Maestro bridge
├── public/                      # Static assets
├── prisma/                      # Database schema (future)
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config (frontend)
└── tsconfig.server.json         # TypeScript config (server)
```

### Scripts

```bash
# Development (parallel servers)
npm run dev

# Build both frontend and server
npm run build

# Production start (parallel servers)
npm start

# Run only WebSocket server
npm run server

# Watch mode for server
npm run server:dev

# Type checking
npm run type-check

# Linting
npm run lint
```

## Integration with Contains Studio Agents

The dashboard connects directly to the Contains Studio Agents Maestro system:

1. **Initialization**: Server initializes Maestro with full agent registry
2. **Event Listening**: Subscribes to all Maestro workflow events
3. **State Management**: Maintains agent and workflow state maps
4. **Real-time Broadcasting**: Emits updates to all connected clients
5. **Bidirectional Control**: Clients can submit workflows via dashboard

## Performance

- **Initial Load**: < 2 seconds
- **WebSocket Latency**: < 100ms
- **Real-time Updates**: 2 second intervals for metrics
- **Concurrent Clients**: Supports 100+ simultaneous connections
- **Memory Footprint**: ~150 MB (server + frontend)

## Browser Support

- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+

## Troubleshooting

### WebSocket Connection Failed

```bash
# Check if server is running
curl http://localhost:3001/health

# Restart server
npm run server:dev
```

### Agents Not Loading

```bash
# Verify Contains Studio Agents package
cd ../contains-studio-agents
npm run build

# Check agent definitions
node tests/health-check-agents.js
```

### Docker Services Down

```bash
# Restart services
cd ../contains-studio-agents
docker-compose restart
```

## Future Enhancements

- [ ] Prisma database integration for workflow history
- [ ] Agent performance analytics and trends
- [ ] Custom agent configuration interface
- [ ] Workflow templates and presets
- [ ] Export workflow reports (PDF/CSV)
- [ ] Multi-user authentication
- [ ] Role-based access control
- [ ] Mobile responsive improvements

## Support

For issues or questions:

1. Check Contains Studio Agents documentation
2. Run health checks: `npm run server:dev`
3. Review WebSocket server logs
4. Verify Docker services are healthy

## License

MIT License - see LICENSE file for details

---

**Version**: 1.0.0 **Last Updated**: October 22, 2025 **Status**: ✅ Operational

> Last updated: 2025-11-20
