# Claude Suite UI Dashboard

📚 [Master Documentation Index](docs/INDEX.md)


Real-time automation dashboard with MCP integration, Claude-Flow telemetry, and
agent swarm visualization.

## Features

- **Real-time Monitoring**: Live updates via WebSocket connection
- **Agent Swarm Visualization**: Interactive network graph of active agents
- **Performance Metrics**: Response times, throughput, and system health
- **Task Queue Management**: View and manage queued tasks
- **MCP Tool Metrics**: Track tool usage and performance
- **Neural Processing Metrics**: GPU utilization, VRAM usage, inference times
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: WCAG 2.1 AA compliant components

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **Zustand** - State management
- **date-fns** - Date formatting

## Installation

```bash
cd /home/deflex/noa-server/packages/ui-dashboard
npm install
```

## Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

### Environment Variables

Create a `.env` file in the package root:

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080
```

### API Endpoints

The dashboard expects the following API endpoints:

- `GET /api/telemetry` - Full telemetry data
- `GET /api/agents` - Agent status list
- `GET /api/tasks` - Task queue
- `POST /api/agents/:id/pause` - Pause agent
- `POST /api/agents/:id/resume` - Resume agent
- `POST /api/tasks/:id/cancel` - Cancel task
- `WS /ws` - WebSocket for real-time updates

### Fallback Mode

If the API is unavailable, the dashboard falls back to static file-based data
from:

- `../../EvidenceLedger/runtime.json`
- `../../EvidenceLedger/truth_gate.json`
- `../../EvidenceLedger/verification.json`
- `../../.swarm/hooks.log`
- `../../logs/mcp/tool_catalog.json`

## Components

### Core Components

- **Header**: Top navigation with refresh controls
- **MetricCard**: Reusable metric display with trends
- **AgentCard**: Individual agent status and controls
- **TaskQueue**: Task list with filtering and actions
- **SystemHealth**: Resource usage and service status
- **SwarmVisualization**: Interactive agent network graph
- **PerformanceCharts**: Real-time performance metrics

### Services

- **api.ts**: REST API and WebSocket client
- **store.ts**: Zustand state management
- **useTelemetry.ts**: Custom hook for data fetching

### Utilities

- **format.ts**: Number, date, and status formatting helpers

## Build Scripts

### Python Build Script

The original Python build script is preserved at
`../../scripts/ui/build_dashboard.py`:

```bash
npm run build:python
```

This generates a static HTML file at `dist/index.html` from repository
artifacts.

## Deployment

### Production Build

```bash
npm run build
```

Output in `dist/` directory. Serve with any static file server.

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Performance

- **Bundle Size**: < 200KB gzipped
- **First Contentful Paint**: < 1.8s
- **Time to Interactive**: < 3.9s
- **60fps Animations**: Optimized with Framer Motion
- **Code Splitting**: Automatic chunk splitting

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast color scheme
- Focus indicators

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

> Last updated: 2025-11-20
